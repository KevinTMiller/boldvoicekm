// Elapsed time text shared by every layout (widget layer).
// While running, it uses `Text(timerInterval:)`, which iOS redraws every second on its own, so the
// Lock Screen and Dynamic Island stay current even while the app is suspended or killed. The
// interval ends when the goal is reached, so the clock does not keep counting past it. While
// paused, it shows static text formatted the same way. "Finished!" shows once the activity is
// paused at its goal, or when iOS re-renders a running activity as stale — the app sets that
// stale date to the goal end, so the Lock Screen switches even if the app is suspended.

import SwiftUI

/// Elapsed study time that ticks natively while running, freezes while paused, and reads
/// "Finished!" once the goal has been reached.
struct ElapsedTimeText: View {
  /// Current content state.
  let state: StudyTimerAttributes.ContentState
  /// Goal duration in seconds. The running clock stops here.
  let goalSeconds: Double
  /// Whether to show an hours component once past 60 minutes. When false, minutes keep counting.
  var showsHours: Bool = true
  /// True when iOS has re-rendered this activity because its stale date, the goal end, has passed.
  var isStale: Bool = false

  /// "Finished!" at the goal; native timer text while running; frozen formatted text while paused.
  var body: some View {
    if isStudyTimerFinished(state: state, goalSeconds: goalSeconds, isStale: isStale) {
      Text("Finished!")
    } else if state.isPaused {
      Text(formatPausedElapsedTime(seconds: state.pausedElapsedSeconds, showsHours: showsHours))
    } else {
      Text(timerInterval: goalInterval, countsDown: false, showsHours: showsHours)
    }
  }

  /// From the running clock's effective start until the goal. A non-positive goal still gets a
  /// one-second interval, because a zero-length range cannot be displayed.
  private var goalInterval: ClosedRange<Date> {
    let duration = max(goalSeconds, 1)
    return state.runningSinceDate...state.runningSinceDate.addingTimeInterval(duration)
  }
}

/// Reports whether the activity should read "Finished!".
/// A paused activity is finished once its frozen time has reached the goal. A running activity is
/// finished when iOS marks it stale: the app sets that stale date to the goal end, and iOS
/// re-renders the widget then even if the app is suspended. `Text(timerInterval:)` cannot change
/// its own words when the interval ends — it just shows the goal time, such as "1:00" — so this
/// stale render is what replaces that time.
/// - Parameters:
///   - state: Current content state.
///   - goalSeconds: Goal duration in seconds.
///   - isStale: Whether iOS is rendering the activity because its stale date has passed.
/// - Returns: True when the goal has been reached.
func isStudyTimerFinished(
  state: StudyTimerAttributes.ContentState,
  goalSeconds: Double,
  isStale: Bool
) -> Bool {
  if state.isPaused {
    return state.pausedElapsedSeconds >= goalSeconds
  }
  return isStale
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
