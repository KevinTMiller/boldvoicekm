/**
 * Study session state (Model layer).
 * Pure, timestamp-based functions for starting, pausing and resuming a study session and for
 * reading its elapsed time and goal progress. Nothing here reads the clock: every function takes
 * `nowMs`, so results are deterministic in tests and the timer cannot drift while the app is
 * backgrounded or suspended. Used by the study timer view model and the Live Activity presenters.
 */

/** Snapshot of a running or paused study session. All times are epoch milliseconds. */
export type TimerSession = {
  /** Display name, already cleaned up by `normalizeSessionName`. */
  name: string;
  /** Target duration in seconds; progress bars fill toward it. Expected to be greater than 0. */
  goalSeconds: number;
  /** When the session was first started. Used to pick the newest session when restoring. */
  startedAtMs: number;
  /** When the current running stretch began; null while paused. */
  runningSinceMs: number | null;
  /** Time already banked from earlier running stretches, in milliseconds. */
  accumulatedMs: number;
};

/** Everything needed to start a new session. */
export type NewSessionInput = {
  /** Normalized session name. */
  name: string;
  /** Target duration in seconds. */
  goalSeconds: number;
};

/**
 * Creates a session whose clock starts running at `nowMs`.
 *
 * @param input - Name and goal for the session.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns A running session with no banked time.
 */
export function startSession(input: NewSessionInput, nowMs: number): TimerSession {
  return {
    name: input.name,
    goalSeconds: input.goalSeconds,
    startedAtMs: nowMs,
    runningSinceMs: nowMs,
    accumulatedMs: 0,
  };
}

/**
 * Reports whether the session's clock is stopped.
 *
 * @param session - Session to inspect.
 * @returns True while paused.
 */
export function isSessionPaused(session: TimerSession): boolean {
  return session.runningSinceMs === null;
}

/**
 * Pauses a running session, banking the current running stretch.
 *
 * @param session - Session to pause.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns A paused copy of the session, or the same object if it was already paused.
 */
export function pauseSession(session: TimerSession, nowMs: number): TimerSession {
  if (isSessionPaused(session)) {
    return session;
  }
  return { ...session, runningSinceMs: null, accumulatedMs: getElapsedMs(session, nowMs) };
}

/**
 * Resumes a paused session, starting a new running stretch at `nowMs`.
 *
 * @param session - Session to resume.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns A running copy of the session, or the same object if it was already running.
 */
export function resumeSession(session: TimerSession, nowMs: number): TimerSession {
  if (!isSessionPaused(session)) {
    return session;
  }
  return { ...session, runningSinceMs: nowMs };
}

/**
 * Computes total elapsed time across all running stretches.
 *
 * @param session - Session to measure.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Elapsed milliseconds, never negative.
 */
export function getElapsedMs(session: TimerSession, nowMs: number): number {
  if (session.runningSinceMs === null) {
    return session.accumulatedMs;
  }
  // Clamp so a clock that moved backwards (e.g. the user changed the device time) cannot
  // subtract from time that was already banked.
  const currentStretchMs = Math.max(0, nowMs - session.runningSinceMs);
  return session.accumulatedMs + currentStretchMs;
}

/**
 * Computes whole elapsed seconds, rounded down, for display.
 *
 * @param session - Session to measure.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Elapsed whole seconds.
 */
export function getElapsedSeconds(session: TimerSession, nowMs: number): number {
  return Math.floor(getElapsedMs(session, nowMs) / 1000);
}

/**
 * Computes how long until the displayed whole-second count next changes. Scheduling display
 * refreshes with this keeps them on second boundaries, so the shown time is never up to a second
 * behind.
 *
 * @param session - A running session.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Milliseconds from 1 to 1000.
 */
export function getMsUntilNextElapsedSecond(session: TimerSession, nowMs: number): number {
  return 1000 - (getElapsedMs(session, nowMs) % 1000);
}

/**
 * Computes how much of the goal duration has been studied.
 *
 * @param session - Session to measure.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns A fraction from 0 to 1. Time past the goal stays at 1; a non-positive goal yields 0.
 */
export function getGoalProgress(session: TimerSession, nowMs: number): number {
  if (session.goalSeconds <= 0) {
    return 0;
  }
  const progress = getElapsedMs(session, nowMs) / (session.goalSeconds * 1000);
  return Math.min(1, Math.max(0, progress));
}
