// Goal progress shared by every layout (widget layer).
// While running, it uses `ProgressView(timerInterval:)`, which iOS animates toward the goal by
// itself; while paused, it shows a fixed fraction. Once the goal is complete it shows a full
// circle. EmojiProgressRing.swift styles it as a ring and turns that circle blue.

import SwiftUI

/// Progress toward the session goal, filling from 0 to 1.
struct GoalProgressView: View {
  /// Current content state.
  let state: StudyTimerAttributes.ContentState
  /// Goal duration in seconds.
  let goalSeconds: Double
  /// Draws a full circle. Set once the goal has been reached, including the stale render at the
  /// goal end, so the ring does not sit on the last moment of the timer interval.
  var isFinished: Bool = false

  /// A full circle once finished; self-animating progress while running; a fixed fraction while paused.
  var body: some View {
    if isFinished || state.isPaused {
      ProgressView(value: isFinished ? 1 : pausedProgress)
    } else {
      ProgressView(timerInterval: goalInterval, countsDown: false) {
        EmptyView()
      } currentValueLabel: {
        // Hide the built-in time label; layouts show ElapsedTimeText instead.
        EmptyView()
      }
    }
  }

  /// Goal duration guarded against zero, since a zero-length interval would never fill.
  private var safeGoalSeconds: Double {
    max(goalSeconds, 1)
  }

  /// From the running clock's effective start to the moment the goal is reached.
  private var goalInterval: ClosedRange<Date> {
    state.runningSinceDate...state.runningSinceDate.addingTimeInterval(safeGoalSeconds)
  }

  /// Fraction of the goal completed when the timer was paused, clamped to 0...1.
  private var pausedProgress: Double {
    min(max(state.pausedElapsedSeconds / safeGoalSeconds, 0), 1)
  }
}
