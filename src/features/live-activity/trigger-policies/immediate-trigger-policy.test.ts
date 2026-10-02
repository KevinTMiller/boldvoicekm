/**
 * Tests for the immediate trigger policy (Model layer): which commands each event produces.
 */
import type {
  LiveActivityCommand,
  StudySessionEvent,
} from '@/features/live-activity/live-activity.types';
import {
  IMMEDIATE_TRIGGER_POLICY_ID,
  createImmediateTriggerPolicy,
} from '@/features/live-activity/trigger-policies/immediate-trigger-policy';
import { pauseSession, startSession } from '@/features/study-timer/timer-state';

const session = startSession({ name: 'Chapter 5', goalSeconds: 1500 }, 0);
const pausedSession = pauseSession(session, 10_000);
const policy = createImmediateTriggerPolicy();

// Requirement: the activity appears when the timer starts, reflects pause/resume, and disappears on stop.
describe('immediate trigger policy', () => {
  it('registers under the "immediate" id', () => {
    expect(policy.id).toBe(IMMEDIATE_TRIGGER_POLICY_ID);
  });

  it.each<[string, StudySessionEvent, boolean, LiveActivityCommand[]]>([
    [
      'starts an activity when a session starts',
      { type: 'sessionStarted', session },
      false,
      [{ type: 'start', session }],
    ],
    [
      'starts a replacement when a session starts while another is showing',
      { type: 'sessionStarted', session },
      true,
      [{ type: 'start', session }],
    ],
    [
      'updates the activity on pause',
      { type: 'sessionPaused', session: pausedSession },
      true,
      [{ type: 'update', session: pausedSession }],
    ],
    [
      'ignores a pause when nothing is showing',
      { type: 'sessionPaused', session: pausedSession },
      false,
      [],
    ],
    [
      'updates the activity on resume',
      { type: 'sessionResumed', session },
      true,
      [{ type: 'update', session }],
    ],
    ['ignores a resume when nothing is showing', { type: 'sessionResumed', session }, false, []],
    ['ends the activity on stop', { type: 'sessionStopped' }, true, [{ type: 'end' }]],
    [
      'still ends on stop when nothing is meant to be showing, to clean up leftovers',
      { type: 'sessionStopped' },
      false,
      [{ type: 'end' }],
    ],
    [
      're-syncs the activity when the app becomes active',
      { type: 'appBecameActive', session },
      true,
      [{ type: 'update', session }],
    ],
    [
      'does nothing when the app becomes active without a session',
      { type: 'appBecameActive', session: null },
      true,
      [],
    ],
    [
      'does nothing when the app becomes active and nothing is showing',
      { type: 'appBecameActive', session },
      false,
      [],
    ],
    [
      'pushes the current session when the app backgrounds, so Finished reaches the Lock Screen',
      { type: 'appMovedToBackground', session },
      true,
      [{ type: 'update', session }],
    ],
    [
      'does nothing when the app backgrounds without a session',
      { type: 'appMovedToBackground', session: null },
      true,
      [],
    ],
    [
      'does nothing when the app backgrounds and nothing is showing',
      { type: 'appMovedToBackground', session },
      false,
      [],
    ],
  ])('%s', (_description, event, isActivityShowing, expectedCommands) => {
    expect(policy.getCommandsForEvent(event, { isActivityShowing })).toEqual(expectedCommands);
  });
});
