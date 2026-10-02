/**
 * Web splash overlay (View layer).
 * The web build has no native splash screen to fade out from, so the overlay renders nothing.
 * Native builds use animated-icon.tsx; src/app/_layout.tsx renders whichever one applies.
 */

/** Renders nothing on web. */
export function AnimatedSplashOverlay() {
  return null;
}
