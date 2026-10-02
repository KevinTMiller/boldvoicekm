/**
 * Timer button (View layer).
 * The rounded button used across the study timer UI, in primary, secondary and destructive
 * styles. Presentational: callers pass the label and the press handler. Used by TimerControls,
 * ActiveSessionCard and NewSessionForm.
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Visual style of a TimerButton. */
export type TimerButtonVariant = 'primary' | 'secondary' | 'destructive';

/** Props for TimerButton. */
export type TimerButtonProps = {
  /** Button text, which is also its accessible name. */
  label: string;
  /** Visual style. */
  variant: TimerButtonVariant;
  /** Called on tap. Never called while disabled. */
  onPress: () => void;
  /** Dims the button and ignores taps. */
  isDisabled?: boolean;
};

/**
 * A rounded button that fills the width it is given.
 *
 * @param props - Label, style, press handler and disabled state.
 */
export function TimerButton({ label, variant, onPress, isDisabled = false }: TimerButtonProps) {
  const colors = getTimerButtonColors(useTheme(), variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.background },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Picks a variant's background and text colors from the theme.
 *
 * @param theme - Current color scheme's tokens.
 * @param variant - Button style.
 * @returns The background and text colors.
 */
function getTimerButtonColors(
  theme: ThemeColors,
  variant: TimerButtonVariant
): { background: string; text: string } {
  switch (variant) {
    case 'primary':
      return { background: theme.accent, text: theme.onAccent };
    case 'destructive':
      return { background: theme.destructive, text: theme.onAccent };
    case 'secondary':
      return { background: theme.backgroundSelected, text: theme.text };
  }
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 17,
    fontWeight: 600,
  },
});
