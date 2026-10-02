// Emoji progress ring shared by every layout (widget layer).
// A circular track that fills clockwise toward the goal with the session's task emoji in its
// center, mirroring the ring on the app's active-session screen. GoalProgressView supplies the
// fill: iOS animates it by itself while running, it holds still (dimmed) while paused, and it
// closes into a full circle once the goal is complete. The stroke color is `ringColorHex` on the
// activity state, which the app sends: orange while running, dimmed while paused, blue when done.

import SwiftUI

/// The goal progress ring with the task emoji inside.
struct EmojiProgressRing: View {
  /// Static data the activity was started with; supplies the emoji and the goal.
  let attributes: StudyTimerAttributes
  /// Current content state.
  let state: StudyTimerAttributes.ContentState
  /// Outer diameter of the ring, in points. The emoji scales with it.
  let diameter: CGFloat
  /// Closes the ring and tints it blue. Set once the goal has been reached.
  var isFinished: Bool = false

  /// Ring with the emoji centered in it.
  var body: some View {
    GoalProgressView(state: state, goalSeconds: attributes.goalSeconds, isFinished: isRingClosed)
      .progressViewStyle(.circular)
      .tint(Color(studyTimerHex: state.ringColorHex) ?? StudyTimerWidgetPalette.progressRing)
      .frame(width: diameter, height: diameter)
      .overlay {
        Text(attributes.sessionEmoji)
          .font(.system(size: diameter * 0.42))
          // VoiceOver reads the ring's progress; the emoji is decoration.
          .accessibilityHidden(true)
      }
  }

  /// True when the ring should be a complete circle: the app sent the finished blue, or the goal
  /// time has been reached and this render is the stale one.
  private var isRingClosed: Bool {
    isFinished
      || state.ringColorHex.caseInsensitiveCompare(
        StudyTimerAttributes.ContentState.finishedRingColorHex
      ) == .orderedSame
  }
}
