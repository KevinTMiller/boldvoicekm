/**
 * Emoji picker (View layer).
 * A row of one-tap task emojis plus a field that accepts any emoji from the keyboard, including the
 * iOS emoji keyboard. The chosen emoji is shown inside the progress ring and in the Live Activity.
 * Presentational: the suggestions, selection and handler come from the study timer view model via
 * NewSessionForm. Which characters count as one emoji is decided by findLastEmoji in
 * session-emoji.ts.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { findLastEmoji } from '@/features/study-timer/session-emoji';
import { useTheme } from '@/hooks/use-theme';

/** Props for EmojiPicker. */
export type EmojiPickerProps = {
  /** One-tap choices. Each is a single emoji. */
  suggestedEmojis: readonly string[];
  /** Emoji currently selected. */
  selectedEmoji: string;
  /** Called with one emoji when a suggestion is tapped or the field contains one. */
  onSelectEmoji: (emoji: string) => void;
};

/**
 * Task label, suggestion buttons and the any-emoji field.
 *
 * @param props - Suggestions, selection and change handler.
 */
export function EmojiPicker({ suggestedEmojis, selectedEmoji, onSelectEmoji }: EmojiPickerProps) {
  const theme = useTheme();
  const [customEmojiDraft, setCustomEmojiDraft] = useState('');
  const isCustomEmojiSelected = !suggestedEmojis.includes(selectedEmoji);

  /**
   * Selects a suggested emoji and clears the field, so the field only shows a custom choice.
   *
   * @param emoji - Suggestion that was tapped.
   */
  function onPressSuggestedEmoji(emoji: string) {
    setCustomEmojiDraft('');
    onSelectEmoji(emoji);
  }

  /**
   * Keeps the last emoji in whatever was typed. Letters and an emptied field leave the current
   * selection alone; a typed suggestion collapses back into its button.
   *
   * @param text - The field's new contents.
   */
  function onChangeCustomEmojiText(text: string) {
    const emoji = findLastEmoji(text);
    if (emoji === null) {
      setCustomEmojiDraft(text);
      return;
    }
    onSelectEmoji(emoji);
    setCustomEmojiDraft(suggestedEmojis.includes(emoji) ? '' : emoji);
  }

  /**
   * Drops leftover text that never became an emoji, such as letters typed by mistake.
   */
  function onBlurCustomEmojiField() {
    if (findLastEmoji(customEmojiDraft) === null) {
      setCustomEmojiDraft('');
    }
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">Task</ThemedText>
      <View style={styles.row}>
        {suggestedEmojis.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={emoji}
            accessibilityState={{ selected: emoji === selectedEmoji }}
            onPress={() => onPressSuggestedEmoji(emoji)}
            style={[
              styles.choice,
              { backgroundColor: theme.background },
              emoji === selectedEmoji && { borderColor: theme.accent },
            ]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
        <TextInput
          accessibilityLabel="Any emoji"
          placeholder="+"
          placeholderTextColor={theme.textSecondary}
          value={customEmojiDraft}
          onChangeText={onChangeCustomEmojiText}
          onBlur={onBlurCustomEmojiField}
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.choice,
            styles.customEmoji,
            { color: theme.text, backgroundColor: theme.background },
            isCustomEmojiSelected && { borderColor: theme.accent },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  choice: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customEmoji: {
    flex: 1,
    minWidth: 40,
    fontSize: 22,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
});
