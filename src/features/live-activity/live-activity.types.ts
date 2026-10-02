/**
 * Live Activity contracts (Model layer).
 * Defines the swappable pieces of the Live Activity system:
 * - the events the study timer reports (StudySessionEvent),
 * - the commands a trigger policy issues (LiveActivityCommand),
 * - the policy that decides *when* to show the activity (LiveActivityTriggerPolicy),
 * - the presenter that decides *what* shows it (LiveActivityPresenter),
 * - the Pause/Resume taps an activity reports back to the app (LiveActivityPauseChange),
 * - the config that selects them (LiveActivityConfig).
 * Implementations live in trigger-policies/ and presenters/, and create-live-activity-controller.ts
 * wires them together. This file contains types only.
 */
import type { TimerSession } from '@/features/study-timer/timer-state';

/**
 * Something that happened in the study timer or the app lifecycle. The view model reports these
 * and never talks to ActivityKit directly; the active trigger policy decides what they mean.
 */
export type StudySessionEvent =
  | { type: 'sessionStarted'; session: TimerSession }
  | { type: 'sessionPaused'; session: TimerSession }
  | { type: 'sessionResumed'; session: TimerSession }
  | { type: 'sessionStopped' }
  /** The app returned to the foreground. `session` is null when no session is active. */
  | { type: 'appBecameActive'; session: TimerSession | null }
  /** The app moved to the background. `session` is null when no session is active. */
  | { type: 'appMovedToBackground'; session: TimerSession | null };

/**
 * An instruction for the presenter. Trigger policies produce these and the command queue runs
 * them in order. `update` and `end` act on whichever activity the queue is currently tracking.
 */
export type LiveActivityCommand =
  | { type: 'start'; session: TimerSession }
  | { type: 'update'; session: TimerSession }
  | { type: 'end' };

/** What a trigger policy knows besides the event itself. */
export type LiveActivityPolicyContext = {
  /**
   * Whether the strategy has asked for an activity to be on screen: a start was issued, or one was
   * restored, and no end has followed. This is the intended state, not one confirmed by iOS, so
   * policies can stay pure and synchronous.
   */
  isActivityShowing: boolean;
};

/**
 * Decides which commands an event produces. Must be pure. Swap the policy to change *when* the
 * activity appears, updates or ends.
 */
export interface LiveActivityTriggerPolicy {
  /** Registry id, matched against LiveActivityConfig.triggerPolicyId. */
  id: string;
  /**
   * Maps an event to zero or more commands.
   *
   * @param event - What just happened.
   * @param context - Current intended activity state.
   * @returns Commands to run, in order.
   */
  getCommandsForEvent(
    event: StudySessionEvent,
    context: LiveActivityPolicyContext
  ): LiveActivityCommand[];
}

/** A Live Activity currently on screen, as reported by a presenter. */
export type LiveActivitySnapshot = {
  /** Presenter-specific identifier (for ActivityKit, the activity's id). */
  activityId: string;
  /** Session rebuilt from the activity's attributes and content state. */
  session: TimerSession;
  /** Layout variant the activity was started with. */
  presentationVariant: string;
};

/**
 * The user tapped Pause or Resume on the Live Activity itself. By the time this arrives the
 * activity already shows the new state; the app still has to apply it to the session.
 */
export type LiveActivityPauseChange = {
  /** Activity whose button was tapped. */
  activityId: string;
  /** True after a Pause tap, false after a Resume tap. */
  isPaused: boolean;
  /**
   * When the tap happened, in epoch milliseconds. Applying the change at this time, rather than
   * when the app hears about it, keeps the app's elapsed time identical to the activity's.
   */
  changedAtMs: number;
};

/** Receives Pause/Resume taps from a Live Activity. */
export type LiveActivityPauseChangeListener = (change: LiveActivityPauseChange) => void;

/** A registered listener. */
export type LiveActivitySubscription = {
  /** Stops the listener from being called. Safe to call more than once. */
  remove(): void;
};

/**
 * I/O adapter that actually shows the activity. Swap the presenter to change *what* shows it, for
 * example ActivityKit on iOS or nothing at all. Methods may reject; the command queue catches and
 * reports every error.
 */
export interface LiveActivityPresenter {
  /** Registry id, matched against LiveActivityConfig.presenterId. */
  id: string;
  /**
   * Reports whether this presenter can work on the current device. Checked once, when the strategy
   * is resolved at launch.
   */
  isSupported(): boolean;
  /**
   * Shows a new activity for the session.
   *
   * @returns The new activity's id, or null if nothing was shown.
   */
  start(session: TimerSession, presentationVariant: string): Promise<string | null>;
  /** Pushes the session's latest state to an existing activity. */
  update(activityId: string, session: TimerSession): Promise<void>;
  /** Removes one activity immediately. */
  end(activityId: string): Promise<void>;
  /** Removes every activity this presenter owns, including ones the app lost track of. */
  endAll(): Promise<void>;
  /** Lists the activities currently on screen, for example after the app was killed. */
  listActive(): Promise<LiveActivitySnapshot[]>;
  /**
   * Listens for Pause/Resume taps on any activity this presenter shows. Presenters whose
   * activities have no buttons never call the listener.
   *
   * @returns A subscription that stops the listener when removed.
   */
  addPauseChangeListener(listener: LiveActivityPauseChangeListener): LiveActivitySubscription;
}

/**
 * Selects the Live Activity strategy by registry id. Unknown ids fall back to the defaults in
 * live-activity-config.ts.
 */
export type LiveActivityConfig = {
  /** Which trigger policy decides when the activity is shown. */
  triggerPolicyId: string;
  /** Which presenter shows it. */
  presenterId: string;
  /** Which SwiftUI layout the widget renders. Stored on the activity when it starts. */
  presentationVariant: string;
};

/**
 * Supplies the config at launch. The app currently uses a static source; a remote-config or
 * experiment source can implement this same interface later.
 */
export interface LiveActivityConfigSource {
  /** Returns the config to use for this app launch. */
  getLiveActivityConfig(): LiveActivityConfig;
}

/** The resolved, ready-to-use combination of policy, presenter and layout variant. */
export type LiveActivityStrategy = {
  /** Decides when commands are issued. */
  policy: LiveActivityTriggerPolicy;
  /** Executes the commands. Always supported on the current device. */
  presenter: LiveActivityPresenter;
  /** Layout variant passed to new activities. */
  presentationVariant: string;
};

/**
 * The facade the view model talks to. It hides which strategy is active and guarantees the
 * presenter sees commands in order.
 */
export interface LiveActivityController {
  /**
   * Reports an event. The active policy decides what, if anything, to show. Never throws; work
   * happens in the background in order.
   */
  notify(event: StudySessionEvent): void;
  /**
   * Adopts the newest activity that survived an app kill and ends any others. Never rejects.
   *
   * @returns The adopted session. Null when no activity survived, when restoring failed, or when
   * an event issued commands while the restore ran (the user's newer action wins).
   */
  restoreSession(): Promise<TimerSession | null>;
  /**
   * Listens for Pause/Resume taps on the current session's activity. Taps on any other activity,
   * such as one that is being ended, are dropped so they cannot change the session.
   *
   * @returns A subscription that stops the listener when removed.
   */
  addPauseChangeListener(listener: LiveActivityPauseChangeListener): LiveActivitySubscription;
  /** Resolves once all queued work has finished. Useful in tests. */
  whenIdle(): Promise<void>;
}
