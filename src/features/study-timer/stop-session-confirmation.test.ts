/**
 * Tests for buildStopSessionConfirmation, the pure builder of the "Are you sure you want to stop?"
 * prompt. Times are plain epoch-millisecond numbers, so no fake timers are needed.
 */
import { buildStopSessionConfirmation } from '@/features/study-timer/stop-session-confirmation';
import { pauseSession, startSession } from '@/features/study-timer/timer-state';

const START_MS = 1_700_000_000_000;
const MINUTE_MS = 60_000;
const twentyFiveMinuteSession = startSession(
  { name: 'Chapter 5 Review', goalSeconds: 25 * 60 },
  START_MS
);

// Requirement: Stop asks "Are you sure you want to stop?" and says how many minutes are left.
describe('buildStopSessionConfirmation before the goal', () => {
  it('asks the question and counts the minutes left', () => {
    const content = buildStopSessionConfirmation(twentyFiveMinuteSession, START_MS + 10 * MINUTE_MS);

    expect(content).toEqual({
      title: 'Are you sure you want to stop?',
      message: 'You still have 15 minutes left in this session.',
    });
  });

  it('rounds a partial minute up', () => {
    const nowMs = START_MS + 10 * MINUTE_MS + 1_000;

    const content = buildStopSessionConfirmation(twentyFiveMinuteSession, nowMs);

    expect(content.message).toBe('You still have 15 minutes left in this session.');
  });

  it('uses "minute" for the last minute', () => {
    const nowMs = START_MS + 24 * MINUTE_MS + 30_000;

    const content = buildStopSessionConfirmation(twentyFiveMinuteSession, nowMs);

    expect(content.message).toBe('You still have 1 minute left in this session.');
  });

  it('counts from the frozen time of a paused session', () => {
    const paused = pauseSession(twentyFiveMinuteSession, START_MS + 5 * MINUTE_MS);

    const content = buildStopSessionConfirmation(paused, START_MS + 60 * MINUTE_MS);

    expect(content.message).toBe('You still have 20 minutes left in this session.');
  });
});

// Edge case: once the goal is met no time is left to mention, so only the question remains.
describe('buildStopSessionConfirmation after the goal', () => {
  it('drops the minutes-left message at the goal and past it', () => {
    const atGoal = buildStopSessionConfirmation(twentyFiveMinuteSession, START_MS + 25 * MINUTE_MS);
    const pastGoal = buildStopSessionConfirmation(twentyFiveMinuteSession, START_MS + 90 * MINUTE_MS);

    expect(atGoal).toEqual({ title: 'Are you sure you want to stop?' });
    expect(pastGoal.message).toBeUndefined();
  });
});
