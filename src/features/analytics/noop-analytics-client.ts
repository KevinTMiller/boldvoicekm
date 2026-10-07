/**
 * No-op analytics client (Model layer).
 * Discards every event. Used when no AnalyticsProvider is mounted, which is how tests avoid
 * printing, and as a safe fallback if a screen renders outside the provider.
 */
import type { AnalyticsClient } from '@/features/analytics/analytics.types';

/** Client that records nothing. */
export const noopAnalyticsClient: AnalyticsClient = {
  track() {},
};
