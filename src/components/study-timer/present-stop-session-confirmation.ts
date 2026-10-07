/**
 * Stop confirmation presenter (View layer, iOS and Android).
 * Shows the "Are you sure you want to stop?" prompt as a native alert: a UIAlertController on iOS
 * and an AlertDialog on Android. TimerScreen hands this to the study timer view model, which
 * decides when to show it and what it says. The web build uses
 * present-stop-session-confirmation.web.ts, because React Native Web's Alert does nothing.
 */
import { Alert } from 'react-native';

import type { StopSessionConfirmationRequest } from '@/features/study-timer/stop-session-confirmation';

/**
 * Shows the stop confirmation with Cancel and a destructive Stop button. Returns right away.
 *
 * @param request - Title, optional message, and the actions to run if the user taps Stop or Cancel.
 */
export function presentStopSessionConfirmation({
  title,
  message,
  onConfirm,
  onCancel,
}: StopSessionConfirmationRequest): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Stop', style: 'destructive', onPress: onConfirm },
  ]);
}
