/**
 * Tests for formatElapsedTime, which produces the HH:MM:SS timer text.
 */
import { formatElapsedTime } from '@/features/study-timer/format-elapsed-time';

// Requirement: the timer UI displays elapsed time in HH:MM:SS format.
describe('formatElapsedTime', () => {
  it.each([
    [0, '00:00:00'],
    [59, '00:00:59'],
    [60, '00:01:00'],
    [3600, '01:00:00'],
    [5025, '01:23:45'],
    [359999, '99:59:59'],
  ])('formats %d seconds as %s', (seconds, expected) => {
    expect(formatElapsedTime(seconds)).toBe(expected);
  });

  it('keeps counting hours past 99 instead of wrapping', () => {
    expect(formatElapsedTime(360000)).toBe('100:00:00');
  });

  it('rounds fractional seconds down', () => {
    expect(formatElapsedTime(59.999)).toBe('00:00:59');
  });

  it.each([-5, Number.NaN, Number.POSITIVE_INFINITY])('renders %p as zero', (seconds) => {
    expect(formatElapsedTime(seconds)).toBe('00:00:00');
  });
});
