/**
 * Widget extension target config (widget layer).
 * Read by the @bacons/apple-targets config plugin during `npx expo prebuild` to generate the
 * "StudyTimerWidget" Xcode target from the Swift files in this folder, subfolders included. Files
 * in `_shared/` are also linked into the main app target. The extension renders the study timer
 * Live Activity on the Lock Screen and in the Dynamic Island; the app starts and updates it
 * through modules/study-timer-activity, and its Pause/Resume button runs an App Intent in the app.
 */

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'StudyTimerWidget',
  displayName: 'Study Timer',
  bundleIdentifier: '.studytimerwidget',
  // Matches the app's minimum iOS version (Expo SDK 57). The Live Activity APIs used here need
  // 16.2; the Pause/Resume button needs 17 and is hidden on older versions.
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
};
