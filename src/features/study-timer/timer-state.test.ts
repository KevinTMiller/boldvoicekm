/**
 * Tests for the timestamp-based session state functions in timer-state.ts.
 * Times are plain epoch-millisecond numbers, so no fake timers are needed.
 */
import {
  getElapsedMs,
  getElapsedSeconds,
  getGoalProgress,
  getMsUntilNextElapsedSecond,
  isSessionPaused,
  pauseSession,
  resumeSession,
  startSession,
} from '@/features/study-timer/timer-state';

const START_MS = 1_700_000_000_000;
const newSessionInput = { name: 'Chapter 5 Review', goalSeconds: 25 * 60 };

// Requirement: starting a session begins a running clock with the given name and goal.
describe('startSession', () => {
  it('creates a running session with no banked time', () => {
    const session = startSession(newSessionInput, START_MS);

    expect(session).toEqual({
      name: 'Chapter 5 Review',
      goalSeconds: 1500,
      startedAtMs: START_MS,
      runningSinceMs: START_MS,
      accumulatedMs: 0,
    });
    expect(isSessionPaused(session)).toBe(false);
  });
});

// Requirement: pause/resume keeps elapsed time correct across any number of cycles.
describe('pause and resume', () => {
  it('freezes elapsed time while paused and continues after resuming', () => {
    const running = startSession(newSessionInput, START_MS);
    const paused = pauseSession(running, START_MS + 10_000);

    expect(isSessionPaused(paused)).toBe(true);
    expect(getElapsedSeconds(paused, START_MS + 10_000)).toBe(10);
    // An hour later, a paused session still reads 10 seconds.
    expect(getElapsedSeconds(paused, START_MS + 3_600_000)).toBe(10);

    const resumed = resumeSession(paused, START_MS + 3_600_000);
    expect(getElapsedSeconds(resumed, START_MS + 3_605_000)).toBe(15);
  });

  it('adds up several running stretches', () => {
    let session = startSession(newSessionInput, START_MS);
    session = pauseSession(session, START_MS + 1_000); // 1s banked
    session = resumeSession(session, START_MS + 5_000);
    session = pauseSession(session, START_MS + 7_000); // +2s banked
    session = resumeSession(session, START_MS + 20_000);

    expect(getElapsedMs(session, START_MS + 23_500)).toBe(6_500);
  });

  it('treats pausing a paused session and resuming a running one as no-ops', () => {
    const running = startSession(newSessionInput, START_MS);
    const paused = pauseSession(running, START_MS + 1_000);

    expect(pauseSession(paused, START_MS + 9_000)).toBe(paused);
    expect(resumeSession(running, START_MS + 9_000)).toBe(running);
  });
});

// Edge case: the device clock moving backwards must not produce negative or shrinking time.
describe('getElapsedMs with a clock that moved backwards', () => {
  it('never subtracts from banked time', () => {
    let session = startSession(newSessionInput, START_MS);
    session = pauseSession(session, START_MS + 5_000);
    session = resumeSession(session, START_MS + 10_000);

    expect(getElapsedMs(session, START_MS)).toBe(5_000);
  });
});

// Requirement: the HH:MM:SS display changes exactly when a new second of study time is reached.
describe('getMsUntilNextElapsedSecond', () => {
  it('waits a full second when elapsed time sits exactly on a second boundary', () => {
    const session = startSession(newSessionInput, START_MS);

    expect(getMsUntilNextElapsedSecond(session, START_MS + 5_000)).toBe(1_000);
  });

  it('waits only the remainder of the current second', () => {
    const session = startSession(newSessionInput, START_MS);

    expect(getMsUntilNextElapsedSecond(session, START_MS + 5_003)).toBe(997);
  });

  it('accounts for banked time that does not end on a second boundary', () => {
    let session = startSession(newSessionInput, START_MS);
    session = pauseSession(session, START_MS + 1_400); // 1.4s banked
    session = resumeSession(session, START_MS + 10_000);

    // 1.4s banked + 0.3s running = 1.7s elapsed, so the display changes in 0.3s.
    expect(getMsUntilNextElapsedSecond(session, START_MS + 10_300)).toBe(300);
  });
});

// Requirement: the progress bar and ring fill toward the session goal.
describe('getGoalProgress', () => {
  it('reports the fraction of the goal completed', () => {
    const session = startSession({ name: 'Goal', goalSeconds: 100 }, START_MS);

    expect(getGoalProgress(session, START_MS + 25_000)).toBeCloseTo(0.25);
  });

  it('stays at 1 after the goal is passed', () => {
    const session = startSession({ name: 'Goal', goalSeconds: 100 }, START_MS);

    expect(getGoalProgress(session, START_MS + 500_000)).toBe(1);
  });

  it('returns 0 for a non-positive goal instead of dividing by zero', () => {
    const session = startSession({ name: 'Goal', goalSeconds: 0 }, START_MS);

    expect(getGoalProgress(session, START_MS + 10_000)).toBe(0);
  });
});
