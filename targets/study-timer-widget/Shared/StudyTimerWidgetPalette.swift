// Widget colors (widget layer).
// The widget extension cannot read the React Native theme, so the colors it needs are repeated
// here. Keep them in sync with `Colors` in src/constants/theme.ts.

import SwiftUI

/// Colors used by the Live Activity layouts.
enum StudyTimerWidgetPalette {
  /// Progress ring and island accent (#FF6B2B), matching `progressRing` in src/constants/theme.ts.
  /// The finished ring is not here: the app sends that blue on the activity as `ringColorHex`.
  static let progressRing = Color(red: 255 / 255, green: 107 / 255, blue: 43 / 255)
  /// Opacity applied to the ring and the button background while paused, so a paused session
  /// reads as dimmed at a glance.
  static let pausedOpacity = 0.45
}

extension Color {
  /// Reads a #RRGGBB color the app sent on the Live Activity.
  /// - Parameter hex: A color such as "#208AEF". The leading "#" is optional.
  /// - Returns: The color, or nil when `hex` is not six hex digits.
  init?(studyTimerHex hex: String) {
    let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
}
