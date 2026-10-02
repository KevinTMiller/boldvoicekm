// ActivityKit operations for the study timer (native bridge layer).
// Wraps Activity<StudyTimerAttributes> so StudyTimerActivityModule.swift stays a thin translation
// layer between JavaScript records and these calls, and applies the Live Activity's own
// Pause/Resume taps for StudyTimerActivityPauseControl.swift. This file has no Expo dependency.
//
// The module's deployment target is iOS 16.4 (see StudyTimerActivity.podspec), so the iOS 16.2
// ActivityContent APIs used here need no availability checks.
//
// A running activity's content goes stale at the goal. iOS re-renders the widget at that date even
// while this app is suspended, and the widget shows "Finished!" for that render. An in-process
// alarm also pauses the activity at the goal while the app is still running, which updates the
// Dynamic Island without waiting for the stale render.

import ActivityKit
import Foundation
import UIKit

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
    let activity = try Activity<StudyTimerAttributes>.request(
      attributes: attributes,
      content: makeContent(state: state, goalSeconds: attributes.goalSeconds),
      pushType: nil
    )
    scheduleFinish(activityId: activity.id, state: state, goalSeconds: attributes.goalSeconds)
    return activity.id
  }

  /// Replaces an activity's content state.
  /// - Parameters:
  ///   - activityId: Activity to update. Unknown ids are ignored because the activity may already
  ///     have ended or been dismissed by the user.
  ///   - state: New content state.
  static func update(activityId: String, state: StudyTimerAttributes.ContentState) async {
    // Locking the phone suspends the app within a moment. The background task keeps this update
    // alive long enough for ActivityKit to take it, so a session that just finished still reaches
    // the Lock Screen.
    await finishBeforeTheAppSuspends {
      guard let activity = findActivity(id: activityId) else { return }
      let goalSeconds = activity.attributes.goalSeconds
      await activity.update(makeContent(state: state, goalSeconds: goalSeconds))
      scheduleFinish(activityId: activityId, state: state, goalSeconds: goalSeconds)
    }
  }

  /// Pauses or resumes an activity in place, keeping its elapsed time, without waiting for
  /// JavaScript.
  /// - Parameters:
  ///   - shouldPause: True to pause, false to resume.
  ///   - activityId: Activity to change.
  ///   - date: When the change happened; the clock freezes, or continues, from here.
  /// - Returns: True when the activity changed; false when it no longer exists or is already in
  ///   the requested state (for example, a second tap before the widget redrew).
  static func setPaused(_ shouldPause: Bool, activityId: String, at date: Date) async -> Bool {
    guard let activity = findActivity(id: activityId) else { return false }
    let state = activity.content.state
    guard state.isPaused != shouldPause else { return false }
    let transitioned = shouldPause ? state.pausing(at: date) : state.resuming(at: date)
    let goalSeconds = activity.attributes.goalSeconds
    let newState = transitioned.coloredForGoal(goalSeconds)
    await activity.update(makeContent(state: newState, goalSeconds: goalSeconds))
    scheduleFinish(activityId: activityId, state: newState, goalSeconds: goalSeconds)
    return true
  }

  /// Ends one activity and removes it from the Lock Screen and Dynamic Island immediately.
  /// - Parameter activityId: Activity to end. Unknown ids are ignored.
  static func end(activityId: String) async {
    cancelFinish(activityId: activityId)
    guard let activity = findActivity(id: activityId) else { return }
    await activity.end(nil, dismissalPolicy: .immediate)
  }

  /// Ends every study timer activity this app owns, including ones JavaScript lost track of
  /// (for example after a crash). This is the safety net against zombie activities.
  static func endAll() async {
    cancelEveryFinish()
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

  /// Builds ActivityKit content for a state.
  /// A running activity goes stale at the goal. iOS re-renders the Live Activity then, even if this
  /// app is suspended, and the widget treats that stale render as "Finished!". A paused activity
  /// has no stale date, so pausing before the goal does not later flip the label.
  /// - Parameters:
  ///   - state: Content state to show.
  ///   - goalSeconds: Goal duration in seconds, from the activity's attributes.
  /// - Returns: Content whose stale date is the goal end while running, and nil while paused.
  private static func makeContent(
    state: StudyTimerAttributes.ContentState,
    goalSeconds: Double
  ) -> ActivityContent<StudyTimerAttributes.ContentState> {
    ActivityContent(state: state, staleDate: goalEndDate(state: state, goalSeconds: goalSeconds))
  }

  /// The moment a running clock reaches its goal.
  /// - Parameters:
  ///   - state: Content state.
  ///   - goalSeconds: Goal duration in seconds.
  /// - Returns: The goal end, or nil when the clock is paused or the goal is not positive.
  private static func goalEndDate(
    state: StudyTimerAttributes.ContentState,
    goalSeconds: Double
  ) -> Date? {
    guard !state.isPaused, goalSeconds > 0 else { return nil }
    return state.runningSinceDate.addingTimeInterval(goalSeconds)
  }

  /// Arms, or cancels, the in-process alarm that pauses the activity at the goal.
  /// The alarm covers the case where JavaScript's own timer does not get an update through, while
  /// the app is still running. The stale date covers the case where the app is already suspended.
  /// - Parameters:
  ///   - activityId: Activity to finish.
  ///   - state: State just written to the activity.
  ///   - goalSeconds: Goal duration in seconds.
  private static func scheduleFinish(
    activityId: String,
    state: StudyTimerAttributes.ContentState,
    goalSeconds: Double
  ) {
    guard let endDate = goalEndDate(state: state, goalSeconds: goalSeconds) else {
      cancelFinish(activityId: activityId)
      return
    }
    finishTaskLock.lock()
    finishTasks[activityId]?.cancel()
    let task = Task {
      let delay = endDate.timeIntervalSinceNow
      if delay > 0 {
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
      }
      guard !Task.isCancelled else { return }
      await markFinished(activityId: activityId)
    }
    finishTasks[activityId] = task
    finishTaskLock.unlock()
  }

  /// Pauses an activity at its goal, which is what the widget reads as "Finished!".
  /// Does nothing if the activity is already paused, or if it was resumed and this alarm is for an
  /// earlier stretch whose end has not actually arrived.
  /// - Parameter activityId: Activity to finish.
  private static func markFinished(activityId: String) async {
    guard let activity = findActivity(id: activityId) else { return }
    let state = activity.content.state
    let goalSeconds = activity.attributes.goalSeconds
    guard !state.isPaused, let endDate = goalEndDate(state: state, goalSeconds: goalSeconds) else {
      return
    }
    // A resume replaces the effective start, so an alarm from the previous stretch must not fire.
    guard Date() >= endDate.addingTimeInterval(-0.05) else { return }
    let finished = StudyTimerAttributes.ContentState(
      isPaused: true,
      runningSinceDate: state.runningSinceDate,
      pausedElapsedSeconds: goalSeconds,
      ringColorHex: StudyTimerAttributes.ContentState.finishedRingColorHex
    )
    await activity.update(makeContent(state: finished, goalSeconds: goalSeconds))
    cancelFinish(activityId: activityId)
  }

  /// Cancels the finish alarm for one activity.
  /// - Parameter activityId: Activity whose alarm to cancel.
  private static func cancelFinish(activityId: String) {
    finishTaskLock.lock()
    finishTasks[activityId]?.cancel()
    finishTasks[activityId] = nil
    finishTaskLock.unlock()
  }

  /// Cancels every finish alarm. Called when every activity is ending.
  private static func cancelEveryFinish() {
    finishTaskLock.lock()
    for task in finishTasks.values {
      task.cancel()
    }
    finishTasks.removeAll()
    finishTaskLock.unlock()
  }

  /// Runs `work` inside a background task so the app is not suspended mid-update when the phone locks.
  /// - Parameter work: The ActivityKit call to finish.
  private static func finishBeforeTheAppSuspends(_ work: () async -> Void) async {
    let task = beginBackgroundTask()
    await work()
    endBackgroundTask(task)
  }

  /// Asks iOS for a little time after the app leaves the foreground.
  /// - Returns: The task to end once the update has been handed off.
  private static func beginBackgroundTask() -> BackgroundTask {
    let task = BackgroundTask()
    task.id = UIApplication.shared.beginBackgroundTask(withName: "StudyTimerActivityUpdate") {
      endBackgroundTask(task)
    }
    return task
  }

  /// Ends a background task. Safe to call twice.
  /// - Parameter task: The task `beginBackgroundTask` returned.
  private static func endBackgroundTask(_ task: BackgroundTask) {
    let id = task.id
    guard id != .invalid else { return }
    task.id = .invalid
    UIApplication.shared.endBackgroundTask(id)
  }
}

