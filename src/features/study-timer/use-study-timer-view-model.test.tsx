/**
 * Tests for the study timer view model (ViewModel layer), driven through renderHook with a spy
 * Live Activity controller. Jest's modern fake timers advance Date.now together with timers, so
 * the hook's default clock follows fake time. AppState is the React Native Jest preset's mock;
 * tests call the listener the hook registered to simulate foreground and background changes.
 * The stop confirmation presenter is a spy that records requests instead of showing a dialog:
 * tests confirm by calling a request's onConfirm, and cancel by never calling it. Taps on the
 * Live Activity's Pause/Resume button are simulated through the spy controller's emitPauseChange.
 */
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { LiveActivityProvider } from '@/features/live-activity/live-activity-context';
import type {
  LiveActivityController,
  LiveActivityPauseChange,
  LiveActivityPauseChangeListener,
  StudySessionEvent,
} from '@/features/live-activity/live-activity.types';
import type { StopSessionConfirmationRequest } from '@/features/study-timer/stop-session-confirmation';
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

/** Stop confirmation presenter that records each request instead of showing a dialog. */
type StopConfirmationSpy = jest.Mock<void, [StopSessionConfirmationRequest]>;

/** A controller that records events, plus a way to simulate taps on the Live Activity. */
type SpyController = LiveActivityController & {
  notify: jest.Mock<void, [StudySessionEvent]>;
  restoreSession: jest.Mock<Promise<TimerSession | null>, []>;
  /** Delivers a Pause/Resume tap to every registered listener, as the real controller does. */
  emitPauseChange(change: LiveActivityPauseChange): void;
};

/**
 * Creates a stop confirmation presenter spy.
 *
 * @returns A presenter that only records requests.
 */
function createStopConfirmationSpy(): StopConfirmationSpy {
  return jest.fn<void, [StopSessionConfirmationRequest]>();
}

/**
 * Creates a controller that records events and restores the given session.
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
 * Renders the view model inside a LiveActivityProvider that provides `controller`.
 *
 * @param controller - Spy controller to provide.
 * @param presentStopSessionConfirmation - Stop confirmation presenter; a fresh spy by default.
 * @returns The renderHook result.
 */
async function renderViewModel(
  controller: LiveActivityController,
  presentStopSessionConfirmation: StopConfirmationSpy = createStopConfirmationSpy()
) {
  function ProviderWrapper({ children }: { children: ReactNode }) {
    return <LiveActivityProvider controller={controller}>{children}</LiveActivityProvider>;
  }
  return renderHook(() => useStudyTimerViewModel({ presentStopSessionConfirmation }), {
    wrapper: ProviderWrapper,
  });
}

/**
 * Answers the most recent stop confirmation with "Stop".
 *
 * @param presentStopSessionConfirmation - Spy presenter that recorded the request.
 */
