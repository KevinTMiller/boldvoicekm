# Study Timer

An Expo / React Native study timer for iOS. You name a session, pick a task emoji, and choose a goal on a stepped slider. The stops are 1, 15, 20, 25, 30, 45, 60, 75 and 90 minutes, evenly spaced, and the slider starts at 15. The 1 minute stop is there for a quick test session. The app counts up in HH:MM:SS inside a progress ring, with Pause/Resume and Stop. Stop asks for confirmation first and says how many minutes are left until the goal. When the goal is reached the clock shows Finished!, Pause becomes Restart, and Stop becomes Start a new session. While a session runs, it shows as a **Live Activity** on the Lock Screen and in the **Dynamic Island**: the emoji with the session name beside it, the elapsed time, and a Pause/Resume button. When the goal is reached, that activity says Finished! too.

## Requirements

- **A development build.** Live Activities need native code (a local Expo module plus a widget extension), so they don't work in Expo Go. In Expo Go, on Android and on web, the timer still works; it just shows no Live Activity.
- **An Apple team ID.** Before building for a device, add `"appleTeamId": "<YOUR_TEAM_ID>"` under `expo.ios` in `app.json`. `@bacons/apple-targets` needs it to sign the widget extension. Simulator builds work without it.
- **iOS 16.4 or later.** The Dynamic Island also needs an iPhone 14 Pro or later (a simulator of one works too). The Live Activity's Pause/Resume button needs iOS 17; on iOS 16 the activity still shows, without that button.

## Getting started

```bash
npm install
npx expo run:ios      # generates ios/ with prebuild, builds, and launches the app
```

`ios/` and `android/` are generated (Continuous Native Generation) and gitignored. Don't edit them; configure native behavior in `app.json`, `modules/` and `targets/` instead. If `ios/` already exists, `expo run:ios` reuses it and does not notice new Swift files. After changing native config, adding a Swift file under `modules/`, or adding, renaming or removing a file in `targets/study-timer-widget/_shared/`, regenerate with `npx expo prebuild -p ios`. Use `--clean` when the generated project itself is stale, for example after adding `appleTeamId` or a widget layout.

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
  _layout.tsx                       Stack + LiveActivityProvider
  index.tsx                         TimerScreen: lays out components, wires them to the view model
src/components/study-timer/       View: presentational components (ring card, emoji picker, goal slider, stop alert)
src/features/study-timer/         ViewModel + Model
  use-study-timer-view-model.ts     ViewModel hook: state, display ticks, AppState, restore on launch
  build-study-timer-view-model.ts   Pure view-state builder (formatting, labels)
  timer-state.ts, ...               Pure, timestamp-based timer logic
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

## Manual QA checklist

Run these on a development build, on a device or on an iPhone 14 Pro (or later) simulator.

**Lock Screen**

- [ ] Start "Chapter 5 Review" with the tomato emoji and a 25 min goal, then lock the device. The activity shows the emoji inside the progress ring, the elapsed time ticking every second, and the title under the time. There is no "X% of Y min goal" line.
- [ ] Pause in the app. Within 1–2 s the Lock Screen freezes the time and dims it. Resume, and it continues from the same value.
- [ ] On iOS 17, tap Pause on the Lock Screen (and again from the expanded Dynamic Island). The app pauses too. Tap the same button, now Resume, and both continue.
- [ ] Tap Stop. An alert asks "Are you sure you want to stop?" and says how many minutes are left until the goal. Tap Cancel: the session keeps running. Tap Stop again and confirm: the activity disappears and the New Session form returns.
- [ ] Tap Stop after the goal is reached. The alert asks only the question, without a minutes-left line.

**Dynamic Island**

- [ ] Compact: the emoji on the left and the time on the right.
- [ ] Expanded (long-press the island): the emoji inside the progress ring, the time, the title under the time, and Pause/Resume.
- [ ] Minimal: start a second Live Activity from another app (for example, a Clock timer). The study timer's minimal view shows the progress ring with the emoji.

**Edge cases**

- [ ] Background the app for 2+ minutes. The activity keeps ticking, and when you reopen the app its time matches the activity.
- [ ] Force-quit while running. The activity keeps ticking. Relaunch: the session is restored with the correct time, and Pause and Stop act on the same activity.
- [ ] Force-quit while paused. Relaunch: the session is restored, still paused.
- [ ] Start and stop sessions (confirming each Stop) as fast as possible several times. After the final Stop, no activity remains.
- [ ] Turn Live Activities off in Settings. The timer still works, nothing crashes, and no activity appears.
- [ ] Use a 60-character name. It truncates in the compact island and wraps in the expanded view.

**Known limit:** iOS ends a Live Activity after 8 hours. A session older than that can't be restored from its activity after the app is killed.
