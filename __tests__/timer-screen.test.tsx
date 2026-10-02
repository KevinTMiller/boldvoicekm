/**
 * End-to-end tests for the timer screen (View + ViewModel + Live Activity controller). The real
 * controller and immediate policy run on the in-memory fake presenter, so each test can check
 * what would be on the Lock Screen. This file sits outside src/app because Expo Router treats
 * every file in src/app as a route.
 *
 * Jest's modern fake timers advance Date.now together with timers, so the screen's clock follows
 * fake time. `whenIdle` waits for the controller's command queue to finish.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

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
});

afterEach(() => {
  jest.useRealTimers();
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
    expect(screen.getByText('Paused')).toBeOnTheScreen();
    expect(presenter.calls).toContain('update:activity-1');
    expect(presenter.activeActivities.get('activity-1')?.session.runningSinceMs).toBeNull();

    await pressButton('Resume');
    await advanceTime(2000);
    expect(screen.getByText('00:00:07')).toBeOnTheScreen();
  });
});

// Requirement: Stop returns to the form, and the Live Activity disappears.
describe('timer screen stop', () => {
  it('returns to the form and ends the activity', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('Chapter 5 Review');

    await pressButton('Stop');
    await act(() => controller.whenIdle());

    expect(screen.getByRole('header', { name: 'New Session' })).toBeOnTheScreen();
    expect(screen.queryByText('Chapter 5 Review')).not.toBeOnTheScreen();
    expect(presenter.activeActivities.size).toBe(0);
  });

  it('leaves no activity behind after rapid start/stop taps', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);

    for (let tap = 0; tap < 3; tap += 1) {
      await startSessionNamed(`Session ${tap}`);
      await pressButton('Stop');
    }
    await act(() => controller.whenIdle());

    expect(presenter.activeActivities.size).toBe(0);
  });
});

// Requirement: "Start New Session" sets up a new session while the current one keeps running.
describe('timer screen start new session', () => {
  it('keeps the current session ticking while the form is open, and can cancel', async () => {
    const { controller } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('First');

    await pressButton('Start New Session');
    await advanceTime(3000);

    expect(screen.getByText('00:00:03')).toBeOnTheScreen();
    expect(screen.getByLabelText('Session name')).toBeOnTheScreen();

    await pressButton('Cancel');
    expect(screen.queryByLabelText('Session name')).not.toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'First' })).toBeOnTheScreen();
  });

  it('replaces the session, leaving exactly one activity', async () => {
    const { controller, presenter } = createTestController();
    await renderTimerScreen(controller);
    await startSessionNamed('First');
    await advanceTime(5000);

    await pressButton('Start New Session');
    await startSessionNamed('Second');
    await act(() => controller.whenIdle());

    expect(screen.getByRole('header', { name: 'Second' })).toBeOnTheScreen();
    expect(screen.getByText('00:00:00')).toBeOnTheScreen();
    expect(getActivitySessionNames(presenter)).toEqual(['Second']);
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
