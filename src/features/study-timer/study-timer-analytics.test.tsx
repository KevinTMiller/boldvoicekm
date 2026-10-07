/**
 * Tests that the study timer view model records analytics at the session moments that matter.
 * The client is a spy passed through AnalyticsProvider. AppState and the Live Activity controller
 * are the same fakes the view-model tests use. Jest's fake timers move Date.now with the clock.
 */
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AnalyticsProvider } from '@/features/analytics/analytics-context';
import type { AnalyticsClient, AnalyticsEvent } from '@/features/analytics/analytics.types';
import { LiveActivityProvider } from '@/features/live-activity/live-activity-context';
import type {
  LiveActivityController,
  LiveActivityPauseChange,
  LiveActivityPauseChangeListener,
  StudySessionEvent,
} from '@/features/live-activity/live-activity.types';
import type { StopSessionConfirmationRequest } from '@/features/study-timer/stop-session-confirmation';
import { pauseSession, startSession, type TimerSession } from '@/features/study-timer/timer-state';
import { useStudyTimerViewModel } from '@/features/study-timer/use-study-timer-view-model';

const START_MS = 1_700_000_000_000;

/** A controller that records events and can deliver a Live Activity pause tap. */
type SpyController = LiveActivityController & {
  emitPauseChange(change: LiveActivityPauseChange): void;
};

/**
 * Creates a controller that restores `restoredSession`.
 *
 * @param restoredSession - What restoreSession resolves with.
 * @returns The spy controller.
 */
function createSpyController(restoredSession: TimerSession | null = null): SpyController {
  const pauseChangeListeners = new Set<LiveActivityPauseChangeListener>();
  return {
    notify: jest.fn<void, [StudySessionEvent]>(),
    restoreSession: jest.fn(async () => restoredSession),
    addPauseChangeListener(listener) {
      pauseChangeListeners.add(listener);
      return { remove: () => pauseChangeListeners.delete(listener) };
    },
    whenIdle: async () => {},
    emitPauseChange(change) {
      for (const listener of pauseChangeListeners) {
        listener(change);
      }
    },
  };
}

/**
 * Renders the view model with a recording analytics client.
 *
 * @param client - Client whose track calls the test asserts on.
 * @param controller - Spy Live Activity controller.
 * @param presentStopSessionConfirmation - Records the stop dialog instead of showing it.
 * @returns The renderHook result.
 */
async function renderViewModel(
  client: AnalyticsClient,
  controller: SpyController,
  presentStopSessionConfirmation: jest.Mock<void, [StopSessionConfirmationRequest]>
) {
  function ProviderWrapper({ children }: { children: ReactNode }) {
    return (
      <AnalyticsProvider client={client}>
        <LiveActivityProvider controller={controller}>{children}</LiveActivityProvider>
      </AnalyticsProvider>
    );
  }
  return renderHook(() => useStudyTimerViewModel({ presentStopSessionConfirmation }), {
    wrapper: ProviderWrapper,
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: START_MS });
});

afterEach(() => {
  jest.useRealTimers();
});

// Requirement: session milestones are recorded, and the session name is not part of the payload.
describe('study timer analytics', () => {
  it('records start, pause, resume, finish, restart, stop and cancel', async () => {
    const track = jest.fn<void, [AnalyticsEvent]>();
    const presentStopSessionConfirmation = jest.fn<void, [StopSessionConfirmationRequest]>();
    const controller = createSpyController();
    const { result } = await renderViewModel(
      { track },
      controller,
      presentStopSessionConfirmation
    );

    await act(() => result.current.onChangeDraftSessionName('Chapter 5'));
    await act(() => result.current.onPressStartSession());
    await act(() => jest.advanceTimersByTime(5_000));
    await act(() => result.current.onPressPauseOrResume());
    await act(() =>
      controller.emitPauseChange({
        activityId: 'activity-1',
        isPaused: false,
        changedAtMs: START_MS + 5_000,
      })
    );
    await act(() => jest.advanceTimersByTime(15 * 60 * 1000));
    await act(() => result.current.onPressPauseOrResume());
    await act(() => result.current.onPressStopSession());
    const cancel = presentStopSessionConfirmation.mock.calls.at(-1)?.[0].onCancel;
    await act(() => cancel?.());
    await act(() => result.current.onPressStopSession());
    const confirm = presentStopSessionConfirmation.mock.calls.at(-1)?.[0].onConfirm;
    // Narrows the optional callback so the confirm tap below is a real function.
    if (confirm === undefined) {
      throw new Error('Expected a stop confirmation.');
    }
    await act(() => confirm());

    expect(track.mock.calls.map(([event]) => event)).toEqual([
      { name: 'session_started', properties: { goalMinutes: 15, emoji: '📚' } },
      {
        name: 'session_paused',
        properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 5, source: 'app' },
      },
      {
        name: 'session_resumed',
        properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 5, source: 'live_activity' },
      },
      { name: 'session_finished', properties: { goalMinutes: 15, emoji: '📚' } },
      { name: 'session_restarted', properties: { goalMinutes: 15, emoji: '📚' } },
      {
        name: 'stop_confirmation_shown',
        properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 0, remainingMinutes: 15 },
      },
      {
        name: 'stop_cancelled',
        properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 0 },
      },
      {
        name: 'stop_confirmation_shown',
        properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 0, remainingMinutes: 15 },
      },
      {
        name: 'session_stopped',
        properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 0, reason: 'confirmed' },
      },
    ]);
  });

  it('records a restored session without its name', async () => {
    const track = jest.fn<void, [AnalyticsEvent]>();
    const survivor = pauseSession(
      startSession({ name: 'Survivor', emoji: '✏️', goalSeconds: 25 * 60 }, START_MS - 90_000),
      START_MS - 30_000
    );

    await renderViewModel({ track }, createSpyController(survivor), jest.fn());
    await act(async () => {});

    expect(track).toHaveBeenCalledWith({
      name: 'session_restored',
      properties: { goalMinutes: 25, emoji: '✏️', elapsedSeconds: 60, isPaused: true },
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain('Survivor');
  });

  it('records ending a finished session as a new session, with no confirmation', async () => {
    const track = jest.fn<void, [AnalyticsEvent]>();
    const presentStopSessionConfirmation = jest.fn<void, [StopSessionConfirmationRequest]>();
    const { result } = await renderViewModel(
      { track },
      createSpyController(),
      presentStopSessionConfirmation
    );

    await act(() => result.current.onChangeDraftSessionName('Chapter 5'));
    await act(() => result.current.onPressStartSession());
    await act(() => jest.advanceTimersByTime(15 * 60 * 1000));
    track.mockClear();
    await act(() => result.current.onPressStopSession());

    expect(presentStopSessionConfirmation).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith({
      name: 'session_stopped',
      properties: { goalMinutes: 15, emoji: '📚', elapsedSeconds: 15 * 60, reason: 'new_session' },
    });
  });
});
