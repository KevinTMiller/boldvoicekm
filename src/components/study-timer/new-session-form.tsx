/**
 * New session form (View layer).
 * Collects a session name, a task emoji and a goal, then starts the session. Shown while no
 * session is active, including after a session is stopped. Presentational: values and handlers
 * come from the study timer view model via TimerScreen.
 */
import { StyleSheet, TextInput, View } from 'react-native';

import { EmojiPicker } from '@/components/study-timer/emoji-picker';
import { GoalSlider } from '@/components/study-timer/goal-slider';
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
  /** One-tap task emojis. */
  suggestedEmojis: readonly string[];
  /** Task emoji currently selected. */
  selectedEmoji: string;
  /** Goal choices the slider offers, in minutes, shortest first. */
  goalOptionsMinutes: readonly number[];
  /** Currently selected goal, in minutes. */
  selectedGoalMinutes: number;
  /** Enables Start Session; false while the name is blank. */
  canStartSession: boolean;
  /** Called as the user types. */
  onChangeDraftSessionName: (sessionName: string) => void;
  /** Called when a suggested or typed emoji is chosen. */
  onSelectEmoji: (emoji: string) => void;
  /** Called with the goal, in minutes, at the slider stop the user moved to. */
  onSelectGoalMinutes: (goalMinutes: number) => void;
  /** Called on Start Session, or on the keyboard's Go key. */
  onPressStart: () => void;
};

/**
 * Card with the session name, the emoji picker, the goal slider and the Start Session button.
 *
 * @param props - Form values and handlers.
 */
export function NewSessionForm({
  draftSessionName,
  maxSessionNameLength,
  suggestedEmojis,
  selectedEmoji,
  goalOptionsMinutes,
  selectedGoalMinutes,
  canStartSession,
  onChangeDraftSessionName,
  onSelectEmoji,
  onSelectGoalMinutes,
  onPressStart,
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
      <EmojiPicker
        suggestedEmojis={suggestedEmojis}
        selectedEmoji={selectedEmoji}
        onSelectEmoji={onSelectEmoji}
      />
      <GoalSlider
        goalOptionsMinutes={goalOptionsMinutes}
        goalMinutes={selectedGoalMinutes}
        onChangeGoalMinutes={onSelectGoalMinutes}
      />
      <View style={styles.actions}>
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
