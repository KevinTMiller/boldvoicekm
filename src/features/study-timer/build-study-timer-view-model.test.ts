/**
 * Tests for buildStudyTimerViewModel, the pure function that turns session state into the values
 * the timer screen renders.
 */
import { buildStudyTimerViewModel } from '@/features/study-timer/build-study-timer-view-model';
import { pauseSession, startSession } from '@/features/study-timer/timer-state';

const START_MS = 1_700_000_000_000;
const running = startSession({ name: 'Chapter 5 Review', goalSeconds: 100 }, START_MS);

// Requirement: with no session, the screen shows the new-session form.
describe('buildStudyTimerViewModel when idle', () => {
  it('shows the form with zeroed timer values', () => {
    const values = buildStudyTimerViewModel({
      session: null,
      nowMs: START_MS,
      draftSessionName: '',
      isComposingNewSession: false,
    });

    expect(values).toEqual({
      screenMode: 'idle',
      sessionName: '',
      formattedElapsedTime: '00:00:00',
      goalProgress: 0,
      goalProgressLabel: '',
      pauseButtonLabel: 'Pause',
      isNewSessionFormVisible: true,
      canCancelNewSession: false,
      canStartSession: false,
    });
  });

  it('enables Start only for a valid draft name', () => {
    const base = { session: null, nowMs: START_MS, isComposingNewSession: false };

    expect(buildStudyTimerViewModel({ ...base, draftSessionName: '   ' }).canStartSession).toBe(
      false
    );
    expect(buildStudyTimerViewModel({ ...base, draftSessionName: 'Math' }).canStartSession).toBe(
      true
    );
  });
});

// Requirement: a running session shows its name, live HH:MM:SS time and goal progress.
describe('buildStudyTimerViewModel while running', () => {
  it('shows elapsed time, progress and a Pause button', () => {
    const values = buildStudyTimerViewModel({
      session: running,
      nowMs: START_MS + 40_000,
      draftSessionName: '',
      isComposingNewSession: false,
    });

    expect(values.screenMode).toBe('running');
    expect(values.sessionName).toBe('Chapter 5 Review');
    expect(values.formattedElapsedTime).toBe('00:00:40');
    expect(values.goalProgress).toBeCloseTo(0.4);
    expect(values.goalProgressLabel).toBe('40% of 2 min goal');
    expect(values.pauseButtonLabel).toBe('Pause');
    expect(values.isNewSessionFormVisible).toBe(false);
  });

  it('shows the form with Cancel while composing a new session', () => {
    const values = buildStudyTimerViewModel({
      session: running,
      nowMs: START_MS,
      draftSessionName: '',
      isComposingNewSession: true,
    });

    expect(values.isNewSessionFormVisible).toBe(true);
    expect(values.canCancelNewSession).toBe(true);
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
      isComposingNewSession: false,
    });

    expect(later.screenMode).toBe('paused');
    expect(later.pauseButtonLabel).toBe('Resume');
    expect(later.formattedElapsedTime).toBe('00:00:30');
  });

  it('clamps progress at 100% once the goal is passed', () => {
    const overGoal = pauseSession(running, START_MS + 500_000);

    const values = buildStudyTimerViewModel({
      session: overGoal,
      nowMs: START_MS + 500_000,
      draftSessionName: '',
      isComposingNewSession: false,
    });

    expect(values.goalProgress).toBe(1);
    expect(values.goalProgressLabel).toBe('100% of 2 min goal');
  });
});
