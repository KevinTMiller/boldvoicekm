/**
 * Tests for the no-op presenter (Model layer): the fallback that shows nothing.
 */
import {
  NOOP_PRESENTER_ID,
  createNoopPresenter,
} from '@/features/live-activity/presenters/noop-presenter';
import { startSession } from '@/features/study-timer/timer-state';

// Requirement: on unsupported devices the timer keeps working and nothing ever throws.
describe('no-op presenter', () => {
  it('is always supported and registers under the "noop" id', () => {
    const presenter = createNoopPresenter();

    expect(presenter.id).toBe(NOOP_PRESENTER_ID);
    expect(presenter.isSupported()).toBe(true);
  });

  it('accepts every command without showing anything', async () => {
    const presenter = createNoopPresenter();
    const session = startSession({ name: 'Chapter 5', goalSeconds: 1500 }, 0);

    await expect(presenter.start(session, 'default')).resolves.toBeNull();
    await expect(presenter.update('activity-1', session)).resolves.toBeUndefined();
    await expect(presenter.end('activity-1')).resolves.toBeUndefined();
    await expect(presenter.endAll()).resolves.toBeUndefined();
    await expect(presenter.listActive()).resolves.toEqual([]);
  });

  it('accepts a Pause/Resume listener without ever calling it', () => {
    const listener = jest.fn();

    const subscription = createNoopPresenter().addPauseChangeListener(listener);

    expect(() => subscription.remove()).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});
