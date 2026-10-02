/**
 * Web color scheme hook (View layer).
 * The static web build renders HTML before it can know the visitor's color scheme, so this hook
 * reports 'light' until the page hydrates and then switches to the browser's real scheme.
 * Native builds use use-color-scheme.ts instead; use-theme.ts reads whichever one applies.
 */
import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** Hydration happens once and React tracks it itself, so there is no outside event to listen for. */
function subscribeToNothing(): () => void {
  return () => {};
}

/** Client snapshot: once React stops using the server snapshot, the page has hydrated. */
function getClientSnapshot(): boolean {
  return true;
}

/** Server snapshot: used for static rendering and for the hydration pass that must match it. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Returns whether the page has hydrated. False during static rendering and hydration; React then
 * re-renders with true. Client-only renders get true straight away.
 */
function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
}

/**
 * Returns the browser's color scheme, or 'light' until the page has hydrated so the first client
 * render matches the statically rendered HTML.
 */
export function useColorScheme() {
  const hasHydrated = useHasHydrated();
  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
