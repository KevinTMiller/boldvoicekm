/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /**
     * Brand accent for primary buttons, the goal slider and the selected emoji. Also the progress
     * ring once the goal is complete. Keep in sync with StudyTimerWidgetPalette.finishedRing.
     */
    accent: '#208AEF',
    /** Text drawn on top of `accent` or `destructive`. */
    onAccent: '#FFFFFF',
    /** Unfilled track of the progress ring. */
    progressTrack: '#E0E1E6',
    /**
     * Filled part of the progress ring. Keep in sync with StudyTimerWidgetPalette.progressRing in
     * targets/study-timer-widget/Shared, so the app and the Live Activity match.
     */
    progressRing: '#FF6B2B',
    /** Destructive actions, such as Stop. */
    destructive: '#DC3E42',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#208AEF',
    onAccent: '#FFFFFF',
    progressTrack: '#2E3135',
    progressRing: '#FF6B2B',
    destructive: '#FF6369',
  },
} as const;

/** The color tokens of one color scheme, as returned by useTheme. */
export type ThemeColors = (typeof Colors)[keyof typeof Colors];

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
