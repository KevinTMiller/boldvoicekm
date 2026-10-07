/**
 * Analytics context (composition root for the analytics client).
 * Provides one AnalyticsClient for the launch. Mounted in src/app/_layout.tsx around the Live
 * Activity provider and the timer screen. Tests omit it and get the no-op client.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

import { createAnalyticsClient, type AnalyticsClientId } from '@/features/analytics/analytics-registry';
import type { AnalyticsClient } from '@/features/analytics/analytics.types';
import { noopAnalyticsClient } from '@/features/analytics/noop-analytics-client';

/** Holds the client. Null outside AnalyticsProvider, where useAnalytics returns the no-op client. */
const AnalyticsClientContext = createContext<AnalyticsClient | null>(null);

/** Props for AnalyticsProvider. The client is chosen on the first render only. */
export type AnalyticsProviderProps = {
  children: ReactNode;
  /** Client to provide. When omitted, `clientId` selects one from the registry. */
  client?: AnalyticsClient;
  /** Registry id used when `client` is omitted. Defaults to `console`. */
  clientId?: AnalyticsClientId;
};

/**
 * Provides an analytics client to everything below it.
 *
 * @param props - Children plus an optional client or registry id.
 */
export function AnalyticsProvider({
  children,
  client,
  clientId = 'console',
}: AnalyticsProviderProps) {
  // One instance for the launch, so a running session does not switch providers mid-flight.
  // Throws are swallowed here so a provider bug cannot break the timer.
  const [providedClient] = useState(() =>
    createNonThrowingAnalyticsClient(client ?? createAnalyticsClient(clientId))
  );
  return <AnalyticsClientContext value={providedClient}>{children}</AnalyticsClientContext>;
}

/**
 * Returns the analytics client from the nearest AnalyticsProvider, or a client that records
 * nothing when there is no provider.
 *
 * @returns The client to record events with.
 */
export function useAnalytics(): AnalyticsClient {
  return useContext(AnalyticsClientContext) ?? noopAnalyticsClient;
}

/**
 * Wraps a client so `track` cannot throw into the timer.
 *
 * @param client - The client the app or a test provided.
 * @returns A client with the same events and a guarded `track`.
 */
function createNonThrowingAnalyticsClient(client: AnalyticsClient): AnalyticsClient {
  return {
    track(event) {
      try {
        client.track(event);
      } catch {
        // The timer keeps running when a provider fails.
      }
    },
  };
}
