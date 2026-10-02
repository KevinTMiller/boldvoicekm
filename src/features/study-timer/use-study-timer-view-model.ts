/**
 * Study timer view model (ViewModel layer).
 * Owns the session and new-session form state, refreshes the displayed time while a session runs,
 * asks for confirmation before stopping, finishes the session when its goal is reached, reports session and app lifecycle events to the Live
 * Activity controller, applies Pause/Resume taps made on the Live Activity, and restores a session
 * that survived an app kill. TimerScreen (View) renders the values this hook returns, wires its
 * controls to the actions, and supplies the dialog that shows the stop confirmation. Display
 * values come from the pure buildStudyTimerViewModel.
 */
import { useEffect, useEffectEvent, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useLiveActivityController } from '@/features/live-activity/live-activity-context';
import type {
  LiveActivityController,
  LiveActivityPauseChangeListener,
} from '@/features/live-activity/live-activity.types';
import {
  buildStudyTimerViewModel,
  type StudyTimerViewModelValues,
} from '@/features/study-timer/build-study-timer-view-model';
import {
  DEFAULT_SESSION_EMOJI,
  SUGGESTED_SESSION_EMOJIS,
} from '@/features/study-timer/session-emoji';
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
  buildStopSessionConfirmation,
  type PresentStopSessionConfirmation,
} from '@/features/study-timer/stop-session-confirmation';
import {
  finishSession,
  getMsUntilNextElapsedSecond,
  isGoalComplete,
  isSessionPaused,
  pauseSession,
  restartSession,
  resumeSession,
  startSession,
  type TimerSession,
} from '@/features/study-timer/timer-state';

/** Dependencies of the view model. */
export type StudyTimerViewModelOptions = {
  /** Shows the "Are you sure you want to stop?" prompt. TimerScreen passes the native alert. */
  presentStopSessionConfirmation: PresentStopSessionConfirmation;
  /** Clock returning epoch milliseconds. Defaults to Date.now. */
  now?: () => number;
};

/** Everything TimerScreen renders, plus the actions its controls call. */
export type StudyTimerViewModel = StudyTimerViewModelValues & {
  /** Name typed into the new-session form. */
  draftSessionName: string;
  /** Longest name the form accepts, in characters. */
  maxSessionNameLength: number;
  /** One-tap task emojis the form offers. */
  suggestedEmojis: readonly string[];
  /** Task emoji currently selected in the form. */
  selectedEmoji: string;
  /** Goal presets the form's slider offers, in minutes, shortest first. */
  goalOptionsMinutes: readonly number[];
  /** Goal currently selected in the form, in minutes. */
  selectedGoalMinutes: number;
  /** Updates the draft name as the user types. */
  onChangeDraftSessionName: (sessionName: string) => void;
  /** Selects the task emoji. */
  onSelectEmoji: (emoji: string) => void;
  /** Selects a goal preset. */
  onSelectGoalMinutes: (goalMinutes: number) => void;
  /** Starts a session from the form. */
  onPressStartSession: () => void;
  /** Pauses a running session or resumes a paused one. */
  onPressPauseOrResume: () => void;
  /** Asks the user to confirm, then stops the active session and returns to the form. */
  onPressStopSession: () => void;
};

/** The new-session form's values when Start is pressed. */
type NewSessionFormValues = {
  /** Name as typed; normalized when the session starts. */
  draftSessionName: string;
  /** Selected task emoji. */
  emoji: string;
  /** Selected goal in minutes. */
  goalMinutes: number;
};

/**
 * Provides the timer screen's state and actions. Must be used inside LiveActivityProvider.
 *
 * Side effects: reports events to the Live Activity controller, listens for Pause/Resume taps on
 * the Live Activity, schedules display refreshes while a session runs, listens to AppState,
 * restores a surviving session once on mount, and shows the stop confirmation through
 * `presentStopSessionConfirmation`.
 *
 * @param options - The stop confirmation presenter, and an optional clock override.
 * @returns View-ready values and actions.
 */
