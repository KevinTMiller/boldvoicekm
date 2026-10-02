/**
 * Goal picker (View layer).
 * A native segmented control for choosing the session goal (25 / 50 / 90 min). It comes from
 * @expo/ui, which renders a SwiftUI segmented picker on iOS, Jetpack Compose on Android and a
 * JavaScript version on web. Used by NewSessionForm.
 */
import {
  SegmentedControl,
  type NativeSegmentedControlChangeEvent,
} from '@expo/ui/community/segmented-control';

import { useTheme } from '@/hooks/use-theme';

/** Props for GoalPicker. */
export type GoalPickerProps = {
  /** Goal presets to offer, in minutes, in display order. */
  goalOptionsMinutes: readonly number[];
  /** Currently selected goal, in minutes. */
  selectedGoalMinutes: number;
  /** Called with the tapped preset, in minutes. */
  onSelectGoalMinutes: (goalMinutes: number) => void;
};

/**
 * Segmented control listing the goal presets.
 *
 * @param props - Presets, current selection and selection handler.
 */
export function GoalPicker({
  goalOptionsMinutes,
  selectedGoalMinutes,
  onSelectGoalMinutes,
}: GoalPickerProps) {
  const theme = useTheme();

  /** Maps the tapped segment's index back to its preset. */
  function onChangeGoalSegment(event: NativeSegmentedControlChangeEvent) {
    const goalMinutes = goalOptionsMinutes[event.nativeEvent.selectedSegmentIndex];
    if (goalMinutes !== undefined) {
      onSelectGoalMinutes(goalMinutes);
    }
  }

  return (
    <SegmentedControl
      testID="goal-picker"
      values={goalOptionsMinutes.map(formatGoalOptionLabel)}
      selectedIndex={goalOptionsMinutes.indexOf(selectedGoalMinutes)}
      tintColor={theme.accent}
      onChange={onChangeGoalSegment}
    />
  );
}

/**
 * Formats a preset for its segment.
 *
 * @param goalMinutes - Preset in minutes.
 * @returns For example "25 min".
 */
function formatGoalOptionLabel(goalMinutes: number): string {
  return `${goalMinutes} min`;
}
