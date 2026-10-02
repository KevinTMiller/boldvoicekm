/**
 * Timer controls (View layer).
 * The [Pause/Resume] [Stop] button row for an active session. Presentational: the label and
 * handlers come from the study timer view model. Used by ActiveSessionCard.
 */
import { StyleSheet, View } from 'react-native';

import { TimerButton } from '@/components/study-timer/timer-button';
import { Spacing } from '@/constants/theme';

/** Props for TimerControls. */
export type TimerControlsProps = {
  /** Label of the toggle: "Pause" while running, "Resume" while paused. */
  pauseButtonLabel: 'Pause' | 'Resume';
  /** Called when the Pause/Resume toggle is tapped. */
  onPressPauseOrResume: () => void;
  /** Called when Stop is tapped. */
  onPressStop: () => void;
};

/**
 * Pause/Resume and Stop buttons side by side.
 *
 * @param props - Toggle label and press handlers.
 */
export function TimerControls({
  pauseButtonLabel,
  onPressPauseOrResume,
  onPressStop,
}: TimerControlsProps) {
  return (
    <View style={styles.row}>
      <TimerButton label={pauseButtonLabel} variant="primary" onPress={onPressPauseOrResume} />
      <TimerButton label="Stop" variant="destructive" onPress={onPressStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
