// Elapsed time text shared by every layout (widget layer).
// While running, it uses `Text(timerInterval:)`, which iOS redraws every second on its own, so the
// Lock Screen and Dynamic Island stay current even while the app is suspended or killed. While
// paused, it shows static text formatted the same way, so pausing never changes the format.

import SwiftUI

/// Elapsed study time that ticks natively while running and freezes while paused.
struct ElapsedTimeText: View {
  /// Current content state.
  let state: StudyTimerAttributes.ContentState
  /// Whether to show an hours component once past 60 minutes. When false, minutes keep counting.
  var showsHours: Bool = true

  /// Native timer text while running; frozen formatted text while paused.
  var body: some View {
    if state.isPaused {
      Text(formatPausedElapsedTime(seconds: state.pausedElapsedSeconds, showsHours: showsHours))
    } else {
      Text(
        timerInterval: state.runningSinceDate...Date.distantFuture,
        countsDown: false,
        showsHours: showsHours
      )
    }
  }
}

/// Formats frozen elapsed time the way `Text(timerInterval:)` formats a running timer: "M:SS"
/// under an hour, then "H:MM:SS" (or "M:SS" with ever-growing minutes when `showsHours` is false).
/// - Parameters:
///   - seconds: Elapsed seconds. Negative or non-finite values render as zero.
///   - showsHours: Whether to switch to an hours component past 60 minutes.
/// - Returns: The formatted time, for example "5:07" or "1:23:45".
func formatPausedElapsedTime(seconds: Double, showsHours: Bool) -> String {
  // Int(_:) traps on NaN and infinity, so sanitize before converting.
  let safeSeconds = seconds.isFinite ? max(0, seconds) : 0
  let totalSeconds = Int(safeSeconds)
  let hours = totalSeconds / 3600
  let minutesWithinHour = (totalSeconds % 3600) / 60
  let secondsWithinMinute = totalSeconds % 60
  if showsHours && hours > 0 {
    return String(format: "%d:%02d:%02d", hours, minutesWithinHour, secondsWithinMinute)
  }
  return String(format: "%d:%02d", totalSeconds / 60, secondsWithinMinute)
}
