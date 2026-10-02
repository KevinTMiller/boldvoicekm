/**
 * Tests for the Live Activity strategy resolver (Model layer): registry lookups and fallbacks.
 */
import { defaultLiveActivityConfig } from '@/features/live-activity/live-activity-config';
import type { LiveActivityRegistry } from '@/features/live-activity/live-activity-registry';
import type {
  LiveActivityPresenter,
  LiveActivityTriggerPolicy,
} from '@/features/live-activity/live-activity.types';
import { createNoopPresenter } from '@/features/live-activity/presenters/noop-presenter';
import { resolveLiveActivityStrategy } from '@/features/live-activity/resolve-live-activity-strategy';

/**
 * Creates a policy that issues no commands.
 *
 * @param id - Registry id to report.
 * @returns The policy.
 */
function createFakePolicy(id: string): LiveActivityTriggerPolicy {
  return { id, getCommandsForEvent: () => [] };
}

/**
 * Creates a presenter that does nothing but report an id and support flag.
 *
 * @param id - Registry id to report.
 * @param isSupported - What isSupported returns.
 * @returns The presenter.
 */
function createFakePresenter(id: string, isSupported = true): LiveActivityPresenter {
  return { ...createNoopPresenter(), id, isSupported: () => isSupported };
}

/**
 * Builds a registry with the default ids plus one alternative of each kind.
 *
 * @param isDefaultPresenterSupported - Whether the default presenter reports support.
 * @returns The registry.
 */
function createTestRegistry(isDefaultPresenterSupported = true): LiveActivityRegistry {
  return {
    triggerPolicies: {
      immediate: () => createFakePolicy('immediate'),
      delayed: () => createFakePolicy('delayed'),
    },
    presenters: {
      activityKit: () => createFakePresenter('activityKit', isDefaultPresenterSupported),
      banner: () => createFakePresenter('banner'),
    },
    presentationVariants: ['default', 'compact'],
  };
}

// Requirement: an experiment can select a different policy, presenter or layout purely by id.
describe('resolveLiveActivityStrategy lookups', () => {
  it('returns the registered entries the config asks for', () => {
    const strategy = resolveLiveActivityStrategy(
      { triggerPolicyId: 'delayed', presenterId: 'banner', presentationVariant: 'compact' },
      createTestRegistry()
    );

    expect(strategy.policy.id).toBe('delayed');
    expect(strategy.presenter.id).toBe('banner');
    expect(strategy.presentationVariant).toBe('compact');
  });
});

// Requirement: bad or unsupported config never breaks the timer.
describe('resolveLiveActivityStrategy fallbacks', () => {
  it('falls back to the default entries for unknown ids', () => {
    const strategy = resolveLiveActivityStrategy(
      { triggerPolicyId: 'missing', presenterId: 'missing', presentationVariant: 'missing' },
      createTestRegistry()
    );

    expect(strategy.policy.id).toBe('immediate');
    expect(strategy.presenter.id).toBe('activityKit');
    expect(strategy.presentationVariant).toBe('default');
  });

  it('does not treat inherited object properties such as "toString" as registered ids', () => {
    const strategy = resolveLiveActivityStrategy(
      { ...defaultLiveActivityConfig, triggerPolicyId: 'toString' },
      createTestRegistry()
    );

    expect(strategy.policy.id).toBe('immediate');
  });

  it('uses the no-op presenter when the configured presenter is unsupported', () => {
    const strategy = resolveLiveActivityStrategy(
      defaultLiveActivityConfig,
      createTestRegistry(false)
    );

    expect(strategy.presenter.id).toBe('noop');
  });

  it('throws when the registry has neither the requested nor the default entry', () => {
    const registry = { ...createTestRegistry(), triggerPolicies: {} };

    expect(() =>
      resolveLiveActivityStrategy({ ...defaultLiveActivityConfig, triggerPolicyId: 'x' }, registry)
    ).toThrow('no entry for "x" or the default "immediate"');
  });

  it('resolves the shipped defaults to the no-op presenter where the native module is missing', () => {
    const strategy = resolveLiveActivityStrategy(defaultLiveActivityConfig);

    expect(strategy.policy.id).toBe('immediate');
    expect(strategy.presenter.id).toBe('noop');
    expect(strategy.presentationVariant).toBe('default');
  });
});
