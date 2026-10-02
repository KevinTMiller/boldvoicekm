/**
 * Tests for the web stop confirmation presenter (View layer). Jest has no browser dialogs, so
 * window.confirm is replaced with a mock that answers OK or Cancel. jest-expo points `window` at
 * the global object, which is why assigning to it works here.
 */
import { presentStopSessionConfirmation } from '@/components/study-timer/present-stop-session-confirmation.web';

const originalConfirm = window.confirm;

afterEach(() => {
  window.confirm = originalConfirm;
});

// Requirement: Stop still asks for confirmation on web, where React Native's Alert does nothing.
describe('presentStopSessionConfirmation on web', () => {
  it('asks with the question and the minutes left, and confirms on OK', () => {
    window.confirm = jest.fn(() => true);
    const onConfirm = jest.fn();

    presentStopSessionConfirmation({
      title: 'Are you sure you want to stop?',
      message: 'You still have 15 minutes left in this session.',
      onConfirm,
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to stop?\n\nYou still have 15 minutes left in this session.'
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('asks with only the question when there is no message, and does nothing on Cancel', () => {
    window.confirm = jest.fn(() => false);
    const onConfirm = jest.fn();

    presentStopSessionConfirmation({ title: 'Are you sure you want to stop?', onConfirm });

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to stop?');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
