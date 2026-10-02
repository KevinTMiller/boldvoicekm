/**
 * Live Activity controller (Model layer).
 * The facade the study timer view model talks to. For each event it asks the strategy's trigger
 * policy what to do, tracks whether an activity is meant to be showing, and hands the resulting
 * commands to the command queue. In the other direction it relays Pause/Resume taps from the
 * activity the queue is tracking. Created once per launch by live-activity-context.tsx.
 */
import {
  createLiveActivityCommandQueue,
  type LiveActivityErrorReporter,
} from '@/features/live-activity/live-activity-command-queue';
import type {
  LiveActivityCommand,
  LiveActivityController,
  LiveActivityPolicyContext,
  LiveActivityStrategy,
  LiveActivityTriggerPolicy,
  StudySessionEvent,
} from '@/features/live-activity/live-activity.types';
import { selectSessionToRestore } from '@/features/study-timer/restore-session';

/** Dependencies of the Live Activity controller. */
export type LiveActivityControllerOptions = {
  /** The resolved policy, presenter and layout variant. */
  strategy: LiveActivityStrategy;
  /** Receives errors from the policy and presenter. Defaults to a console warning. */
  onError?: LiveActivityErrorReporter;
};

/**
 * Creates the Live Activity controller.
 *
 * @param options - Strategy and optional error reporter.
 * @returns The controller.
 */
export function createLiveActivityController({
  strategy,
  onError = warnAboutLiveActivityError,
}: LiveActivityControllerOptions): LiveActivityController {
  const queue = createLiveActivityCommandQueue({
    presenter: strategy.presenter,
    presentationVariant: strategy.presentationVariant,
    onError,
  });
  /** Whether a start (or restore) has been issued with no end since. See LiveActivityPolicyContext. */
  let isActivityShowing = false;
  /** Counts issued commands, so a restore can tell whether newer commands overtook it. */
  let issuedCommandCount = 0;

  return {
    notify(event) {
      const commands = getCommandsReportingErrors(strategy.policy, event, { isActivityShowing }, onError);
      for (const command of commands) {
        isActivityShowing = isActivityShowingAfter(command, isActivityShowing);
        issuedCommandCount += 1;
        void queue.enqueue(command);
      }
    },
    async restoreSession() {
      const issuedCommandCountAtRequest = issuedCommandCount;
      const restoredSnapshot = await queue.restore(selectSessionToRestore);
      // Commands issued while the restore ran (for example, the user started a new session) run
      // after it and replace whatever it adopted, so the restored session is already stale.
      if (restoredSnapshot === null || issuedCommandCount !== issuedCommandCountAtRequest) {
        return null;
      }
      isActivityShowing = true;
      return restoredSnapshot.session;
    },
    addPauseChangeListener(listener) {
      return strategy.presenter.addPauseChangeListener((change) => {
        // A tap can land on an activity the queue no longer tracks, such as one being ended
        // after Stop. Only the current session's activity may pause or resume it.
        if (change.activityId === queue.getTrackedActivityId()) {
          listener(change);
        }
      });
    },
    whenIdle: () => queue.whenIdle(),
  };
}

/**
 * Asks the policy for commands. A throwing policy (for example, a buggy experiment) produces no
 * commands instead of crashing the timer.
 *
 * @param policy - Active trigger policy.
 * @param event - What just happened.
 * @param context - Current intended activity state.
 * @param onError - Receives the error if the policy throws.
 * @returns The policy's commands, or none if it threw.
 */
function getCommandsReportingErrors(
  policy: LiveActivityTriggerPolicy,
  event: StudySessionEvent,
  context: LiveActivityPolicyContext,
  onError: LiveActivityErrorReporter
): LiveActivityCommand[] {
  try {
    return policy.getCommandsForEvent(event, context);
  } catch (error) {
    onError(error, `${policy.id} policy`);
    return [];
  }
}

/**
 * Works out whether an activity is meant to be showing after a command.
 *
 * @param command - Command being issued.
 * @param wasShowing - Whether an activity was meant to be showing before it.
 * @returns The intended state after the command.
 */
function isActivityShowingAfter(command: LiveActivityCommand, wasShowing: boolean): boolean {
  switch (command.type) {
    case 'start':
      return true;
    case 'end':
      return false;
    case 'update':
      return wasShowing;
  }
}

/**
 * Default error reporter. Live Activity failures (for example, the user disabled Live Activities
 * mid-session) must never break the timer, so they are only logged.
 *
 * @param error - The caught error.
 * @param taskDescription - Which task failed.
 */
function warnAboutLiveActivityError(error: unknown, taskDescription: string): void {
  console.warn(`[LiveActivity] ${taskDescription} failed`, error);
}
