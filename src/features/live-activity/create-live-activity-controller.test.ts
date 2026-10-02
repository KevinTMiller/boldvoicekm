/**
 * Tests for the Live Activity controller (Model layer): policy wiring, intended visibility and
 * restore. Uses the in-memory fake presenter, which tracks what is on screen.
 */
import { createLiveActivityController } from '@/features/live-activity/create-live-activity-controller';
import type {
  LiveActivitySnapshot,
  LiveActivityTriggerPolicy,
} from '@/features/live-activity/live-activity.types';
import { createFakeLiveActivityPresenter } from '@/features/live-activity/testing/fake-live-activity-presenter';
import { createImmediateTriggerPolicy } from '@/features/live-activity/trigger-policies/immediate-trigger-policy';
import {
  isSessionPaused,
  pauseSession,
  resumeSession,
  startSession,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/**
 * Builds a running session.
 *
 * @param name - Session name.
 * @param startedAtMs - Start time in epoch milliseconds.
 * @returns The session.
 */
function makeSession(name: string, startedAtMs = 0): TimerSession {
  return startSession({ name, goalSeconds: 1500 }, startedAtMs);
}

/**
 * Builds a surviving activity snapshot.
 *
 * @param activityId - Activity id; also used as the session name.
 * @param session - Session the activity shows.
 * @param presentationVariant - Layout the activity was started with.
 * @returns The snapshot.
 */
function makeSnapshot(
  activityId: string,
  session: TimerSession = makeSession(activityId),
  presentationVariant = 'default'
): LiveActivitySnapshot {
  return { activityId, session, presentationVariant };
}

/**
 * Creates a controller on a fresh fake presenter with a mock error reporter.
 *
 * @param policy - Trigger policy to use. Defaults to the immediate policy.
 * @returns The controller, the presenter and the error reporter.
 */
function createControllerUnderTest(
  policy: LiveActivityTriggerPolicy = createImmediateTriggerPolicy()
) {
  const presenter = createFakeLiveActivityPresenter();
  const onError = jest.fn();
  const controller = createLiveActivityController({
    strategy: { policy, presenter, presentationVariant: 'default' },
    onError,
  });
  return { controller, presenter, onError };
}

// Requirement: the activity follows the session from start, through pause/resume, to stop.
describe('controller with the immediate policy', () => {
  it('shows, updates and removes the activity across a session', async () => {
    const { controller, presenter } = createControllerUnderTest();
    const session = makeSession('Chapter 5');
    const pausedSession = pauseSession(session, 5000);

    controller.notify({ type: 'sessionStarted', session });
    await controller.whenIdle();
    expect(presenter.activeActivities.size).toBe(1);

    controller.notify({ type: 'sessionPaused', session: pausedSession });
    controller.notify({ type: 'sessionResumed', session: resumeSession(pausedSession, 9000) });
    await controller.whenIdle();
    expect(presenter.calls.filter((call) => call.startsWith('update:'))).toHaveLength(2);

    controller.notify({ type: 'sessionStopped' });
    await controller.whenIdle();
    expect(presenter.activeActivities.size).toBe(0);
  });

  it('leaves no activity behind after rapid start/stop taps', async () => {
    const { controller, presenter } = createControllerUnderTest();

    for (let tap = 0; tap < 5; tap += 1) {
      controller.notify({ type: 'sessionStarted', session: makeSession(`Session ${tap}`) });
      controller.notify({ type: 'sessionStopped' });
    }
    await controller.whenIdle();

    expect(presenter.activeActivities.size).toBe(0);
  });
});

// Requirement: experiments can swap the trigger policy without changing the controller.
describe('controller with a custom policy', () => {
  it('runs whatever commands the policy returns, in order', async () => {
    const startOnPausePolicy: LiveActivityTriggerPolicy = {
      id: 'start-on-pause',
      getCommandsForEvent: (event) =>
        event.type === 'sessionPaused'
          ? [
              { type: 'start', session: event.session },
              { type: 'update', session: event.session },
            ]
          : [],
    };
    const { controller, presenter } = createControllerUnderTest(startOnPausePolicy);
    const session = makeSession('Chapter 5');

    controller.notify({ type: 'sessionStarted', session });
    controller.notify({ type: 'sessionPaused', session: pauseSession(session, 1000) });
    await controller.whenIdle();

    expect(presenter.calls).toEqual(['endAll', 'start:Chapter 5', 'update:activity-1']);
  });

  it('tells the policy whether an activity is meant to be showing', () => {
    const immediatePolicy = createImmediateTriggerPolicy();
    const seenVisibility: boolean[] = [];
    const recordingPolicy: LiveActivityTriggerPolicy = {
      id: 'recording',
      getCommandsForEvent: (event, context) => {
        seenVisibility.push(context.isActivityShowing);
        return immediatePolicy.getCommandsForEvent(event, context);
      },
    };
    const { controller } = createControllerUnderTest(recordingPolicy);
    const session = makeSession('Chapter 5');

    controller.notify({ type: 'sessionStarted', session });
    controller.notify({ type: 'sessionPaused', session: pauseSession(session, 1000) });
    controller.notify({ type: 'sessionStopped' });
    controller.notify({ type: 'appBecameActive', session: null });

    expect(seenVisibility).toEqual([false, true, true, false]);
  });

  it('reports a throwing policy instead of crashing the timer', () => {
    const brokenPolicy: LiveActivityTriggerPolicy = {
      id: 'broken',
      getCommandsForEvent: () => {
        throw new Error('policy bug');
      },
    };
    const { controller, onError } = createControllerUnderTest(brokenPolicy);

    expect(() => controller.notify({ type: 'sessionStopped' })).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'broken policy');
  });
});