async function confirmLatestStopRequest(presentStopSessionConfirmation: StopConfirmationSpy) {
  const latestRequest = presentStopSessionConfirmation.mock.calls.at(-1)?.[0];
  await act(() => latestRequest?.onConfirm());
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
 * Simulates a tap on the Live Activity's Pause/Resume button.
 *
 * @param controller - Spy controller the view model listens to.
 * @param isPaused - True for a Pause tap, false for a Resume tap.
 * @param changedAtMs - When the tap happened, in epoch milliseconds.
 */
async function tapLiveActivityPauseButton(
  controller: SpyController,
  isPaused: boolean,
  changedAtMs: number
) {
  await act(() => controller.emitPauseChange({ activityId: 'activity-1', isPaused, changedAtMs }));
}

/**
 * Lists the types of the events the view model reported, in order.
 *
 * @param controller - Spy controller.
 * @returns Event types.
 */
function getReportedEventTypes(controller: SpyController) {
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

// Requirement: the form's slider offers 1 minute plus 15–90, opens on 15, and an emoji is preselected.
describe('useStudyTimerViewModel form defaults', () => {
  it('offers the stepped goals with 15 minutes selected', async () => {
    const { result } = await renderViewModel(createSpyController());

    expect(result.current.goalOptionsMinutes).toEqual([1, 15, 20, 25, 30, 45, 60, 75, 90]);
    expect(result.current.selectedGoalMinutes).toBe(15);
  });

  it('preselects the first suggested emoji', async () => {
    const { result } = await renderViewModel(createSpyController());

    expect(result.current.selectedEmoji).toBe(result.current.suggestedEmojis[0]);
  });
});

// Requirement: a session starts with a custom name and emoji, and its HH:MM:SS time ticks.
describe('useStudyTimerViewModel running session', () => {
  it('starts a session with the cleaned-up name, the chosen emoji and the selected goal', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);

    await act(() => result.current.onSelectGoalMinutes(45));
    await act(() => result.current.onSelectEmoji('🎸'));
    await startSessionNamed(result, '  Chapter   5  ');

    expect(result.current.screenMode).toBe('running');
    expect(result.current.sessionName).toBe('Chapter 5');
    expect(result.current.sessionEmoji).toBe('🎸');
    expect(result.current.formattedElapsedTime).toBe('00:00:00');
    expect(result.current.draftSessionName).toBe('');
    expect(controller.notify).toHaveBeenCalledWith({
      type: 'sessionStarted',
      session: expect.objectContaining({
        name: 'Chapter 5',
        emoji: '🎸',
        goalSeconds: 2700,
        startedAtMs: START_MS,
      }),
    });
  });

  it('ticks the displayed time every second, past an hour', async () => {
    const { result } = await renderViewModel(createSpyController());
    // 90 minutes so the clock can pass an hour before the goal finishes the session.
    await act(() => result.current.onSelectGoalMinutes(90));
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

  it('fills the progress ring toward the default 15 minute goal', async () => {
    const { result } = await renderViewModel(createSpyController());
    await startSessionNamed(result, 'Chapter 5');

    await advanceTime(10 * 60 * 1000);

    expect(result.current.goalProgress).toBeCloseTo(10 / 15);
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

// Requirement: the Live Activity's Pause button pauses the session, and when paused it resumes it.
describe('useStudyTimerViewModel Pause/Resume taps on the Live Activity', () => {
  it('pauses as of the tap, even when the app hears about it later', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(5000);

    // Tapped 3 s in; the app only finds out at 5 s.
    await tapLiveActivityPauseButton(controller, true, START_MS + 3000);

    expect(result.current.screenMode).toBe('paused');
    expect(result.current.formattedElapsedTime).toBe('00:00:03');
    expect(controller.notify).toHaveBeenLastCalledWith({
      type: 'sessionPaused',
      session: expect.objectContaining({ runningSinceMs: null, accumulatedMs: 3000 }),
    });
  });

  it('resumes as of the tap', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(3000);
    await tapLiveActivityPauseButton(controller, true, START_MS + 3000);
    await advanceTime(7000);

    // Resume tapped at 8 s; the app only finds out at 10 s.
    await tapLiveActivityPauseButton(controller, false, START_MS + 8000);
    await advanceTime(2000);

    // 3 s before the pause, plus 4 s since resuming at 8 s.
    expect(result.current.screenMode).toBe('running');
    expect(result.current.formattedElapsedTime).toBe('00:00:07');
    expect(getReportedEventTypes(controller)).toEqual([
      'sessionStarted',
      'sessionPaused',
      'sessionResumed',
    ]);
  });

  it('ignores a tap that asks for the state the session is already in', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await act(() => result.current.onPressPauseOrResume());

    await tapLiveActivityPauseButton(controller, true, START_MS);

    expect(getReportedEventTypes(controller)).toEqual(['sessionStarted', 'sessionPaused']);
  });

  it('ignores taps while no session is active', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);

    await tapLiveActivityPauseButton(controller, true, START_MS);

    expect(result.current.screenMode).toBe('idle');
    expect(controller.notify).not.toHaveBeenCalled();
  });

  it('stops listening once the screen unmounts', async () => {
    const controller = createSpyController();
    const { result, unmount } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await unmount();

    await tapLiveActivityPauseButton(controller, true, START_MS);

    expect(getReportedEventTypes(controller)).toEqual(['sessionStarted']);
  });
});

// Requirement: Stop asks for confirmation with the minutes left; confirming ends the session and
// returns to the form, and cancelling keeps it running.
describe('useStudyTimerViewModel stop', () => {
  it('asks for confirmation with the minutes left, without stopping yet', async () => {
    const controller = createSpyController();
    const presentStopSessionConfirmation = createStopConfirmationSpy();
    const { result } = await renderViewModel(controller, presentStopSessionConfirmation);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(10 * 60 * 1000);

    await act(() => result.current.onPressStopSession());

    expect(presentStopSessionConfirmation).toHaveBeenCalledWith({
      title: 'Are you sure you want to stop?',
      message: 'You still have 5 minutes left in this session.',
      onConfirm: expect.any(Function),
      onCancel: expect.any(Function),
    });
    expect(result.current.screenMode).toBe('running');
    expect(getReportedEventTypes(controller)).toEqual(['sessionStarted']);
  });

  it('returns to idle and reports the stop once the user confirms', async () => {
    const controller = createSpyController();
    const presentStopSessionConfirmation = createStopConfirmationSpy();
    const { result } = await renderViewModel(controller, presentStopSessionConfirmation);
    await startSessionNamed(result, 'Chapter 5');

    await act(() => result.current.onPressStopSession());
    await confirmLatestStopRequest(presentStopSessionConfirmation);

    expect(result.current.screenMode).toBe('idle');
    expect(result.current.formattedElapsedTime).toBe('00:00:00');
    expect(controller.notify).toHaveBeenLastCalledWith({ type: 'sessionStopped' });
  });

  it('keeps the session running when the user cancels', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');

    // Cancelling is the presenter never calling onConfirm.
    await act(() => result.current.onPressStopSession());
    await advanceTime(2000);

    expect(result.current.screenMode).toBe('running');
    expect(result.current.formattedElapsedTime).toBe('00:00:02');
    expect(getReportedEventTypes(controller)).toEqual(['sessionStarted']);
  });

});

