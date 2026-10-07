# Study Timer

An Expo / React Native study timer for iOS. You name a session, pick a task emoji, and choose a goal on a stepped slider. The stops are 1, 15, 20, 25, 30, 45, 60, 75 and 90 minutes, evenly spaced, and the slider starts at 15. The 1 minute stop is there for a quick test session. The app counts up in HH:MM:SS inside a progress ring, with Pause/Resume and Stop. Stop asks for confirmation first and says how many minutes are left until the goal. When the goal is reached the clock shows Finished!, Pause becomes Restart, and Stop becomes Start a new session. While a session runs, it shows as a **Live Activity** on the Lock Screen and in the **Dynamic Island**: the emoji with the session name beside it, the elapsed time, and a Pause/Resume button. When the goal is reached, that activity says Finished! too.

## Requirements

- **A development build.** Live Activities need native code (a local Expo module plus a widget extension), so they don't work in Expo Go. In Expo Go, on Android and on web, the timer still works; it just shows no Live Activity.
- **An Apple team ID.** `expo.ios.appleTeamId` is already set in `app.json`. `@bacons/apple-targets` uses it to sign the widget extension. Change it only if a build fails because that team cannot sign this bundle id.
- **iOS 16.4 or later.** The Dynamic Island also needs an iPhone 14 Pro or later (a simulator of one works too). The Live Activity's Pause/Resume button needs iOS 17; on iOS 16 the activity still shows, without that button.

## Run the app

Run these from the repository root, in order. Every command is non-interactive. Do not use Expo Go, and do not run `npx expo start` by itself: Live Activities are native code and only appear in the development build produced below. Do not edit `ios/` or `android/`; they are generated and gitignored. Configure native behavior in `app.json`, `modules/`, and `targets/`.

### 1. Check the machine

- macOS with Xcode installed, including the iOS 16.4 SDK or newer. `xcode-select -p` must print a path.
- Node.js 20 or newer (`node -v`) and npm (`npm -v`).

### 2. Install dependencies

```bash
npm ci
```

`npm ci` installs from `package-lock.json` and does not prompt.

### 3. Pick a simulator

The Dynamic Island needs an iPhone 14 Pro or later. List simulators:

```bash
xcrun simctl list devices available
```

Choose one available iPhone whose name is 14 Pro or newer (for example `iPhone 16 Pro`). Use that name exactly, including spaces. If it is not already booted:

```bash
xcrun simctl boot "iPhone 16 Pro"
```

Substitute the name you chose. If boot says the device is already booted, continue.

### 4. Build, install, and launch

```bash
EXPO_NO_TELEMETRY=1 npx expo run:ios --device "iPhone 16 Pro"
```

Again, substitute the simulator name. This generates `ios/` on the first run, compiles the app and the Live Activity widget, installs them on that simulator, and starts Metro. Leave the process running.

The launch succeeded when the simulator shows the Study Timer screen: a New Session form with a name field, emoji choices, a goal slider on 15 minutes, and a Start Session button.

JavaScript changes reload through the running Metro process. Swift changes under `modules/` or `targets/` need the same `npx expo run:ios --device "..."` command again. If `ios/` already exists and a new Swift file was added under `modules/`, or a file was added, renamed, or removed in `targets/study-timer-widget/_shared/`, regenerate first:

```bash
CI=1 npx expo prebuild -p ios
```

Then run `npx expo run:ios --device "..."` again. Add `--clean` to that prebuild only when the generated project itself is stale, for example after changing `appleTeamId` or adding a widget layout. `--clean` deletes `ios/` and rebuilds it.

### 5. Physical device, instead of the simulator

List devices:

```bash
xcrun xctrace list devices
```

Pass the device name or UDID. The phone must be unlocked, trusted, and on iOS 16.4 or later.

```bash
EXPO_NO_TELEMETRY=1 npx expo run:ios --device "<device name or UDID>"
```

Do not pass `--device` with no value. That opens an interactive picker.

### Checks that do not launch the app

```bash
npm test
npx tsc --noEmit
CI=1 EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npx expo lint
```

These do not install a Live Activity. Use section 4 to run the app.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Jest (`jest-expo`) unit, hook, component and screen tests |
| `npm run lint` | ESLint via `expo lint` |
| `npx tsc --noEmit` | Typecheck |

## Architecture

The app uses MVVM. Each layer has its own folder:

```
src/app/                          View (Expo Router routes)
  _layout.tsx                       Stack, AnalyticsProvider, LiveActivityProvider
  index.tsx                         TimerScreen: lays out components, wires them to the view model
src/components/study-timer/       View: presentational components (ring card, emoji picker, goal slider, stop alert)
src/features/study-timer/         ViewModel + Model
  use-study-timer-view-model.ts     ViewModel hook: state, display ticks, AppState, restore on launch
  build-study-timer-view-model.ts   Pure view-state builder (formatting, labels)
  timer-state.ts, ...               Pure, timestamp-based timer logic
src/features/analytics/           Model: swappable event client (console by default; see "Analytics")
src/features/live-activity/       Model: when and how the Live Activity is shown (see "Experiments")
modules/study-timer-activity/     Native bridge: local Expo module (Swift ActivityKit calls + typed TS API)
targets/study-timer-widget/       Widget extension (SwiftUI): Lock Screen and Dynamic Island layouts
__tests__/                        Screen tests (kept out of src/app, where Expo Router treats every file as a route)
```

