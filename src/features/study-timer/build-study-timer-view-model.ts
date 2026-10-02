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
  isGoalComplete,
  isSessionPaused,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/**
 * Which state the timer screen is in. 'idle' shows the new-session form. 'running' and 'paused'
 * show the active session card. 'finished' shows that card once the goal has been reached.
 */
export type StudyTimerScreenMode = 'idle' | 'running' | 'paused' | 'finished';

/** What the button inside the progress ring does. */
export type RingButtonAction = 'pause' | 'resume' | 'restart';

/** Everything the builder needs. */
export type StudyTimerViewModelInput = {
  /** Active session, or null when idle. */
  session: TimerSession | null;
  /** Current time in epoch milliseconds, refreshed by the view model's display tick. */
  nowMs: number;
  /** Name typed into the new-session form so far. */
  draftSessionName: string;
};

/** View-ready values for the timer screen. */
export type StudyTimerViewModelValues = {
  /** Which state the screen is in. */
  screenMode: StudyTimerScreenMode;
  /** Active session's name, or an empty string when idle. */
  sessionName: string;
  /** Active session's task emoji, or an empty string when idle. */
  sessionEmoji: string;
  /** Elapsed time as HH:MM:SS. "00:00:00" when idle. Hidden once the goal is complete. */
  formattedElapsedTime: string;
  /** True once the studied time has reached the goal. The card then shows "Finished!". */
  isFinished: boolean;
  /** Goal progress from 0 to 1; fills the progress ring. */
  goalProgress: number;
  /** What the button inside the ring does: pause, resume, or restart after the goal. */
  ringButtonAction: RingButtonAction;
  /** Accessible name of the button inside the ring. */
  pauseButtonLabel: 'Pause' | 'Resume' | 'Restart';
  /** Label of the button under the ring: Stop, or Start a new session once finished. */
  sessionActionLabel: 'Stop' | 'Start a new session';
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
  const { session, nowMs, draftSessionName } = input;
  const isFinished = session !== null && isGoalComplete(session, nowMs);
  return {
    screenMode: getScreenMode(session, isFinished),
    sessionName: session?.name ?? '',
    sessionEmoji: session?.emoji ?? '',
    formattedElapsedTime: formatElapsedTime(session ? getElapsedSeconds(session, nowMs) : 0),
    isFinished,
    goalProgress: session ? getGoalProgress(session, nowMs) : 0,
    ringButtonAction: getRingButtonAction(session, isFinished),
    pauseButtonLabel: getRingButtonLabel(session, isFinished),
    sessionActionLabel: isFinished ? 'Start a new session' : 'Stop',
    canStartSession: isSessionNameValid(draftSessionName),
  };
}

/**
 * Maps the session to the screen mode.
 *
 * @param session - Active session, or null.
 * @param isFinished - Whether the goal has been reached. Takes priority over paused, so a session
 *   frozen at its goal shows Finished rather than Resume.
 * @returns 'idle' without a session, otherwise 'finished', 'paused' or 'running'.
 */
function getScreenMode(session: TimerSession | null, isFinished: boolean): StudyTimerScreenMode {
  if (session === null) {
    return 'idle';
  }
  if (isFinished) {
    return 'finished';
  }
  return isSessionPaused(session) ? 'paused' : 'running';
}

/**
 * Chooses the ring button for the session.
 *
 * @param session - Active session, or null.
 * @param isFinished - Whether the goal has been reached.
 * @returns Restart once finished, Resume while paused, otherwise Pause.
 */
function getRingButtonAction(session: TimerSession | null, isFinished: boolean): RingButtonAction {
  if (isFinished) {
    return 'restart';
  }
  return session !== null && isSessionPaused(session) ? 'resume' : 'pause';
}

/**
 * Names the ring button for screen readers.
 *
 * @param session - Active session, or null.
 * @param isFinished - Whether the goal has been reached.
 * @returns "Restart", "Resume" or "Pause".
 */
function getRingButtonLabel(
  session: TimerSession | null,
  isFinished: boolean
): 'Pause' | 'Resume' | 'Restart' {
  const action = getRingButtonAction(session, isFinished);
  if (action === 'restart') {
    return 'Restart';
  }
  return action === 'resume' ? 'Resume' : 'Pause';
}
