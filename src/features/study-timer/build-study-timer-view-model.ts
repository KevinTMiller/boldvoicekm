/**
 * Timer screen view-state builder (ViewModel layer, pure).
 * Turns the current session, the clock and the form draft into ready-to-render values, so the
 * View never formats or computes anything itself. Called on every render by
 * use-study-timer-view-model.ts.
 */
import { formatElapsedTime } from '@/features/study-timer/format-elapsed-time';
import { isSessionNameValid } from '@/features/study-timer/session-name';
import {
  getElapsedSeconds,
  getGoalProgress,
  isSessionPaused,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/** Which state the timer screen is in. */
export type StudyTimerScreenMode = 'idle' | 'running' | 'paused';

/** Everything the builder needs. */
export type StudyTimerViewModelInput = {
  /** Active session, or null when idle. */
  session: TimerSession | null;
  /** Current time in epoch milliseconds, refreshed by the view model's display tick. */
  nowMs: number;
  /** Name typed into the new-session form so far. */
  draftSessionName: string;
  /** True while the user is composing a new session on top of an active one. */
  isComposingNewSession: boolean;
};

/** View-ready values for the timer screen. */
export type StudyTimerViewModelValues = {
  /** Which state the screen is in. */
  screenMode: StudyTimerScreenMode;
  /** Active session's name, or an empty string when idle. */
  sessionName: string;
  /** Elapsed time as HH:MM:SS. "00:00:00" when idle. */
  formattedElapsedTime: string;
  /** Goal progress from 0 to 1. */
  goalProgress: number;
  /** For example "40% of 25 min goal". Empty when idle. */
  goalProgressLabel: string;
  /** Label for the pause/resume toggle. */
  pauseButtonLabel: 'Pause' | 'Resume';
  /** Whether the new-session form is shown. */
  isNewSessionFormVisible: boolean;
  /** Whether the form offers Cancel, which is only possible while a session is active. */
  canCancelNewSession: boolean;
  /** Whether the draft name is valid, which enables the Start button. */
  canStartSession: boolean;
};

/**
 * Builds the timer screen's view-ready values.
 *
 * @param input - Session, clock and form state.
 * @returns Values the View can render directly.
 */
export function buildStudyTimerViewModel(
  input: StudyTimerViewModelInput
): StudyTimerViewModelValues {
  const { session, nowMs, draftSessionName, isComposingNewSession } = input;
  const goalProgress = session ? getGoalProgress(session, nowMs) : 0;
  return {
    screenMode: getScreenMode(session),
    sessionName: session?.name ?? '',
    formattedElapsedTime: formatElapsedTime(session ? getElapsedSeconds(session, nowMs) : 0),
    goalProgress,
    goalProgressLabel: session ? formatGoalProgressLabel(goalProgress, session.goalSeconds) : '',
    pauseButtonLabel: session && isSessionPaused(session) ? 'Resume' : 'Pause',
    isNewSessionFormVisible: session === null || isComposingNewSession,
    canCancelNewSession: session !== null && isComposingNewSession,
    canStartSession: isSessionNameValid(draftSessionName),
  };
}

/**
 * Maps the session to the screen mode.
 *
 * @param session - Active session, or null.
 * @returns 'idle' without a session, otherwise 'running' or 'paused'.
 */
function getScreenMode(session: TimerSession | null): StudyTimerScreenMode {
  if (session === null) {
    return 'idle';
  }
  return isSessionPaused(session) ? 'paused' : 'running';
}

/**
 * Describes goal progress in words.
 *
 * @param goalProgress - Fraction from 0 to 1.
 * @param goalSeconds - Goal duration in seconds.
 * @returns For example "40% of 25 min goal". Percentages round down, so 100% means the goal is met.
 */
function formatGoalProgressLabel(goalProgress: number, goalSeconds: number): string {
  const percent = Math.floor(goalProgress * 100);
  const goalMinutes = Math.round(goalSeconds / 60);
  return `${percent}% of ${goalMinutes} min goal`;
}
