/**
 * Tests for the study timer view model (ViewModel layer), driven through renderHook with a spy
 * Live Activity controller. Jest's modern fake timers advance Date.now together with timers, so
 * the hook's default clock follows fake time. AppState is the React Native Jest preset's mock;
 * tests call the listener the hook registered to simulate foreground and background changes.
 */
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { LiveActivityProvider } from '@/features/live-activity/live-activity-context';
import type {
  LiveActivityController,
  StudySessionEvent,
} from '@/features/live-activity/live-activity.types';
import {
  pauseSession,
  startSession,
  type TimerSession,
} from '@/features/study-timer/timer-state';
import {
  useStudyTimerViewModel,
  type StudyTimerViewModel,
} from '@/features/study-timer/use-study-timer-view-model';

const START_MS = 1_700_000_000_000;

/** Latest view model returned by renderHook. */
type ViewModelResult = { current: StudyTimerViewModel };

/**
 * Creates a controller that records events and restores the given session.
 *
 * @param restoredSession - What restoreSession resolves with.
 * @returns The spy controller.
 */
function createSpyController(restoredSession: TimerSession | null = null) {
  return {
    notify: jest.fn<void, [StudySessionEvent]>(),
    restoreSession: jest.fn(async () => restoredSession),
    whenIdle: jest.fn(async () => {}),
  } satisfies LiveActivityController;
}

/**
 * Renders the view model inside a LiveActivityProvider that provides `controller`.
 *
 * @param controller - Spy controller to provide.
 * @returns The renderHook result.
 */
async function renderViewModel(controller: LiveActivityController) {
  function ProviderWrapper({ children }: { children: ReactNode }) {
    return <LiveActivityProvider controller={controller}>{children}</LiveActivityProvider>;
  }
  return renderHook(() => useStudyTimerViewModel(), { wrapper: ProviderWrapper });
}

/**
 * Types a name and presses Start.
 *
 * @param result - View model result.
 * @param sessionName - Name to type.
 */
async function startSessionNamed(result: ViewModelResult, sessionName: string) {
  await act(() => result.current.onChangeDraftSessionName(sessionName));
  await act(() => result.current.onPressStartSession());
}

/**
 * Advances fake time, firing any timers that come due.
 *
 * @param milliseconds - How far to advance.
 */
async function advanceTime(milliseconds: number) {
  await act(() => jest.advanceTimersByTime(milliseconds));
}

/**
 * Sends an AppState change to the listener the hook registered.
 *
 * @param appState - The new app state.
 */
async function changeAppState(appState: AppStateStatus) {
  const listener = jest.mocked(AppState.addEventListener).mock.calls.at(-1)?.[1];
  await act(() => listener?.(appState));
}

/**
 * Lists the types of the events the view model reported, in order.
 *
 * @param controller - Spy controller.
 * @returns Event types.
 */
function getReportedEventTypes(controller: ReturnType<typeof createSpyController>) {
  return controller.notify.mock.calls.map(([event]) => event.type);
}

beforeEach(() => {
  jest.useFakeTimers({ now: START_MS });
  jest.mocked(AppState.addEventListener).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

// Requirement: the timer opens on the new-session form, and Start needs a name.
describe('useStudyTimerViewModel idle state', () => {
  it('starts idle with the form shown and Start disabled', async () => {
    const { result } = await renderViewModel(createSpyController());

    expect(result.current.screenMode).toBe('idle');
    expect(result.current.isNewSessionFormVisible).toBe(true);
    expect(result.current.canStartSession).toBe(false);
    expect(result.current.formattedElapsedTime).toBe('00:00:00');
  });

  it('enables Start once a name is typed', async () => {
    const { result } = await renderViewModel(createSpyController());

    await act(() => result.current.onChangeDraftSessionName('Chapter 5'));

    expect(result.current.canStartSession).toBe(true);
  });

  it('ignores Start while the name is blank', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);

    await startSessionNamed(result, '   ');

    expect(result.current.screenMode).toBe('idle');
    expect(controller.notify).not.toHaveBeenCalled();
  });
});

