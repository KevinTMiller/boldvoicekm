/**
 * Tests for GoalPicker (View layer). Jest renders the iOS build of the @expo/ui segmented control,
 * whose native picker reports taps through a `selectionChange` event carrying the segment index.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { GoalPicker } from '@/components/study-timer/goal-picker';

const GOAL_OPTIONS_MINUTES = [25, 50, 90];

/**
 * Simulates a tap on a segment of the native picker.
 *
 * @param segmentIndex - Index of the tapped segment.
 */
async function tapGoalSegment(segmentIndex: number) {
  await fireEvent(screen.getByTestId('goal-picker'), 'selectionChange', {
    nativeEvent: { selection: segmentIndex },
  });
}

// Requirement: the user picks a 25, 50 or 90 minute goal for the progress bar and ring.
describe('GoalPicker', () => {
  it('reports the tapped preset in minutes', async () => {
    const onSelectGoalMinutes = jest.fn();
    await render(
      <GoalPicker
        goalOptionsMinutes={GOAL_OPTIONS_MINUTES}
        selectedGoalMinutes={25}
        onSelectGoalMinutes={onSelectGoalMinutes}
      />
    );

    await tapGoalSegment(2);

    expect(onSelectGoalMinutes).toHaveBeenCalledWith(90);
  });

  it('ignores a segment index outside the presets', async () => {
    const onSelectGoalMinutes = jest.fn();
    await render(
      <GoalPicker
        goalOptionsMinutes={GOAL_OPTIONS_MINUTES}
        selectedGoalMinutes={25}
        onSelectGoalMinutes={onSelectGoalMinutes}
      />
    );

    await tapGoalSegment(7);

    expect(onSelectGoalMinutes).not.toHaveBeenCalled();
  });
});
