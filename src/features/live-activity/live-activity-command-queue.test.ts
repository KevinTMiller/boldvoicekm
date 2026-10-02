/**
 * Tests for the Live Activity command queue (Model layer): ordering, zombie prevention, error
 * handling and restore. Uses the in-memory fake presenter, which tracks what is on screen.
 */
import { createLiveActivityCommandQueue } from '@/features/live-activity/live-activity-command-queue';
import type { LiveActivitySnapshot } from '@/features/live-activity/live-activity.types';
import {
  createFakeLiveActivityPresenter,
  type FakeLiveActivityPresenter,
} from '@/features/live-activity/testing/fake-live-activity-presenter';
import { selectSessionToRestore } from '@/features/study-timer/restore-session';
import { pauseSession, startSession, type TimerSession } from '@/features/study-timer/timer-state';

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
 * Creates a queue on a fresh fake presenter with a mock error reporter.
 *
 * @returns The queue, the presenter and the error reporter.
 */
function createQueueUnderTest() {
  const presenter: FakeLiveActivityPresenter = createFakeLiveActivityPresenter();
  const onError = jest.fn();
  const queue = createLiveActivityCommandQueue({ presenter, presentationVariant: 'default', onError });
  return { queue, presenter, onError };
}

// Requirement: the activity appears on start, reflects pause/resume, and disappears on stop.
describe('command queue basics', () => {
  it('shows an activity on start with the configured variant', async () => {
    const { queue, presenter } = createQueueUnderTest();

    await queue.enqueue({ type: 'start', session: makeSession('Chapter 5') });

    expect([...presenter.activeActivities.values()]).toEqual([
      expect.objectContaining({ activityId: 'activity-1', presentationVariant: 'default' }),
    ]);
  });

  it('updates the tracked activity', async () => {
    const { queue, presenter } = createQueueUnderTest();
    const session = makeSession('Chapter 5');
    const pausedSession = pauseSession(session, 5000);

    void queue.enqueue({ type: 'start', session });
    await queue.enqueue({ type: 'update', session: pausedSession });

    expect(presenter.calls).toContain('update:activity-1');
    expect(presenter.activeActivities.get('activity-1')?.session).toBe(pausedSession);
  });

  it('ignores updates when no activity is tracked', async () => {
    const { queue, presenter } = createQueueUnderTest();

    await queue.enqueue({ type: 'update', session: makeSession('Chapter 5') });

    expect(presenter.calls).toEqual([]);
  });

  it('removes the activity on end', async () => {
    const { queue, presenter } = createQueueUnderTest();

    await queue.enqueue({ type: 'start', session: makeSession('Chapter 5') });
    await queue.enqueue({ type: 'end' });

    expect(presenter.activeActivities.size).toBe(0);
    expect(presenter.calls).toContain('end:activity-1');
  });

  it('runs each command only after the previous one has finished', async () => {
    const { queue, presenter } = createQueueUnderTest();
    const session = makeSession('Chapter 5');
    presenter.holdStarts();

    void queue.enqueue({ type: 'start', session });
    void queue.enqueue({ type: 'update', session: pauseSession(session, 1000) });
    await presenter.waitForHeldStart();
    // The update was issued already, but must wait for the slow start to finish.
    expect(presenter.calls).toEqual(['endAll', 'start:Chapter 5']);

    presenter.releaseHeldStart();
    await queue.whenIdle();
    expect(presenter.calls).toEqual(['endAll', 'start:Chapter 5', 'update:activity-1']);
  });
});

// Requirement: rapid start/stop never leaves a zombie activity.
describe('command queue zombie prevention', () => {
  it('leaves nothing on screen after rapid start/stop taps', async () => {
    const { queue, presenter } = createQueueUnderTest();

    for (let tap = 0; tap < 5; tap += 1) {
      void queue.enqueue({ type: 'start', session: makeSession(`Session ${tap}`) });
      void queue.enqueue({ type: 'end' });
    }
    await queue.whenIdle();

    expect(presenter.activeActivities.size).toBe(0);
    // Every start was superseded before its turn, so none of them reached the presenter.
    expect(presenter.calls.some((call) => call.startsWith('start:'))).toBe(false);
  });

  it('ends a slow start that is stopped while iOS is still creating it', async () => {
    const { queue, presenter } = createQueueUnderTest();
    presenter.holdStarts();

    void queue.enqueue({ type: 'start', session: makeSession('Chapter 5') });
    await presenter.waitForHeldStart();
    void queue.enqueue({ type: 'end' });
    presenter.releaseHeldStart();
    await queue.whenIdle();

    expect(presenter.activeActivities.size).toBe(0);
    expect(presenter.calls).toContain('end:activity-1');
  });

  it('leaves exactly the newest activity when starts arrive back to back', async () => {
    const { queue, presenter } = createQueueUnderTest();

    void queue.enqueue({ type: 'start', session: makeSession('First') });
    void queue.enqueue({ type: 'start', session: makeSession('Second') });
    await queue.whenIdle();

    expect([...presenter.activeActivities.values()].map((activity) => activity.session.name)).toEqual([
      'Second',
    ]);
  });

  it('replaces an activity that is already showing when a new session starts', async () => {
    const { queue, presenter } = createQueueUnderTest();

    await queue.enqueue({ type: 'start', session: makeSession('First') });
    await queue.enqueue({ type: 'start', session: makeSession('Second') });

    expect([...presenter.activeActivities.values()].map((activity) => activity.session.name)).toEqual([
      'Second',
    ]);
  });

  it('cleans up activities it lost track of when ending', async () => {
    const { queue, presenter } = createQueueUnderTest();
    presenter.seedActivity({
      activityId: 'orphan',
      session: makeSession('Orphan'),
      presentationVariant: 'default',
    });

    await queue.enqueue({ type: 'end' });

    expect(presenter.activeActivities.size).toBe(0);
  });
});

