/**
 * Tests for the analytics context: a throwing client cannot escape into the timer.
 */
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AnalyticsProvider, useAnalytics } from '@/features/analytics/analytics-context';
import type { AnalyticsClient } from '@/features/analytics/analytics.types';

/**
 * Renders useAnalytics inside a provider with the given client.
 *
 * @param client - Client the provider should wrap.
 * @returns The renderHook result, after the hook has rendered.
 */
async function renderAnalytics(client: AnalyticsClient) {
  function ProviderWrapper({ children }: { children: ReactNode }) {
    return <AnalyticsProvider client={client}>{children}</AnalyticsProvider>;
  }
  return renderHook(() => useAnalytics(), { wrapper: ProviderWrapper });
}

// Requirement: a provider failure is contained, and the no-op client is used outside the provider.
describe('AnalyticsProvider', () => {
  it('records through the client it was given', async () => {
    const track = jest.fn();
    const { result } = await renderAnalytics({ track });

    result.current.track({
      name: 'session_started',
      properties: { goalMinutes: 15, emoji: '📚' },
    });

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('swallows a throwing client', async () => {
    const { result } = await renderAnalytics({
      track() {
        throw new Error('vendor');
      },
    });

    expect(() =>
      result.current.track({
        name: 'session_started',
        properties: { goalMinutes: 15, emoji: '📚' },
      })
    ).not.toThrow();
  });

  it('records nothing outside the provider', async () => {
    const { result } = await renderHook(() => useAnalytics());

    expect(() =>
      result.current.track({ name: 'live_activity_failed', properties: { task: 'start' } })
    ).not.toThrow();
  });
});
