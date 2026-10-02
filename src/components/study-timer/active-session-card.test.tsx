/**
 * Tests for ActiveSessionCard (View layer), including the ProgressRing, PauseResumeButton and
 * TimerButton inside it.
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
    sessionEmoji: '🍅',
    sessionName: 'Chapter 5 Review',
    formattedElapsedTime: '01:23:45',
    isPaused: false,
    isFinished: false,
    goalProgress: 0.5,
    ringButtonAction: 'pause',
    sessionActionLabel: 'Stop',
    onPressPauseOrResume: jest.fn(),
    onPressStop: jest.fn(),
    ...overrides,
  };
}

// Requirement: the ring holds the emoji, the HH:MM:SS time and the title below it, and the ring
// alone shows progress (no "X% of Y min goal" line).
describe('ActiveSessionCard display', () => {
  it('shows the emoji, elapsed time and title inside a progress ring', async () => {
    await render(<ActiveSessionCard {...createCardProps()} />);

    expect(screen.getByText('🍅')).toBeOnTheScreen();
    expect(screen.getByText('01:23:45')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Chapter 5 Review' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Goal progress' })).toHaveAccessibilityValue({
      now: 50,
    });
  });

  it('shrinks the elapsed time so HH:MM:SS stays inside the ring', async () => {
    await render(<ActiveSessionCard {...createCardProps()} />);

    const elapsedTime = screen.getByText('01:23:45');

    expect(elapsedTime).toHaveProp('adjustsFontSizeToFit', true);
    expect(elapsedTime).toHaveProp('numberOfLines', 1);
    expect(elapsedTime).toHaveStyle({ alignSelf: 'stretch' });
  });

  it('has no percentage caption', async () => {
    await render(<ActiveSessionCard {...createCardProps()} />);

    expect(screen.queryByText(/% of/)).not.toBeOnTheScreen();
  });

  it('marks a paused session for screen readers and offers Resume', async () => {
    await render(
      <ActiveSessionCard
        {...createCardProps({ isPaused: true, ringButtonAction: 'resume' })}
      />
    );

    expect(screen.getByLabelText('Elapsed time 01:23:45, paused')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeOnTheScreen();
  });

  it('shows Finished, Restart and Start a new session once the goal is complete', async () => {
    await render(
      <ActiveSessionCard
        {...createCardProps({
          isFinished: true,
          goalProgress: 1,
          ringButtonAction: 'restart',
          sessionActionLabel: 'Start a new session',
        })}
      />
    );

    expect(screen.getByText('Finished!')).toBeOnTheScreen();
    expect(screen.queryByText('01:23:45')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start a new session' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeOnTheScreen();
  });
});

// Requirement: the Pause/Resume button inside the ring and the Stop button drive the session.
describe('ActiveSessionCard controls', () => {
  it('reports Pause and Stop presses', async () => {
    const props = createCardProps();
    await render(<ActiveSessionCard {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));

    expect(props.onPressPauseOrResume).toHaveBeenCalledTimes(1);
    expect(props.onPressStop).toHaveBeenCalledTimes(1);
  });
});
