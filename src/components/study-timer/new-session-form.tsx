/**
 * New session form (View layer).
 * Collects a session name and goal, then starts the session. Shown when no session is active, or
 * over the active session after "Start New Session", in which case it also offers Cancel.
 * Presentational: values and handlers come from the study timer view model via TimerScreen.
 */
import { StyleSheet, TextInput, View } from 'react-native';

import { GoalPicker } from '@/components/study-timer/goal-picker';
import { TimerButton } from '@/components/study-timer/timer-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Props for NewSessionForm. */
export type NewSessionFormProps = {
  /** Name typed so far. */
  draftSessionName: string;
  /** Longest name the input accepts, in characters. */
  maxSessionNameLength: number;
  /** Goal presets to offer, in minutes. */
  goalOptionsMinutes: readonly number[];
  /** Currently selected goal, in minutes. */
  selectedGoalMinutes: number;
  /** Enables Start Session; false while the name is blank. */
  canStartSession: boolean;
  /** Shows Cancel; only true while a session is already active. */
  canCancel: boolean;
  /** Called as the user types. */
  onChangeDraftSessionName: (sessionName: string) => void;
  /** Called when a goal preset is tapped. */
  onSelectGoalMinutes: (goalMinutes: number) => void;
  /** Called on Start Session, or on the keyboard's Go key. */
  onPressStart: () => void;
  /** Called on Cancel. */
  onPressCancel: () => void;
};

/**
 * Card with the session name input, the goal picker and the start/cancel buttons.
 *
 * @param props - Form values and handlers.
 */
export function NewSessionForm({
  draftSessionName,
  maxSessionNameLength,
  goalOptionsMinutes,
  selectedGoalMinutes,
  canStartSession,
  canCancel,
  onChangeDraftSessionName,
  onSelectGoalMinutes,
  onPressStart,
  onPressCancel,
}: NewSessionFormProps) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle" accessibilityRole="header">
        New Session
      </ThemedText>
      <View style={styles.field}>
        <ThemedText type="smallBold">Session name</ThemedText>
        <TextInput
          accessibilityLabel="Session name"
          placeholder="e.g. Chapter 5 Review"
          placeholderTextColor={theme.textSecondary}
          value={draftSessionName}
          onChangeText={onChangeDraftSessionName}
          maxLength={maxSessionNameLength}
          autoCapitalize="sentences"
          returnKeyType="go"
          onSubmitEditing={onPressStart}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
        />
      </View>
      <View style={styles.field}>
        <ThemedText type="smallBold">Goal</ThemedText>
        <GoalPicker
          goalOptionsMinutes={goalOptionsMinutes}
          selectedGoalMinutes={selectedGoalMinutes}
          onSelectGoalMinutes={onSelectGoalMinutes}
        />
      </View>
      <View style={styles.actions}>
        {canCancel && <TimerButton label="Cancel" variant="secondary" onPress={onPressCancel} />}
        <TimerButton
          label="Start Session"
          variant="primary"
          isDisabled={!canStartSession}
          onPress={onPressStart}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
