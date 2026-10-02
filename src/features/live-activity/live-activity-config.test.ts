/**
 * Tests for the Live Activity config (Model layer): shipped defaults and the static source.
 */
import {
  createStaticLiveActivityConfigSource,
  defaultLiveActivityConfig,
  staticLiveActivityConfigSource,
} from '@/features/live-activity/live-activity-config';

// Requirement: the shipped app shows the activity immediately, via ActivityKit, with the default layout.
describe('Live Activity config', () => {
  it('defaults to the immediate policy, the ActivityKit presenter and the default layout', () => {
    expect(defaultLiveActivityConfig).toEqual({
      triggerPolicyId: 'immediate',
      presenterId: 'activityKit',
      presentationVariant: 'default',
    });
  });

  it('has the app-wide static source return the defaults', () => {
    expect(staticLiveActivityConfigSource.getLiveActivityConfig()).toBe(defaultLiveActivityConfig);
  });

  it('creates static sources that return the config they were given', () => {
    const config = { triggerPolicyId: 'a', presenterId: 'b', presentationVariant: 'c' };

    expect(createStaticLiveActivityConfigSource(config).getLiveActivityConfig()).toBe(config);
  });
});
