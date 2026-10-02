/**
 * Tests for EmojiPicker (View layer).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmojiPicker } from '@/components/study-timer/emoji-picker';

const SUGGESTED_EMOJIS = ['📚', '🍅', '🗣️', '✍️', '💻'] as const;

/**
 * Renders the picker with the book suggestion selected.
 *
 * @param onSelectEmoji - Selection handler. Defaults to a mock.
 * @param selectedEmoji - Emoji shown as selected.
 * @returns The selection handler, so a test can assert on it.
 */
function renderEmojiPicker(onSelectEmoji = jest.fn(), selectedEmoji = '📚') {
  return render(
    <EmojiPicker
      suggestedEmojis={SUGGESTED_EMOJIS}
      selectedEmoji={selectedEmoji}
      onSelectEmoji={onSelectEmoji}
    />
  );
}

// Requirement: the suggested task emojis are one tap each, and the current one is marked selected.
describe('EmojiPicker suggestions', () => {
  it('offers each suggestion and marks the selected one', async () => {
    await renderEmojiPicker();

    for (const emoji of SUGGESTED_EMOJIS) {
      expect(screen.getByRole('button', { name: emoji })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: '📚' })).toBeSelected();
    expect(screen.getByRole('button', { name: '🍅' })).not.toBeSelected();
  });

  it('selects a suggestion when its button is tapped', async () => {
    const onSelectEmoji = jest.fn();
    await renderEmojiPicker(onSelectEmoji);

    await fireEvent.press(screen.getByRole('button', { name: '🍅' }));

    expect(onSelectEmoji).toHaveBeenCalledWith('🍅');
  });
});

// Requirement: the field accepts any emoji from the keyboard, and keeps exactly one.
describe('EmojiPicker custom emoji', () => {
  it('selects the emoji typed into the field', async () => {
    const onSelectEmoji = jest.fn();
    await renderEmojiPicker(onSelectEmoji);

    await fireEvent.changeText(screen.getByLabelText('Any emoji'), '🎸');

    expect(onSelectEmoji).toHaveBeenCalledWith('🎸');
    expect(screen.getByLabelText('Any emoji')).toHaveDisplayValue('🎸');
  });

  it('keeps the newest emoji when another is typed after it', async () => {
    const onSelectEmoji = jest.fn();
    await renderEmojiPicker(onSelectEmoji);

    await fireEvent.changeText(screen.getByLabelText('Any emoji'), '🎸🍅');

    expect(onSelectEmoji).toHaveBeenLastCalledWith('🍅');
  });

  it('leaves the selection unchanged when the field has no emoji', async () => {
    const onSelectEmoji = jest.fn();
    await renderEmojiPicker(onSelectEmoji);

    await fireEvent.changeText(screen.getByLabelText('Any emoji'), 'focus');

    expect(onSelectEmoji).not.toHaveBeenCalled();
  });
});
