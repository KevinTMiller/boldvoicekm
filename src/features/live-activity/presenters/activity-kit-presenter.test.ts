/**
 * Tests for the ActivityKit presenter (Model layer I/O adapter), against a fake native API. The
 * fake keeps the pause listener the presenter registers, so tests can play the native module
 * reporting a tap on the Live Activity.
 */
import type {
  StartStudyTimerActivityOptions,
  StudyTimerActivityApi,
  StudyTimerActivityPauseChangeEvent,
  StudyTimerActivitySnapshot,
  StudyTimerActivityState,
} from '../../../../modules/study-timer-activity/src';
import {
  ACTIVITY_KIT_PRESENTER_ID,
  createActivityKitPresenter,
} from '@/features/live-activity/presenters/activity-kit-presenter';
import {
  getElapsedMs,
  isSessionPaused,
  pauseSession,
  startSession,
} from '@/features/study-timer/timer-state';

const NOW_MS = 1_000_000;
const sessionInput = { name: 'Chapter 5', emoji: '🍅', goalSeconds: 1500 };

/**
 * Creates a fake native API whose functions are Jest mocks.
 *
 * @param isAvailable - Whether the native module "exists".
 * @param areActivitiesEnabled - Whether Live Activities are "enabled" in Settings.
 * @returns The fake API.
 */
function createFakeNativeApi(isAvailable = true, areActivitiesEnabled = true) {
  return {
    isAvailable: jest.fn(() => isAvailable),
    areActivitiesEnabled: jest.fn(() => areActivitiesEnabled),
    startActivity: jest.fn(
      async (_options: StartStudyTimerActivityOptions): Promise<string | null> => 'activity-1'
    ),
    updateActivity: jest.fn(async (_activityId: string, _state: StudyTimerActivityState) => {}),
    endActivity: jest.fn(async (_activityId: string) => {}),
    endAllActivities: jest.fn(async () => {}),
    getActiveActivities: jest.fn(async (): Promise<StudyTimerActivitySnapshot[]> => []),
    addPauseChangeListener: jest.fn(
      (_listener: (event: StudyTimerActivityPauseChangeEvent) => void) => ({ remove: jest.fn() })
    ),
  } satisfies StudyTimerActivityApi;
}

// Requirement: devices without Live Activities fall back gracefully instead of failing.
describe('ActivityKit presenter support', () => {
  it('registers under the "activityKit" id', () => {
    expect(createActivityKitPresenter({ nativeApi: createFakeNativeApi() }).id).toBe(
      ACTIVITY_KIT_PRESENTER_ID
    );
  });

  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false],
  ])(
    'with module available=%s and activities enabled=%s, reports supported=%s',
    (isAvailable, areActivitiesEnabled, expectedSupport) => {
      const nativeApi = createFakeNativeApi(isAvailable, areActivitiesEnabled);

      expect(createActivityKitPresenter({ nativeApi }).isSupported()).toBe(expectedSupport);
    }
  );
});

// Requirement: start, pause/resume and stop reach the native Live Activity with the right data.
describe('ActivityKit presenter commands', () => {
  it('starts an activity with the session mapped at the current time', async () => {
    const nativeApi = createFakeNativeApi();
    const presenter = createActivityKitPresenter({ nativeApi, now: () => NOW_MS + 3000 });

    const activityId = await presenter.start(startSession(sessionInput, NOW_MS), 'default');

    expect(activityId).toBe('activity-1');
    expect(nativeApi.startActivity).toHaveBeenCalledWith({
      sessionName: 'Chapter 5',
      sessionEmoji: '🍅',
      goalSeconds: 1500,
      presentationVariant: 'default',
      sessionStartedAtMs: NOW_MS,
      state: {
        isPaused: false,
        runningSinceMs: NOW_MS,
        pausedElapsedSeconds: 3,
        ringColorHex: '#FF6B2B',
      },
    });
  });

  it('sends the frozen time when a session is paused', async () => {
    const nativeApi = createFakeNativeApi();
    const presenter = createActivityKitPresenter({ nativeApi, now: () => NOW_MS + 90_000 });
    const pausedSession = pauseSession(startSession(sessionInput, NOW_MS), NOW_MS + 45_000);

    await presenter.update('activity-1', pausedSession);

    expect(nativeApi.updateActivity).toHaveBeenCalledWith(
      'activity-1',
      expect.objectContaining({ isPaused: true, pausedElapsedSeconds: 45 })
    );
  });

  it('ends one activity or all of them through the native module', async () => {
    const nativeApi = createFakeNativeApi();
    const presenter = createActivityKitPresenter({ nativeApi });

    await presenter.end('activity-1');
    await presenter.endAll();

    expect(nativeApi.endActivity).toHaveBeenCalledWith('activity-1');
    expect(nativeApi.endAllActivities).toHaveBeenCalledTimes(1);
  });
});

// Requirement: after an app kill, surviving activities are read back as sessions with the right time.
describe('ActivityKit presenter listActive', () => {
  it('maps running and paused activities back to sessions', async () => {
    const nativeApi = createFakeNativeApi();
    nativeApi.getActiveActivities.mockResolvedValueOnce([
      {
        id: 'running',
        sessionName: 'Running',
        sessionEmoji: '📚',
        goalSeconds: 1500,
        presentationVariant: 'default',
        sessionStartedAtMs: NOW_MS,
        state: {
          isPaused: false,
          runningSinceMs: NOW_MS - 10_000,
          pausedElapsedSeconds: 0,
          ringColorHex: '#FF6B2B',
        },
      },
      {
        id: 'paused',
        sessionName: 'Paused',
        sessionEmoji: '🍅',
        goalSeconds: 3000,
        presentationVariant: 'default',
        sessionStartedAtMs: NOW_MS,
        state: {
          isPaused: true,
          runningSinceMs: NOW_MS,
          pausedElapsedSeconds: 75,
          ringColorHex: '#EEAC92',
        },
      },
    ]);
    const presenter = createActivityKitPresenter({ nativeApi });

    const [running, paused] = await presenter.listActive();

    expect(running.activityId).toBe('running');
    expect(isSessionPaused(running.session)).toBe(false);
    expect(getElapsedMs(running.session, NOW_MS)).toBe(10_000);
    expect(paused.activityId).toBe('paused');
    expect(isSessionPaused(paused.session)).toBe(true);
    expect(getElapsedMs(paused.session, NOW_MS + 999_000)).toBe(75_000);
    expect(paused.session.emoji).toBe('🍅');
  });
});

// Requirement: a Pause/Resume tap on the Live Activity is relayed from the native module.
describe('ActivityKit presenter addPauseChangeListener', () => {
  it('relays native tap events as pause changes', () => {
    const nativeApi = createFakeNativeApi();
    const listener = jest.fn();
    createActivityKitPresenter({ nativeApi }).addPauseChangeListener(listener);
    const relayNativeEvent = nativeApi.addPauseChangeListener.mock.calls[0][0];

    relayNativeEvent({ activityId: 'activity-1', isPaused: false, changedAtMs: NOW_MS });

    expect(listener).toHaveBeenCalledWith({
      activityId: 'activity-1',
      isPaused: false,
      changedAtMs: NOW_MS,
    });
  });

  it('returns the native subscription, so removing it stops the native listener', () => {
    const nativeApi = createFakeNativeApi();

    createActivityKitPresenter({ nativeApi }).addPauseChangeListener(jest.fn()).remove();

    expect(nativeApi.addPauseChangeListener.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
  });
});
