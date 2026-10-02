/**
 * Tests for selectSessionToRestore, which picks the surviving Live Activity to restore after an
 * app kill.
 */
import type { LiveActivitySnapshot } from '@/features/live-activity/live-activity.types';
import { selectSessionToRestore } from '@/features/study-timer/restore-session';
import { startSession } from '@/features/study-timer/timer-state';

/**
 * Builds a snapshot of a running activity whose session started at `startedAtMs`.
 *
 * @param activityId - Fake activity id.
 * @param startedAtMs - Session start time in epoch milliseconds.
 * @returns A snapshot using the default layout variant.
 */
function makeSnapshot(activityId: string, startedAtMs: number): LiveActivitySnapshot {
  return {
    activityId,
    session: startSession({ name: activityId, goalSeconds: 1500 }, startedAtMs),
    presentationVariant: 'default',
  };
}

// Edge case: after an app kill, exactly one activity survives and it is the newest session.
describe('selectSessionToRestore', () => {
  it('returns nothing to restore when no activity survived', () => {
    expect(selectSessionToRestore([])).toEqual({ snapshotToRestore: null, activityIdsToEnd: [] });
  });

  it('restores a lone activity without ending anything', () => {
    const only = makeSnapshot('only', 1_000);

    expect(selectSessionToRestore([only])).toEqual({
      snapshotToRestore: only,
      activityIdsToEnd: [],
    });
  });

  it('restores the newest activity and ends the others', () => {
    const older = makeSnapshot('older', 1_000);
    const newest = makeSnapshot('newest', 3_000);
    const middle = makeSnapshot('middle', 2_000);

    const selection = selectSessionToRestore([older, newest, middle]);

    expect(selection.snapshotToRestore).toBe(newest);
    expect(selection.activityIdsToEnd).toEqual(['older', 'middle']);
  });

  it('keeps the first listed activity when start times tie', () => {
    const first = makeSnapshot('first', 1_000);
    const second = makeSnapshot('second', 1_000);

    const selection = selectSessionToRestore([first, second]);

    expect(selection.snapshotToRestore).toBe(first);
    expect(selection.activityIdsToEnd).toEqual(['second']);
  });
});
