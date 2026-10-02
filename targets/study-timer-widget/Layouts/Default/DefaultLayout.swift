// Default Live Activity layout entry points (widget layer).
// Used for the "default" presentation variant and as the fallback for unknown variants. Groups the
// Lock Screen view and the Dynamic Island builder so StudyTimerLiveActivity.swift can pick a whole
// layout with one switch.

import ActivityKit
import SwiftUI
import WidgetKit

/// Entry points for the default layout. Main-actor isolated like the SwiftUI views it builds.
@MainActor
enum DefaultLayout {
  /// Variant id the app sends to request this layout. Must match the id registered in
  /// src/features/live-activity/live-activity-registry.ts.
  static let variantId = "default"

  /// Builds the Lock Screen view.
  /// - Parameters:
  ///   - attributes: Static data the activity was started with.
  ///   - state: Current content state.
  ///   - activityId: ActivityKit id of this activity, for the Pause/Resume button.
  ///   - isStale: Whether iOS is rendering this activity because the goal end has passed.
  /// - Returns: The Lock Screen view.
  static func lockScreen(
    attributes: StudyTimerAttributes,
    state: StudyTimerAttributes.ContentState,
    activityId: String,
    isStale: Bool
  ) -> some View {
    DefaultLockScreenView(
      attributes: attributes,
      state: state,
      activityId: activityId,
      isStale: isStale
    )
  }

  /// Builds the Dynamic Island presentations.
  /// - Parameters:
  ///   - attributes: Static data the activity was started with.
  ///   - state: Current content state.
  ///   - activityId: ActivityKit id of this activity, for the Pause/Resume button.
  ///   - isStale: Whether iOS is rendering this activity because the goal end has passed.
  /// - Returns: The compact, minimal and expanded presentations.
  static func dynamicIsland(
    attributes: StudyTimerAttributes,
    state: StudyTimerAttributes.ContentState,
    activityId: String,
    isStale: Bool
  ) -> DynamicIsland {
    DefaultDynamicIsland.make(
      attributes: attributes,
      state: state,
      activityId: activityId,
      isStale: isStale
    )
  }
}
