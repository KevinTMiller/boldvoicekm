/**
 * Analytics registry (Model layer).
 * Maps a client id to a factory. The app uses `console`. Add a real provider by implementing
 * AnalyticsClient, registering it here, and passing its id to AnalyticsProvider.
 */
import type { AnalyticsClient } from '@/features/analytics/analytics.types';
import { createConsoleAnalyticsClient } from '@/features/analytics/console-analytics-client';

/** Id of a registered analytics client. */
export type AnalyticsClientId = 'console';

/** Factories for the registered clients, keyed by id. */
const analyticsClientFactories = {
  console: createConsoleAnalyticsClient,
} satisfies Record<AnalyticsClientId, () => AnalyticsClient>;

/**
 * Creates the analytics client for an id.
 *
 * @param id - Which client to create. Defaults to the console client.
 * @returns A new client. Each call gets its own instance.
 */
export function createAnalyticsClient(id: AnalyticsClientId = 'console'): AnalyticsClient {
  return analyticsClientFactories[id]();
}
