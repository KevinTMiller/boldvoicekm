// Pause/Resume button intent for the study timer Live Activity (shared by the app and the widget).
//
// @bacons/apple-targets links every file in this _shared folder into both the main app target and
// the widget extension, and both need this one: the widget's Button(intent:) refers to the type,
// and iOS runs a LiveActivityIntent's perform() in the app's process (launching it in the
// background if needed), where the StudyTimerActivity pod can update the activity and tell
// JavaScript. Only the app target links that pod, hence the canImport checks. Re-run
// `npx expo prebuild -p ios` after adding, renaming or removing files in this folder.

import AppIntents
import Foundation
#if canImport(StudyTimerActivity)
// Expo's generated ExpoModulesProvider.swift imports this module with `internal import`. A plain
// `import` in the same app target is ambiguous under the current Swift compiler, so match it.
internal import StudyTimerActivity
#endif

/// Pauses or resumes the study timer from the Live Activity's button. Buttons in Live Activities
/// need iOS 17; on iOS 16 the widget shows no button.
@available(iOS 17.0, *)
struct PauseOrResumeStudyTimerIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Pause or Resume Study Timer"
  // Only meaningful from the Live Activity's own button, so keep it out of Shortcuts and Spotlight.
  static let isDiscoverable = false

  /// ActivityKit id of the activity whose button was tapped.
  @Parameter(title: "Activity ID")
  var activityId: String

  /// True for the Pause button, false for the Resume button.
  @Parameter(title: "Pause")
  var shouldPause: Bool

  /// Required by AppIntents, which creates the intent before filling in its parameters.
  init() {}

  /// Creates the intent attached to the widget's button.
  /// - Parameters:
  ///   - activityId: Activity the button belongs to.
  ///   - shouldPause: True for the Pause button, false for the Resume button.
  init(activityId: String, shouldPause: Bool) {
    self.activityId = activityId
    self.shouldPause = shouldPause
  }

  /// Applies the tap. Runs in the app's process.
  /// - Returns: An empty result; the activity's new state is the visible outcome.
  func perform() async throws -> some IntentResult {
    #if canImport(StudyTimerActivity)
    await StudyTimerActivityPauseControl.setPaused(shouldPause, activityId: activityId, at: Date())
    #endif
    return .result()
  }
}
