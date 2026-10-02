/**
 * Study timer view model (ViewModel layer).
 * Owns the session and new-session form state, refreshes the displayed time while a session runs,
 * reports session and app lifecycle events to the Live Activity controller, and restores a session
 * that survived an app kill. TimerScreen (View) renders the values this hook returns and wires its
 * buttons to the actions. Display values come from the pure buildStudyTimerViewModel.
 */
import { useEffect, useEffectEvent, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useLiveActivityController } from '@/features/live-activity/live-activity-context';
import type { LiveActivityController } from '@/features/live-activity/live-activity.types';
import {
  buildStudyTimerViewModel,
  type StudyTimerViewModelValues,
} from '@/features/study-timer/build-study-timer-view-model';
import {
  DEFAULT_SESSION_GOAL_MINUTES,
  SESSION_GOAL_OPTIONS_MINUTES,
  convertGoalMinutesToSeconds,
} from '@/features/study-timer/session-goals';
import {
  MAX_SESSION_NAME_LENGTH,
  isSessionNameValid,
  normalizeSessionName,
} from '@/features/study-timer/session-name';
import {
  getMsUntilNextElapsedSecond,
  isSessionPaused,
  pauseSession,
  resumeSession,
  startSession,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/** Optional dependencies of the view model. */
export type StudyTimerViewModelOptions = {
  /** Clock returning epoch milliseconds. Defaults to Date.now. */
  now?: () => number;
};

/** Everything TimerScreen renders, plus the actions its controls call. */
export type StudyTimerViewModel = StudyTimerViewModelValues & {
  /** Name typed into the new-session form. */
  draftSessionName: string;
  /** Longest name the form accepts, in characters. */
  maxSessionNameLength: number;
  /** Goal presets the form offers, in minutes. */
  goalOptionsMinutes: readonly number[];
  /** Goal currently selected in the form, in minutes. */
  selectedGoalMinutes: number;
  /** Updates the draft name as the user types. */
  onChangeDraftSessionName: (sessionName: string) => void;
  /** Selects a goal preset. */
  onSelectGoalMinutes: (goalMinutes: number) => void;
  /** Starts a session from the form, replacing the active one if there is one. */
  onPressStartSession: () => void;
  /** Pauses a running session or resumes a paused one. */
  onPressPauseOrResume: () => void;
  /** Stops the active session and returns to the form. */
  onPressStopSession: () => void;
  /** Opens the form on top of the active session, which keeps running meanwhile. */
  onPressStartNewSession: () => void;
  /** Closes the form and goes back to the active session. */
  onPressCancelNewSession: () => void;
};

/**
 * Provides the timer screen's state and actions. Must be used inside LiveActivityProvider.
 *
 * Side effects: reports events to the Live Activity controller, schedules display refreshes while
 * a session runs, listens to AppState, and restores a surviving session once on mount.
 *
 * @param options - Optional clock override.
 * @returns View-ready values and actions.
 */
export function useStudyTimerViewModel({
  now = Date.now,
}: StudyTimerViewModelOptions = {}): StudyTimerViewModel {
  const controller = useLiveActivityController();
  const [session, setSession] = useState<TimerSession | null>(null);
  const [nowMs, setNowMs] = useState(() => now());
  const [draftSessionName, setDraftSessionName] = useState('');
  const [selectedGoalMinutes, setSelectedGoalMinutes] = useState(DEFAULT_SESSION_GOAL_MINUTES);
  const [isComposingNewSession, setIsComposingNewSession] = useState(false);

  useDisplayRefresh(session, now, setNowMs);
  useAppStateReporting(controller, session, now, setNowMs);
  useSessionRestore(controller, (restoredSession) => {
    setSession(restoredSession);
    setNowMs(now());
  });

  /** Starts a session from the form. Does nothing while the draft name is invalid. */
  function onPressStartSession() {
    if (!isSessionNameValid(draftSessionName)) {
      return;
    }
    const startedAtMs = now();
    const newSession = createSessionFromForm(draftSessionName, selectedGoalMinutes, startedAtMs);
    if (session !== null) {
      // The replaced session ends first, so the policy sees a clean stop before the new start.
      controller.notify({ type: 'sessionStopped' });
    }
    controller.notify({ type: 'sessionStarted', session: newSession });
    setSession(newSession);
    setNowMs(startedAtMs);
    setDraftSessionName('');
    setIsComposingNewSession(false);
  }

  /** Toggles between paused and running. Does nothing without a session. */
  function onPressPauseOrResume() {
    if (session === null) {
      return;
    }
    const changedAtMs = now();
    const isResuming = isSessionPaused(session);
    const updatedSession = isResuming
      ? resumeSession(session, changedAtMs)
      : pauseSession(session, changedAtMs);
    controller.notify({
      type: isResuming ? 'sessionResumed' : 'sessionPaused',
      session: updatedSession,
    });
    setSession(updatedSession);
    setNowMs(changedAtMs);
  }

  /** Stops the active session. Does nothing without a session. */
  function onPressStopSession() {
    if (session === null) {
      return;
    }
    controller.notify({ type: 'sessionStopped' });
    setSession(null);
    setIsComposingNewSession(false);
  }

  /** Opens the new-session form over the active session. */
  function onPressStartNewSession() {
    setIsComposingNewSession(true);
  }

  /** Closes the new-session form and discards the draft name. */
  function onPressCancelNewSession() {
    setIsComposingNewSession(false);
    setDraftSessionName('');
  }

  return {
    ...buildStudyTimerViewModel({ session, nowMs, draftSessionName, isComposingNewSession }),
    draftSessionName,
    maxSessionNameLength: MAX_SESSION_NAME_LENGTH,
    goalOptionsMinutes: SESSION_GOAL_OPTIONS_MINUTES,
    selectedGoalMinutes,
    onChangeDraftSessionName: setDraftSessionName,
    onSelectGoalMinutes: setSelectedGoalMinutes,
    onPressStartSession,
    onPressPauseOrResume,
    onPressStopSession,
    onPressStartNewSession,
    onPressCancelNewSession,
  };
}

/**
 * Builds a new running session from the form's values.
 *
 * @param draftSessionName - Name as typed; normalized here.
 * @param goalMinutes - Selected goal in minutes.
 * @param startedAtMs - Start time in epoch milliseconds.
 * @returns The new session.
 */
function createSessionFromForm(
  draftSessionName: string,
  goalMinutes: number,
  startedAtMs: number
): TimerSession {
  return startSession(
    {
      name: normalizeSessionName(draftSessionName),
      goalSeconds: convertGoalMinutesToSeconds(goalMinutes),
    },
    startedAtMs
  );
}

/**
 * While the session runs, refreshes the clock each time the displayed second changes. The clock is
 * re-read on every refresh instead of counting ticks, so late or skipped timers cannot drift it.
 *
 * @param session - Active session, or null.
 * @param now - Clock returning epoch milliseconds.
 * @param setNowMs - Stores the refreshed time.
 */
function useDisplayRefresh(
  session: TimerSession | null,
  now: () => number,
  setNowMs: (nowMs: number) => void
): void {
  const readClock = useEffectEvent(() => now());

  useEffect(() => {
    if (session === null || isSessionPaused(session)) {
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    // A timeout chain aimed at each second boundary, rather than a fixed interval, so the display
    // flips exactly when a new second of study time is reached.
    const scheduleNextRefresh = () => {
      timeoutId = setTimeout(() => {
        setNowMs(readClock());
        scheduleNextRefresh();
      }, getMsUntilNextElapsedSecond(session, readClock()));
    };
    scheduleNextRefresh();
    return () => clearTimeout(timeoutId);
  }, [session, setNowMs]);
}

/**
 * Reports foreground and background transitions to the Live Activity controller, and refreshes
 * the clock on return to the foreground.
 *
 * @param controller - Live Activity controller.
 * @param session - Active session, or null.
 * @param now - Clock returning epoch milliseconds.
 * @param setNowMs - Stores the refreshed time.
 */
function useAppStateReporting(
  controller: LiveActivityController,
  session: TimerSession | null,
  now: () => number,
  setNowMs: (nowMs: number) => void
): void {
  // An effect event reads the latest session without re-subscribing on every change.
  const onAppStateChange = useEffectEvent((appState: AppStateStatus) => {
    if (appState === 'active') {
      // iOS suspends JS timers in the background, so the shown time is stale until refreshed.
      setNowMs(now());
      controller.notify({ type: 'appBecameActive', session });
    } else if (appState === 'background') {
      controller.notify({ type: 'appMovedToBackground', session });
    }
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) =>
      onAppStateChange(appState)
    );
    return () => subscription.remove();
  }, []);
}

/**
 * Asks the controller, once per controller, for a session that survived an app kill, and applies
 * it if one did.
 *
 * @param controller - Live Activity controller.
 * @param onSessionRestored - Applies the restored session to the view model's state.
 */
function useSessionRestore(
  controller: LiveActivityController,
  onSessionRestored: (restoredSession: TimerSession) => void
): void {
  const applyRestoredSession = useEffectEvent(onSessionRestored);

  useEffect(() => {
    // Set on cleanup, so a restore that finishes after unmount (or after a Strict Mode re-run)
    // is ignored.
    let isCancelled = false;
    void controller.restoreSession().then((restoredSession) => {
      if (!isCancelled && restoredSession !== null) {
        applyRestoredSession(restoredSession);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [controller]);
}
