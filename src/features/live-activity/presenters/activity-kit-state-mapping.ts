/**
 * ActivityKit state mapping (Model layer, pure).
 * Converts between the app's TimerSession and the StudyTimerActivity bridge types. The widget ticks
 * the clock by itself from `runningSinceMs`, so instead of sending elapsed seconds the mapping
 * folds banked time into an earlier "effective start". Used by activity-kit-presenter.ts.
 */
import type {
  StartStudyTimerActivityOptions,
  StudyTimerActivitySnapshot,
  StudyTimerActivityState,
} from '../../../../modules/study-timer-activity/src';
import type { LiveActivitySnapshot } from '@/features/live-activity/live-activity.types';
import {
  getElapsedMs,
  isSessionPaused,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/**
 * Builds the Live Activity content state for a session.
 *
 * @param session - Session to show.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Content state whose effective start makes "now minus start" equal the elapsed time.
 */
export function mapSessionToActivityState(
  session: TimerSession,
  nowMs: number
): StudyTimerActivityState {
  const elapsedMs = getElapsedMs(session, nowMs);
  return {
    isPaused: isSessionPaused(session),
    // While running this equals runningSinceMs minus banked time, whatever `nowMs` is, so the
    // widget's native timer shows the right value without per-second updates.
    runningSinceMs: nowMs - elapsedMs,
    pausedElapsedSeconds: elapsedMs / 1000,
  };
}

/**
 * Builds the options for starting a Live Activity.
 *
 * @param session - Session to show.
 * @param presentationVariant - Widget layout to render.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Options for StudyTimerActivity.startActivity.
 */
export function mapSessionToStartOptions(
  session: TimerSession,
  presentationVariant: string,
  nowMs: number
): StartStudyTimerActivityOptions {
  return {
    sessionName: session.name,
    goalSeconds: session.goalSeconds,
    presentationVariant,
    sessionStartedAtMs: session.startedAtMs,
    state: mapSessionToActivityState(session, nowMs),
  };
}

/**
 * Converts a native activity snapshot into the presenter-neutral snapshot used for restoring.
 *
 * @param snapshot - Activity as reported by the native module.
 * @returns The activity's id, layout variant and rebuilt session.
 */
export function mapActivitySnapshotToLiveActivitySnapshot(
  snapshot: StudyTimerActivitySnapshot
): LiveActivitySnapshot {
  return {
    activityId: snapshot.id,
    presentationVariant: snapshot.presentationVariant,
    session: mapActivitySnapshotToSession(snapshot),
  };
}

/**
 * Rebuilds a TimerSession from a native activity snapshot.
 *
 * @param snapshot - Activity as reported by the native module.
 * @returns A session with the same elapsed time as the activity shows.
 */
function mapActivitySnapshotToSession(snapshot: StudyTimerActivitySnapshot): TimerSession {
  const { state } = snapshot;
  return {
    name: snapshot.sessionName,
    goalSeconds: snapshot.goalSeconds,
    startedAtMs: snapshot.sessionStartedAtMs,
    // A running activity only knows its effective start, which already includes banked time, so it
    // comes back as one running stretch with nothing banked.
    runningSinceMs: state.isPaused ? null : state.runningSinceMs,
    accumulatedMs: state.isPaused ? Math.round(state.pausedElapsedSeconds * 1000) : 0,
  };
}
