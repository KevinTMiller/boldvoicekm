// Default Dynamic Island presentations (widget layer).
// - Expanded: the same row as the Lock Screen (emoji progress ring, elapsed time over the session
//   title, Pause/Resume button), placed below the camera so it lays out predictably.
// - Compact: the task emoji with the session name beside it, and the elapsed time.
// - Minimal (shown when another app's activity shares the island): the emoji inside a small ring.
// Built by DefaultLayout.swift.

import SwiftUI
import WidgetKit

/// Builds the Dynamic Island for the default layout. Main-actor isolated because SwiftUI styles
/// such as `.circular` are.
@MainActor
enum DefaultDynamicIsland {
  /// Builds every Dynamic Island presentation.
  /// - Parameters:
  ///   - attributes: Static data the activity was started with.
  ///   - state: Current content state.
  ///   - activityId: ActivityKit id of this activity, for the Pause/Resume button.
  ///   - isStale: Whether iOS is rendering this activity because the goal end, its stale date, has
  ///     passed. That render shows "Finished!" even though the app may be suspended.
  /// - Returns: The configured Dynamic Island.
  static func make(
    attributes: StudyTimerAttributes,
    state: StudyTimerAttributes.ContentState,
    activityId: String,
    isStale: Bool
  ) -> DynamicIsland {
    let isFinished = isStudyTimerFinished(
      state: state,
      goalSeconds: attributes.goalSeconds,
      isStale: isStale
    )
    return DynamicIsland {
      DynamicIslandExpandedRegion(.bottom) {
        DefaultSessionRow(
          attributes: attributes,
          state: state,
          activityId: activityId,
          isStale: isStale,
          ringDiameter: 52,
          timeFontSize: 30
        )
        .padding(.horizontal, 4)
      }
    } compactLeading: {
      // The name sits beside the emoji in the compact island. A long name truncates rather than
      // pushing the elapsed time off the trailing side.
      HStack(spacing: 4) {
        Text(attributes.sessionEmoji)
          .font(.system(size: 15))
        Text(attributes.sessionName)
          .font(.caption2.weight(.semibold))
          .lineLimit(1)
      }
    } compactTrailing: {
      // A fixed maximum width stops the timer text from reserving extra space and pushing the
      // island wider than needed.
      ElapsedTimeText(state: state, goalSeconds: attributes.goalSeconds, isStale: isStale)
        .font(.caption.monospacedDigit().weight(.semibold))
        .multilineTextAlignment(.trailing)
        // "Finished!" is wider than a short time, so give it a little more room than the digits.
        .frame(maxWidth: isFinished ? 88 : 56)
        .foregroundStyle(compactTimeColor(state: state, goalSeconds: attributes.goalSeconds, isStale: isStale))
    } minimal: {
      EmojiProgressRing(attributes: attributes, state: state, diameter: 24, isFinished: isFinished)
    }
    .keylineTint(StudyTimerWidgetPalette.progressRing)
  }

  /// Color of the compact elapsed time.
  /// - Parameters:
  ///   - state: Current content state.
  ///   - goalSeconds: Goal duration in seconds.
  ///   - isStale: Whether this render is the goal-end stale render.
  /// - Returns: The ring color, dimmed while paused before the goal. Finished stays full strength.
  private static func compactTimeColor(
    state: StudyTimerAttributes.ContentState,
    goalSeconds: Double,
    isStale: Bool
  ) -> Color {
    state.isPaused && !isStudyTimerFinished(state: state, goalSeconds: goalSeconds, isStale: isStale)
      ? StudyTimerWidgetPalette.progressRing.opacity(StudyTimerWidgetPalette.pausedOpacity)
      : StudyTimerWidgetPalette.progressRing
  }
}
