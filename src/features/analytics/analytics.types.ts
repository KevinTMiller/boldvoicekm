/**
 * Analytics client (Model layer).
 * The events the study timer records, and the interface a provider implements. The view model and
 * the Live Activity controller call `track`; they never talk to a vendor SDK. Swap the
 * implementation by registering another client in analytics-registry.ts.
 */

/** Where a pause or resume was requested. */
export type AnalyticsControlSource = 'app' | 'live_activity';

/** Why a session ended. `new_session` is the button shown after the goal is already complete. */
export type AnalyticsStopReason = 'confirmed' | 'new_session';

/**
 * Facts about a session that every provider can store. The free-text session name is omitted.
 * `goalMinutes` is the selected goal. `elapsedSeconds` is whole seconds studied so far.
 */
export type SessionAnalyticsProperties = {
  /** Selected goal, in minutes. */
  goalMinutes: number;
  /** Task emoji chosen for the session. */
  emoji: string;
  /** Whole seconds studied so far. */
  elapsedSeconds: number;
};

/** One analytics event. `properties` is the payload a provider stores with the name. */
export type AnalyticsEvent =
  | {
      /** A session started from the new-session form. */
      name: 'session_started';
      properties: Pick<SessionAnalyticsProperties, 'goalMinutes' | 'emoji'>;
    }
  | {
      /** The user paused a session that had not reached its goal. */
      name: 'session_paused';
      properties: SessionAnalyticsProperties & { source: AnalyticsControlSource };
    }
  | {
      /** The user resumed a paused session that had not reached its goal. */
      name: 'session_resumed';
      properties: SessionAnalyticsProperties & { source: AnalyticsControlSource };
    }
  | {
      /** The clock reached the goal and the session froze. */
      name: 'session_finished';
      properties: Pick<SessionAnalyticsProperties, 'goalMinutes' | 'emoji'>;
    }
  | {
      /** Restart after the goal, which starts the same name, emoji and goal from zero. */
      name: 'session_restarted';
      properties: Pick<SessionAnalyticsProperties, 'goalMinutes' | 'emoji'>;
    }
  | {
      /** The stop confirmation was shown. The session keeps running until the user answers. */
      name: 'stop_confirmation_shown';
      properties: SessionAnalyticsProperties & {
        /** Whole minutes left, rounded up, matching the dialog copy. */
        remainingMinutes: number;
      };
    }
  | {
      /** The user dismissed the stop confirmation. The session keeps running. */
      name: 'stop_cancelled';
      properties: SessionAnalyticsProperties;
    }
  | {
      /** The session ended and the screen returned to the new-session form. */
      name: 'session_stopped';
      properties: SessionAnalyticsProperties & { reason: AnalyticsStopReason };
    }
  | {
      /** A session was restored from a Live Activity that survived an app kill. */
      name: 'session_restored';
      properties: SessionAnalyticsProperties & { isPaused: boolean };
    }
  | {
      /** A Live Activity command failed. `task` names the step, such as "immediate policy". */
      name: 'live_activity_failed';
      properties: { task: string };
    };

/**
 * Records product events. A provider must not throw: a failure here must not break the timer.
 */
export type AnalyticsClient = {
  /**
   * Records one event.
   *
   * @param event - Event name and properties.
   */
  track(event: AnalyticsEvent): void;
};
