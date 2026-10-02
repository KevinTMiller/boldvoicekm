/**
 * End-to-end tests for the timer screen (View + ViewModel + Live Activity controller). The real
 * controller and immediate policy run on the in-memory fake presenter, so each test can check
 * what would be on the Lock Screen. This file sits outside src/app because Expo Router treats
 * every file in src/app as a route.
 *
 * Jest's modern fake timers advance Date.now together with timers, so the screen's clock follows
 * fake time. `whenIdle` waits for the controller's command queue to finish. React Native's
 * Alert.alert is replaced with a spy, so tests answer the stop confirmation by calling the
 * onPress of the button they want from the recorded alert.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import TimerScreen from '@/app/index';
import { createLiveActivityController } from '@/features/live-activity/create-live-activity-controller';
import { LiveActivityProvider } from '@/features/live-activity/live-activity-context';
import type { LiveActivityController } from '@/features/live-activity/live-activity.types';
import {
  createFakeLiveActivityPresenter,
  type FakeLiveActivityPresenter,
} from '@/features/live-activity/testing/fake-live-activity-presenter';
import { createImmediateTriggerPolicy } from '@/features/live-activity/trigger-policies/immediate-trigger-policy';
import { pauseSession, startSession } from '@/features/study-timer/timer-state';

const START_MS = 1_700_000_000_000;

/**
 * Creates a real controller on a fake presenter.
 *
 * @returns The controller and the presenter.
 */
function createTestController() {
  const presenter = createFakeLiveActivityPresenter();
  const controller = createLiveActivityController({
    strategy: { policy: createImmediateTriggerPolicy(), presenter, presentationVariant: 'default' },
    onError: jest.fn(),
  });
  return { controller, presenter };
}

/**
 * Renders the timer screen and lets the launch-time restore finish.
 *
 * @param controller - Controller to provide.
 */
async function renderTimerScreen(controller: LiveActivityController) {
  await render(
    <LiveActivityProvider controller={controller}>
      <TimerScreen />
    </LiveActivityProvider>
  );
  await act(() => controller.whenIdle());
}

/**
 * Types a session name and presses Start Session.
 *
 * @param sessionName - Name to type.
 */
async function startSessionNamed(sessionName: string) {
  await fireEvent.changeText(screen.getByLabelText('Session name'), sessionName);
  await fireEvent.press(screen.getByRole('button', { name: 'Start Session' }));
}

/**
 * Presses a button by its label.
 *
 * @param label - The button's accessible name.
 */
async function pressButton(label: string) {
  await fireEvent.press(screen.getByRole('button', { name: label }));
}

/**
 * Taps a button in the most recent alert, the way a user answers the stop confirmation.
 *
 * @param buttonText - The alert button to tap.
 */
async function answerLatestAlert(buttonText: 'Stop' | 'Cancel') {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  const button = buttons?.find((alertButton) => alertButton.text === buttonText);
  await act(() => button?.onPress?.());
}

