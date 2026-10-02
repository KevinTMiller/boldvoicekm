/**
 * ActivityKit presenter (Model layer, swappable strategy, I/O adapter).
 * Shows the study timer as an iOS Live Activity through the StudyTimerActivity native module in
 * modules/study-timer-activity. Registered under 'activityKit' in live-activity-registry.ts. It
 * reports itself unsupported when the native module is missing (Android, web, Expo Go, Jest) or
 * the user has disabled Live Activities, so the resolver swaps in the no-op presenter.
 */
import {
  StudyTimerActivity,
  type StudyTimerActivityApi,
} from '../../../../modules/study-timer-activity/src';
import type { LiveActivityPresenter } from '@/features/live-activity/live-activity.types';
import {
  mapActivitySnapshotToLiveActivitySnapshot,
  mapSessionToActivityState,
  mapSessionToStartOptions,
} from '@/features/live-activity/presenters/activity-kit-state-mapping';

/** Registry id of the ActivityKit presenter. */
export const ACTIVITY_KIT_PRESENTER_ID = 'activityKit';

/** Dependencies of the ActivityKit presenter. Tests replace them with fakes. */
export type ActivityKitPresenterDependencies = {
  /** Native module API. Defaults to the real module. */
  nativeApi?: StudyTimerActivityApi;
  /** Clock returning epoch milliseconds. Defaults to Date.now. */
  now?: () => number;
};

/**
 * Creates the ActivityKit presenter.
 *
 * @param dependencies - Optional native API and clock overrides.
 * @returns A presenter that drives iOS Live Activities.
 */
export function createActivityKitPresenter({
  nativeApi = StudyTimerActivity,
  now = Date.now,
}: ActivityKitPresenterDependencies = {}): LiveActivityPresenter {
  return {
    id: ACTIVITY_KIT_PRESENTER_ID,
    isSupported: () => nativeApi.isAvailable() && nativeApi.areActivitiesEnabled(),
    start: (session, presentationVariant) =>
      nativeApi.startActivity(mapSessionToStartOptions(session, presentationVariant, now())),
    update: (activityId, session) =>
      nativeApi.updateActivity(activityId, mapSessionToActivityState(session, now())),
    end: (activityId) => nativeApi.endActivity(activityId),
    endAll: () => nativeApi.endAllActivities(),
    listActive: async () => {
      const snapshots = await nativeApi.getActiveActivities();
      return snapshots.map(mapActivitySnapshotToLiveActivitySnapshot);
    },
  };
}