/// Holds a background-task id so the expiration handler and the caller share one value.
/// `beginBackgroundTask` can invoke its handler before it returns the id, so the id cannot live
/// in a local variable the handler captured too early.
private final class BackgroundTask: @unchecked Sendable {
  /// The id from `beginBackgroundTask`, or `.invalid` once the task has ended.
  var id: UIBackgroundTaskIdentifier = .invalid
}

/// Finish alarms, keyed by activity id. Guarded by `finishTaskLock` because a widget tap and a
/// JavaScript update can reschedule the same activity at once.
private let finishTaskLock = NSLock()
private var finishTasks: [String: Task<Void, Never>] = [:]

// The same transitions as pauseSession and resumeSession in src/features/study-timer/timer-state.ts,
// expressed on the widget's effective-start representation, so a tap applied here and the change
// JavaScript applies afterwards produce identical states.
private extension StudyTimerAttributes.ContentState {
  /// Freezes a running clock.
  /// - Parameter date: When the pause happened.
  /// - Returns: A paused state holding the elapsed time at `date`.
  func pausing(at date: Date) -> Self {
    Self(
      isPaused: true,
      runningSinceDate: runningSinceDate,
      pausedElapsedSeconds: max(0, date.timeIntervalSince(runningSinceDate)),
      ringColorHex: ringColorHex
    )
  }

  /// Restarts a frozen clock from where it stopped.
  /// - Parameter date: When the resume happened.
  /// - Returns: A running state whose effective start is `date` minus the frozen elapsed time.
  func resuming(at date: Date) -> Self {
    Self(
      isPaused: false,
      runningSinceDate: date.addingTimeInterval(-pausedElapsedSeconds),
      pausedElapsedSeconds: pausedElapsedSeconds,
      ringColorHex: Self.runningRingColorHex
    )
  }

  /// Picks the ring color for a pause or resume applied on the Live Activity itself.
  /// Reaching the goal turns the ring blue. Resuming returns it to orange. A pause before the
  /// goal keeps the color the app last sent; JavaScript then replaces it with the dimmed orange.
  /// - Parameter goalSeconds: Goal duration in seconds.
  /// - Returns: A copy of this state with `ringColorHex` set.
  func coloredForGoal(_ goalSeconds: Double) -> Self {
    let colorHex: String
    if isPaused && goalSeconds > 0 && pausedElapsedSeconds >= goalSeconds {
      colorHex = Self.finishedRingColorHex
    } else if isPaused {
      colorHex = ringColorHex
    } else {
      colorHex = Self.runningRingColorHex
    }
    return Self(
      isPaused: isPaused,
      runningSinceDate: runningSinceDate,
      pausedElapsedSeconds: pausedElapsedSeconds,
      ringColorHex: colorHex
    )
  }
}
