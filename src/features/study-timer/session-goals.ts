/**
 * Session goal presets (Model layer).
 * The goal durations the new-session form offers. The chosen goal drives the progress bar in the
 * app and the progress bar and ring in the Live Activity. Used by the study timer view model.
 */

/** Goal presets offered in the new-session form, in minutes. */
export const SESSION_GOAL_OPTIONS_MINUTES: readonly number[] = [25, 50, 90];

/** Goal preselected when the new-session form opens, in minutes. */
export const DEFAULT_SESSION_GOAL_MINUTES = 25;

/**
 * Converts a goal from minutes to the seconds stored on a TimerSession.
 *
 * @param goalMinutes - Goal in minutes.
 * @returns Goal in seconds.
 */
export function convertGoalMinutesToSeconds(goalMinutes: number): number {
  return goalMinutes * 60;
}
