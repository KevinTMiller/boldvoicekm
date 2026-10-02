/**
 * Goal slider modifiers, iOS (View layer).
 * SwiftUI modifiers that make VoiceOver announce the goal slider as "Goal, 45 minutes" rather than
 * as a percentage of its 0–7 position range. Kept in an .ios file because the SwiftUI modifiers
 * module loads the ExpoUI native module as soon as it is imported, which would crash web. Metro
 * picks this file on iOS and goal-slider-modifiers.ts everywhere else. Used by GoalSlider.
 */
import type { SliderProps } from '@expo/ui';
import { accessibilityLabel, accessibilityValue } from '@expo/ui/swift-ui/modifiers';

/**
 * Builds the slider's accessibility modifiers.
 *
 * @param goalMinutes - Selected goal, read out as the slider's value.
 * @returns Modifiers for the universal Slider's `modifiers` prop.
 */
export function getGoalSliderModifiers(goalMinutes: number): NonNullable<SliderProps['modifiers']> {
  return [accessibilityLabel('Goal'), accessibilityValue(`${goalMinutes} minutes`)];
}
