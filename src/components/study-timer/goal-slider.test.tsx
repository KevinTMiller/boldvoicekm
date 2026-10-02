/**
 * Tests for GoalSlider (View layer). Jest renders the iOS build, where the slider is the ExpoUI
 * SwiftUI view. Firing its native "valueChanged" event stands in for the user dragging the thumb.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { GoalSlider } from '@/components/study-timer/goal-slider';
import { SESSION_GOAL_OPTIONS_MINUTES } from '@/features/study-timer/session-goals';

/**
 * Simulates the native slider reporting a new thumb position.
 *
 * @param sliderPosition - Step position the thumb moved to.
 */
async function moveSliderTo(sliderPosition: number) {
  await fireEvent(screen.getByTestId('goal-slider'), 'valueChanged', {
    nativeEvent: { value: sliderPosition, eventCount: 1 },
  });
}

// Requirement: the slider has one evenly spaced stop per goal option, and shows the selected goal.
describe('GoalSlider', () => {
  it('shows the selected goal and puts the thumb on its stop', async () => {
    await render(
      <GoalSlider
        goalOptionsMinutes={SESSION_GOAL_OPTIONS_MINUTES}
        goalMinutes={45}
        onChangeGoalMinutes={jest.fn()}
      />
    );

    expect(screen.getByText('45 min')).toBeOnTheScreen();
    expect(screen.getByTestId('goal-slider')).toHaveProp('value', 5);
    expect(screen.getByTestId('goal-slider')).toHaveProp('max', 8);
    expect(screen.getByTestId('goal-slider')).toHaveProp('step', 1);
  });

  it('reports the minutes at the stop the user moves to', async () => {
    const onChangeGoalMinutes = jest.fn();
    await render(
      <GoalSlider
        goalOptionsMinutes={SESSION_GOAL_OPTIONS_MINUTES}
        goalMinutes={15}
        onChangeGoalMinutes={onChangeGoalMinutes}
      />
    );

    await moveSliderTo(7);

    expect(onChangeGoalMinutes).toHaveBeenLastCalledWith(75);
  });

  it('snaps an in-between position to the nearest stop', async () => {
    const onChangeGoalMinutes = jest.fn();
    await render(
      <GoalSlider
        goalOptionsMinutes={SESSION_GOAL_OPTIONS_MINUTES}
        goalMinutes={15}
        onChangeGoalMinutes={onChangeGoalMinutes}
      />
    );

    await moveSliderTo(3.8);

    expect(onChangeGoalMinutes).toHaveBeenLastCalledWith(30);
  });
});
