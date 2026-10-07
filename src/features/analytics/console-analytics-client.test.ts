/**
 * Tests for the console analytics client: each event is printed as a name plus its properties.
 */
import { createConsoleAnalyticsClient } from '@/features/analytics/console-analytics-client';

// Requirement: the default client prints the event name and properties, with nothing else to configure.
describe('createConsoleAnalyticsClient', () => {
  it('prints the event name and properties', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const client = createConsoleAnalyticsClient();

    client.track({
      name: 'session_started',
      properties: { goalMinutes: 15, emoji: '📚' },
    });

    expect(log).toHaveBeenCalledWith('[analytics] session_started', {
      goalMinutes: 15,
      emoji: '📚',
    });
    log.mockRestore();
  });
});
