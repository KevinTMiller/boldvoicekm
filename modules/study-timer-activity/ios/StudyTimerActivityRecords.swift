// Bridge records for the study timer Live Activity (native bridge layer).
// These mirror the TypeScript types in ../src/StudyTimerActivity.types.ts. Expo Modules converts
// the JavaScript objects passed to StudyTimerActivityModule into these structs field by field, so
// field names must match the TypeScript property names exactly. Times cross the bridge as epoch
// milliseconds and are converted to Date here.

import ExpoModulesCore
import Foundation

/// Mirrors `StudyTimerActivityState` in TypeScript.
struct StudyTimerActivityStateRecord: Record {
  /// True while the timer is paused.
  @Field var isPaused: Bool = false
  /// Effective start of the running clock (now minus elapsed), in epoch milliseconds.
  @Field var runningSinceMs: Double = 0
  /// Elapsed seconds frozen at pause time.
  @Field var pausedElapsedSeconds: Double = 0
}

/// Mirrors `StartStudyTimerActivityOptions` in TypeScript.
struct StartStudyTimerActivityRecord: Record {
  /// Session name typed by the user.
  @Field var sessionName: String = ""
  /// Goal duration in seconds.
  @Field var goalSeconds: Double = 0
  /// Widget layout to render.
  @Field var presentationVariant: String = "default"
  /// When the session first started, in epoch milliseconds.
  @Field var sessionStartedAtMs: Double = 0
  /// Initial content state.
  @Field var state: StudyTimerActivityStateRecord = StudyTimerActivityStateRecord()
}

extension StartStudyTimerActivityRecord {
  /// Builds the static ActivityKit attributes for a new activity.
  /// - Returns: Attributes carrying the session's name, goal, layout variant and start time.
  func makeAttributes() -> StudyTimerAttributes {
    StudyTimerAttributes(
      sessionName: sessionName,
      goalSeconds: goalSeconds,
      presentationVariant: presentationVariant,
      sessionStartedAt: makeDate(fromEpochMilliseconds: sessionStartedAtMs)
    )
  }
}

extension StudyTimerActivityStateRecord {
  /// Converts the bridge record into ActivityKit content state.
  /// - Returns: Content state with the running anchor converted to a Date.
  func makeContentState() -> StudyTimerAttributes.ContentState {
    StudyTimerAttributes.ContentState(
      isPaused: isPaused,
      runningSinceDate: makeDate(fromEpochMilliseconds: runningSinceMs),
      pausedElapsedSeconds: pausedElapsedSeconds
    )
  }
}

extension StudyTimerActivitySnapshot {
  /// Converts a snapshot into the dictionary returned to JavaScript.
  /// - Returns: An object matching `StudyTimerActivitySnapshot` in TypeScript.
  func makeBridgeDictionary() -> [String: Any] {
    [
      "id": id,
      "sessionName": attributes.sessionName,
      "goalSeconds": attributes.goalSeconds,
      "presentationVariant": attributes.presentationVariant,
      "sessionStartedAtMs": makeEpochMilliseconds(from: attributes.sessionStartedAt),
      "state": [
        "isPaused": state.isPaused,
        "runningSinceMs": makeEpochMilliseconds(from: state.runningSinceDate),
        "pausedElapsedSeconds": state.pausedElapsedSeconds,
      ] as [String: Any],
    ]
  }
}

/// Converts epoch milliseconds from JavaScript into a Date.
/// - Parameter milliseconds: Milliseconds since 1970-01-01 UTC.
/// - Returns: The matching Date.
private func makeDate(fromEpochMilliseconds milliseconds: Double) -> Date {
  Date(timeIntervalSince1970: milliseconds / 1000)
}

/// Converts a Date into epoch milliseconds for JavaScript.
/// - Parameter date: Date to convert.
/// - Returns: Milliseconds since 1970-01-01 UTC.
private func makeEpochMilliseconds(from date: Date) -> Double {
  date.timeIntervalSince1970 * 1000
}
