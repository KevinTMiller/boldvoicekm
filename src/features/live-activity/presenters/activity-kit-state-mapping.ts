/**
 * ActivityKit state mapping (Model layer, pure).
 * Converts between the app's TimerSession and the StudyTimerActivity bridge types, and turns the
 * native module's Pause/Resume tap events into presenter-neutral pause changes. The widget ticks
 * the clock by itself from `runningSinceMs`, so instead of sending elapsed seconds the mapping
 * folds banked time into an earlier "effective start". Used by activity-kit-presenter.ts.
 */
import type {
  StartStudyTimerActivityOptions,
  StudyTimerActivityPauseChangeEvent,
  StudyTimerActivitySnapshot,
  StudyTimerActivityState,
} from '../../../../modules/study-timer-activity/src';
import type {
  LiveActivityPauseChange,
  LiveActivitySnapshot,
} from '@/features/live-activity/live-activity.types';
import { getArcColor } from '@/components/study-timer/progress-ring-geometry';
import { Colors } from '@/constants/theme';
import {
  getElapsedMs,
  isGoalComplete,
  isSessionPaused,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/** The theme tokens that decide the Live Activity's ring color. */
export type LiveActivityRingTheme = {
  /** Unfilled track. The paused ring blends toward this. */
  progressTrack: string;
  /** Orange stroke while the session is running. */
  progressRing: string;
  /** Solid blue stroke once the goal is complete. */
  accent: string;
};

/** Light-theme ring colors. Used when the caller does not pass a theme. */
const LIGHT_RING_THEME: LiveActivityRingTheme = {
  progressTrack: Colors.light.progressTrack,
  progressRing: Colors.light.progressRing,
  accent: Colors.light.accent,
};

/**
 * Builds the Live Activity content state for a session.
 *
 * @param session - Session to show.
 * @param nowMs - Current time in epoch milliseconds.
 * @param ringTheme - Colors for the ring stroke. Defaults to the light theme.
 * @returns Content state whose effective start makes "now minus start" equal the elapsed time,
 *   and whose ring color matches the circle in the app.
 */
export function mapSessionToActivityState(
  session: TimerSession,
  nowMs: number,
  ringTheme: LiveActivityRingTheme = LIGHT_RING_THEME
): StudyTimerActivityState {
  const elapsedMs = getElapsedMs(session, nowMs);
  const isFinished = isGoalComplete(session, nowMs);
  return {
    isPaused: isSessionPaused(session),
    // While running this equals runningSinceMs minus banked time, whatever `nowMs` is, so the
    // widget's native timer shows the right value without per-second updates.
    runningSinceMs: nowMs - elapsedMs,
    pausedElapsedSeconds: elapsedMs / 1000,
    ringColorHex: getArcColor(
      ringTheme.progressTrack,
      ringTheme.progressRing,
      isSessionPaused(session),
      isFinished,
      ringTheme.accent
    ),
  };
}

/**
 * Builds the options for starting a Live Activity.
 *
 * @param session - Session to show.
 * @param presentationVariant - Widget layout to render.
 * @param nowMs - Current time in epoch milliseconds.
 * @param ringTheme - Colors for the ring stroke. Defaults to the light theme.
 * @returns Options for StudyTimerActivity.startActivity.
 */
export function mapSessionToStartOptions(
  session: TimerSession,
  presentationVariant: string,
  nowMs: number,
  ringTheme: LiveActivityRingTheme = LIGHT_RING_THEME
): StartStudyTimerActivityOptions {
  return {
    sessionName: session.name,
    sessionEmoji: session.emoji,
    goalSeconds: session.goalSeconds,
    presentationVariant,
    sessionStartedAtMs: session.startedAtMs,
    state: mapSessionToActivityState(session, nowMs, ringTheme),
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
 * Converts the native module's tap event into the presenter-neutral pause change.
 *
 * @param event - "onPauseChange" event from the native module.
 * @returns The same tap, in the shape the controller and view model use.
 */
export function mapPauseChangeEventToPauseChange(
  event: StudyTimerActivityPauseChangeEvent
): LiveActivityPauseChange {
  return {
    activityId: event.activityId,
    isPaused: event.isPaused,
    changedAtMs: event.changedAtMs,
  };
}

/**
 * Rebuilds a TimerSession from a native activity snapshot.
 *
 * @param snapshot - Activity as reported by the native module.
 * @returns A session with the same name, emoji and elapsed time as the activity shows.
 */
function mapActivitySnapshotToSession(snapshot: StudyTimerActivitySnapshot): TimerSession {
  const { state } = snapshot;
  return {
    name: snapshot.sessionName,
    emoji: snapshot.sessionEmoji,
    goalSeconds: snapshot.goalSeconds,
    startedAtMs: snapshot.sessionStartedAtMs,
    // A running activity only knows its effective start, which already includes banked time, so it
    // comes back as one running stretch with nothing banked.
    runningSinceMs: state.isPaused ? null : state.runningSinceMs,
    accumulatedMs: state.isPaused ? Math.round(state.pausedElapsedSeconds * 1000) : 0,
  };
}
