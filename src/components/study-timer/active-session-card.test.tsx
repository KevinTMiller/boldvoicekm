/**
 * Tests for ActiveSessionCard (View layer), including the TimerControls and TimerButton inside it.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  ActiveSessionCard,
  type ActiveSessionCardProps,
} from '@/components/study-timer/active-session-card';

/**
 * Builds card props for a running session, with mock handlers.
 *
 * @param overrides - Props to change.
 * @returns Complete props.
 */
function createCardProps(overrides: Partial<ActiveSessionCardProps> = {}): ActiveSessionCardProps {
  return {
    sessionName: 'Chapter 5 Review',
    formattedElapsedTime: '01:23:45',
    isPaused: false,
    goalProgress: 0.5,
    goalProgressLabel: '50% of 90 min goal',
    pauseButtonLabel: 'Pause',
    isStartNewSessionVisible: true,
    onPressPauseOrResume: jest.fn(),
    onPressStop: jest.fn(),
    onPressStartNewSession: jest.fn(),
    ...overrides,
  };
}

// Requirement: the active session shows its name, HH:MM:SS time and goal progress.
describe('ActiveSessionCard display', () => {
  it('shows the session name, elapsed time and progress', async () => {
    await render(<ActiveSessionCard {...createCardProps()} />);

    expect(screen.getByRole('header', { name: 'Chapter 5 Review' })).toBeOnTheScreen();
    expect(screen.getByText('01:23:45')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 50 });
    expect(screen.queryByText('Paused')).not.toBeOnTheScreen();
  });

  it('marks a paused session and offers Resume', async () => {
    await render(
      <ActiveSessionCard {...createCardProps({ isPaused: true, pauseButtonLabel: 'Resume' })} />
    );

    expect(screen.getByText('Paused')).toBeOnTheScreen();
    expect(screen.getByLabelText('Elapsed time 01:23:45, paused')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeOnTheScreen();
  });
});

// Requirement: Pause/Resume, Stop and Start New Session controls drive the session.
describe('ActiveSessionCard controls', () => {
  it('reports Pause, Stop and Start New Session presses', async () => {
    const props = createCardProps();
    await render(<ActiveSessionCard {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Start New Session' }));

    expect(props.onPressPauseOrResume).toHaveBeenCalledTimes(1);
    expect(props.onPressStop).toHaveBeenCalledTimes(1);
    expect(props.onPressStartNewSession).toHaveBeenCalledTimes(1);
  });

  it('hides Start New Session while the new-session form is open', async () => {
    await render(<ActiveSessionCard {...createCardProps({ isStartNewSessionVisible: false })} />);

    expect(screen.queryByRole('button', { name: 'Start New Session' })).not.toBeOnTheScreen();
  });
});
