/**
 * Timer screen (View layer, route "/").
 * Lays out the active session card and the new-session form, and wires their events to
 * useStudyTimerViewModel (ViewModel). All state, timing and Live Activity work lives in the view
 * model; this file only decides what to show.
 */
import { ScrollView, StyleSheet } from 'react-native';

import { ActiveSessionCard } from '@/components/study-timer/active-session-card';
import { NewSessionForm } from '@/components/study-timer/new-session-form';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStudyTimerViewModel } from '@/features/study-timer/use-study-timer-view-model';
import { useTheme } from '@/hooks/use-theme';

/** The study timer screen. Must be rendered inside LiveActivityProvider. */
export default function TimerScreen() {
  const viewModel = useStudyTimerViewModel();
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      // Lets the native large-title header collapse as the content scrolls.
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      {viewModel.screenMode !== 'idle' && (
        <ActiveSessionCard
          sessionName={viewModel.sessionName}
          formattedElapsedTime={viewModel.formattedElapsedTime}
          isPaused={viewModel.screenMode === 'paused'}
          goalProgress={viewModel.goalProgress}
          goalProgressLabel={viewModel.goalProgressLabel}
          pauseButtonLabel={viewModel.pauseButtonLabel}
          isStartNewSessionVisible={!viewModel.isNewSessionFormVisible}
          onPressPauseOrResume={viewModel.onPressPauseOrResume}
          onPressStop={viewModel.onPressStopSession}
          onPressStartNewSession={viewModel.onPressStartNewSession}
        />
      )}
      {viewModel.isNewSessionFormVisible && (
        <NewSessionForm
          draftSessionName={viewModel.draftSessionName}
          maxSessionNameLength={viewModel.maxSessionNameLength}
          goalOptionsMinutes={viewModel.goalOptionsMinutes}
          selectedGoalMinutes={viewModel.selectedGoalMinutes}
          canStartSession={viewModel.canStartSession}
          canCancel={viewModel.canCancelNewSession}
          onChangeDraftSessionName={viewModel.onChangeDraftSessionName}
          onSelectGoalMinutes={viewModel.onSelectGoalMinutes}
          onPressStart={viewModel.onPressStartSession}
          onPressCancel={viewModel.onPressCancelNewSession}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
});