// Requirement: Live Activity failures are reported, never thrown, and never block later commands.
describe('command queue error handling', () => {
  it('reports a failed start and still runs the next command', async () => {
    const { queue, presenter, onError } = createQueueUnderTest();
    const startError = new Error('Live Activities disabled');
    jest.spyOn(presenter, 'start').mockRejectedValueOnce(startError);

    await expect(
      queue.enqueue({ type: 'start', session: makeSession('Chapter 5') })
    ).resolves.toBeUndefined();
    await queue.enqueue({ type: 'start', session: makeSession('Chapter 6') });

    expect(onError).toHaveBeenCalledWith(startError, 'start command');
    expect(presenter.activeActivities.size).toBe(1);
  });

  it('still ends everything when ending the tracked activity fails', async () => {
    const { queue, presenter, onError } = createQueueUnderTest();
    await queue.enqueue({ type: 'start', session: makeSession('Chapter 5') });
    jest.spyOn(presenter, 'end').mockRejectedValueOnce(new Error('end failed'));

    await queue.enqueue({ type: 'end' });

    expect(presenter.calls.at(-1)).toBe('endAll');
    expect(presenter.activeActivities.size).toBe(0);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'end command');
  });
});

// Requirement: after an app kill, the newest surviving activity is adopted and duplicates are ended.
describe('command queue restore', () => {
  /**
   * Builds a surviving activity snapshot.
   *
   * @param activityId - Activity id.
   * @param startedAtMs - When its session started.
   * @returns The snapshot.
   */
  function makeSnapshot(activityId: string, startedAtMs: number): LiveActivitySnapshot {
    return {
      activityId,
      session: makeSession(activityId, startedAtMs),
      presentationVariant: 'default',
    };
  }

  it('adopts the newest activity and ends the others', async () => {
    const { queue, presenter } = createQueueUnderTest();
    presenter.seedActivity(makeSnapshot('older', 1000));
    presenter.seedActivity(makeSnapshot('newest', 5000));
    presenter.seedActivity(makeSnapshot('oldest', 0));

    const restored = await queue.restore(selectSessionToRestore);

    expect(restored?.activityId).toBe('newest');
    expect([...presenter.activeActivities.keys()]).toEqual(['newest']);
  });

  it('sends later updates to the adopted activity', async () => {
    const { queue, presenter } = createQueueUnderTest();
    presenter.seedActivity(makeSnapshot('survivor', 1000));

    await queue.restore(selectSessionToRestore);
    await queue.enqueue({ type: 'update', session: makeSession('survivor', 1000) });

    expect(presenter.calls).toContain('update:survivor');
  });

  it('resolves null when nothing survived', async () => {
    const { queue } = createQueueUnderTest();

    await expect(queue.restore(selectSessionToRestore)).resolves.toBeNull();
  });

  it('resolves null and reports the error when listing fails', async () => {
    const { queue, presenter, onError } = createQueueUnderTest();
    jest.spyOn(presenter, 'listActive').mockRejectedValueOnce(new Error('list failed'));

    await expect(queue.restore(selectSessionToRestore)).resolves.toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'restore');
  });

  it('keeps ending duplicates when one of them fails to end', async () => {
    const { queue, presenter, onError } = createQueueUnderTest();
    presenter.seedActivity(makeSnapshot('stubborn', 0));
    presenter.seedActivity(makeSnapshot('duplicate', 1000));
    presenter.seedActivity(makeSnapshot('newest', 5000));
    jest.spyOn(presenter, 'end').mockRejectedValueOnce(new Error('end failed'));

    const restored = await queue.restore(selectSessionToRestore);

    expect(restored?.activityId).toBe('newest');
    expect(presenter.activeActivities.has('duplicate')).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'end duplicate activity stubborn');
  });

  it('tracks the adopted activity', async () => {
    const { queue, presenter } = createQueueUnderTest();
    presenter.seedActivity(makeSnapshot('survivor', 1000));

    await queue.restore(selectSessionToRestore);

    expect(queue.getTrackedActivityId()).toBe('survivor');
  });
});

// Requirement: the controller can tell which activity belongs to the current session, so only
// that activity's Pause/Resume button changes the session.
describe('command queue tracked activity', () => {
  it('tracks nothing before any start has finished', () => {
    const { queue } = createQueueUnderTest();

    expect(queue.getTrackedActivityId()).toBeNull();
  });

  it('tracks the activity a start created, until an end', async () => {
    const { queue } = createQueueUnderTest();

    await queue.enqueue({ type: 'start', session: makeSession('Chapter 5') });
    expect(queue.getTrackedActivityId()).toBe('activity-1');

    await queue.enqueue({ type: 'end' });
    expect(queue.getTrackedActivityId()).toBeNull();
  });
});
