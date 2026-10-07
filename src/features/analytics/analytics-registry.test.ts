/**
 * Tests for the analytics registry: the default id is the console client.
 */
import { createAnalyticsClient } from '@/features/analytics/analytics-registry';

// Requirement: calling the registry with no id yields a client that prints.
describe('createAnalyticsClient', () => {
  it('defaults to the console client', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    createAnalyticsClient().track({
      name: 'live_activity_failed',
      properties: { task: 'start' },
    });

    expect(log).toHaveBeenCalledWith('[analytics] live_activity_failed', { task: 'start' });
    log.mockRestore();
  });
});
