// Widget extension entry point (widget layer).
// iOS loads this bundle to render the study timer Live Activity. The bundle contains only the Live
// Activity; there are no Home Screen widgets. Target settings live in expo-target.config.js.

import SwiftUI
import WidgetKit

/// Lists every widget this extension provides.
@main
struct StudyTimerWidgetBundle: WidgetBundle {
  /// The extension's widgets: just the study timer Live Activity.
  var body: some Widget {
    StudyTimerLiveActivity()
  }
}
