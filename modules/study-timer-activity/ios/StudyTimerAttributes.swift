// Study timer Live Activity attributes (shared model between the native bridge and the widget).
//
// ActivityKit matches a running activity to its widget by this type's name and Codable shape, so
// this file must stay byte-identical in both places it lives:
//   - modules/study-timer-activity/ios/StudyTimerAttributes.swift (the app's native bridge)
//   - targets/study-timer-widget/Shared/StudyTimerAttributes.swift (the widget extension)
// Each target compiles its own copy because the bridge pod and the widget extension cannot see
// each other's types. The Jest test study-timer-attributes-sync.test.ts fails if the copies drift.

import ActivityKit
import Foundation

/// Data describing one study session's Live Activity.
/// The stored properties are fixed when the activity starts; `ContentState` changes on pause and
/// resume.
struct StudyTimerAttributes: ActivityAttributes {
  /// The part of the activity that changes over time. The app sends a new value only when the
  /// timer starts, pauses or resumes; the widget ticks the clock by itself in between.
  struct ContentState: Codable, Hashable {
    /// True while the timer is paused. The widget then shows frozen values.
    var isPaused: Bool
    /// The running clock's effective start: the current time minus the elapsed time. Passed to
    /// `Text(timerInterval:)` and `ProgressView(timerInterval:)` so iOS ticks without app updates.
    var runningSinceDate: Date
    /// Elapsed seconds at the moment of pausing. Only meaningful while paused.
    var pausedElapsedSeconds: Double
  }

  /// Session name typed by the user.
  var sessionName: String
  /// Goal duration in seconds; progress views fill toward it.
  var goalSeconds: Double
  /// Which widget layout to render. Unknown values fall back to the default layout.
  var presentationVariant: String
  /// When the session first started. Used to pick the newest activity when the app restores.
  var sessionStartedAt: Date
}
