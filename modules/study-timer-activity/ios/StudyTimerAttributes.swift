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
  /// The part of the activity that changes over time. The app sends a new value when the timer
  /// starts, pauses, resumes, or the ring color changes. The widget ticks the clock by itself
  /// in between, and paints the ring with `ringColorHex` rather than choosing a color of its own.
  struct ContentState: Codable, Hashable {
    /// Orange progress ring (#FF6B2B), matching `progressRing` in src/constants/theme.ts.
    static let runningRingColorHex = "#FF6B2B"
    /// Solid blue ring once the goal is complete (#208AEF), matching `accent` in that theme.
    static let finishedRingColorHex = "#208AEF"

    /// True while the timer is paused. The widget then shows frozen values.
    var isPaused: Bool
    /// The running clock's effective start: the current time minus the elapsed time. Passed to
    /// `Text(timerInterval:)` and `ProgressView(timerInterval:)` so iOS ticks without app updates.
    var runningSinceDate: Date
    /// Elapsed seconds at the moment of pausing. Only meaningful while paused.
    var pausedElapsedSeconds: Double
    /// Progress-ring stroke as #RRGGBB. The app sends orange while the session runs, a dimmed
    /// orange while it is paused, and blue once the goal is complete.
    var ringColorHex: String

    /// Memberwise init. A custom decoder below would otherwise remove the synthesized one.
    init(
      isPaused: Bool,
      runningSinceDate: Date,
      pausedElapsedSeconds: Double,
      ringColorHex: String
    ) {
      self.isPaused = isPaused
      self.runningSinceDate = runningSinceDate
      self.pausedElapsedSeconds = pausedElapsedSeconds
      self.ringColorHex = ringColorHex
    }

    /// Decodes content written before `ringColorHex` existed as a running orange ring.
    init(from decoder: Decoder) throws {
      let container = try decoder.container(keyedBy: CodingKeys.self)
      isPaused = try container.decode(Bool.self, forKey: .isPaused)
      runningSinceDate = try container.decode(Date.self, forKey: .runningSinceDate)
      pausedElapsedSeconds = try container.decode(Double.self, forKey: .pausedElapsedSeconds)
      ringColorHex = try container.decodeIfPresent(String.self, forKey: .ringColorHex)
        ?? Self.runningRingColorHex
    }

    /// Encodes every field, including the ring color the widget tints with.
    func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      try container.encode(isPaused, forKey: .isPaused)
      try container.encode(runningSinceDate, forKey: .runningSinceDate)
      try container.encode(pausedElapsedSeconds, forKey: .pausedElapsedSeconds)
      try container.encode(ringColorHex, forKey: .ringColorHex)
    }

    private enum CodingKeys: String, CodingKey {
      case isPaused
      case runningSinceDate
      case pausedElapsedSeconds
      case ringColorHex
    }
  }

  /// Session name typed by the user. Shown under the timer.
  var sessionName: String
  /// Emoji for the type of task, shown inside the progress ring. One emoji, possibly several
  /// Unicode scalars long.
  var sessionEmoji: String
  /// Goal duration in seconds; the progress ring fills toward it.
  var goalSeconds: Double
  /// Which widget layout to render. Unknown values fall back to the default layout.
  var presentationVariant: String
  /// When the session first started. Used to pick the newest activity when the app restores.
  var sessionStartedAt: Date
}
