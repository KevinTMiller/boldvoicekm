/**
 * Tests for the ActivityKit state mapping (Model layer): session to bridge state and back.
 */
import type {
  StartStudyTimerActivityOptions,
  StudyTimerActivitySnapshot,
} from '../../../../modules/study-timer-activity/src';
import {
  mapActivitySnapshotToLiveActivitySnapshot,
  mapSessionToActivityState,
  mapSessionToStartOptions,
} from '@/features/live-activity/presenters/activity-kit-state-mapping';
import {
  getElapsedMs,
  isSessionPaused,
  pauseSession,
  resumeSession,
  startSession,
} from '@/features/study-timer/timer-state';

const sessionInput = { name: 'Organic Chemistry', goalSeconds: 3000 };

/**
 * Builds a session that ran 0–60 s, paused, then resumed at 100 s, so 60 s is banked.
 *
 * @returns The resumed session.
 */
function makeResumedSession() {
  return resumeSession(pauseSession(startSession(sessionInput, 0), 60_000), 100_000);
}

/**
 * Builds the snapshot the native module would report for an activity started with `options`.
 *
 * @param activityId - Id the native module assigned.
 * @param options - Options the activity was started with.
 * @returns The native snapshot.
 */
function makeNativeSnapshot(
  activityId: string,
  options: StartStudyTimerActivityOptions
): StudyTimerActivitySnapshot {
  return { id: activityId, ...options };
}

// Requirement: the widget ticks by itself, so banked time must be folded into an earlier effective start.
describe('mapSessionToActivityState', () => {
  it('uses the start time as the effective start of a fresh running session', () => {
    const session = startSession(sessionInput, 1_000_000);

    expect(mapSessionToActivityState(session, 1_005_000)).toEqual({
      isPaused: false,
      runningSinceMs: 1_000_000,
      pausedElapsedSeconds: 5,
    });
  });

  it('moves the effective start earlier by the time banked before a pause', () => {
    expect(mapSessionToActivityState(makeResumedSession(), 130_000)).toEqual({
      isPaused: false,
      runningSinceMs: 40_000,
      pausedElapsedSeconds: 90,
    });
  });

  it('gives the same effective start whenever a running session is mapped', () => {
    const session = makeResumedSession();

    expect(mapSessionToActivityState(session, 130_000).runningSinceMs).toBe(
      mapSessionToActivityState(session, 999_000).runningSinceMs
    );
  });

  it('freezes the elapsed seconds of a paused session', () => {
    const pausedSession = pauseSession(startSession(sessionInput, 0), 60_000);

    expect(mapSessionToActivityState(pausedSession, 500_000)).toMatchObject({
      isPaused: true,
      pausedElapsedSeconds: 60,
    });
  });
});

// Requirement: the activity shows the session name and carries what the app needs to restore it.
describe('mapSessionToStartOptions', () => {
  it('copies the name, goal, start time and variant, plus the current state', () => {
    const session = startSession(sessionInput, 1_000_000);

    expect(mapSessionToStartOptions(session, 'default', 1_002_000)).toEqual({
      sessionName: 'Organic Chemistry',
      goalSeconds: 3000,
      presentationVariant: 'default',
      sessionStartedAtMs: 1_000_000,
      state: { isPaused: false, runningSinceMs: 1_000_000, pausedElapsedSeconds: 2 },
    });
  });
});

// Requirement: after an app kill, the session restores from the surviving activity with the correct time.
describe('mapActivitySnapshotToLiveActivitySnapshot', () => {
  it('rebuilds a running session that shows the same elapsed time', () => {
    const original = makeResumedSession();
    const nativeSnapshot = makeNativeSnapshot(
      'activity-1',
      mapSessionToStartOptions(original, 'default', 130_000)
    );

    const restored = mapActivitySnapshotToLiveActivitySnapshot(nativeSnapshot).session;

    expect(isSessionPaused(restored)).toBe(false);
    expect(getElapsedMs(restored, 200_000)).toBe(getElapsedMs(original, 200_000));
    expect(restored.startedAtMs).toBe(original.startedAtMs);
  });

  it('rebuilds a paused session with its frozen time', () => {
    const original = pauseSession(startSession(sessionInput, 0), 61_500);
    const nativeSnapshot = makeNativeSnapshot(
      'activity-1',
      mapSessionToStartOptions(original, 'default', 90_000)
    );

    const restored = mapActivitySnapshotToLiveActivitySnapshot(nativeSnapshot).session;

    expect(isSessionPaused(restored)).toBe(true);
    expect(getElapsedMs(restored, 500_000)).toBe(61_500);
  });

  it('keeps the activity id, name, goal and presentation variant', () => {
    const nativeSnapshot = makeNativeSnapshot(
      'activity-9',
      mapSessionToStartOptions(startSession(sessionInput, 0), 'compact', 1_000)
    );

    expect(mapActivitySnapshotToLiveActivitySnapshot(nativeSnapshot)).toMatchObject({
      activityId: 'activity-9',
      presentationVariant: 'compact',
      session: { name: 'Organic Chemistry', goalSeconds: 3000 },
    });
  });
});
