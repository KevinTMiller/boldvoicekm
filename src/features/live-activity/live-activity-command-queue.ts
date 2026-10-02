/**
 * Live Activity command queue (Model layer).
 * Runs start/update/end commands, plus the restore step, one at a time in the order they were
 * issued, against any LiveActivityPresenter, so rapid taps can never leave a zombie activity. Used
 * by create-live-activity-controller.ts. Every strategy goes through this queue, so every strategy
 * gets the same protection.
 *
 * How zombies are prevented:
 * 1. Serialization: each task waits for the previous one, so an `end` can never overtake the
 *    `start` it is meant to undo.
 * 2. Generation guard: every start and end bumps a counter when it is issued. A start that has
 *    already been superseded when its turn comes is skipped. A start superseded while iOS is still
 *    creating the activity ends that activity as soon as it appears.
 * 3. Safety nets: a start first ends every existing activity, and an end also calls endAll.
 */
import type {
  LiveActivityCommand,
  LiveActivityPresenter,
  LiveActivitySnapshot,
} from '@/features/live-activity/live-activity.types';
import type { RestoreSelection } from '@/features/study-timer/restore-session';
import type { TimerSession } from '@/features/study-timer/timer-state';

/**
 * Receives errors the queue caught so they never reach the UI.
 *
 * @param error - The thrown value.
 * @param taskDescription - Which task failed, for example "start command".
 */
export type LiveActivityErrorReporter = (error: unknown, taskDescription: string) => void;

/** Chooses which surviving activity to adopt and which to end. */
export type RestoreSelector = (snapshots: LiveActivitySnapshot[]) => RestoreSelection;

/** Dependencies of the command queue. */
export type LiveActivityCommandQueueOptions = {
  /** Presenter that executes the commands. */
  presenter: LiveActivityPresenter;
  /** Layout variant passed to every new activity. */
  presentationVariant: string;
  /** Receives every caught error. */
  onError: LiveActivityErrorReporter;
};

/** An ordered queue of Live Activity work. None of its promises ever reject. */
export type LiveActivityCommandQueue = {
  /**
   * Schedules a command.
   *
   * @returns A promise that settles once the command, and everything queued before it, has run.
   */
  enqueue(command: LiveActivityCommand): Promise<void>;
  /**
   * Schedules a restore: lists surviving activities, ends the ones `selectActivityToRestore`
   * rejects, and starts tracking the one it keeps.
   *
   * @returns The adopted snapshot, or null if none survived or listing failed.
   */
  restore(selectActivityToRestore: RestoreSelector): Promise<LiveActivitySnapshot | null>;
  /**
   * Reports which activity `update` and `end` currently act on: the one the last start created or
   * the last restore adopted.
   *
   * @returns The tracked activity's id, or null when none is tracked (before any start finishes,
   *   and from the moment an end begins).
   */
  getTrackedActivityId(): string | null;
  /** Resolves once everything scheduled so far has run. */
  whenIdle(): Promise<void>;
};

/**
 * Creates a command queue bound to one presenter.
 *
 * @param options - Presenter, layout variant and error reporter.
 * @returns The queue.
 */
