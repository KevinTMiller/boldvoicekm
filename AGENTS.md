This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Code quality

- **One responsibility per function.** Prefer small, discrete helpers over multi-step procedures. Components render and wire events; non-UI logic belongs in helpers or hooks.
- **English-like names.** Function and variable names should read like prose (`getNextLesson`, `isMicrophonePermissionGranted`). Booleans use `is` / `has` / `can` / `should`. Avoid abbreviations and vague verbs (`handle`, `process`).
- **Document public APIs.** Exported functions, hooks, and components get brief JSDoc (purpose, params/returns when non-obvious, side effects and thrown errors).
- **Prioritize testability.** Prefer pure functions for business logic; inject I/O dependencies; avoid hidden module state. Colocate tests as `foo.test.ts` when adding them.
- **Modern React Native.** Functional components and hooks only. Screens in `src/app/`; shared UI/logic outside. Prefer Expo modules and `@expo/ui`. Use theme tokens for colors/spacing. `Pressable` over `TouchableOpacity`. `process.env.EXPO_OS` over `Platform.OS`.

## Scope discipline

- Do only what was requested. Do not refactor, rename, upgrade, or edit unrelated files "while here."
- If a change falls outside the stated scope, ask for permission before making it.
- If the request's boundaries are unclear, ask before assuming a larger interpretation.
