/**
 * Restore selection (Model layer).
 * Decides which surviving Live Activity to restore after the app was killed and relaunched, and
 * which extra activities to end so that only one remains. Pure. Used by the Live Activity command
 * queue's restore step.
 */
import type { LiveActivitySnapshot } from '@/features/live-activity/live-activity.types';

/** Result of choosing which surviving Live Activity to restore. */
export type RestoreSelection = {
  /** The activity to adopt and restore into the app, or null when none survived. */
  snapshotToRestore: LiveActivitySnapshot | null;
  /** Ids of extra activities to end, for example ones left behind by a crash mid-start. */
  activityIdsToEnd: string[];
};

/**
 * Picks the newest surviving activity to restore and marks the rest for ending.
 *
 * @param snapshots - Activities currently on screen.
 * @returns The selection. The activity with the latest session start wins; on a tie, the first
 * one listed wins.
 */
export function selectSessionToRestore(
  snapshots: readonly LiveActivitySnapshot[]
): RestoreSelection {
  const newestSnapshot = findNewestSnapshot(snapshots);
  return {
    snapshotToRestore: newestSnapshot,
    activityIdsToEnd: snapshots
      .filter((snapshot) => snapshot !== newestSnapshot)
      .map((snapshot) => snapshot.activityId),
  };
}

/**
 * Finds the snapshot whose session started most recently.
 *
 * @param snapshots - Activities currently on screen.
 * @returns The newest snapshot, or null for an empty list.
 */
function findNewestSnapshot(
  snapshots: readonly LiveActivitySnapshot[]
): LiveActivitySnapshot | null {
  let newestSnapshot: LiveActivitySnapshot | null = null;
  for (const snapshot of snapshots) {
    if (newestSnapshot === null || snapshot.session.startedAtMs > newestSnapshot.session.startedAtMs) {
      newestSnapshot = snapshot;
    }
  }
  return newestSnapshot;
}