// Requirement: a session starts with a custom name, and its elapsed time shows as HH:MM:SS and ticks.
describe('useStudyTimerViewModel running session', () => {
  it('starts a session with the cleaned-up name and the selected goal', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);

    await act(() => result.current.onSelectGoalMinutes(50));
    await startSessionNamed(result, '  Chapter   5  ');

    expect(result.current.screenMode).toBe('running');
    expect(result.current.sessionName).toBe('Chapter 5');
    expect(result.current.formattedElapsedTime).toBe('00:00:00');
    expect(result.current.isNewSessionFormVisible).toBe(false);
    expect(result.current.draftSessionName).toBe('');
    expect(controller.notify).toHaveBeenCalledWith({
      type: 'sessionStarted',
      session: expect.objectContaining({ name: 'Chapter 5', goalSeconds: 3000, startedAtMs: START_MS }),
    });
  });

  it('ticks the displayed time every second, past an hour', async () => {
    const { result } = await renderViewModel(createSpyController());
    await startSessionNamed(result, 'Chapter 5');

    await advanceTime(1000);
    expect(result.current.formattedElapsedTime).toBe('00:00:01');

    await advanceTime(3_599_000);
    expect(result.current.formattedElapsedTime).toBe('01:00:00');
  });

  it('changes the display exactly on each second boundary', async () => {
    const { result } = await renderViewModel(createSpyController());
    await startSessionNamed(result, 'Chapter 5');

    await advanceTime(999);
    expect(result.current.formattedElapsedTime).toBe('00:00:00');

    await advanceTime(1);
    expect(result.current.formattedElapsedTime).toBe('00:00:01');
  });

  it('describes progress toward the goal', async () => {
    const { result } = await renderViewModel(createSpyController());
    await startSessionNamed(result, 'Chapter 5');

    await advanceTime(10 * 60 * 1000);

    expect(result.current.goalProgress).toBeCloseTo(0.4);
    expect(result.current.goalProgressLabel).toBe('40% of 25 min goal');
  });
});

// Requirement: Pause freezes the time, Resume continues it, and both are reported to the activity.
describe('useStudyTimerViewModel pause and resume', () => {
  it('freezes the time while paused and continues after resuming', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(5000);

    await act(() => result.current.onPressPauseOrResume());
    expect(result.current.screenMode).toBe('paused');
    expect(result.current.pauseButtonLabel).toBe('Resume');

    await advanceTime(60_000);
    expect(result.current.formattedElapsedTime).toBe('00:00:05');

    await act(() => result.current.onPressPauseOrResume());
    await advanceTime(2000);
    expect(result.current.screenMode).toBe('running');
    expect(result.current.formattedElapsedTime).toBe('00:00:07');
    expect(getReportedEventTypes(controller)).toEqual([
      'sessionStarted',
      'sessionPaused',
      'sessionResumed',
    ]);
  });
});

// Requirement: Stop ends the session, returns to the form, and removes the activity.
describe('useStudyTimerViewModel stop', () => {
  it('returns to idle and reports the stop', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');

    await act(() => result.current.onPressStopSession());

    expect(result.current.screenMode).toBe('idle');
    expect(result.current.isNewSessionFormVisible).toBe(true);
    expect(controller.notify).toHaveBeenLastCalledWith({ type: 'sessionStopped' });
  });
});

