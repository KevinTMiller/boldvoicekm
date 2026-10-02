// Default Dynamic Island presentations (widget layer).
// - Compact: the session name, truncated to one line, and the elapsed time.
// - Expanded: the full session name, a large elapsed time, a goal progress ring and a
//   Studying/Paused status.
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
  /// - Returns: The configured Dynamic Island.
  static func make(
    attributes: StudyTimerAttributes,
    state: StudyTimerAttributes.ContentState
  ) -> DynamicIsland {
    DynamicIsland {
      DynamicIslandExpandedRegion(.leading) {
        Label(state.isPaused ? "Paused" : "Studying", systemImage: state.isPaused ? "pause.fill" : "book.fill")
          .font(.caption.weight(.semibold))
          .foregroundStyle(StudyTimerWidgetPalette.accent)
      }
      DynamicIslandExpandedRegion(.trailing) {
        GoalProgressView(state: state, goalSeconds: attributes.goalSeconds)
          .progressViewStyle(.circular)
          .tint(StudyTimerWidgetPalette.accent)
          .frame(width: 36, height: 36)
      }
      DynamicIslandExpandedRegion(.center) {
        Text(attributes.sessionName)
          .font(.headline)
          .lineLimit(2)
          .multilineTextAlignment(.center)
      }
      DynamicIslandExpandedRegion(.bottom) {
        ElapsedTimeText(state: state)
          .font(.largeTitle.monospacedDigit().weight(.semibold))
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
      }
    } compactLeading: {
      Text(attributes.sessionName)
        .font(.caption.weight(.semibold))
        .lineLimit(1)
        .truncationMode(.tail)
        .frame(maxWidth: 64, alignment: .leading)
    } compactTrailing: {
      // A fixed maximum width stops the timer text from reserving extra space and pushing the
      // island wider than needed.
      ElapsedTimeText(state: state)
        .font(.caption.monospacedDigit().weight(.semibold))
        .multilineTextAlignment(.trailing)
        .frame(maxWidth: 56)
        .foregroundStyle(StudyTimerWidgetPalette.accent)
    } minimal: {
      // The minimal view is tiny, so drop the hours component (minutes keep counting past 59).
      ElapsedTimeText(state: state, showsHours: false)
        .font(.system(size: 11, weight: .semibold).monospacedDigit())
        .multilineTextAlignment(.center)
        .foregroundStyle(StudyTimerWidgetPalette.accent)
    }
    .keylineTint(StudyTimerWidgetPalette.accent)
  }
}
