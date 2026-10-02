/**
 * Session goal presets (Model layer).
 * The goal durations offered by the new-session form's stepped slider, and the mapping between
 * slider positions and goals. The chosen goal drives the progress ring in the app and in the Live
 * Activity. Used by the study timer view model and the GoalSlider component.
 */

/**
 * Goal presets offered in the new-session form, in minutes, shortest first. The slider gives every
 * option one equal step, so 1 → 15 is as far apart on the track as 60 → 75. The 1 minute stop is
 * for trying a session quickly; the form still opens on 15.
 */
export const SESSION_GOAL_OPTIONS_MINUTES: readonly number[] = [1, 15, 20, 25, 30, 45, 60, 75, 90];

/** Goal preselected when the new-session form opens, in minutes. */
export const DEFAULT_SESSION_GOAL_MINUTES = 15;

/**
 * Converts a goal from minutes to the seconds stored on a TimerSession.
 *
 * @param goalMinutes - Goal in minutes.
 * @returns Goal in seconds.
 */
export function convertGoalMinutesToSeconds(goalMinutes: number): number {
  return goalMinutes * 60;
}

/**
 * Finds the slider position for a goal. Positions are option indexes rather than minutes, which
 * is what spaces the options evenly instead of in proportion to their durations.
 *
 * @param goalOptionsMinutes - Goal options, shortest first.
 * @param goalMinutes - Goal to locate.
 * @returns The goal's index; for a goal that is not an option, the index of the closest option
 *   (ties go to the shorter goal). Returns 0 for an empty list.
 */
export function getGoalSliderPosition(
  goalOptionsMinutes: readonly number[],
  goalMinutes: number
): number {
  let closestPosition = 0;
  goalOptionsMinutes.forEach((optionMinutes, position) => {
    const distance = Math.abs(optionMinutes - goalMinutes);
    if (distance < Math.abs(goalOptionsMinutes[closestPosition] - goalMinutes)) {
      closestPosition = position;
    }
  });
  return closestPosition;
}

/**
 * Converts a slider position back into a goal.
 *
 * @param goalOptionsMinutes - Goal options, shortest first. Must not be empty.
 * @param sliderPosition - Position reported by the slider. Fractional positions round to the
 *   nearest step (not every platform snaps while dragging), out-of-range positions clamp to the
 *   ends, and a non-finite position reads as the first option.
 * @returns The goal at that position, in minutes.
 */
export function getGoalMinutesAtSliderPosition(
  goalOptionsMinutes: readonly number[],
  sliderPosition: number
): number {
  const roundedPosition = Number.isFinite(sliderPosition) ? Math.round(sliderPosition) : 0;
  const lastPosition = goalOptionsMinutes.length - 1;
  return goalOptionsMinutes[Math.min(lastPosition, Math.max(0, roundedPosition))];
}
