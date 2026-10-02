// Default Lock Screen banner (widget layer).
// Mirrors the app's active-session screen in one row: the task emoji inside the goal progress ring,
// the elapsed time with the session title below it, and a Pause/Resume button (iOS 17 and later).
// While paused, the time freezes and the ring and digits dim. Built by DefaultLayout.swift, which
// reuses DefaultSessionRow for the expanded Dynamic Island.

import SwiftUI
import WidgetKit

/// Lock Screen view for the default layout.
struct DefaultLockScreenView: View {
  /// Static data the activity was started with.
  let attributes: StudyTimerAttributes
  /// Current content state.
  let state: StudyTimerAttributes.ContentState
  /// ActivityKit id of this activity, for the Pause/Resume button.
  let activityId: String
  /// Whether iOS is rendering this activity because the goal end has passed.
  let isStale: Bool

  /// The session row with Lock Screen padding.
  var body: some View {
    DefaultSessionRow(
      attributes: attributes,
      state: state,
      activityId: activityId,
      isStale: isStale,
      ringDiameter: 64,
      timeFontSize: 34
    )
    .padding(16)
  }
}

/// Ring with emoji, elapsed time over the session title, and the Pause/Resume button, in one row.
struct DefaultSessionRow: View {
  /// Static data the activity was started with.
  let attributes: StudyTimerAttributes
  /// Current content state.
  let state: StudyTimerAttributes.ContentState
  /// ActivityKit id of this activity, for the Pause/Resume button.
  let activityId: String
  /// Whether iOS is rendering this activity because the goal end has passed.
  let isStale: Bool
  /// Diameter of the progress ring, in points.
  let ringDiameter: CGFloat
  /// Point size of the elapsed time digits.
  let timeFontSize: CGFloat

  /// Ring, time and title, then the button at the trailing edge.
  var body: some View {
    HStack(spacing: 14) {
      EmojiProgressRing(
        attributes: attributes,
        state: state,
        diameter: ringDiameter,
        isFinished: isFinished
      )
      VStack(alignment: .leading, spacing: 2) {
        ElapsedTimeText(state: state, goalSeconds: attributes.goalSeconds, isStale: isStale)
          .font(.system(size: timeFontSize, weight: .semibold, design: .rounded).monospacedDigit())
          .foregroundStyle(isFinished || !state.isPaused ? .primary : .secondary)
          // Timer text reserves width for its longest possible value, so pin the digits to the
          // leading edge instead of letting them float inside that space.
          .multilineTextAlignment(.leading)
          .lineLimit(1)
        Text(attributes.sessionName)
          .font(.caption.weight(.semibold))
          .textCase(.uppercase)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      Spacer(minLength: 8)
      PauseResumeButton(activityId: activityId, isPaused: state.isPaused, isFinished: isFinished)
    }
  }

  /// True once the goal has been reached: paused at the goal, or the stale render at the goal end.
  private var isFinished: Bool {
    isStudyTimerFinished(state: state, goalSeconds: attributes.goalSeconds, isStale: isStale)
  }
}
