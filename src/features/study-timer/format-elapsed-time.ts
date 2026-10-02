/**
 * Elapsed time formatting (Model layer).
 * Turns a number of seconds into the HH:MM:SS string shown on the timer screen. Used by
 * build-study-timer-view-model.ts.
 */

/**
 * Formats whole seconds as zero-padded HH:MM:SS.
 *
 * @param totalSeconds - Elapsed seconds. Fractions are rounded down.
 * @returns For example "01:23:45". Hours keep growing past 99 instead of wrapping, and negative
 * or non-finite input renders as "00:00:00".
 */
export function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map(padToTwoDigits).join(':');
}

/**
 * Left-pads a number with zeros to at least two digits.
 *
 * @param value - Non-negative integer.
 * @returns For example "05" for 5, and "123" for 123.
 */
function padToTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}
