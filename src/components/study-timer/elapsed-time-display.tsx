/**
 * Elapsed time display (View layer).
 * Shows a session's elapsed time in large HH:MM:SS digits, dimmed while paused. Presentational:
 * the text arrives preformatted from the study timer view model. Used by ActiveSessionCard.
 */
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** Props for ElapsedTimeDisplay. */
export type ElapsedTimeDisplayProps = {
  /** Elapsed time as HH:MM:SS. */
  formattedElapsedTime: string;
  /** Dims the digits and tells screen readers the timer is paused. */
  isPaused: boolean;
};

/**
 * Large elapsed-time digits.
 *
 * @param props - Formatted time and paused state.
 */
export function ElapsedTimeDisplay({ formattedElapsedTime, isPaused }: ElapsedTimeDisplayProps) {
  return (
    <ThemedText
      role="timer"
      accessibilityLabel={`Elapsed time ${formattedElapsedTime}${isPaused ? ', paused' : ''}`}
      themeColor={isPaused ? 'textSecondary' : 'text'}
      style={styles.digits}>
      {formattedElapsedTime}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  digits: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: 600,
    // Fixed-width digits stop the text from jiggling as it ticks.
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
