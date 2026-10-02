// Study timer Live Activity bridge (native bridge layer).
// Exposes ActivityKit to JavaScript as the "StudyTimerActivity" Expo module. Each function converts
// JavaScript records (StudyTimerActivityRecords.swift) into ActivityKit values and delegates to
// StudyTimerActivityStore.swift. The TypeScript side lives in ../src: StudyTimerActivityModule.ts
// loads this module and index.ts wraps it in a typed, null-safe API.

import ExpoModulesCore

/// Expo module that starts, updates, ends and lists study timer Live Activities.
public class StudyTimerActivityModule: Module {
  /// Declares the functions JavaScript can call.
  /// - Returns: The module definition consumed by Expo Modules Core.
  public func definition() -> ModuleDefinition {
    Name("StudyTimerActivity")

    // Synchronous because it is a cheap settings read and the JavaScript strategy resolver needs
    // the answer while the app launches.
    Function("areActivitiesEnabled") { () -> Bool in
      StudyTimerActivityStore.areActivitiesEnabled()
    }

    // Resolves with the new activity's id; rejects when Live Activities are disabled.
    AsyncFunction("startActivity") { (options: StartStudyTimerActivityRecord) throws -> String in
      try StudyTimerActivityStore.start(
        attributes: options.makeAttributes(),
        state: options.state.makeContentState()
      )
    }

    AsyncFunction("updateActivity") {
      (activityId: String, state: StudyTimerActivityStateRecord) async in
      await StudyTimerActivityStore.update(activityId: activityId, state: state.makeContentState())
    }

    AsyncFunction("endActivity") { (activityId: String) async in
      await StudyTimerActivityStore.end(activityId: activityId)
    }

    AsyncFunction("endAllActivities") { () async in
      await StudyTimerActivityStore.endAll()
    }

    AsyncFunction("getActiveActivities") { () -> [[String: Any]] in
      StudyTimerActivityStore.listActive().map { $0.makeBridgeDictionary() }
    }
  }
}
