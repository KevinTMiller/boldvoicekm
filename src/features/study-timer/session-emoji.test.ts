/**
 * Tests for the task emoji rules in session-emoji.ts. Emoji are written as literals so each case
 * reads like what a user would type; the multi-part ones are noted with their parts.
 */
import {
  DEFAULT_SESSION_EMOJI,
  findLastEmoji,
  SUGGESTED_SESSION_EMOJIS,
} from '@/features/study-timer/session-emoji';

// Requirement: the form offers ready-made task emojis with a sensible default.
describe('suggested emojis', () => {
  it('includes the default emoji', () => {
    expect(SUGGESTED_SESSION_EMOJIS).toContain(DEFAULT_SESSION_EMOJI);
  });

  it('holds only single emojis, so each suggestion survives the picker unchanged', () => {
    for (const emoji of SUGGESTED_SESSION_EMOJIS) {
      expect(findLastEmoji(emoji)).toBe(emoji);
    }
  });
});

// Requirement: the user can pick any emoji from the keyboard, and exactly one is kept.
describe('findLastEmoji', () => {
  it('returns a single emoji as typed', () => {
    expect(findLastEmoji('🍅')).toBe('🍅');
  });

  it('keeps the newest emoji when one is appended to the current one', () => {
    expect(findLastEmoji('🍅📚')).toBe('📚');
  });

  it('ignores letters, digits and spaces around the emoji', () => {
    expect(findLastEmoji('focus 🎯 now')).toBe('🎯');
  });

  it('returns null when nothing typed is an emoji', () => {
    expect(findLastEmoji('')).toBeNull();
    expect(findLastEmoji('abc 123')).toBeNull();
  });

  it('keeps zero-width-joined sequences whole', () => {
    expect(findLastEmoji('👩‍💻')).toBe('👩‍💻'); // woman + ZWJ + laptop
    expect(findLastEmoji('🏳️‍🌈')).toBe('🏳️‍🌈'); // flag + VS16 + ZWJ + rainbow
  });

  it('keeps skin-tone modifiers with their emoji', () => {
    expect(findLastEmoji('👍🏽')).toBe('👍🏽');
    expect(findLastEmoji('🧑🏾‍🎓')).toBe('🧑🏾‍🎓'); // person + tone + ZWJ + cap
  });

  it('keeps flags whole, including subdivision flags made of tag characters', () => {
    expect(findLastEmoji('🇯🇵')).toBe('🇯🇵');
    expect(findLastEmoji('🇺🇸🇯🇵')).toBe('🇯🇵');
    expect(findLastEmoji('🏴󠁧󠁢󠁳󠁣󠁴󠁿')).toBe('🏴󠁧󠁢󠁳󠁣󠁴󠁿');
  });

  it('recognizes symbols that need the emoji presentation selector or a keycap', () => {
    expect(findLastEmoji('✍️')).toBe('✍️');
    expect(findLastEmoji('1️⃣')).toBe('1️⃣');
  });

  it('recognizes basic-plane symbols that draw as emoji on their own', () => {
    expect(findLastEmoji('☕')).toBe('☕');
    expect(findLastEmoji('⭐')).toBe('⭐');
  });

  it('does not mistake rare CJK ideographs outside the emoji blocks for emoji', () => {
    expect(findLastEmoji('𠀀')).toBeNull(); // U+20000
  });
});
