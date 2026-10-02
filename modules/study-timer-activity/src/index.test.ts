/**
 * Tests for the null-safe StudyTimerActivity API. A hand-written fake stands in for the Swift
 * module, because Jest has no native modules.
 */
import { createStudyTimerActivityApi } from './index';
import type {
  StartStudyTimerActivityOptions,
  StudyTimerActivityNativeModule,
  StudyTimerActivitySnapshot,
  StudyTimerActivityState,
} from './StudyTimerActivity.types';

const startOptions: StartStudyTimerActivityOptions = {
  sessionName: 'Chapter 5 Review',
  goalSeconds: 1500,
  presentationVariant: 'default',
  sessionStartedAtMs: 1_000,
  state: { isPaused: false, runningSinceMs: 1_000, pausedElapsedSeconds: 0 },
};

/**
 * Builds a fake native module whose functions are Jest mocks.
 *
 * @param activeActivities - What getActiveActivities resolves with.
 * @returns The fake module.
 */
function createFakeNativeModule(
  activeActivities: StudyTimerActivitySnapshot[] = []
): jest.Mocked<StudyTimerActivityNativeModule> {
  return {
    areActivitiesEnabled: jest.fn(() => true),
    startActivity: jest.fn(async (_options: StartStudyTimerActivityOptions) => 'activity-1'),
    updateActivity: jest.fn(async (_activityId: string, _state: StudyTimerActivityState) => {}),
    endActivity: jest.fn(async (_activityId: string) => {}),
    endAllActivities: jest.fn(async () => {}),
    getActiveActivities: jest.fn(async () => activeActivities),
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