// Requirement: a new session can be set up while the current one keeps running.
describe('useStudyTimerViewModel start new session', () => {
  it('shows the form over the running session, which keeps ticking', async () => {
    const { result } = await renderViewModel(createSpyController());
    await startSessionNamed(result, 'First');

    await act(() => result.current.onPressStartNewSession());
    await advanceTime(3000);

    expect(result.current.isNewSessionFormVisible).toBe(true);
    expect(result.current.canCancelNewSession).toBe(true);
    expect(result.current.screenMode).toBe('running');
    expect(result.current.formattedElapsedTime).toBe('00:00:03');
  });

  it('replaces the running session, reporting the stop before the new start', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'First');
    await advanceTime(5000);

    await act(() => result.current.onPressStartNewSession());
    await startSessionNamed(result, 'Second');

    expect(result.current.sessionName).toBe('Second');
    expect(result.current.formattedElapsedTime).toBe('00:00:00');
    expect(result.current.isNewSessionFormVisible).toBe(false);
    expect(getReportedEventTypes(controller)).toEqual([
      'sessionStarted',
      'sessionStopped',
      'sessionStarted',
    ]);
  });

  it('cancels back to the running session and discards the draft', async () => {
    const { result } = await renderViewModel(createSpyController());
    await startSessionNamed(result, 'First');
    await act(() => result.current.onPressStartNewSession());
    await act(() => result.current.onChangeDraftSessionName('Draft'));

    await act(() => result.current.onPressCancelNewSession());

    expect(result.current.isNewSessionFormVisible).toBe(false);
    expect(result.current.draftSessionName).toBe('');
    expect(result.current.sessionName).toBe('First');
  });
});

// Requirement: backgrounding keeps the activity, and returning to the app re-syncs the time.
describe('useStudyTimerViewModel app state', () => {
  it('reports background and foreground transitions with the current session', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');

    await changeAppState('background');
    expect(controller.notify).toHaveBeenLastCalledWith({
      type: 'appMovedToBackground',
      session: expect.objectContaining({ name: 'Chapter 5' }),
    });

    // Ten minutes pass in the background without any JS timer firing.
    jest.setSystemTime(START_MS + 10 * 60 * 1000);
    await changeAppState('active');

    expect(result.current.formattedElapsedTime).toBe('00:10:00');
    expect(controller.notify).toHaveBeenLastCalledWith({
      type: 'appBecameActive',
      session: expect.objectContaining({ name: 'Chapter 5' }),
    });
  });

  it('reports a null session when the app becomes active while idle', async () => {
    const controller = createSpyController();
    await renderViewModel(controller);

    await changeAppState('active');

    expect(controller.notify).toHaveBeenCalledWith({ type: 'appBecameActive', session: null });
  });

  it('ignores the transient inactive state', async () => {
    const controller = createSpyController();
    await renderViewModel(controller);

    await changeAppState('inactive');

    expect(controller.notify).not.toHaveBeenCalled();
  });
});

// Requirement: after the app is killed and relaunched, the surviving session is restored.
describe('useStudyTimerViewModel restore', () => {
  it('asks the controller to restore once on mount', async () => {
    const controller = createSpyController();
    await renderViewModel(controller);

    expect(controller.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('restores a running session with the correct elapsed time', async () => {
    const survivor = startSession({ name: 'Survivor', goalSeconds: 1500 }, START_MS - 90_000);
    const { result } = await renderViewModel(createSpyController(survivor));
    await act(async () => {});

    expect(result.current.screenMode).toBe('running');
    expect(result.current.sessionName).toBe('Survivor');
    expect(result.current.formattedElapsedTime).toBe('00:01:30');

    await advanceTime(1000);
    expect(result.current.formattedElapsedTime).toBe('00:01:31');
  });

  it('restores a paused session as paused', async () => {
    const survivor = pauseSession(
      startSession({ name: 'Survivor', goalSeconds: 1500 }, START_MS - 90_000),
      START_MS - 30_000
    );
    const { result } = await renderViewModel(createSpyController(survivor));
    await act(async () => {});

    expect(result.current.screenMode).toBe('paused');
    expect(result.current.formattedElapsedTime).toBe('00:01:00');
  });

  it('stays idle when nothing survived', async () => {
    const { result } = await renderViewModel(createSpyController(null));
    await act(async () => {});

    expect(result.current.screenMode).toBe('idle');
  });
});
