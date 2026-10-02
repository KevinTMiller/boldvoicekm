/**
 * Stop confirmation presenter (View layer, web).
 * React Native Web's Alert.alert does nothing, so on web the "Are you sure you want to stop?"
 * prompt uses the browser's confirm dialog instead. Native builds use
 * present-stop-session-confirmation.ts; TimerScreen hands whichever applies to the view model.
 */
import type { StopSessionConfirmationRequest } from '@/features/study-timer/stop-session-confirmation';

/**
 * Asks with the browser's confirm dialog and runs `onConfirm` if the user clicks OK.
 *
 * @param request - Title, optional message, and the action to run on OK.
 */
export function presentStopSessionConfirmation({
  title,
  message,
  onConfirm,
}: StopSessionConfirmationRequest): void {
  const prompt = message === undefined ? title : `${title}\n\n${message}`;
  if (window.confirm(prompt)) {
    onConfirm();
  }
}
