/**
 * Fake Live Activity presenter (test support; not used by the app).
 * Behaves like ActivityKit in memory: it tracks which activities are on screen, so tests can
 * check that none are left behind. Starts can be held open to simulate iOS taking a while to
 * create an activity. Used by the command queue, controller and view model tests.
 */
import type {
  LiveActivityPresenter,
  LiveActivitySnapshot,
} from '@/features/live-activity/live-activity.types';

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
