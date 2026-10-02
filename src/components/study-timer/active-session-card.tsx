/**
 * Active session card (View layer).
 * Shows the running or paused session: name, HH:MM:SS, goal progress, the Pause/Resume and Stop
 * controls, and "Start New Session". Presentational: values and handlers come from the study
 * timer view model via TimerScreen.
 */
import { StyleSheet } from 'react-native';

import { ElapsedTimeDisplay } from '@/components/study-timer/elapsed-time-display';
import { SessionProgressBar } from '@/components/study-timer/session-progress-bar';
import { TimerButton } from '@/components/study-timer/timer-button';
import { TimerControls } from '@/components/study-timer/timer-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Props for ActiveSessionCard. */
export type ActiveSessionCardProps = {
  /** Session name typed by the user. */
  sessionName: string;
  /** Elapsed time as HH:MM:SS. */
  formattedElapsedTime: string;
  /** Whether the timer is paused. */
  isPaused: boolean;
  /** Fraction of the goal completed, from 0 to 1. */
  goalProgress: number;
  /** Caption under the progress bar. */
  goalProgressLabel: string;
  /** "Pause" while running, "Resume" while paused. */
  pauseButtonLabel: 'Pause' | 'Resume';
  /** Shows "Start New Session"; false while the new-session form is already open. */
  isStartNewSessionVisible: boolean;
  /** Called when Pause/Resume is tapped. */
  onPressPauseOrResume: () => void;
  /** Called when Stop is tapped. */
  onPressStop: () => void;
  /** Called when "Start New Session" is tapped. */
  onPressStartNewSession: () => void;
};

/**
 * Card for the active session.
 *
 * @param props - Session values and handlers.
 */
export function ActiveSessionCard({
  sessionName,
  formattedElapsedTime,
  isPaused,
  goalProgress,
  goalProgressLabel,
  pauseButtonLabel,
  isStartNewSessionVisible,
  onPressPauseOrResume,
  onPressStop,
  onPressStartNewSession,
}: ActiveSessionCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText
        type="subtitle"
        accessibilityRole="header"
        numberOfLines={2}
        style={styles.sessionName}>
        {sessionName}
      </ThemedText>
      {isPaused && (
        <ThemedText type="smallBold" themeColor="textSecondary">
          Paused
        </ThemedText>
      )}
      <ElapsedTimeDisplay formattedElapsedTime={formattedElapsedTime} isPaused={isPaused} />
      <SessionProgressBar progress={goalProgress} label={goalProgressLabel} />
      <TimerControls
        pauseButtonLabel={pauseButtonLabel}
        onPressPauseOrResume={onPressPauseOrResume}
        onPressStop={onPressStop}
      />
      {isStartNewSessionVisible && (
        <TimerButton
          label="Start New Session"
          variant="secondary"
          onPress={onPressStartNewSession}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  sessionName: {
    textAlign: 'center',
  },
});
