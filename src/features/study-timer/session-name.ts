/**
 * Session name rules (Model layer).
 * Cleans up and validates the name typed into the new-session form before it becomes part of a
 * TimerSession and the Live Activity. Used by the study timer view model.
 */

/** Longest accepted session name, in characters. Keeps the lock screen layout readable. */
export const MAX_SESSION_NAME_LENGTH = 60;

/**
 * Trims a typed name and collapses runs of whitespace (including newlines) into single spaces.
 *
 * @param rawName - Text exactly as typed.
 * @returns The cleaned-up name.
 */
export function normalizeSessionName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, ' ');
}

/**
 * Checks whether a typed name can start a session.
 *
 * @param rawName - Text exactly as typed.
 * @returns True when the normalized name has between 1 and MAX_SESSION_NAME_LENGTH characters.
 */
export function isSessionNameValid(rawName: string): boolean {
  const normalizedName = normalizeSessionName(rawName);
  return normalizedName.length > 0 && normalizedName.length <= MAX_SESSION_NAME_LENGTH;
}
