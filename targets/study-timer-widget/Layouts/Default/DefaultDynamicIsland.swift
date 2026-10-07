// Default Dynamic Island presentations (widget layer).
// - Compact: the task emoji on the leading side and the elapsed time on the trailing side.
// - Expanded: the full session name, the emoji, the elapsed time, and the progress ring, in the
//   bottom region so they sit below the camera. The Pause/Resume button stays on this presentation.
// - Minimal (shown when another app's activity shares the island): the elapsed time only.
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
        // The name wraps here. The Lock Screen keeps a single uppercase line; this presentation
        // shows the name as typed, up to the 60-character limit enforced when the session starts.
        DefaultSessionRow(
          attributes: attributes,
          state: state,
          activityId: activityId,
          isStale: isStale,
          ringDiameter: 52,
          timeFontSize: 28,
          sessionNameLineLimit: 3,
          uppercasesSessionName: false
        )
        .padding(.horizontal, 4)
      }
    } compactLeading: {
      Text(attributes.sessionEmoji)
        .font(.system(size: 16))
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
      // The minimal capsule is only a few dozen points wide, so the digits shrink to fit instead
      // of truncating to a single character.
      ElapsedTimeText(state: state, goalSeconds: attributes.goalSeconds, isStale: isStale)
        .font(.system(size: 11, weight: .semibold, design: .rounded).monospacedDigit())
        .minimumScaleFactor(0.5)
        .lineLimit(1)
        .foregroundStyle(compactTimeColor(state: state, goalSeconds: attributes.goalSeconds, isStale: isStale))
    }
    .keylineTint(StudyTimerWidgetPalette.progressRing)
  }

  /// Color of the elapsed time in the compact and minimal presentations.
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
