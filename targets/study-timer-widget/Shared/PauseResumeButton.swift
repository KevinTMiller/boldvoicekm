// Pause/Resume button shared by every layout (widget layer).
// Runs PauseOrResumeStudyTimerIntent (_shared/), which iOS executes in the app's process: the
// activity switches to paused or running at once, and the app applies the same change to its
// session. Buttons in Live Activities need iOS 17, so on iOS 16 this draws nothing and the
// activity is display-only.

import AppIntents
import SwiftUI

/// Round Pause button while running; round Resume (play) button while paused. Hidden once the
/// goal is complete, because Resume would start the clock again after "Finished!". Restart lives
/// in the app.
struct PauseResumeButton: View {
  /// ActivityKit id of the activity this button controls.
  let activityId: String
  /// Whether the timer is paused, which turns the button into Resume.
  let isPaused: Bool
  /// Hides the button. Set once the goal has been reached.
  var isFinished: Bool = false
  /// Button diameter in points. 44 or more keeps it an easy tap target.
  var diameter: CGFloat = 44

  /// The interactive button on iOS 17 and later; nothing on iOS 16, and nothing once finished.
  var body: some View {
    if isFinished {
      EmptyView()
    } else if #available(iOS 17.0, *) {
      Button(intent: PauseOrResumeStudyTimerIntent(activityId: activityId, shouldPause: !isPaused)) {
        Image(systemName: isPaused ? "play.fill" : "pause.fill")
          .font(.system(size: diameter * 0.4, weight: .bold))
          .foregroundStyle(StudyTimerWidgetPalette.progressRing)
          .frame(width: diameter, height: diameter)
          .background(Circle().fill(StudyTimerWidgetPalette.progressRing.opacity(0.2)))
      }
      .buttonStyle(.plain)
      .accessibilityLabel(isPaused ? "Resume" : "Pause")
    }
  }
}
