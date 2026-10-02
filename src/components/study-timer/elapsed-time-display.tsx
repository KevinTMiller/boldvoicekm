/**
 * Elapsed time display (View layer).
 * Shows a session's elapsed time in large, monospaced HH:MM:SS digits sized to fit inside the progress
 * ring, dimmed while paused. Once the goal is complete it shows "Finished!" instead of a time that
 * would keep growing. Presentational: the text arrives preformatted from the study timer view
 * model. Used by ActiveSessionCard.
 */
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

/** Props for ElapsedTimeDisplay. */
export type ElapsedTimeDisplayProps = {
  /** Elapsed time as HH:MM:SS. Unused while finished. */
  formattedElapsedTime: string;
  /** Dims the digits and tells screen readers the timer is paused. Ignored while finished. */
  isPaused: boolean;
  /** Shows "Finished!" instead of the elapsed time. */
  isFinished: boolean;
};

/** Shown in place of the clock once the goal is complete. */
const FINISHED_LABEL = 'Finished!';

/**
 * Large elapsed-time digits, or "Finished!" once the goal is complete. The type size starts at the
 * preferred size and shrinks, down to MINIMUM_FONT_SCALE, so the line stays inside the ring. The
 * parent must give this a width; ActiveSessionCard does, by insetting the ring's contents from
 * the stroke.
 *
 * @param props - Formatted time, paused state and finished state.
 */
export function ElapsedTimeDisplay({
  formattedElapsedTime,
  isPaused,
  isFinished,
}: ElapsedTimeDisplayProps) {
  const label = isFinished ? FINISHED_LABEL : formattedElapsedTime;
  return (
    <ThemedText
      role={isFinished ? undefined : 'timer'}
      accessibilityLabel={
        isFinished ? FINISHED_LABEL : `Elapsed time ${formattedElapsedTime}${isPaused ? ', paused' : ''}`
      }
      themeColor={!isFinished && isPaused ? 'textSecondary' : 'text'}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={MINIMUM_FONT_SCALE}
      style={styles.digits}>
      {label}
    </ThemedText>
  );
}

/** Smallest the digits may get, as a fraction of the preferred size. */
const MINIMUM_FONT_SCALE = 0.5;

const styles = StyleSheet.create({
  digits: {
    // Takes the width the ring leaves. That bound is what adjustsFontSizeToFit scales against.
    alignSelf: 'stretch',
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 600,
    fontFamily: Fonts.mono,
    // Tabular digits as well, so a fallback that is not fully monospaced still holds its width.
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
