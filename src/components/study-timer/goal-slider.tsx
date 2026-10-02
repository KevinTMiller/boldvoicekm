/**
 * Goal slider (View layer).
 * A stepped slider for choosing the session goal from a fixed list of options. Each option takes
 * one step, so the stops are evenly spaced even though the minutes between them are not (1, 15, 20,
 * 25, 30, 45, 60, 75, 90). The slider works in step positions (0 to options.length - 1), and
 * session-goals.ts converts between positions and minutes. Uses the universal @expo/ui Slider:
 * SwiftUI on iOS, Jetpack Compose on Android, a range input on web. Presentational: the options,
 * value and handler come from the study timer view model via NewSessionForm.
 */
import { Host, Slider } from '@expo/ui';
import { StyleSheet, View } from 'react-native';

import { getGoalSliderModifiers } from '@/components/study-timer/goal-slider-modifiers';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  getGoalMinutesAtSliderPosition,
  getGoalSliderPosition,
} from '@/features/study-timer/session-goals';
import { useTheme } from '@/hooks/use-theme';

/** Props for GoalSlider. */
export type GoalSliderProps = {
  /** Goal choices in minutes, shortest first. Each one is a slider stop. */
  goalOptionsMinutes: readonly number[];
  /** Selected goal, in minutes. */
  goalMinutes: number;
  /** Called with the goal, in minutes, at the stop the user moved to. */
  onChangeGoalMinutes: (goalMinutes: number) => void;
};

/**
 * Goal label, selected value, and the stepped slider.
 *
 * @param props - Options, selected goal and change handler.
 */
export function GoalSlider({
  goalOptionsMinutes,
  goalMinutes,
  onChangeGoalMinutes,
}: GoalSliderProps) {
  const theme = useTheme();

  /**
   * Converts the slider's step position into minutes for the view model.
   *
   * @param sliderPosition - Step position from the slider. Platforms may report fractions.
   */
  function onChangeSliderPosition(sliderPosition: number) {
    onChangeGoalMinutes(getGoalMinutesAtSliderPosition(goalOptionsMinutes, sliderPosition));
  }

  return (
    <View style={styles.field}>
      <View style={styles.header}>
        <ThemedText type="smallBold">Goal</ThemedText>
        <ThemedText type="smallBold" themeColor="accent">
          {goalMinutes} min
        </ThemedText>
      </View>
      {/* seedColor tints the SwiftUI slider on iOS and themes it on Android and web. */}
      <Host matchContents={{ vertical: true }} seedColor={theme.accent} style={styles.sliderHost}>
        <Slider
          value={getGoalSliderPosition(goalOptionsMinutes, goalMinutes)}
          onValueChange={onChangeSliderPosition}
          min={0}
          max={Math.max(0, goalOptionsMinutes.length - 1)}
          step={1}
          testID="goal-slider"
          modifiers={getGoalSliderModifiers(goalMinutes)}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  // The web Host shrinks to its content when matchContents is set; stretching keeps it full width.
  sliderHost: {
    alignSelf: 'stretch',
  },
});