/** Presses Stop on the session card, then confirms in the alert. */
async function stopAndConfirm() {
  await pressButton('Stop');
  await answerLatestAlert('Stop');
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
 * Lists the session names of the activities on the fake Lock Screen.
 *
 * @param presenter - Fake presenter.
 * @returns Session names, in start order.
 */
function getActivitySessionNames(presenter: FakeLiveActivityPresenter): string[] {
  return [...presenter.activeActivities.values()].map((activity) => activity.session.name);
}

beforeEach(() => {
  jest.useFakeTimers({ now: START_MS });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Requirement: start a session with a custom name; the screen and the Live Activity show it.
describe('timer screen starting a session', () => {
  it('opens on the new-session form with Start disabled', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);

    expect(screen.getByRole('header', { name: 'New Session' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled();
  });

  it('shows the name and 00:00:00, and starts a Live Activity', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);

    await startSessionNamed('Chapter 5 Review');
    await act(() => controller.whenIdle());

    expect(screen.getByRole('header', { name: 'Chapter 5 Review' })).toBeOnTheScreen();
    expect(screen.getByText('00:00:00')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Session name')).not.toBeOnTheScreen();
    expect(getActivitySessionNames(presenter)).toEqual(['Chapter 5 Review']);
  });

  it('ticks the elapsed time as HH:MM:SS', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);
    // 90 minutes so the clock can pass an hour before the goal finishes the session.
    await fireEvent(screen.getByTestId('goal-slider'), 'valueChanged', {
      nativeEvent: { value: 8, eventCount: 1 },
    });
    await startSessionNamed('Chapter 5 Review');

    await advanceTime(1000);
    expect(screen.getByText('00:00:01')).toBeOnTheScreen();

    await advanceTime((1 * 3600 + 23 * 60 + 44) * 1000);
    expect(screen.getByText('01:23:45')).toBeOnTheScreen();
  });
});

// Requirement: Pause/Resume freezes and continues the time, and the Live Activity follows.
describe('timer screen pause and resume', () => {
  it('freezes the time while paused and updates the activity', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');
    await advanceTime(5000);

    await pressButton('Pause');
    await advanceTime(30_000);
    await act(() => controller.whenIdle());

    expect(screen.getByText('00:00:05')).toBeOnTheScreen();
    expect(screen.getByLabelText('Elapsed time 00:00:05, paused')).toBeOnTheScreen();
    expect(screen.queryByText('Paused')).not.toBeOnTheScreen();
    expect(presenter.calls).toContain('update:activity-1');
    expect(presenter.activeActivities.get('activity-1')?.session.runningSinceMs).toBeNull();

    await pressButton('Resume');
    await advanceTime(2000);
    expect(screen.getByText('00:00:07')).toBeOnTheScreen();
  });
});

// Requirement: Stop asks for confirmation with the minutes left. Confirming returns to the form and
// removes the Live Activity; cancelling keeps the session and its activity.
describe('timer screen stop', () => {
  it('asks "Are you sure you want to stop?" with the minutes left', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');
    await advanceTime(10 * 60 * 1000);

    await pressButton('Stop');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Are you sure you want to stop?',
      'You still have 5 minutes left in this session.',
      expect.any(Array)
    );
  });

  it('returns to the form and ends the activity once confirmed', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');

    await stopAndConfirm();
    await act(() => controller.whenIdle());

    expect(screen.getByRole('header', { name: 'New Session' })).toBeOnTheScreen();
    expect(screen.queryByText('Chapter 5 Review')).not.toBeOnTheScreen();
    expect(presenter.activeActivities.size).toBe(0);
  });

  it('keeps the session ticking and its activity showing when cancelled', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');

    await pressButton('Stop');
    await answerLatestAlert('Cancel');
    await advanceTime(1000);
    await act(() => controller.whenIdle());

    expect(screen.getByRole('header', { name: 'Chapter 5 Review' })).toBeOnTheScreen();
    expect(screen.getByText('00:00:01')).toBeOnTheScreen();
    expect(getActivitySessionNames(presenter)).toEqual(['Chapter 5 Review']);
  });

  it('leaves no activity behind after rapid start/stop', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);

    for (let tap = 0; tap < 3; tap += 1) {
      await startSessionNamed(`Session ${tap}`);
      await stopAndConfirm();
    }
    await act(() => controller.whenIdle());

    expect(presenter.activeActivities.size).toBe(0);
  });
});

// Requirement: the form starts at 15 minutes, and the chosen emoji is shown in the app and sent to
// the Live Activity.
describe('timer screen goal and emoji', () => {
  it('opens with a 15 minute goal', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);

    expect(screen.getByText('15 min')).toBeOnTheScreen();
  });

  it('shows the chosen emoji on the session and on its activity', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);

    await fireEvent.press(screen.getByRole('button', { name: '🍅' }));
    await startSessionNamed('Chapter 5 Review');
    await act(() => controller.whenIdle());

    expect(screen.getByText('🍅')).toBeOnTheScreen();
    expect(presenter.activeActivities.get('activity-1')?.session.emoji).toBe('🍅');
  });

  it('accepts an emoji typed into the any-emoji field', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);

    await fireEvent.changeText(screen.getByLabelText('Any emoji'), '🎸');
    await startSessionNamed('Chapter 5 Review');
    await act(() => controller.whenIdle());

    expect(screen.getByText('🎸')).toBeOnTheScreen();
    expect(presenter.activeActivities.get('activity-1')?.session.emoji).toBe('🎸');
  });
});

