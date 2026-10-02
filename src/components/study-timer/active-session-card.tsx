/**
 * Active session card (View layer).
 * Shows the running or paused session after the design reference: a progress ring holding the
 * task emoji, the HH:MM:SS time, the session title below it and a Pause/Resume button, with Stop
 * underneath. Once the goal is complete the time becomes "Finished!", Pause becomes Restart, and
 * Stop becomes Start a new session. The ring alone shows goal progress; there is no percentage
 * text. While paused, the ring and digits dim and the button turns into Resume. Presentational:
 * values and handlers come from the study timer view model via TimerScreen.
 */
import { StyleSheet, Text, View } from 'react-native';

import { ElapsedTimeDisplay } from '@/components/study-timer/elapsed-time-display';
import { PauseResumeButton } from '@/components/study-timer/pause-resume-button';
import { ProgressRing } from '@/components/study-timer/progress-ring';
import { TimerButton } from '@/components/study-timer/timer-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { RingButtonAction } from '@/features/study-timer/build-study-timer-view-model';

/** Ring diameter, in points. Fits the narrowest phones (375 pt) inside the screen and card padding. */
const RING_DIAMETER = 260;

/** Ring thickness, in points. */
const RING_THICKNESS = 22;

/** Props for ActiveSessionCard. */
export type ActiveSessionCardProps = {
  /** Task emoji shown at the top of the ring. */
  sessionEmoji: string;
  /** Session title typed by the user, shown under the time. */
  sessionName: string;
  /** Elapsed time as HH:MM:SS. Hidden while finished. */
  formattedElapsedTime: string;
  /** Whether the timer is paused. Ignored while finished. */
  isPaused: boolean;
  /** Shows "Finished!" and swaps the buttons for Restart and Start a new session. */
  isFinished: boolean;
  /** Fraction of the goal completed, from 0 to 1. Fills the ring. */
  goalProgress: number;
  /** Pause, resume, or restart once the goal is complete. */
  ringButtonAction: RingButtonAction;
  /** "Stop", or "Start a new session" once the goal is complete. */
  sessionActionLabel: 'Stop' | 'Start a new session';
  /** Called when the ring button is tapped. */
  onPressPauseOrResume: () => void;
  /**
   * Called when the button under the ring is tapped. Before the goal, the view model asks for
   * confirmation. Once finished, it ends the session and returns to the form.
   */
  onPressStop: () => void;
};

/**
 * Card for the active session.
 *
 * @param props - Session values and handlers.
 */
export function ActiveSessionCard({
  sessionEmoji,
  sessionName,
  formattedElapsedTime,
  isPaused,
  isFinished,
  goalProgress,
  ringButtonAction,
  sessionActionLabel,
  onPressPauseOrResume,
  onPressStop,
}: ActiveSessionCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.ring}>
        <ProgressRing
          progress={goalProgress}
          diameter={RING_DIAMETER}
          thickness={RING_THICKNESS}
          isDimmed={isPaused && !isFinished}
          isFinished={isFinished}
        />
        <View style={styles.ringContent}>
          <Text style={styles.emoji}>{sessionEmoji}</Text>
          <ElapsedTimeDisplay
            formattedElapsedTime={formattedElapsedTime}
            isPaused={isPaused}
            isFinished={isFinished}
          />
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            accessibilityRole="header"
            numberOfLines={2}
            style={styles.sessionName}>
            {sessionName}
          </ThemedText>
          <PauseResumeButton action={ringButtonAction} onPress={onPressPauseOrResume} />
        </View>
      </View>
      <View style={styles.actions}>
        <TimerButton
          label={sessionActionLabel}
          variant={isFinished ? 'primary' : 'destructive'}
          onPress={onPressStop}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  ring: {
    width: RING_DIAMETER,
    height: RING_DIAMETER,
  },
  ringContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    // Keeps the title clear of the ring; the opening is RING_DIAMETER - 2 * RING_THICKNESS wide.
    paddingHorizontal: RING_THICKNESS + Spacing.three,
  },
  emoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  sessionName: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
});
