// ActivityKit operations for the study timer (native bridge layer).
// Wraps Activity<StudyTimerAttributes> so StudyTimerActivityModule.swift stays a thin translation
// layer between JavaScript records and these calls. This file has no Expo dependency.
//
// The module's deployment target is iOS 16.4 (see StudyTimerActivity.podspec), so the iOS 16.2
// ActivityContent APIs used here need no availability checks.

import ActivityKit
import Foundation

/// A study timer Live Activity currently on screen, as plain values.
struct StudyTimerActivitySnapshot {
  /// ActivityKit's identifier for the activity.
  let id: String
  /// Static attributes the activity was started with.
  let attributes: StudyTimerAttributes
  /// Latest content state.
  let state: StudyTimerAttributes.ContentState
}

/// Starts, updates, ends and lists study timer Live Activities.
enum StudyTimerActivityStore {
  /// Reports whether the user allows Live Activities for this app (Settings > the app > Live
  /// Activities).
  /// - Returns: True when new activities can be requested.
  static func areActivitiesEnabled() -> Bool {
    ActivityAuthorizationInfo().areActivitiesEnabled
  }

  /// Requests a new Live Activity.
  /// - Parameters:
  ///   - attributes: Static data for the activity.
  ///   - state: Initial content state.
  /// - Returns: The new activity's id.
  /// - Throws: ActivityKit's authorization error when Live Activities are disabled or the system's
  ///   limit on concurrent activities is reached.
  static func start(
    attributes: StudyTimerAttributes,
    state: StudyTimerAttributes.ContentState
  ) throws -> String {
    // No stale date: the widget's timer views keep ticking on their own, so the content never
    // goes out of date while the app is suspended.
    let content = ActivityContent(state: state, staleDate: nil)
    let activity = try Activity<StudyTimerAttributes>.request(
      attributes: attributes,
      content: content,
      pushType: nil
    )
    return activity.id
  }

  /// Replaces an activity's content state.
  /// - Parameters:
  ///   - activityId: Activity to update. Unknown ids are ignored because the activity may already
  ///     have ended or been dismissed by the user.
  ///   - state: New content state.
  static func update(activityId: String, state: StudyTimerAttributes.ContentState) async {
    guard let activity = findActivity(id: activityId) else { return }
    await activity.update(ActivityContent(state: state, staleDate: nil))
  }

  /// Ends one activity and removes it from the Lock Screen and Dynamic Island immediately.
  /// - Parameter activityId: Activity to end. Unknown ids are ignored.
  static func end(activityId: String) async {
    guard let activity = findActivity(id: activityId) else { return }
    await activity.end(nil, dismissalPolicy: .immediate)
  }

  /// Ends every study timer activity this app owns, including ones JavaScript lost track of
  /// (for example after a crash). This is the safety net against zombie activities.
  static func endAll() async {
    for activity in Activity<StudyTimerAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  /// Lists the study timer activities still on screen.
  /// - Returns: Snapshots of active and stale activities. Ended and dismissed ones are skipped,
  ///   because ActivityKit can keep reporting them for a while after they end.
  static func listActive() -> [StudyTimerActivitySnapshot] {
    Activity<StudyTimerAttributes>.activities
      .filter { isOnScreen($0.activityState) }
      .map { activity in
        StudyTimerActivitySnapshot(
          id: activity.id,
          attributes: activity.attributes,
          state: activity.content.state
        )
      }
  }

  /// Finds a study timer activity by id.
  /// - Parameter id: ActivityKit activity id.
  /// - Returns: The activity, or nil if it no longer exists.
  private static func findActivity(id: String) -> Activity<StudyTimerAttributes>? {
    Activity<StudyTimerAttributes>.activities.first { $0.id == id }
  }

  /// Reports whether an activity in this state is still visible to the user.
  /// - Parameter state: ActivityKit lifecycle state.
  /// - Returns: True for active and stale activities.
  private static func isOnScreen(_ state: ActivityState) -> Bool {
    // Compare rather than switch: newer SDKs add states (iOS 26's `.pending`, for scheduled
    // activities) that would otherwise need availability checks, and none of them are on screen.
    state == .active || state == .stale
  }
}
