/**
 * Tests for buildStudyTimerViewModel, the pure function that turns session state into the values
 * the timer screen renders.
 */
import { buildStudyTimerViewModel } from '@/features/study-timer/build-study-timer-view-model';
import { pauseSession, startSession } from '@/features/study-timer/timer-state';

const START_MS = 1_700_000_000_000;
const running = startSession(
  { name: 'Chapter 5 Review', emoji: '🍅', goalSeconds: 100 },
  START_MS
);

// Requirement: with no session, the screen shows the new-session form.
describe('buildStudyTimerViewModel when idle', () => {
  it('reports idle with zeroed timer values', () => {
    const values = buildStudyTimerViewModel({
      session: null,
      nowMs: START_MS,
      draftSessionName: '',
    });

    expect(values).toEqual({
      screenMode: 'idle',
      sessionName: '',
      sessionEmoji: '',
      formattedElapsedTime: '00:00:00',
      isFinished: false,
      goalProgress: 0,
      ringButtonAction: 'pause',
      pauseButtonLabel: 'Pause',
      sessionActionLabel: 'Stop',
      canStartSession: false,
    });
  });

  it('enables Start only for a valid draft name', () => {
    const base = { session: null, nowMs: START_MS };

    expect(buildStudyTimerViewModel({ ...base, draftSessionName: '   ' }).canStartSession).toBe(
      false
    );
    expect(buildStudyTimerViewModel({ ...base, draftSessionName: 'Math' }).canStartSession).toBe(
      true
    );
  });
});

// Requirement: a running session shows its emoji, name, live HH:MM:SS time and goal progress.
describe('buildStudyTimerViewModel while running', () => {
  it('shows elapsed time, progress and a Pause button', () => {
    const values = buildStudyTimerViewModel({
      session: running,
      nowMs: START_MS + 40_000,
      draftSessionName: '',
    });

    expect(values.screenMode).toBe('running');
    expect(values.sessionName).toBe('Chapter 5 Review');
    expect(values.sessionEmoji).toBe('🍅');
    expect(values.formattedElapsedTime).toBe('00:00:40');
    expect(values.goalProgress).toBeCloseTo(0.4);
    expect(values.isFinished).toBe(false);
    expect(values.pauseButtonLabel).toBe('Pause');
    expect(values.sessionActionLabel).toBe('Stop');
  });
});

// Requirement: a paused session shows Resume, a frozen time and clamped progress.
describe('buildStudyTimerViewModel while paused', () => {
  const paused = pauseSession(running, START_MS + 30_000);

  it('shows Resume and keeps the time frozen as the clock moves on', () => {
    const later = buildStudyTimerViewModel({
      session: paused,
      nowMs: START_MS + 600_000,
      draftSessionName: '',
    });

    expect(later.screenMode).toBe('paused');
    expect(later.pauseButtonLabel).toBe('Resume');
    expect(later.formattedElapsedTime).toBe('00:00:30');
    expect(later.isFinished).toBe(false);
  });
});

// Requirement: once the goal is reached the screen offers Restart and Start a new session.
describe('buildStudyTimerViewModel when finished', () => {
  it('shows finished controls and a full ring at the goal', () => {
    const values = buildStudyTimerViewModel({
      session: running,
      nowMs: START_MS + 100_000,
      draftSessionName: '',
    });

    expect(values.screenMode).toBe('finished');
    expect(values.isFinished).toBe(true);
    expect(values.goalProgress).toBe(1);
    expect(values.ringButtonAction).toBe('restart');
    expect(values.pauseButtonLabel).toBe('Restart');
    expect(values.sessionActionLabel).toBe('Start a new session');
  });

  it('stays finished when the session was paused at or past the goal', () => {
    const overGoal = pauseSession(running, START_MS + 500_000);

    const values = buildStudyTimerViewModel({
      session: overGoal,
      nowMs: START_MS + 500_000,
      draftSessionName: '',
    });

    expect(values.screenMode).toBe('finished');
    expect(values.pauseButtonLabel).toBe('Restart');
  });
});