**How an event flows:** `TimerScreen` → `useStudyTimerViewModel` → `LiveActivityController.notify(event)` → trigger policy → command queue → presenter → `StudyTimerActivity` native module → ActivityKit → widget.

Pause and Resume also run the other way. The widget's button runs `PauseOrResumeStudyTimerIntent` (`targets/study-timer-widget/_shared/`). `@bacons/apple-targets` links every file in `_shared/` into both the app and the widget, which this intent needs: the widget's button refers to the type, and iOS runs a `LiveActivityIntent`'s `perform()` in the app. There it calls `StudyTimerActivityPauseControl`, which updates the activity immediately and posts a notification. The Expo module forwards that as `onPauseChange` to JavaScript, and the view model applies the same pause or resume at the tap's timestamp. If the app had been killed, the next launch reads the paused state from the activity instead.

The widget ticks the clock by itself with `Text(timerInterval:)` and `ProgressView(timerInterval:)`. The app only sends updates when a session starts, pauses, resumes or stops, so the Lock Screen stays accurate even while the app is suspended. The Lock Screen and expanded island show the emoji inside a progress ring, the time, the session title under the time, and the Pause/Resume button. Compact shows the emoji and the time; minimal shows the ring.

**Edge cases:**

- **Backgrounded app.** ActivityKit keeps the activity, and the widget keeps ticking. When the app returns, it refreshes its own clock and re-syncs the activity.
- **Killed app.** The activity stays on screen. On relaunch, the app adopts the newest surviving activity, restores its session (running or paused, with the correct time) and ends any duplicates.
- **Rapid start/stop.** A command queue runs commands one at a time, in order. A start that has already been superseded is skipped. A start superseded while iOS is still creating the activity ends that activity as soon as it appears. As a safety net, every start and stop also clears every other activity. Together these mean no zombie activities.
- **Live Activities turned off in Settings.** The ActivityKit presenter reports itself unsupported, and the app falls back to a no-op presenter. The timer keeps working.

## Analytics

Events go through an `AnalyticsClient` (`track(event)`). The app mounts `AnalyticsProvider` in `src/app/_layout.tsx`, which uses the `console` client: each event is printed as `[analytics] <name>` plus its properties. The free-text session name is not included.

Recorded events:

| Event | When |
| --- | --- |
| `session_started` | Start on the new-session form |
| `session_paused` / `session_resumed` | Pause or resume in the app or on the Live Activity (`source`) |
| `session_finished` | The clock reaches the goal and the session freezes |
| `session_restarted` | Restart after the goal |
| `stop_confirmation_shown` | Stop is tapped before the goal |
| `stop_cancelled` | The stop dialog is dismissed |
| `session_stopped` | The session ends (`reason`: `confirmed` or `new_session`) |
| `session_restored` | A session is restored from a Live Activity after the app was killed |
| `live_activity_failed` | A Live Activity command fails |

To send these to a real provider, implement `AnalyticsClient`, register it in `src/features/analytics/analytics-registry.ts`, and pass its id to `<AnalyticsProvider clientId="...">`. Passing `client={...}` skips the registry. Call sites do not change.

## Experiments: changing how the Live Activity is triggered or shown

Three pieces can be swapped. A `LiveActivityConfig` selects each one by id. The app ships one of each, the defaults, and no experiments yet.

| Piece | Decides | Where |
| --- | --- | --- |
| Trigger policy | *When* to start, update or end the activity (a pure event-to-commands function) | `src/features/live-activity/trigger-policies/` |
| Presenter | *What* shows it (ActivityKit, or nothing) | `src/features/live-activity/presenters/` |
| Presentation variant | *Which* SwiftUI layout the widget renders | `targets/study-timer-widget/Layouts/` |

**Adding a trigger policy** (for example, show the activity only after 5 minutes):

1. Create `trigger-policies/<name>-trigger-policy.ts` implementing `LiveActivityTriggerPolicy` with a unique `id`.
2. Register its factory in `triggerPolicies` in `src/features/live-activity/live-activity-registry.ts`.
3. Add a colocated test. The command queue already provides the ordering and zombie protection.

**Adding a presenter:** implement `LiveActivityPresenter`, then register it in `presenters` in the same registry.

**Adding a layout variant** (this needs a native rebuild):

1. Add `targets/study-timer-widget/Layouts/<Variant>/` with a `<Variant>Layout` enum exposing `variantId`, `lockScreen(...)` and `dynamicIsland(...)`, following `Layouts/Default/`.
2. Add a `case` for it to both switches in `targets/study-timer-widget/StudyTimerLiveActivity.swift`.
3. Add its id to `presentationVariants` in the registry.

**Selecting a strategy:** pass a `LiveActivityConfigSource` (for example, one backed by remote config or experiment assignment) to `<LiveActivityProvider configSource={...}>` in `src/app/_layout.tsx`. Things to know:

- The config is read once per launch.
- Unknown ids fall back to the defaults.
- An unsupported presenter falls back to the no-op presenter.
- A restored activity keeps the layout variant it started with.

**Shared struct:** `StudyTimerAttributes.swift` exists twice, in `modules/study-timer-activity/ios/` and `targets/study-timer-widget/Shared/`. ActivityKit matches activities to widgets by this type, so the two copies must stay byte-identical. `study-timer-attributes-sync.test.ts` fails if they drift.
