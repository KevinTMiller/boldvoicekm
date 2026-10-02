// Widget colors (widget layer).
// The widget extension cannot read the React Native theme, so the brand colors it needs are
// repeated here. Keep them in sync with `Colors` in src/constants/theme.ts.

import SwiftUI

/// Colors used by the Live Activity layouts.
enum StudyTimerWidgetPalette {
  /// Brand accent (#208AEF), matching `accent` in src/constants/theme.ts.
  static let accent = Color(red: 32 / 255, green: 138 / 255, blue: 239 / 255)
}
