/**
 * No-op presenter (Model layer, swappable strategy).
 * Accepts every command and shows nothing. The resolver uses it wherever Live Activities cannot
 * work (Android, web, Expo Go, Jest, or Live Activities disabled in Settings), and it can serve as
 * an experiment's control group. Registered under 'noop' in live-activity-registry.ts.
 */
import type { LiveActivityPresenter } from '@/features/live-activity/live-activity.types';

/** Registry id of the no-op presenter. */
export const NOOP_PRESENTER_ID = 'noop';

/**
 * Creates a presenter that does nothing.
 *
 * @returns A presenter that is always supported, never shows anything, never reports a
 *   Pause/Resume tap and never fails.
 */
export function createNoopPresenter(): LiveActivityPresenter {
  return {
    id: NOOP_PRESENTER_ID,
    isSupported: () => true,
    start: async () => null,
    update: async () => {},
    end: async () => {},
    endAll: async () => {},
    listActive: async () => [],
    addPauseChangeListener: () => ({ remove: () => {} }),
  };
}
