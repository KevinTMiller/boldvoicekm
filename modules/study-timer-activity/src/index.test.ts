/**
 * Tests for the null-safe StudyTimerActivity API. A hand-written fake stands in for the Swift
 * module, because Jest has no native modules. The fake's `emitPauseChange` plays the part of Swift
 * sending "onPauseChange" after a tap on the Live Activity.
 */
import { createStudyTimerActivityApi } from './index';
import type {
  StartStudyTimerActivityOptions,
  StudyTimerActivityNativeModule,
  StudyTimerActivityPauseChangeEvent,
  StudyTimerActivitySnapshot,
  StudyTimerActivityState,
} from './StudyTimerActivity.types';

const startOptions: StartStudyTimerActivityOptions = {
  sessionName: 'Chapter 5 Review',
  sessionEmoji: '📚',
  goalSeconds: 1500,
  presentationVariant: 'default',
  sessionStartedAtMs: 1_000,
  state: { isPaused: false, runningSinceMs: 1_000, pausedElapsedSeconds: 0, ringColorHex: '#FF6B2B' },
};

const pauseChangeEvent: StudyTimerActivityPauseChangeEvent = {
  activityId: 'activity-1',
  isPaused: true,
  changedAtMs: 5_000,
};

/** Receives "onPauseChange" events. */
type PauseChangeListener = (event: StudyTimerActivityPauseChangeEvent) => void;

/** A fake native module, plus a way to send the "onPauseChange" event. */
type FakeNativeModule = jest.Mocked<StudyTimerActivityNativeModule> & {
  /** Calls every "onPauseChange" listener that is still registered. */
  emitPauseChange(event: StudyTimerActivityPauseChangeEvent): void;
};

/**
 * Builds a fake native module whose functions are Jest mocks.
 *
 * @param activeActivities - What getActiveActivities resolves with.
 * @returns The fake module.
 */
function createFakeNativeModule(
  activeActivities: StudyTimerActivitySnapshot[] = []
): FakeNativeModule {
  const pauseChangeListeners = new Set<PauseChangeListener>();
  return {
    areActivitiesEnabled: jest.fn(() => true),
    startActivity: jest.fn(async (_options: StartStudyTimerActivityOptions) => 'activity-1'),
    updateActivity: jest.fn(async (_activityId: string, _state: StudyTimerActivityState) => {}),
    endActivity: jest.fn(async (_activityId: string) => {}),
    endAllActivities: jest.fn(async () => {}),
    getActiveActivities: jest.fn(async () => activeActivities),
    addListener: jest.fn((_eventName: 'onPauseChange', listener: PauseChangeListener) => {
      pauseChangeListeners.add(listener);
      return { remove: () => pauseChangeListeners.delete(listener) };
    }),
    emitPauseChange(event) {
      for (const listener of pauseChangeListeners) {
        listener(event);
      }
    },
  };
}

// Requirement: Android, web, Expo Go and tests run safely without the native module.
describe('createStudyTimerActivityApi without a native module', () => {
  const api = createStudyTimerActivityApi(null);

  it('reports that nothing is available', async () => {
    expect(api.isAvailable()).toBe(false);
    expect(api.areActivitiesEnabled()).toBe(false);
    await expect(api.getActiveActivities()).resolves.toEqual([]);
  });

  it('turns writes into no-ops', async () => {
    await expect(api.startActivity(startOptions)).resolves.toBeNull();
    await expect(api.updateActivity('id', startOptions.state)).resolves.toBeUndefined();
    await expect(api.endActivity('id')).resolves.toBeUndefined();
    await expect(api.endAllActivities()).resolves.toBeUndefined();
  });

  it('accepts a pause listener and returns a subscription that is safe to remove', () => {
    const subscription = api.addPauseChangeListener(jest.fn());

    expect(() => subscription.remove()).not.toThrow();
  });
});

// Requirement: on iOS, the TypeScript API forwards every call to ActivityKit through the module.
describe('createStudyTimerActivityApi with a native module', () => {
  it('delegates each call with its arguments', async () => {
    const snapshot: StudyTimerActivitySnapshot = { id: 'activity-1', ...startOptions };
    const nativeModule = createFakeNativeModule([snapshot]);
    const api = createStudyTimerActivityApi(nativeModule);

    expect(api.isAvailable()).toBe(true);
    expect(api.areActivitiesEnabled()).toBe(true);
    await expect(api.startActivity(startOptions)).resolves.toBe('activity-1');
    await api.updateActivity('activity-1', startOptions.state);
    await api.endActivity('activity-1');
    await api.endAllActivities();
    await expect(api.getActiveActivities()).resolves.toEqual([snapshot]);

    expect(nativeModule.startActivity).toHaveBeenCalledWith(startOptions);
    expect(nativeModule.updateActivity).toHaveBeenCalledWith('activity-1', startOptions.state);
    expect(nativeModule.endActivity).toHaveBeenCalledWith('activity-1');
    expect(nativeModule.endAllActivities).toHaveBeenCalledTimes(1);
  });

  it('passes native rejections through so the command queue can report them', async () => {
    const nativeModule = createFakeNativeModule();
    nativeModule.startActivity.mockRejectedValueOnce(new Error('Live Activities disabled'));
    const api = createStudyTimerActivityApi(nativeModule);

    await expect(api.startActivity(startOptions)).rejects.toThrow('Live Activities disabled');
  });
});

// Requirement: a Pause/Resume tap on the Live Activity reaches JavaScript until it stops listening.
describe('createStudyTimerActivityApi pause listener', () => {
  it('subscribes to the "onPauseChange" event and delivers it unchanged', () => {
    const nativeModule = createFakeNativeModule();
    const listener = jest.fn();
    createStudyTimerActivityApi(nativeModule).addPauseChangeListener(listener);

    nativeModule.emitPauseChange(pauseChangeEvent);

    expect(nativeModule.addListener).toHaveBeenCalledWith('onPauseChange', listener);
    expect(listener).toHaveBeenCalledWith(pauseChangeEvent);
  });

  it('stops delivering once the subscription is removed', () => {
    const nativeModule = createFakeNativeModule();
    const listener = jest.fn();
    const subscription = createStudyTimerActivityApi(nativeModule).addPauseChangeListener(listener);

    subscription.remove();
    nativeModule.emitPauseChange(pauseChangeEvent);

    expect(listener).not.toHaveBeenCalled();
  });
});
