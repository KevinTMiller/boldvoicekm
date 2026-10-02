/**
 * Typed JavaScript API for the StudyTimerActivity native module (native bridge layer).
 * Wraps the optional native handle from StudyTimerActivityModule.ts so callers never need to check
 * for null, including when listening for Pause/Resume taps on the Live Activity. Used by the
 * ActivityKit presenter in src/features/live-activity/presenters/activity-kit-presenter.ts.
 */
import type {
  StudyTimerActivityApi,
  StudyTimerActivityNativeModule,
  StudyTimerActivitySubscription,
} from './StudyTimerActivity.types';
import StudyTimerActivityModule from './StudyTimerActivityModule';

export type * from './StudyTimerActivity.types';

/** Returned instead of a real subscription when there is no native module to listen to. */
const INACTIVE_SUBSCRIPTION: StudyTimerActivitySubscription = { remove: () => {} };

/**
 * Creates the null-safe API over a native module handle.
 *
 * @param nativeModule - The loaded native module, or null when this build does not include it.
 *   Tests pass a fake here.
 * @returns An API whose calls do nothing (or report nothing) when `nativeModule` is null.
 */
export function createStudyTimerActivityApi(
  nativeModule: StudyTimerActivityNativeModule | null
): StudyTimerActivityApi {
  return {
    isAvailable: () => nativeModule !== null,
    areActivitiesEnabled: () => nativeModule?.areActivitiesEnabled() ?? false,
    startActivity: async (options) => (nativeModule ? nativeModule.startActivity(options) : null),
    updateActivity: async (activityId, state) => {
      await nativeModule?.updateActivity(activityId, state);
    },
    endActivity: async (activityId) => {
      await nativeModule?.endActivity(activityId);
    },
    endAllActivities: async () => {
      await nativeModule?.endAllActivities();
    },
    getActiveActivities: async () => (nativeModule ? nativeModule.getActiveActivities() : []),
    addPauseChangeListener: (listener) =>
      nativeModule?.addListener('onPauseChange', listener) ?? INACTIVE_SUBSCRIPTION,
  };
}

/** The app's API instance, bound to the real native module (null outside iOS development builds). */
export const StudyTimerActivity = createStudyTimerActivityApi(StudyTimerActivityModule);
