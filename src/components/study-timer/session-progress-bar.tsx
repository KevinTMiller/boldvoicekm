/**
 * Session progress bar (View layer).
 * A horizontal bar filling toward the session goal, with a caption such as "40% of 25 min goal".
 * Presentational: progress and caption come from the study timer view model. Used by
 * ActiveSessionCard.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Props for SessionProgressBar. */
export type SessionProgressBarProps = {
  /** Fraction of the goal completed, from 0 to 1. */
  progress: number;
  /** Caption under the bar, for example "40% of 25 min goal". */
  label: string;
};

/**
 * Goal progress bar with a caption.
 *
 * @param props - Progress fraction and caption.
 */
export function SessionProgressBar({ progress, label }: SessionProgressBarProps) {
  const theme = useTheme();
  const percent = convertProgressToPercent(progress);
  return (
    <View style={styles.container}>
      <View
        // A View is only exposed to screen readers as one element when it is marked accessible.
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Goal progress"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={[styles.track, { backgroundColor: theme.progressTrack }]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${percent}%` }]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Converts a progress fraction to a whole percentage.
 *
 * @param progress - Fraction, expected from 0 to 1.
 * @returns Whole percent from 0 to 100, rounded down to match the caption.
 */
function convertProgressToPercent(progress: number): number {
  return Math.min(100, Math.max(0, Math.floor(progress * 100)));
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    alignSelf: 'stretch',
    height: Spacing.two,
    borderRadius: Spacing.one,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Spacing.one,
  },
});
