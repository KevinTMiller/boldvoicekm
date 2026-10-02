/**
 * Live Activity strategy resolver (Model layer).
 * Turns a LiveActivityConfig into a ready-to-use strategy by looking its ids up in the registry.
 * It never fails on bad config: unknown ids fall back to the defaults, and a presenter that cannot
 * work on this device is replaced by the no-op presenter. Called once per launch by
 * live-activity-context.tsx.
 */
import { defaultLiveActivityConfig } from '@/features/live-activity/live-activity-config';
import {
  defaultLiveActivityRegistry,
  type LiveActivityRegistry,
} from '@/features/live-activity/live-activity-registry';
import type {
  LiveActivityConfig,
  LiveActivityPresenter,
  LiveActivityStrategy,
} from '@/features/live-activity/live-activity.types';
import { createNoopPresenter } from '@/features/live-activity/presenters/noop-presenter';

/**
 * Resolves the strategy a config selects.
 *
 * @param config - Ids of the policy, presenter and layout variant to use.
 * @param registry - Where to look the ids up. Defaults to the shipped registry.
 * @returns The policy, a presenter supported on this device, and a known layout variant.
 * @throws Error if the registry lacks both the requested entry and the default entry.
 */
export function resolveLiveActivityStrategy(
  config: LiveActivityConfig,
  registry: LiveActivityRegistry = defaultLiveActivityRegistry
): LiveActivityStrategy {
  const createPolicy = findRegisteredFactory(
    registry.triggerPolicies,
    config.triggerPolicyId,
    defaultLiveActivityConfig.triggerPolicyId
  );
  const createPresenter = findRegisteredFactory(
    registry.presenters,
    config.presenterId,
    defaultLiveActivityConfig.presenterId
  );
  return {
    policy: createPolicy(),
    presenter: replaceUnsupportedPresenter(createPresenter()),
    presentationVariant: registry.presentationVariants.includes(config.presentationVariant)
      ? config.presentationVariant
      : defaultLiveActivityConfig.presentationVariant,
  };
}

/**
 * Looks up a factory by id, falling back to the default id.
 *
 * @param factories - Registered factories keyed by id.
 * @param requestedId - Id the config asked for.
 * @param defaultId - Id to use when `requestedId` is not registered.
 * @returns The matching factory.
 * @throws Error if neither id is registered.
 */
function findRegisteredFactory<T>(
  factories: Readonly<Record<string, () => T>>,
  requestedId: string,
  defaultId: string
): () => T {
  // Object.hasOwn keeps ids like "toString" from matching inherited Object properties.
  if (Object.hasOwn(factories, requestedId)) {
    return factories[requestedId];
  }
  if (Object.hasOwn(factories, defaultId)) {
    return factories[defaultId];
  }
  throw new Error(
    `Live Activity registry has no entry for "${requestedId}" or the default "${defaultId}".`
  );
}

/**
 * Swaps a presenter that cannot work on this device for the no-op presenter.
 *
 * @param presenter - The configured presenter.
 * @returns `presenter` if it is supported, otherwise a no-op presenter.
 */
function replaceUnsupportedPresenter(presenter: LiveActivityPresenter): LiveActivityPresenter {
  return presenter.isSupported() ? presenter : createNoopPresenter();
}
