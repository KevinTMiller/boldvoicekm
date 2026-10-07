/**
 * Stop confirmation (ViewModel layer, pure).
 * Builds the "Are you sure you want to stop?" prompt the study timer view model shows before it
 * ends a session, and defines the presenter it shows the prompt through. TimerScreen (View)
 * supplies the presenter from components/study-timer/present-stop-session-confirmation.ts, so the
 * view model never calls dialog APIs itself and tests can answer the prompt with a fake.
 */
import { getRemainingGoalMs, type TimerSession } from '@/features/study-timer/timer-state';

/** Text of the stop confirmation. */
export type StopSessionConfirmationContent = {
  /** The question, shown as the dialog title. */
  title: string;
  /** How many minutes are left until the goal. Undefined once the goal is met. */
  message?: string;
};

/** A stop confirmation to show, plus what to do with the user's answer. */
export type StopSessionConfirmationRequest = StopSessionConfirmationContent & {
  /** Called only if the user confirms. */
  onConfirm: () => void;
  /** Called if the user dismisses the prompt. Omitted callers leave cancel as a no-op. */
  onCancel?: () => void;
};

/**
 * Shows a stop confirmation. Returns right away; the user's answer arrives later, through the
 * request's `onConfirm` or `onCancel`.
 */
export type PresentStopSessionConfirmation = (request: StopSessionConfirmationRequest) => void;

/**
 * Builds the stop confirmation's text for a session.
 *
 * @param session - The session the user wants to stop.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns The question, plus a minutes-left message while the goal is not met yet.
 */
export function buildStopSessionConfirmation(
  session: TimerSession,
  nowMs: number
): StopSessionConfirmationContent {
  return {
    title: 'Are you sure you want to stop?',
    message: formatMinutesLeftMessage(getRemainingGoalMs(session, nowMs)),
  };
}

/**
 * Describes the time left until the goal in whole minutes. Rounds up, so the last partial minute
 * reads "1 minute" rather than "0 minutes".
 *
 * @param remainingGoalMs - Time left until the goal, in milliseconds.
 * @returns For example "You still have 15 minutes left in this session.", or undefined when no
 *   time is left.
 */
function formatMinutesLeftMessage(remainingGoalMs: number): string | undefined {
  if (remainingGoalMs <= 0) {
    return undefined;
  }
  const minutesLeft = Math.ceil(remainingGoalMs / 60_000);
  const minuteWord = minutesLeft === 1 ? 'minute' : 'minutes';
  return `You still have ${minutesLeft} ${minuteWord} left in this session.`;
}
