/**
 * Bridge types for the StudyTimerActivity native module (native bridge layer).
 * These mirror the Swift records in ../ios/StudyTimerActivityRecords.swift, the snapshot
 * dictionaries the module returns and the pause-change event it sends, so property names must
 * match the Swift field names exactly. All times are epoch milliseconds.
 */

/** Content state of a study timer Live Activity. Mirrors StudyTimerAttributes.ContentState. */
export type StudyTimerActivityState = {
  /** True while the timer is paused; the widget then shows frozen values. */
  isPaused: boolean;
  /**
   * The running clock's effective start: the current time minus the elapsed time. The widget
   * ticks from here by itself.
   */
  runningSinceMs: number;
  /** Elapsed seconds frozen at pause time. Only meaningful while paused. */
  pausedElapsedSeconds: number;
  /**
   * Progress-ring stroke as #RRGGBB. Orange while the session runs, dimmed while paused, and the
   * accent blue once the goal is complete. The widget tints the circle with this instead of
   * choosing a color itself.
   */
  ringColorHex: string;
};

/** Everything needed to start a study timer Live Activity. */
export type StartStudyTimerActivityOptions = {
  /** Session name shown under the timer on the Lock Screen and in the Dynamic Island. */
  sessionName: string;
  /** Task emoji shown inside the progress ring and in the compact Dynamic Island. */
  sessionEmoji: string;
  /** Goal duration in seconds; the progress ring fills toward it. */
  goalSeconds: number;
  /** Widget layout to render. Unknown values fall back to the default layout in Swift. */
  presentationVariant: string;
  /** When the session first started. Used to pick the newest activity on restore. */
  sessionStartedAtMs: number;
  /** Initial content state. */
  state: StudyTimerActivityState;
};

/** A study timer Live Activity currently on screen, as returned by getActiveActivities. */
export type StudyTimerActivitySnapshot = {
  /** ActivityKit activity id. */
  id: string;
  /** Session name the activity was started with. */
  sessionName: string;
  /** Task emoji the activity was started with. */
  sessionEmoji: string;
  /** Goal duration in seconds. */
  goalSeconds: number;
  /** Layout variant the activity was started with. */
  presentationVariant: string;
  /** When the session first started. */
  sessionStartedAtMs: number;
  /** Latest content state. */
  state: StudyTimerActivityState;
};

/**
 * Sent as "onPauseChange" when the user taps Pause or Resume on a Live Activity. Swift has already
 * updated the activity by then; JavaScript applies the same change to its session.
 */
export type StudyTimerActivityPauseChangeEvent = {
  /** ActivityKit id of the activity whose button was tapped. */
  activityId: string;
  /** True after a Pause tap, false after a Resume tap. */
  isPaused: boolean;
  /** When the tap happened. */
  changedAtMs: number;
};

/** A registered event listener. Matches the shape of Expo's EventSubscription. */
export type StudyTimerActivitySubscription = {
  /** Stops the listener from being called. */
  remove(): void;
};

/** The functions and events the Swift module exposes, as seen from JavaScript. */
export type StudyTimerActivityNativeModule = {
  /** Whether the user allows Live Activities for this app. Synchronous. */
  areActivitiesEnabled(): boolean;
  /** Starts an activity. Resolves with its id; rejects when Live Activities are disabled. */
  startActivity(options: StartStudyTimerActivityOptions): Promise<string>;
  /** Replaces an activity's content state. Unknown ids are ignored. */
  updateActivity(activityId: string, state: StudyTimerActivityState): Promise<void>;
  /** Ends one activity immediately. Unknown ids are ignored. */
  endActivity(activityId: string): Promise<void>;
  /** Ends every study timer activity the app owns. */
  endAllActivities(): Promise<void>;
  /** Lists activities still on screen. */
  getActiveActivities(): Promise<StudyTimerActivitySnapshot[]>;
  /**
   * Subscribes to a native event. Every Expo native module is an event emitter; this one only
   * sends "onPauseChange".
   */
  addListener(
    eventName: 'onPauseChange',
    listener: (event: StudyTimerActivityPauseChangeEvent) => void
  ): StudyTimerActivitySubscription;
};

/**
 * Typed API over the native module that is safe to call when the module is missing (Android, web,
 * Expo Go, Jest). Reads then report that nothing is available, and writes do nothing.
 */
export type StudyTimerActivityApi = {
  /** Whether this build includes the native module. */
  isAvailable(): boolean;
  /** Whether Live Activities can be started right now. False without the native module. */
  areActivitiesEnabled(): boolean;
  /** Starts an activity. Resolves with its id, or null without the native module. */
  startActivity(options: StartStudyTimerActivityOptions): Promise<string | null>;
  /** Replaces an activity's content state. */
  updateActivity(activityId: string, state: StudyTimerActivityState): Promise<void>;
  /** Ends one activity immediately. */
  endActivity(activityId: string): Promise<void>;
  /** Ends every study timer activity the app owns. */
  endAllActivities(): Promise<void>;
  /** Lists activities still on screen. Empty without the native module. */
  getActiveActivities(): Promise<StudyTimerActivitySnapshot[]>;
  /**
   * Listens for Pause/Resume taps on any study timer Live Activity. Without the native module the
   * listener is never called.
   *
   * @returns A subscription that stops the listener when removed.
   */
  addPauseChangeListener(
    listener: (event: StudyTimerActivityPauseChangeEvent) => void
  ): StudyTimerActivitySubscription;
};
