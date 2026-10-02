/**
 * Session emoji rules (Model layer).
 * The emoji that labels a study session's type of task: the one-tap suggestions in the new-session
 * form, the default, and how to pull a single emoji out of whatever the iOS emoji keyboard typed.
 * The chosen emoji sits inside the progress ring in the app and in the Live Activity. Used by
 * timer-state.ts, the study timer view model and the EmojiPicker component.
 *
 * Emoji detection works on code points by hand rather than with `\p{Extended_Pictographic}` or
 * `Intl.Segmenter`, because Hermes does not reliably support either.
 */

/**
 * One-tap task emojis offered in the new-session form. Each is a single emoji. Five, so they fit
 * in one row with the "any emoji" field on the narrowest phones.
 */
export const SUGGESTED_SESSION_EMOJIS: readonly string[] = ['📚', '🍅', '🗣️', '✍️', '💻'];

/** Emoji preselected in the new-session form, and used for sessions started without one. */
export const DEFAULT_SESSION_EMOJI = '📚';

/** Zero-width joiner. Glues emoji into one sequence, as in 👩‍💻. */
const ZERO_WIDTH_JOINER = 0x200d;

/** Variation selector 16. Requests the colored emoji form of a symbol, as in ✍️. */
const EMOJI_PRESENTATION_SELECTOR = 0xfe0f;

/** Variation selector 15. Requests the plain-text form of a symbol. */
const TEXT_PRESENTATION_SELECTOR = 0xfe0e;

/** Combining enclosing keycap, as in 1️⃣. */
const COMBINING_ENCLOSING_KEYCAP = 0x20e3;

/**
 * Basic Multilingual Plane symbols that draw as emoji even without variation selector 16, such as
 * ⌚ ☕ ⚡ ✅ ⭐. Inclusive code point ranges, from Unicode's Emoji_Presentation property. Other BMP
 * symbols only count as emoji when followed by the selector, which the emoji keyboard always adds.
 */
const BMP_EMOJI_PRESENTATION_RANGES: readonly (readonly [number, number])[] = [
  [0x231a, 0x231b],
  [0x23e9, 0x23ec],
  [0x23f0, 0x23f0],
  [0x23f3, 0x23f3],
  [0x25fd, 0x25fe],
  [0x2614, 0x2615],
  [0x2648, 0x2653],
  [0x267f, 0x267f],
  [0x2693, 0x2693],
  [0x26a1, 0x26a1],
  [0x26aa, 0x26ab],
  [0x26bd, 0x26be],
  [0x26c4, 0x26c5],
  [0x26ce, 0x26ce],
  [0x26d4, 0x26d4],
  [0x26ea, 0x26ea],
  [0x26f2, 0x26f3],
  [0x26f5, 0x26f5],
  [0x26fa, 0x26fa],
  [0x26fd, 0x26fd],
  [0x2705, 0x2705],
  [0x270a, 0x270b],
  [0x2728, 0x2728],
  [0x274c, 0x274c],
  [0x274e, 0x274e],
  [0x2753, 0x2755],
  [0x2757, 0x2757],
  [0x2795, 0x2797],
  [0x27b0, 0x27b0],
  [0x27bf, 0x27bf],
  [0x2b1b, 0x2b1c],
  [0x2b50, 0x2b50],
  [0x2b55, 0x2b55],
];

/**
 * Pulls the most recently typed emoji out of text from the emoji field. The field keeps showing the
 * current emoji, so a new pick arrives appended to it and the last emoji is the one to keep.
 *
 * @param text - Text exactly as typed, possibly mixing letters and several emoji.
 * @returns The last complete emoji, including multi-part sequences such as 👩‍💻, 👍🏽 and 🇯🇵, or
 *   null when the text holds no emoji.
 */
export function findLastEmoji(text: string): string | null {
  const emojiSequences = splitIntoCodePointSequences(text).filter(isEmojiSequence);
  if (emojiSequences.length === 0) {
    return null;
  }
  return String.fromCodePoint(...emojiSequences[emojiSequences.length - 1]);
}

/**
 * Splits text into code point sequences that each draw as one character: a base code point plus
 * any skin-tone modifiers, variation selectors, keycap marks and tag characters after it, with
 * zero-width-joined parts and regional-indicator pairs (flags) kept together.
 *
 * @param text - Text to split.
 * @returns The sequences in order, each as an array of code points.
 */
function splitIntoCodePointSequences(text: string): number[][] {
  // Array.from iterates by code point, so surrogate pairs arrive as one value.
  const codePoints = Array.from(text, (character) => character.codePointAt(0) ?? 0);
  const sequences: number[][] = [];
  let index = 0;
  while (index < codePoints.length) {
    const sequence = [codePoints[index]];
    index += 1;
    // A flag is a pair of regional indicator letters.
    if (isRegionalIndicator(sequence[0]) && isRegionalIndicator(codePoints[index])) {
      sequence.push(codePoints[index]);
      index += 1;
    }
    // Absorb everything that modifies the base or joins another emoji onto it.
    while (index < codePoints.length) {
      const nextCodePoint = codePoints[index];
      if (isSequenceExtender(nextCodePoint)) {
        sequence.push(nextCodePoint);
        index += 1;
      } else if (nextCodePoint === ZERO_WIDTH_JOINER && index + 1 < codePoints.length) {
        sequence.push(nextCodePoint, codePoints[index + 1]);
        index += 2;
      } else {
        break;
      }
    }
    sequences.push(sequence);
  }
  return sequences;
}

/**
 * Decides whether a code point sequence draws as an emoji.
 *
 * @param sequence - One sequence from splitIntoCodePointSequences.
 * @returns True for pictographs and flags in the emoji blocks, BMP symbols with default emoji
 *   presentation, and anything explicitly requesting emoji presentation or a keycap.
 */
function isEmojiSequence(sequence: number[]): boolean {
  if (
    sequence.includes(EMOJI_PRESENTATION_SELECTOR) ||
    sequence.includes(COMBINING_ENCLOSING_KEYCAP)
  ) {
    return true;
  }
  const [baseCodePoint] = sequence;
  // U+1F000–U+1FAFF holds the emoji blocks, flags included. The upper bound keeps rare CJK
  // ideographs (U+20000 and up) from counting.
  if (baseCodePoint >= 0x1f000 && baseCodePoint <= 0x1faff) {
    return true;
  }
  return BMP_EMOJI_PRESENTATION_RANGES.some(
    ([first, last]) => baseCodePoint >= first && baseCodePoint <= last
  );
}

/**
 * Reports whether a code point modifies the one before it rather than starting a new character.
 *
 * @param codePoint - Code point to check.
 * @returns True for variation selectors, skin-tone modifiers, the keycap mark and tag characters
 *   (used by subdivision flags such as 🏴󠁧󠁢󠁳󠁣󠁴󠁿).
 */
function isSequenceExtender(codePoint: number): boolean {
  return (
    codePoint === EMOJI_PRESENTATION_SELECTOR ||
    codePoint === TEXT_PRESENTATION_SELECTOR ||
    codePoint === COMBINING_ENCLOSING_KEYCAP ||
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) ||
    (codePoint >= 0xe0020 && codePoint <= 0xe007f)
  );
}

/**
 * Reports whether a code point is a regional indicator letter, two of which make a flag.
 *
 * @param codePoint - Code point to check; undefined past the end of the text.
 * @returns True for U+1F1E6–U+1F1FF.
 */
function isRegionalIndicator(codePoint: number | undefined): boolean {
  return codePoint !== undefined && codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
}
