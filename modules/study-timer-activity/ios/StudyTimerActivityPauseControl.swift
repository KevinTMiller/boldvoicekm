// Pause/Resume taps from the study timer Live Activity (native bridge layer).
// The widget's Pause/Resume button runs PauseOrResumeStudyTimerIntent
// (targets/study-timer-widget/_shared), which iOS executes in the app's process and which calls
// setPaused here. Flow:
//   1. The activity is updated natively first, so the Lock Screen responds even while JavaScript
//      is suspended or not loaded yet.
//   2. A notification tells StudyTimerActivityModule.swift, which sends "onPauseChange" to
//      JavaScript if it is listening; the view model then applies the same change to its session.
//   3. If JavaScript was not listening (the app had been killed), the next restore reads the new
//      state from the activity instead.
// This is the only public API of the pod besides the Expo module itself.

import Foundation

/// A Pause/Resume tap that has been applied to an activity.
struct StudyTimerActivityPauseChange {
  /// Activity whose button was tapped.
  let activityId: String
  /// True after a Pause tap, false after a Resume tap.
  let isPaused: Bool
  /// When the tap happened.
  let changedAt: Date
}

/// Entry point for the Live Activity's Pause/Resume button.
public enum StudyTimerActivityPauseControl {
  /// Posted after a tap has been applied to an activity. The notification's object is the
  /// StudyTimerActivityPauseChange.
  static let pauseChangedNotification = Notification.Name("StudyTimerActivityPauseChanged")

  /// Pauses or resumes a study timer activity, then tells JavaScript.
  /// - Parameters:
  ///   - shouldPause: True to pause, false to resume.
  ///   - activityId: Activity whose button was tapped. Unknown ids are ignored.
  ///   - date: When the tap happened.
  public static func setPaused(_ shouldPause: Bool, activityId: String, at date: Date) async {
    let didChange = await StudyTimerActivityStore.setPaused(
      shouldPause,
      activityId: activityId,
      at: date
    )
    guard didChange else { return }
    let change = StudyTimerActivityPauseChange(
      activityId: activityId,
      isPaused: shouldPause,
      changedAt: date
    )
    NotificationCenter.default.post(name: pauseChangedNotification, object: change)
  }
}
