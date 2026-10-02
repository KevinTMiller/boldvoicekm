/**
 * Live Activity registry (Model layer).
 * Maps config ids to the trigger policies, presenters and widget layout variants the app ships.
 * resolve-live-activity-strategy.ts looks ids up here. To add a strategy for an experiment,
 * implement the interface from live-activity.types.ts, register it here, then point a config at
 * its id. Layout variants also need a matching SwiftUI layout in targets/study-timer-widget/Layouts.
 */
import { DEFAULT_PRESENTATION_VARIANT } from '@/features/live-activity/live-activity-config';
import type {
  LiveActivityPresenter,
  LiveActivityTriggerPolicy,
} from '@/features/live-activity/live-activity.types';
import {
  ACTIVITY_KIT_PRESENTER_ID,
  createActivityKitPresenter,
} from '@/features/live-activity/presenters/activity-kit-presenter';
import {
  NOOP_PRESENTER_ID,
  createNoopPresenter,
} from '@/features/live-activity/presenters/noop-presenter';
import {
  IMMEDIATE_TRIGGER_POLICY_ID,
  createImmediateTriggerPolicy,
} from '@/features/live-activity/trigger-policies/immediate-trigger-policy';

/**
 * Everything a config can select, keyed by id. Policies and presenters are factories, so building
 * a registry has no side effects and only the selected entries are ever created.
 */
export type LiveActivityRegistry = {
  /** Trigger policy factories keyed by LiveActivityConfig.triggerPolicyId. */
  triggerPolicies: Readonly<Record<string, () => LiveActivityTriggerPolicy>>;
  /** Presenter factories keyed by LiveActivityConfig.presenterId. */
  presenters: Readonly<Record<string, () => LiveActivityPresenter>>;
  /** Layout variant ids the widget extension implements. */
  presentationVariants: readonly string[];
};

/** The strategies the app ships. */
export const defaultLiveActivityRegistry: LiveActivityRegistry = {
  triggerPolicies: {
    [IMMEDIATE_TRIGGER_POLICY_ID]: createImmediateTriggerPolicy,
  },
  presenters: {
    [ACTIVITY_KIT_PRESENTER_ID]: () => createActivityKitPresenter(),
    [NOOP_PRESENTER_ID]: createNoopPresenter,
  },
  presentationVariants: [DEFAULT_PRESENTATION_VARIANT],
};
