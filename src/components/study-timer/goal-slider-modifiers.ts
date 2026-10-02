/**
 * Goal slider modifiers, Android and web (View layer).
 * The iOS version, goal-slider-modifiers.ios.ts, adds SwiftUI accessibility modifiers. The other
 * platforms keep their slider's default accessibility, so this version adds nothing. It also
 * gives TypeScript the shared signature. Used by GoalSlider.
 */
import type { SliderProps } from '@expo/ui';

/**
 * Builds the slider's platform modifiers; none are needed off iOS.
 *
 * @param _goalMinutes - Selected goal; unused here.
 * @returns An empty list.
 */
export function getGoalSliderModifiers(_goalMinutes: number): NonNullable<SliderProps['modifiers']> {
  return [];
}
