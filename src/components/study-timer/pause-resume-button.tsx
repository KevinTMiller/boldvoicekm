/**
 * Pause/Resume button (View layer).
 * The icon-only control inside the progress ring, after the design reference: a pause glyph while
 * running, a play glyph while paused, and a restart glyph once the goal is complete. expo-symbols
 * draws SF Symbols on iOS and Material Symbols on Android and web. Presentational: the action and
 * handler come from the study timer view model via ActiveSessionCard.
 */
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import type { RingButtonAction } from '@/features/study-timer/build-study-timer-view-model';
import { useTheme } from '@/hooks/use-theme';

/** Tap target size, in points. Larger than the 44 pt minimum because it is the main control. */
const BUTTON_SIZE = 56;

/** Glyph size, in points. */
const ICON_SIZE = 34;

/** Glyph and accessible name for each ring action. */
const RING_BUTTONS = {
  pause: {
    label: 'Pause',
    symbol: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  },
  resume: {
    label: 'Resume',
    symbol: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  },
  restart: {
    label: 'Restart',
    symbol: { ios: 'arrow.clockwise', android: 'restart_alt', web: 'restart_alt' },
  },
} as const;

/** Props for PauseResumeButton. */
export type PauseResumeButtonProps = {
  /** Pause while running, resume while paused, restart once the goal is complete. */
  action: RingButtonAction;
  /** Called on tap. */
  onPress: () => void;
};

/**
 * Round, icon-only Pause, Resume or Restart button.
 *
 * @param props - Action and press handler.
 */
export function PauseResumeButton({ action, onPress }: PauseResumeButtonProps) {
  const theme = useTheme();
  const button = RING_BUTTONS[action];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={button.label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView name={button.symbol} size={ICON_SIZE} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUTTON_SIZE / 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
