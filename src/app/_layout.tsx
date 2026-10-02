/**
 * Root layout (View layer, Expo Router).
 * Applies the light/dark navigation theme, mounts the animated splash overlay and the
 * LiveActivityProvider (which resolves the Live Activity strategy once per launch), and renders a
 * native Stack whose only screen is the study timer at "/" (src/app/index.tsx).
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LiveActivityProvider } from '@/features/live-activity/live-activity-context';

// Keep the native splash screen up until AnimatedSplashOverlay has laid out and hides it.
SplashScreen.preventAutoHideAsync();

/** App root: theme, splash overlay, Live Activity controller and the navigation stack. */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <LiveActivityProvider>
        <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
          <Stack.Screen name="index" options={{ title: 'Study Timer' }} />
        </Stack>
      </LiveActivityProvider>
    </ThemeProvider>
  );
}