// Requirement: when the app is killed the activity persists, and the session restores on relaunch.
describe('controller restoreSession', () => {
  it('restores the newest surviving session and ends duplicates', async () => {
    const { controller, presenter } = createControllerUnderTest();
    const newest = makeSnapshot('newest', makeSession('newest', 5000));
    presenter.seedActivity(makeSnapshot('older', makeSession('older', 1000)));
    presenter.seedActivity(newest);

    await expect(controller.restoreSession()).resolves.toEqual(newest.session);
    expect([...presenter.activeActivities.keys()]).toEqual(['newest']);
  });

  it('treats the restored activity as showing, so a pause updates it in place', async () => {
    const { controller, presenter } = createControllerUnderTest();
    presenter.seedActivity(makeSnapshot('survivor'));

    const restoredSession = await controller.restoreSession();
    controller.notify({ type: 'sessionPaused', session: pauseSession(restoredSession!, 5000) });
    await controller.whenIdle();

    expect(presenter.calls).toContain('update:survivor');
    expect(presenter.calls.some((call) => call.startsWith('start:'))).toBe(false);
  });

  it('keeps the presentation variant the restored activity was started with', async () => {
    const { controller, presenter } = createControllerUnderTest();
    presenter.seedActivity(makeSnapshot('survivor', makeSession('survivor'), 'legacy-layout'));

    const restoredSession = await controller.restoreSession();
    controller.notify({ type: 'sessionPaused', session: pauseSession(restoredSession!, 5000) });
    await controller.whenIdle();

    expect(presenter.activeActivities.get('survivor')?.presentationVariant).toBe('legacy-layout');
  });

  it('restores a paused session as paused', async () => {
    const { controller, presenter } = createControllerUnderTest();
    presenter.seedActivity(makeSnapshot('survivor', pauseSession(makeSession('survivor'), 30_000)));

    const restoredSession = await controller.restoreSession();

    expect(restoredSession).not.toBeNull();
    expect(isSessionPaused(restoredSession!)).toBe(true);
  });

  it('returns null when nothing survived', async () => {
    const { controller } = createControllerUnderTest();

    await expect(controller.restoreSession()).resolves.toBeNull();
  });

  it('returns null when the user starts a session while the restore is running', async () => {
    const { controller, presenter } = createControllerUnderTest();
    presenter.seedActivity(makeSnapshot('survivor'));

    const restorePromise = controller.restoreSession();
    controller.notify({ type: 'sessionStarted', session: makeSession('New session', 9000) });

    await expect(restorePromise).resolves.toBeNull();
    await controller.whenIdle();
    expect([...presenter.activeActivities.values()].map((activity) => activity.session.name)).toEqual([
      'New session',
    ]);
  });
});