export function useStudyTimerViewModel({
  presentStopSessionConfirmation,
  now = Date.now,
}: StudyTimerViewModelOptions): StudyTimerViewModel {
  const controller = useLiveActivityController();
  const [session, setSession] = useState<TimerSession | null>(null);
  const [nowMs, setNowMs] = useState(() => now());
  const [draftSessionName, setDraftSessionName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(DEFAULT_SESSION_EMOJI);
  const [selectedGoalMinutes, setSelectedGoalMinutes] = useState(DEFAULT_SESSION_GOAL_MINUTES);

  /**
   * Pauses or resumes the session as of `changedAtMs` and reports it to the Live Activity. Does
   * nothing without a session, or when the session is already in the requested state (for
   * example, a Live Activity tap that repeats a change just made in the app). Declared before the
   * Live Activity listener so that listener always calls the current version.
   *
   * @param shouldPause - True to pause, false to resume.
   * @param changedAtMs - When the change happened, in epoch milliseconds. Earlier than now when
   *   the tap was made on the Live Activity.
   */
  function setSessionPaused(shouldPause: boolean, changedAtMs: number) {
    if (session === null || isSessionPaused(session) === shouldPause) {
      return;
    }
    // A Live Activity Resume after the goal must not start the clock again. Re-send the frozen
    // session so the activity, which iOS already updated, matches the finished screen.
    if (isGoalComplete(session, now())) {
      const finished = finishSession(session, now());
      controller.notify({ type: 'sessionPaused', session: finished });
      setSession(finished);
      return;
    }
    const updatedSession = shouldPause
      ? pauseSession(session, changedAtMs)
      : resumeSession(session, changedAtMs);
    controller.notify({
      type: shouldPause ? 'sessionPaused' : 'sessionResumed',
      session: updatedSession,
    });
    setSession(updatedSession);
    setNowMs(now());
  }

  useDisplayRefresh(session, now, setNowMs);
  useFinishSessionAtGoal(controller, session, nowMs, now, setSession);
  useAppStateReporting(controller, session, now, setNowMs);
  usePauseChangesFromLiveActivity(controller, (change) =>
    setSessionPaused(change.isPaused, change.changedAtMs)
  );
  useSessionRestore(controller, (restoredSession) => {
    setSession(restoredSession);
    setNowMs(now());
  });

  /**
   * Starts a session from the form. Does nothing while a session is active, since only one runs at
   * a time, or while the draft name is invalid. The emoji and goal stay selected for next time.
   */
  function onPressStartSession() {
    if (session !== null || !isSessionNameValid(draftSessionName)) {
      return;
    }
    const startedAtMs = now();
    const newSession = createSessionFromForm(
      { draftSessionName, emoji: selectedEmoji, goalMinutes: selectedGoalMinutes },
      startedAtMs
    );
    controller.notify({ type: 'sessionStarted', session: newSession });
    setSession(newSession);
    setNowMs(startedAtMs);
    setDraftSessionName('');
  }

  /**
   * Pauses, resumes, or — once the goal is complete — restarts the session from zero. Does nothing
   * without a session.
   */
  function onPressPauseOrResume() {
    if (session === null) {
      return;
    }
    if (isGoalComplete(session, now())) {
      const restartedSession = restartSession(session, now());
      controller.notify({ type: 'sessionResumed', session: restartedSession });
      setSession(restartedSession);
      setNowMs(now());
      return;
    }
    setSessionPaused(!isSessionPaused(session), now());
  }

  /**
   * Stops the session. Before the goal, asks for confirmation and shows the minutes left; the
   * session keeps running while the prompt is up and stops only if the user confirms. Once the
   * goal is complete, the button is "Start a new session" and ends the session immediately. Does
   * nothing without a session.
   */
  function onPressStopSession() {
    if (session === null) {
      return;
    }
    if (isGoalComplete(session, now())) {
      stopSession();
      return;
    }
    presentStopSessionConfirmation({
      ...buildStopSessionConfirmation(session, now()),
      onConfirm: stopSession,
    });
  }

  /** Ends the session and returns to the new-session form. Runs once the user confirms. */
  function stopSession() {
    controller.notify({ type: 'sessionStopped' });
    setSession(null);
  }

  return {
    ...buildStudyTimerViewModel({ session, nowMs, draftSessionName }),
    draftSessionName,
    maxSessionNameLength: MAX_SESSION_NAME_LENGTH,
    suggestedEmojis: SUGGESTED_SESSION_EMOJIS,
    selectedEmoji,
    goalOptionsMinutes: SESSION_GOAL_OPTIONS_MINUTES,
    selectedGoalMinutes,
    onChangeDraftSessionName: setDraftSessionName,
    onSelectEmoji: setSelectedEmoji,
    onSelectGoalMinutes: setSelectedGoalMinutes,
    onPressStartSession,
    onPressPauseOrResume,
    onPressStopSession,
  };
}

/**
 * Builds a new running session from the form's values.
 *
 * @param form - Name, emoji and goal from the form.
 * @param startedAtMs - Start time in epoch milliseconds.
 * @returns The new session.
 */
function createSessionFromForm(form: NewSessionFormValues, startedAtMs: number): TimerSession {
  return startSession(
    {
      name: normalizeSessionName(form.draftSessionName),
      emoji: form.emoji,
      goalSeconds: convertGoalMinutesToSeconds(form.goalMinutes),
    },
    startedAtMs
  );
}

/**
 * Freezes the session at its goal the first time the clock reaches it, and tells the Live Activity
 * so the Lock Screen stops counting too. A paused session is left alone.
 *
 * @param controller - Live Activity controller.
 * @param session - Active session, or null.
 * @param nowMs - Current time in epoch milliseconds. The effect re-checks when this changes.
 * @param now - Clock returning epoch milliseconds.
 * @param setSession - Stores the frozen session.
 */
function useFinishSessionAtGoal(
  controller: LiveActivityController,
  session: TimerSession | null,
  nowMs: number,
  now: () => number,
  setSession: (session: TimerSession) => void
): void {
  const finishAtGoal = useEffectEvent(() => {
    if (session === null || isSessionPaused(session) || !isGoalComplete(session, now())) {
      return;
    }
    const finishedSession = finishSession(session, now());
    controller.notify({ type: 'sessionPaused', session: finishedSession });
    setSession(finishedSession);
  });

  useEffect(() => {
    finishAtGoal();
  }, [session, nowMs]);
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
 * Applies Pause/Resume taps made on the current session's Live Activity. iOS can run the tap while
 * the app is in the background, so this listens for the whole lifetime of the screen.
 *
 * @param controller - Live Activity controller. It only forwards taps on the activity it tracks.
 * @param onPauseChange - Applies one tap to the view model's state.
 */
function usePauseChangesFromLiveActivity(
  controller: LiveActivityController,
  onPauseChange: LiveActivityPauseChangeListener
): void {
  // An effect event reads the latest session without re-subscribing on every change.
  const applyPauseChange = useEffectEvent(onPauseChange);

  useEffect(() => {
    const subscription = controller.addPauseChangeListener((change) => applyPauseChange(change));
    return () => subscription.remove();
  }, [controller]);
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
