// Study timer Live Activity configuration (widget layer).
// Connects StudyTimerAttributes to its Lock Screen and Dynamic Island views. The layout is chosen
// per activity from `presentationVariant`, which the app stores on the activity when it starts
// (see src/features/live-activity). To add a variant: add a folder under Layouts/, add one `case`
// to each switch below, and register the id in src/features/live-activity/live-activity-registry.ts.
// Unknown variants always fall back to the default layout.

import ActivityKit
import SwiftUI
import WidgetKit

/// The study timer Live Activity widget.
struct StudyTimerLiveActivity: Widget {
  /// Declares the Lock Screen view and the Dynamic Island for study timer activities.
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: StudyTimerAttributes.self) { context in
      makeLockScreenView(for: context)
    } dynamicIsland: { context in
      makeDynamicIsland(for: context)
    }
  }
}

/// Picks the Lock Screen view for an activity's layout variant.
/// - Parameter context: The activity's attributes and current state.
/// - Returns: The variant's Lock Screen view.
@MainActor
@ViewBuilder
private func makeLockScreenView(
  for context: ActivityViewContext<StudyTimerAttributes>
) -> some View {
  switch context.attributes.presentationVariant {
  case DefaultLayout.variantId:
    DefaultLayout.lockScreen(attributes: context.attributes, state: context.state)
  default:
    DefaultLayout.lockScreen(attributes: context.attributes, state: context.state)
  }
}

/// Picks the Dynamic Island layout for an activity's layout variant.
/// - Parameter context: The activity's attributes and current state.
/// - Returns: The variant's compact, minimal and expanded presentations.
@MainActor
private func makeDynamicIsland(
  for context: ActivityViewContext<StudyTimerAttributes>
) -> DynamicIsland {
  switch context.attributes.presentationVariant {
  case DefaultLayout.variantId:
    return DefaultLayout.dynamicIsland(attributes: context.attributes, state: context.state)
  default:
    return DefaultLayout.dynamicIsland(attributes: context.attributes, state: context.state)
  }
}