// Requirement: at the goal the clock stops on Finished, Restart runs it again, and Start a new
// session returns to the form without asking.
describe('useStudyTimerViewModel finished session', () => {
  it('freezes at the goal and offers Restart and Start a new session', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(15 * 60 * 1000);

    expect(result.current.screenMode).toBe('finished');
    expect(result.current.isFinished).toBe(true);
    expect(result.current.pauseButtonLabel).toBe('Restart');
    expect(result.current.sessionActionLabel).toBe('Start a new session');
    expect(controller.notify).toHaveBeenLastCalledWith({
      type: 'sessionPaused',
      session: expect.objectContaining({ runningSinceMs: null, accumulatedMs: 15 * 60 * 1000 }),
    });
  });

  it('restarts the same session from zero', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(15 * 60 * 1000);

    await act(() => result.current.onPressPauseOrResume());

    expect(result.current.screenMode).toBe('running');
    expect(result.current.formattedElapsedTime).toBe('00:00:00');
    expect(result.current.pauseButtonLabel).toBe('Pause');
    expect(controller.notify).toHaveBeenLastCalledWith({
      type: 'sessionResumed',
      session: expect.objectContaining({ accumulatedMs: 0, runningSinceMs: START_MS + 15 * 60 * 1000 }),
    });
  });

  it('returns to the form without a confirmation', async () => {
    const controller = createSpyController();
    const presentStopSessionConfirmation = createStopConfirmationSpy();
    const { result } = await renderViewModel(controller, presentStopSessionConfirmation);
    await startSessionNamed(result, 'Chapter 5');
    await advanceTime(15 * 60 * 1000);

    await act(() => result.current.onPressStopSession());

    expect(presentStopSessionConfirmation).not.toHaveBeenCalled();
    expect(result.current.screenMode).toBe('idle');
    expect(controller.notify).toHaveBeenLastCalledWith({ type: 'sessionStopped' });
  });
});

// Edge case: only one session runs at a time, so Start does nothing while one is active.
describe('useStudyTimerViewModel single session', () => {
  it('ignores Start while a session is already active', async () => {
    const controller = createSpyController();
    const { result } = await renderViewModel(controller);
    await startSessionNamed(result, 'First');

    await startSessionNamed(result, 'Second');

    expect(result.current.sessionName).toBe('First');
    expect(getReportedEventTypes(controller)).toEqual(['sessionStarted']);
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
