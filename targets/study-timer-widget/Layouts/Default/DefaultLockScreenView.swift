// Default Lock Screen banner (widget layer).
// Shows the session name and elapsed time on one row with a goal progress bar underneath. While
// paused, the time freezes and a "Paused" label appears. Built by DefaultLayout.swift.

import SwiftUI
import WidgetKit

/// Lock Screen view for the default layout.
struct DefaultLockScreenView: View {
  /// Static data the activity was started with.
  let attributes: StudyTimerAttributes
  /// Current content state.
  let state: StudyTimerAttributes.ContentState

  /// Name and time row above the goal progress row.
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 8) {
        Image(systemName: "book.fill")
          .foregroundStyle(StudyTimerWidgetPalette.accent)
        Text(attributes.sessionName)
          .font(.headline)
          .lineLimit(1)
        Spacer(minLength: 8)
        // Timer text reserves width for its longest possible value, so align it to the trailing
        // edge to keep the digits flush right.
        ElapsedTimeText(state: state)
          .font(.title3.monospacedDigit().weight(.semibold))
          .multilineTextAlignment(.trailing)
      }
      HStack(spacing: 8) {
        GoalProgressView(state: state, goalSeconds: attributes.goalSeconds)
          .progressViewStyle(.linear)
          .tint(StudyTimerWidgetPalette.accent)
        if state.isPaused {
          Label("Paused", systemImage: "pause.fill")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding(16)
  }
}
