/**
 * Tests for NewSessionForm (View layer).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  NewSessionForm,
  type NewSessionFormProps,
} from '@/components/study-timer/new-session-form';

/**
 * Builds form props with mock handlers.
 *
 * @param overrides - Props to change.
 * @returns Complete props.
 */
function createFormProps(overrides: Partial<NewSessionFormProps> = {}): NewSessionFormProps {
  return {
    draftSessionName: '',
    maxSessionNameLength: 60,
    goalOptionsMinutes: [25, 50, 90],
    selectedGoalMinutes: 25,
    canStartSession: false,
    canCancel: false,
    onChangeDraftSessionName: jest.fn(),
    onSelectGoalMinutes: jest.fn(),
    onPressStart: jest.fn(),
    onPressCancel: jest.fn(),
    ...overrides,
  };
}

// Requirement: a session starts with a custom name, and Start needs a name first.
describe('NewSessionForm starting', () => {
  it('disables Start Session while the name is invalid', async () => {
    const props = createFormProps({ canStartSession: false });
    await render(<NewSessionForm {...props} />);

    const startButton = screen.getByRole('button', { name: 'Start Session' });
    await fireEvent.press(startButton);

    expect(startButton).toBeDisabled();
    expect(props.onPressStart).not.toHaveBeenCalled();
  });

  it('starts when Start Session is pressed', async () => {
    const props = createFormProps({ draftSessionName: 'Chapter 5', canStartSession: true });
    await render(<NewSessionForm {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Start Session' }));

    expect(props.onPressStart).toHaveBeenCalledTimes(1);
  });

  it("starts from the keyboard's Go key", async () => {
    const props = createFormProps({ draftSessionName: 'Chapter 5', canStartSession: true });
    await render(<NewSessionForm {...props} />);

    await fireEvent(screen.getByLabelText('Session name'), 'submitEditing');

    expect(props.onPressStart).toHaveBeenCalledTimes(1);
  });
});

// Requirement: the user types a custom session name, within the length limit.
describe('NewSessionForm name input', () => {
  it('reports typing', async () => {
    const props = createFormProps();
    await render(<NewSessionForm {...props} />);

    await fireEvent.changeText(screen.getByLabelText('Session name'), 'Organic Chemistry');

    expect(props.onChangeDraftSessionName).toHaveBeenCalledWith('Organic Chemistry');
  });

  it('shows the draft and caps its length', async () => {
    await render(<NewSessionForm {...createFormProps({ draftSessionName: 'Chapter 5' })} />);

    const input = screen.getByLabelText('Session name');

    expect(input).toHaveDisplayValue('Chapter 5');
    expect(input.props.maxLength).toBe(60);
  });
});

// Requirement: Cancel is offered only while composing over an active session.
describe('NewSessionForm cancel', () => {
  it('hides Cancel when there is no session to go back to', async () => {
    await render(<NewSessionForm {...createFormProps({ canCancel: false })} />);

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeOnTheScreen();
  });

  it('reports Cancel when it is offered', async () => {
    const props = createFormProps({ canCancel: true });
    await render(<NewSessionForm {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onPressCancel).toHaveBeenCalledTimes(1);
  });
});