// Requirement: the Live Activity's Pause/Resume button pauses and resumes the session in the app.
describe('timer screen Live Activity pause button', () => {
  it('pauses as of the tap, then resumes from the Live Activity', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');
    await act(() => controller.whenIdle());
    await advanceTime(5000);

    // Paused at 3 s; the app only finds out after the clock has reached 5 s.
    await act(() => {
      presenter.tapPauseButton('activity-1', START_MS + 3000);
    });
    await act(() => controller.whenIdle());

    expect(screen.getByText('00:00:03')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeOnTheScreen();

    await advanceTime(5000);
    // Resumed at 8 s; the app finds out at 10 s, then two more seconds elapse.
    await act(() => {
      presenter.tapPauseButton('activity-1', START_MS + 8000);
    });
    await act(() => controller.whenIdle());
    await advanceTime(2000);

    expect(screen.getByText('00:00:07')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  });
});

// Requirement: at the goal the clock shows Finished, Restart runs it again, and Start a new session
// returns to the form without asking.
describe('timer screen finished session', () => {
  it('shows Finished, Restart and Start a new session', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');
    await advanceTime(15 * 60 * 1000);
    await act(() => controller.whenIdle());

    expect(screen.getByText('Finished!')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start a new session' })).toBeOnTheScreen();
    expect(screen.queryByText('00:15:00')).not.toBeOnTheScreen();
    const activity = presenter.activeActivities.get('activity-1');
    expect(activity?.session.runningSinceMs).toBeNull();
    expect(activity?.session.accumulatedMs).toBe(15 * 60 * 1000);
  });

  it('restarts from 00:00:00', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');
    await advanceTime(15 * 60 * 1000);

    await pressButton('Restart');

    expect(screen.getByText('00:00:00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
    expect(screen.queryByText('Finished!')).not.toBeOnTheScreen();
  });

  it('returns to the form without a confirmation', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');
    await advanceTime(15 * 60 * 1000);

    await pressButton('Start a new session');
    await act(() => controller.whenIdle());

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(screen.getByRole('header', { name: 'New Session' })).toBeOnTheScreen();
  });
});

// Requirement: after the app is killed and relaunched, the session restores from its activity.
describe('timer screen restore', () => {
  it('restores a running session with the correct time and ends duplicates', async () => {
    const { controller, presenter } = createTestController();
    presenter.seedActivity({
      activityId: 'stale-duplicate',
      session: startSession({ name: 'Older', goalSeconds: 1500 }, START_MS - 600_000),
      presentationVariant: 'default',
    });
    presenter.seedActivity({
      activityId: 'survivor',
      session: startSession({ name: 'Survivor', goalSeconds: 1500 }, START_MS - 90_000),
      presentationVariant: 'default',
    });

    await renderTimerScreen(controller);

    expect(screen.getByRole('header', { name: 'Survivor' })).toBeOnTheScreen();
    expect(screen.getByText('00:01:30')).toBeOnTheScreen();
    expect([...presenter.activeActivities.keys()]).toEqual(['survivor']);
  });

  it('restores a paused session as paused', async () => {
    const { controller, presenter } = createTestController();
    presenter.seedActivity({
      activityId: 'survivor',
      session: pauseSession(
        startSession({ name: 'Survivor', goalSeconds: 1500 }, START_MS - 90_000),
        START_MS - 60_000
      ),
      presentationVariant: 'default',
    });

    await renderTimerScreen(controller);

    expect(screen.getByText('00:00:30')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeOnTheScreen();
  });
});
