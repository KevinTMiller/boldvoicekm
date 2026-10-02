/**
 * Tests for session name cleanup and validation.
 */
import {
  isSessionNameValid,
  MAX_SESSION_NAME_LENGTH,
  normalizeSessionName,
} from '@/features/study-timer/session-name';

// Requirement: sessions start with a custom name, cleaned of stray whitespace.
describe('normalizeSessionName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSessionName('  Chapter   5 \n Review  ')).toBe('Chapter 5 Review');
  });
});

// Requirement: a blank or overly long name cannot start a session.
describe('isSessionNameValid', () => {
  it('accepts an ordinary name', () => {
    expect(isSessionNameValid('Chapter 5 Review')).toBe(true);
  });

  it.each(['', '   ', '\n\t'])('rejects the blank name %p', (name) => {
    expect(isSessionNameValid(name)).toBe(false);
  });

  it('accepts a name at the maximum length and rejects one past it', () => {
    expect(isSessionNameValid('a'.repeat(MAX_SESSION_NAME_LENGTH))).toBe(true);
    expect(isSessionNameValid('a'.repeat(MAX_SESSION_NAME_LENGTH + 1))).toBe(false);
  });

  it('measures length after normalizing', () => {
    expect(isSessionNameValid(`  ${'a'.repeat(MAX_SESSION_NAME_LENGTH)}  `)).toBe(true);
  });
});
