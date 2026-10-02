/**
 * Timer screen (View layer, route "/").
 * Shows the new-session form while idle and the active session card otherwise, wires their events
 * to useStudyTimerViewModel (ViewModel), and gives the view model the native dialog that shows the
 * stop confirmation. All state, timing and Live Activity work lives in the view model; this file
 * only decides what to show.
 */
import { ScrollView, StyleSheet } from 'react-native';

import { ActiveSessionCard } from '@/components/study-timer/active-session-card';
import { NewSessionForm } from '@/components/study-timer/new-session-form';
import { presentStopSessionConfirmation } from '@/components/study-timer/present-stop-session-confirmation';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStudyTimerViewModel } from '@/features/study-timer/use-study-timer-view-model';
import { useTheme } from '@/hooks/use-theme';

/** The study timer screen. Must be rendered inside LiveActivityProvider. */
export default function TimerScreen() {
  const viewModel = useStudyTimerViewModel({ presentStopSessionConfirmation });
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      // Lets the native large-title header collapse as the content scrolls.
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      {viewModel.screenMode === 'idle' ? (
        <NewSessionForm
          draftSessionName={viewModel.draftSessionName}
          maxSessionNameLength={viewModel.maxSessionNameLength}
          suggestedEmojis={viewModel.suggestedEmojis}
          selectedEmoji={viewModel.selectedEmoji}
          goalOptionsMinutes={viewModel.goalOptionsMinutes}
          selectedGoalMinutes={viewModel.selectedGoalMinutes}
          canStartSession={viewModel.canStartSession}
          onChangeDraftSessionName={viewModel.onChangeDraftSessionName}
          onSelectEmoji={viewModel.onSelectEmoji}
          onSelectGoalMinutes={viewModel.onSelectGoalMinutes}
          onPressStart={viewModel.onPressStartSession}
        />
      ) : (
        <ActiveSessionCard
          sessionEmoji={viewModel.sessionEmoji}
          sessionName={viewModel.sessionName}
          formattedElapsedTime={viewModel.formattedElapsedTime}
          isPaused={viewModel.screenMode === 'paused'}
          isFinished={viewModel.isFinished}
          goalProgress={viewModel.goalProgress}
          ringButtonAction={viewModel.ringButtonAction}
          sessionActionLabel={viewModel.sessionActionLabel}
          onPressPauseOrResume={viewModel.onPressPauseOrResume}
          onPressStop={viewModel.onPressStopSession}
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