export function createLiveActivityCommandQueue(
  options: LiveActivityCommandQueueOptions
): LiveActivityCommandQueue {
  const { presenter, presentationVariant, onError } = options;
  /** End of the task chain; the next task starts when it settles. Never rejects. */
  let lastScheduledTask: Promise<unknown> = Promise.resolve();
  /** The activity that update and end act on, or null when none is tracked. */
  let currentActivityId: string | null = null;
  /** Bumped by every start and end when issued, so a start can tell it was superseded. */
  let latestGeneration = 0;

  /**
   * Appends a task to the chain and converts its failure into a reported fallback value.
   *
   * @param task - Work to run once everything before it has settled.
   * @param fallbackValue - Value to resolve with if the task throws.
   * @param taskDescription - Name passed to the error reporter.
   * @returns The task's result, or `fallbackValue` on failure.
   */
  function schedule<T>(task: () => Promise<T>, fallbackValue: T, taskDescription: string): Promise<T> {
    const scheduledTask = lastScheduledTask.then(task).catch((error: unknown) => {
      onError(error, taskDescription);
      return fallbackValue;
    });
    lastScheduledTask = scheduledTask;
    return scheduledTask;
  }

  /**
   * Shows a new activity unless a newer start or end has superseded this one.
   *
   * @param session - Session to show.
   * @param generation - Generation this start was issued in.
   */
  async function runStart(session: TimerSession, generation: number): Promise<void> {
    // Superseded before its turn: showing it now would only flash it on screen.
    if (generation !== latestGeneration) {
      return;
    }
    // Clear anything already showing so exactly one activity remains.
    currentActivityId = null;
    await presenter.endAll();
    const activityId = await presenter.start(session, presentationVariant);
    if (activityId === null) {
      return;
    }
    if (generation !== latestGeneration) {
      // Superseded while iOS was creating the activity: end it now so it cannot linger.
      await presenter.end(activityId);
      return;
    }
    currentActivityId = activityId;
  }

  /**
   * Pushes the session's latest state to the tracked activity, if any.
   *
   * @param session - Session whose state to show.
   */
  async function runUpdate(session: TimerSession): Promise<void> {
    if (currentActivityId === null) {
      return;
    }
    await presenter.update(currentActivityId, session);
  }

  /** Ends the tracked activity, then every other activity the presenter owns. */
  async function runEnd(): Promise<void> {
    const activityId = currentActivityId;
    currentActivityId = null;
    try {
      if (activityId !== null) {
        await presenter.end(activityId);
      }
    } finally {
      // Safety net: also ends activities the queue lost track of, for example one whose start
      // promise rejected after iOS had already created it.
      await presenter.endAll();
    }
  }

  /**
   * Runs one command.
   *
   * @param command - Command to run.
   * @param generation - Generation the command was issued in.
   */
  function runCommand(command: LiveActivityCommand, generation: number): Promise<void> {
    switch (command.type) {
      case 'start':
        return runStart(command.session, generation);
      case 'update':
        return runUpdate(command.session);
      case 'end':
        return runEnd();
    }
  }

  /**
   * Adopts the activity the selector keeps and ends the rest.
   *
   * @param selectActivityToRestore - Chooses which activity to keep.
   * @returns The adopted snapshot, or null.
   */
  async function runRestore(
    selectActivityToRestore: RestoreSelector
  ): Promise<LiveActivitySnapshot | null> {
    const snapshots = await presenter.listActive();
    const { snapshotToRestore, activityIdsToEnd } = selectActivityToRestore(snapshots);
    for (const activityId of activityIdsToEnd) {
      await endActivityReportingErrors(activityId);
    }
    if (snapshotToRestore !== null) {
      currentActivityId = snapshotToRestore.activityId;
    }
    return snapshotToRestore;
  }

  /**
   * Ends one activity, reporting a failure instead of throwing, so one stubborn duplicate cannot
   * stop the rest from being cleaned up.
   *
   * @param activityId - Activity to end.
   */
  async function endActivityReportingErrors(activityId: string): Promise<void> {
    try {
      await presenter.end(activityId);
    } catch (error) {
      onError(error, `end duplicate activity ${activityId}`);
    }
  }

  return {
    enqueue(command) {
      // Bump when issued, not when run, so starts already waiting in the queue can tell they
      // were superseded.
      if (command.type !== 'update') {
        latestGeneration += 1;
      }
      const generation = latestGeneration;
      return schedule(() => runCommand(command, generation), undefined, `${command.type} command`);
    },
    restore(selectActivityToRestore) {
      return schedule(() => runRestore(selectActivityToRestore), null, 'restore');
    },
    getTrackedActivityId: () => currentActivityId,
    async whenIdle() {
      await lastScheduledTask;
    },
  };
}
