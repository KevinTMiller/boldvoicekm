/**
 * Tests for SessionProgressBar (View layer).
 */
import { render, screen } from '@testing-library/react-native';

import { SessionProgressBar } from '@/components/study-timer/session-progress-bar';

// Requirement: the progress bar shows how far the session is toward its goal, including to screen readers.
describe('SessionProgressBar', () => {
  it('exposes progress as a 0–100 progress bar value, with its caption', async () => {
    await render(<SessionProgressBar progress={0.4} label="40% of 25 min goal" />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 100, now: 40 });
    expect(screen.getByText('40% of 25 min goal')).toBeOnTheScreen();
  });

  it('rounds down, matching the caption', async () => {
    await render(<SessionProgressBar progress={0.999} label="99% of 25 min goal" />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 99 });
  });

  it('clamps progress outside 0 to 1', async () => {
    await render(<SessionProgressBar progress={1.7} label="100% of 25 min goal" />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 100 });
  });
});
