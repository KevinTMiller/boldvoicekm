/**
 * Console analytics client (Model layer).
 * Prints each event with `console.log` so events are visible in Metro without a vendor SDK.
 * Registered as `console` in analytics-registry.ts. Replace that registration to send the same
 * events to a real provider.
 */
import type { AnalyticsClient, AnalyticsEvent } from '@/features/analytics/analytics.types';

/**
 * Creates a client that prints events to the console.
 *
 * @returns The console client. `track` does not throw.
 */
export function createConsoleAnalyticsClient(): AnalyticsClient {
  return {
    track(event: AnalyticsEvent) {
      console.log(`[analytics] ${event.name}`, event.properties);
    },
  };
}
