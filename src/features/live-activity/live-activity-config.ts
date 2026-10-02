/**
 * Live Activity config (Model layer).
 * The default strategy selection and the static config source the app uses today. An experiment
 * or remote-config source can replace the static source later by implementing
 * LiveActivityConfigSource and passing it to LiveActivityProvider in src/app/_layout.tsx.
 */
import type {
  LiveActivityConfig,
  LiveActivityConfigSource,
} from '@/features/live-activity/live-activity.types';
import { ACTIVITY_KIT_PRESENTER_ID } from '@/features/live-activity/presenters/activity-kit-presenter';
import { IMMEDIATE_TRIGGER_POLICY_ID } from '@/features/live-activity/trigger-policies/immediate-trigger-policy';

/** Id of the widget layout in targets/study-timer-widget/Layouts/Default. */
export const DEFAULT_PRESENTATION_VARIANT = 'default';

/** The shipped strategy: show immediately, through ActivityKit, with the default layout. */
export const defaultLiveActivityConfig: LiveActivityConfig = {
  triggerPolicyId: IMMEDIATE_TRIGGER_POLICY_ID,
  presenterId: ACTIVITY_KIT_PRESENTER_ID,
  presentationVariant: DEFAULT_PRESENTATION_VARIANT,
};

/**
 * Creates a config source that always returns the same config.
 *
 * @param config - Config to return.
 * @returns The config source.
 */
export function createStaticLiveActivityConfigSource(
  config: LiveActivityConfig
): LiveActivityConfigSource {
  return { getLiveActivityConfig: () => config };
}

/** The config source the app uses by default. Always returns defaultLiveActivityConfig. */
export const staticLiveActivityConfigSource = createStaticLiveActivityConfigSource(
  defaultLiveActivityConfig
);
