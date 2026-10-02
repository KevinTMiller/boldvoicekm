/**
 * Tests for the native stop confirmation presenter (View layer). Alert.alert is replaced with a
 * spy, so the tests read the buttons it was given and "tap" them by calling their onPress.
 */
import { Alert, type AlertButton } from 'react-native';

import { presentStopSessionConfirmation } from '@/components/study-timer/present-stop-session-confirmation';

/**
 * Finds a button in the most recent alert.
 *
 * @param buttonText - The button's label.
 * @returns The button, or undefined if the alert has none with that label.
 */
function getAlertButton(buttonText: string): AlertButton | undefined {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  return buttons?.find((button) => button.text === buttonText);
}

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Requirement: Stop shows a native alert, and only its Stop button stops the session.
describe('presentStopSessionConfirmation on native', () => {
  it('shows the question, the minutes left, Cancel and a destructive Stop', () => {
    presentStopSessionConfirmation({
      title: 'Are you sure you want to stop?',
      message: 'You still have 15 minutes left in this session.',
      onConfirm: jest.fn(),
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Are you sure you want to stop?',
      'You still have 15 minutes left in this session.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: expect.any(Function) },
      ]
    );
  });

  it('confirms only when Stop is tapped', () => {
    const onConfirm = jest.fn();
    presentStopSessionConfirmation({ title: 'Are you sure you want to stop?', onConfirm });

    getAlertButton('Cancel')?.onPress?.();
    expect(onConfirm).not.toHaveBeenCalled();

    getAlertButton('Stop')?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
