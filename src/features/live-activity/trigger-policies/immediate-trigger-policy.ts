/**
 * Immediate trigger policy (Model layer, swappable strategy).
 * The default answer to "when should the Live Activity show?": as soon as a session starts, kept in
 * sync on pause and resume, and removed when the session stops. Registered under the id
 * 'immediate' in live-activity-registry.ts. Pure: it only maps events to commands.
 */
import type {
  LiveActivityCommand,
  LiveActivityPolicyContext,
  LiveActivityTriggerPolicy,
  StudySessionEvent,
} from '@/features/live-activity/live-activity.types';

/** Registry id of the immediate trigger policy. */
export const IMMEDIATE_TRIGGER_POLICY_ID = 'immediate';

/**
 * Creates the immediate trigger policy.
 *
 * @returns A policy that shows the activity for the whole life of a session.
 */
export function createImmediateTriggerPolicy(): LiveActivityTriggerPolicy {
  return {
    id: IMMEDIATE_TRIGGER_POLICY_ID,
    getCommandsForEvent: getImmediateCommandsForEvent,
  };
}

/**
 * Maps an event to commands under the immediate policy.
 * - Session started: start. The command queue replaces any activity already showing.
 * - Paused or resumed: update, if an activity is meant to be showing.
 * - Stopped: end, always, so leftovers are cleaned up even if the app lost track of them.
 * - App became active: update, to re-sync anything missed while backgrounded.
 * - App moved to background: update, so a session that just finished is pushed before iOS suspends
 *   the app. The widget keeps ticking on its own until that update; the update is what switches it
 *   to "Finished!".
 *
 * @param event - What just happened.
 * @param context - Whether an activity is meant to be showing.
 * @returns Commands to run, in order.
 */
function getImmediateCommandsForEvent(
  event: StudySessionEvent,
  context: LiveActivityPolicyContext
): LiveActivityCommand[] {
  switch (event.type) {
    case 'sessionStarted':
      return [{ type: 'start', session: event.session }];
    case 'sessionPaused':
    case 'sessionResumed':
      return context.isActivityShowing ? [{ type: 'update', session: event.session }] : [];
    case 'sessionStopped':
      return [{ type: 'end' }];
    case 'appBecameActive':
      return event.session !== null && context.isActivityShowing
        ? [{ type: 'update', session: event.session }]
        : [];
    case 'appMovedToBackground':
      return event.session !== null && context.isActivityShowing
        ? [{ type: 'update', session: event.session }]
        : [];
  }
}
