// Study timer Live Activity bridge (native bridge layer).
// Exposes ActivityKit to JavaScript as the "StudyTimerActivity" Expo module. Each function converts
// JavaScript records (StudyTimerActivityRecords.swift) into ActivityKit values and delegates to
// StudyTimerActivityStore.swift. In the other direction it sends "onPauseChange" when the Live
// Activity's own Pause/Resume button was tapped (see StudyTimerActivityPauseControl.swift). The
// TypeScript side lives in ../src: StudyTimerActivityModule.ts loads this module and index.ts
// wraps it in a typed, null-safe API.

import ExpoModulesCore

/// Expo module that starts, updates, ends and lists study timer Live Activities, and reports taps
/// on their Pause/Resume button.
public class StudyTimerActivityModule: Module {
  /// Observes StudyTimerActivityPauseControl's notification while JavaScript is listening; nil
  /// otherwise.
  private var pauseChangeObserver: NSObjectProtocol?

  /// Declares the functions and events JavaScript can use.
  /// - Returns: The module definition consumed by Expo Modules Core.
  public func definition() -> ModuleDefinition {
    Name("StudyTimerActivity")

    // Sent after a tap on the Live Activity's Pause/Resume button has been applied to the
    // activity. The body matches StudyTimerActivityPauseChangeEvent in TypeScript.
    Events("onPauseChange")

    OnStartObserving("onPauseChange") {
      startForwardingPauseChanges()
    }

    OnStopObserving("onPauseChange") {
      stopForwardingPauseChanges()
    }

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

  /// Starts sending "onPauseChange" for every tap StudyTimerActivityPauseControl applies. Called
  /// when JavaScript adds its first listener.
  private func startForwardingPauseChanges() {
    guard pauseChangeObserver == nil else { return }
    pauseChangeObserver = NotificationCenter.default.addObserver(
      forName: StudyTimerActivityPauseControl.pauseChangedNotification,
      object: nil,
      queue: nil
    ) { [weak self] notification in
      guard let change = notification.object as? StudyTimerActivityPauseChange else { return }
      self?.sendEvent("onPauseChange", change.makeEventBody())
    }
  }

  /// Stops forwarding once JavaScript has removed its last listener.
  private func stopForwardingPauseChanges() {
    if let observer = pauseChangeObserver {
      NotificationCenter.default.removeObserver(observer)
    }
    pauseChangeObserver = nil
  }
}
