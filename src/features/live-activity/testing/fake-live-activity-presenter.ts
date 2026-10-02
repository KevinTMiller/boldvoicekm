/**
 * Fake Live Activity presenter (test support; not used by the app).
 * Behaves like ActivityKit in memory: it tracks which activities are on screen, so tests can
 * check that none are left behind. Starts can be held open to simulate iOS taking a while to
 * create an activity, and tapPauseButton simulates the widget's Pause/Resume button. Used by the
 * command queue, controller, view model and screen tests.
 */
import type {
  LiveActivityPauseChangeListener,
  LiveActivityPresenter,
  LiveActivitySnapshot,
} from '@/features/live-activity/live-activity.types';
import {
  isSessionPaused,
  pauseSession,
  resumeSession,
} from '@/features/study-timer/timer-state';

/** A LiveActivityPresenter with inspection and timing controls for tests. */
export type FakeLiveActivityPresenter = LiveActivityPresenter & {
  /** Activities currently on screen, keyed by activity id. */
  readonly activeActivities: Map<string, LiveActivitySnapshot>;
  /**
   * Every call made, in order, for example `['endAll', 'start:Chapter 5', 'end:activity-1']`.
   * Starts record the session name; update and end record the activity id.
   */
  readonly calls: string[];
  /** Makes later starts wait until releaseHeldStart is called. */
  holdStarts(): void;
  /** Resolves once at least one start is waiting to be released. */
  waitForHeldStart(): Promise<void>;
  /** Lets the oldest waiting start finish and create its activity. */
  releaseHeldStart(): void;
  /** Puts an activity on screen directly, as if it had survived an app kill. */
  seedActivity(snapshot: LiveActivitySnapshot): void;
  /**
   * Simulates the user tapping the activity's Pause button, or Resume while it is paused. Like the
   * real widget, it changes the activity first and then tells the listeners.
   *
   * @param activityId - Activity whose button is tapped. Unknown ids do nothing.
   * @param changedAtMs - When the tap happens, in epoch milliseconds.
   */
  tapPauseButton(activityId: string, changedAtMs: number): void;
};

/**
 * Creates a fake presenter. New activity ids count up from "activity-1".
 *
 * @returns The fake presenter, with nothing on screen.
 */
export function createFakeLiveActivityPresenter(): FakeLiveActivityPresenter {
  const activeActivities = new Map<string, LiveActivitySnapshot>();
  const calls: string[] = [];
  /** Release callbacks of starts that are waiting, oldest first. */
  const heldStartReleasers: (() => void)[] = [];
  /** Tests waiting for a start to be held. */
  const heldStartWaiters: (() => void)[] = [];
  /** Listeners registered through addPauseChangeListener and not yet removed. */
  const pauseChangeListeners = new Set<LiveActivityPauseChangeListener>();
  let shouldHoldStarts = false;
  let createdActivityCount = 0;

  /** Waits for releaseHeldStart, after telling any waiting test that a start is now held. */
  function waitForRelease(): Promise<void> {
    return new Promise((resolve) => {
      heldStartReleasers.push(resolve);
      for (const notifyWaiter of heldStartWaiters.splice(0)) {
        notifyWaiter();
      }
    });
  }

  return {
    id: 'fake',
    activeActivities,
    calls,
    isSupported: () => true,
    async start(session, presentationVariant) {
      calls.push(`start:${session.name}`);
      if (shouldHoldStarts) {
        await waitForRelease();
      }
      createdActivityCount += 1;
      const activityId = `activity-${createdActivityCount}`;
      activeActivities.set(activityId, { activityId, session, presentationVariant });
      return activityId;
    },
    async update(activityId, session) {
      calls.push(`update:${activityId}`);
      const activity = activeActivities.get(activityId);
      if (activity !== undefined) {
        activeActivities.set(activityId, { ...activity, session });
      }
    },
    async end(activityId) {
      calls.push(`end:${activityId}`);
      activeActivities.delete(activityId);
    },
    async endAll() {
      calls.push('endAll');
      activeActivities.clear();
    },
    async listActive() {
      calls.push('listActive');
      return [...activeActivities.values()];
    },
    addPauseChangeListener(listener) {
      pauseChangeListeners.add(listener);
      return { remove: () => pauseChangeListeners.delete(listener) };
    },
    tapPauseButton(activityId, changedAtMs) {
      const activity = activeActivities.get(activityId);
      if (activity === undefined) {
        return;
      }
      const isPaused = !isSessionPaused(activity.session);
      const session = isPaused
        ? pauseSession(activity.session, changedAtMs)
        : resumeSession(activity.session, changedAtMs);
      activeActivities.set(activityId, { ...activity, session });
      for (const listener of pauseChangeListeners) {
        listener({ activityId, isPaused, changedAtMs });
      }
    },
    holdStarts() {
      shouldHoldStarts = true;
    },
    waitForHeldStart() {
      if (heldStartReleasers.length > 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => heldStartWaiters.push(resolve));
    },
    releaseHeldStart() {
      heldStartReleasers.shift()?.();
    },
    seedActivity(snapshot) {
      activeActivities.set(snapshot.activityId, snapshot);
    },
  };
}
