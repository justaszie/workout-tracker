# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

A client app for people working with a private coach: view the current program week, log exercises, and send the finished week to the coach. It is a single Compose activity in Material 3, implemented from a design with six boards.

The Android app reads the current week from the coach server (`WeekApi`, parsed in `WeekJson.kt`) each time it comes to the foreground. `WeekStore` caches that plan and the client's input in separate JSON files, so the week works offline. Each change is saved and then uploaded whole by `WeekUploadWorker`, which WorkManager retries until the server has it, even if the app is closed. `SampleWeek` is only for previews and tests. Navigation is a small back stack in `WeekViewModel`, not a library.

The client signs in with Google (`ui/signin`, through Credential Manager). The server trades Google's ID token for a session token, which `SessionStore` keeps in a file outside backups and `WeekApi` sends on every call. A 401 from the server means the session has ended: the app signs itself out and shows the sign-in screen, and `WeekUploadWorker` stops retrying. What was logged stays on the device and is uploaded after the next sign-in; it is only cleared when a different client signs in.

`web/` holds the coach web app and a web version of this client app, for clients on an iPhone. Each has its own section below.

## Commands

Run from the repository root. There is one module, `:app`.

```sh
./gradlew assembleDebug                # build the debug APK
./gradlew installDebug                 # install on a connected device or emulator
./gradlew lintDebug                    # lint; report at app/build/reports/lint-results-debug.html
./gradlew testDebugUnitTest            # JVM unit tests
./gradlew connectedDebugAndroidTest    # instrumented tests; requires a device or emulator

# single unit test class or method
./gradlew testDebugUnitTest --tests "com.example.workoutprogram.ExampleUnitTest"
./gradlew testDebugUnitTest --tests "com.example.workoutprogram.ExampleUnitTest.addition_isCorrect"
```

## Build setup

- UI is Jetpack Compose with Material 3. Compose library versions come from the BOM, so don't pin them individually.
- Declare dependency versions in `gradle/libs.versions.toml` and reference them as `libs.*`. Repositories belong in `settings.gradle.kts`; `FAIL_ON_PROJECT_REPOS` makes the build fail if a module declares its own.
- There is no `kotlin-android` plugin in `app/build.gradle.kts`, only `kotlin-compose`. AGP 9 compiles Kotlin itself, so don't add it.
- The Gradle configuration cache is on, so custom build logic must be compatible with it.
- R8 keep rules go in `app/src/main/keepRules/` rather than a `proguard-rules.pro` file. Release optimization is scoped to `androidx.**`, `kotlin.**` and `kotlinx.**` through `packageScope`, so app code is not currently optimized.
- Text fields use `LabeledField`, which takes a `TextFieldState`. Keep that state in the screen; mirroring it through a `String` drops characters during fast typing.
- The app is light-only and doesn't use dynamic color. Roboto Condensed is bundled in `res/font`, with its license in `assets/licenses`.
- `minSdk` is 33, so no compatibility handling is needed for older API levels.
- The server connection comes from gitignored `local.properties`: `coach.apiUrl` (default `http://localhost:3000`) and `coach.googleClientId`, the server's "Web application" OAuth client ID (the same value as its `GOOGLE_CLIENT_ID`). Google only allows sign-in from an app whose package name and signing key SHA-1 are registered as an "Android" OAuth client in the same Google Cloud project; that client's ID isn't used in code. Optional `coach.clientId` adds a "Developer sign-in" button to debug builds, which signs in as that client without Google on a server that has no password. To reach a local server from a device or emulator, run `adb reverse tcp:3000 tcp:3000`. Only debug builds allow cleartext HTTP (`app/src/debug/AndroidManifest.xml`).

## Coach web app

`web/` is one Node process serving a React + TypeScript app and its API. It needs Node 22.18+, which runs the server's TypeScript directly, so the server has no build step, and a Postgres server. `DATABASE_URL` defaults to `postgres://localhost/coach` outside production; create that database once with `createdb coach`. Run these from `web/`:

```sh
npm run dev      # app and API on http://localhost:3000
npm run demo     # same, with the six clients from the design, in a `demo` schema reset on each start
npm test         # node:test, for shared/ and server/; server tests need Postgres and use a `test` schema
npm run build    # type-check and bundle into dist/
DATABASE_URL=... APP_PASSWORD=... npm start   # production; serves dist/ on all interfaces
```

- `npm run dev` and `npm run demo` load the gitignored `web/.env` if it exists; that is where `GOOGLE_CLIENT_ID` goes for local work. `npm start` and the tests don't read it.
- `shared/model.ts` mirrors `data/Model.kt` and holds all derived logic, such as client status and result flags. Both the server and the browser import it; keep the two models in step.
- `server/store.ts` is the only code that talks to Postgres. It creates missing tables on start and seeds an empty database; there are no migrations yet, so a change to an existing table has to be applied by hand, unless it can be written as an idempotent statement like the `add column if not exists` lines there. A week's workouts, exercises and logs are one `jsonb` value, which doesn't keep key order, so compare them with `isDeepStrictEqual`, not as JSON strings.
- Any change to a client goes through `store.update`, which holds that client's row lock. Throw `Refused` inside it to roll back and answer with an error status. Only the draft and the latest week are written back.
- The database sits behind this API. Client apps use the endpoints below and never connect to Postgres directly.
- There are two kinds of caller, told apart in `server/app.ts`. The coach uses HTTP Basic auth with any username and `APP_PASSWORD`, which covers everything except `/api/auth` and `/api/me`. A client signs in with Google: the app posts Google's ID token to `POST /api/auth/google`, `server/google.ts` verifies it against `GOOGLE_CLIENT_ID` (the "Web application" OAuth client ID), and the answer is a session token to send as `Authorization: Bearer` on `/api/me/*`. Sessions are rows in `sessions`, stored hashed, and last 90 days from their last use.
- A client can sign in once the coach has set their email (`PUT /api/clients/:id/email`, or `email` on `POST /api/clients`). The first sign-in saves the Google account's `sub` on the client, and later sign-ins match on that. Changing the email clears it and signs the client out.
- Without `APP_PASSWORD` the server binds to localhost only, the coach's routes are open, and `POST /api/auth/dev` with a `clientId` gives a session for any client without Google.
- On Vercel (project Root Directory `web`), `vercel.json` sends `/api/*` to `api/index.ts`, which refuses to start without `APP_PASSWORD` and `DATABASE_URL`; everything else is `dist/` on the CDN, with `/app/*` falling back to the client web app's page and the rest to the coach's. `server/index.ts` isn't used there, so static files aren't behind Basic auth; the API is.
- The plan builder saves its fields as typed (`PlanForm`), so drafts can be incomplete. `shared/plan.ts` validates them and converts them to a `Week` on publish.
- The client app's endpoints are `GET /api/me/current-week`, which is the week plus its `coach`, `GET /api/me/past-weeks`, every earlier week in the same shape, newest first, and `PUT /api/me/weeks/:weekId/progress`. The same three still exist under `/api/clients/:id/`, behind the coach's password, for copies of the Android app built before it had sign-in; remove them once none are in use. The app caches past weeks in `history.json` and refetches them each time the history screen opens. The progress body is the JSON from `progressJson` in `WeekJson.kt`, with exercise logs keyed by the ids from the published week. The device is the source of truth for the week it has: on refresh its input wins over the server's copy, and a server copy is only used when the device has none, as after a reinstall.
- Routing is a few lines in `src/router.tsx`, not a library. Colours in `src/styles.css` match `ui/theme/Color.kt`.

## Client web app

The same client app as the Android one, for a phone's browser, so a client on an iPhone needs no App Store build. It is a second page of the Vite build: `web/app/index.html` loads `web/src/client/`, and it is served at `/app/`, outside the coach's password. Its screens follow the Android screens and `design/2026-11-14-client-web-app`, with their own styles in `src/client/client.css`; it doesn't use the coach app's components or `styles.css`.

- It uses the same `/api/me/*` endpoints as the Android app. `shared/progress.ts` holds what a client can do to a week and the progress JSON, mirroring `ProgramWeek` in `Model.kt` and `progressJson` in `WeekJson.kt`; keep them in step.
- `src/client/store.ts` is the only state. It keeps the session, the week and the past weeks in `localStorage`, so the app works offline. A web page can't upload in the background, so a change is sent while the app is open and retried when it is opened again or comes back online. The phone's copy of the week wins over the server's only while it has changes that haven't been sent.
- Sign-in is Google's button in redirect mode: Google posts the ID token to `POST /api/auth/google/redirect`, which redirects to `/app/#token=…`. A popup can't report back to an app opened from an iPhone's Home Screen. The site's origin has to be an "Authorized JavaScript origin" of the "Web application" OAuth client, and `<origin>/api/auth/google/redirect` an "Authorized redirect URI". `GET /api/auth/config` gives the page the client ID. On a server without `APP_PASSWORD`, the sign-in screen also lists every client for a developer sign-in.
- Signed-out phones first see a screen asking to add the app to the Home Screen (`Install.tsx`), because an iPhone keeps a Home Screen app's storage apart from Safari's.
- `public/app/` has the manifest, icons and `sw.js`, a service worker that lets the app open offline. It is only registered in a production build.
- Routes are real paths under `/app/` (`src/client/nav.ts`), so the phone's back button works. Both servers answer any `/app/*` path without a file with the page.

## Design system

The coach web app's design system, "Workout Coach", lives in Claude as a Design System artifact: https://claude.ai/artifact/GqLKfrxyAhFy3Vddp5PJHg. Designs for this repo are made in Claude against it. It was first synced from `web/src/components/` to a standalone Claude Design (claude.ai/design) project, and has since moved to Claude; the standalone project is retired, and standalone Claude Design closes by December 14, 2026.

- `/design-sync` can't send updates to a design system in Claude yet; it stops at its first check. Until it can, the design system in Claude doesn't pick up changes to `web/src/components/` by itself, so mention any component change that should reach it.
- `web/.design-sync/` keeps the sync setup (config, previews, conventions). `projectId` in its `config.json` still names the old standalone project; keep it, since the sync tooling uses it to find the moved design system.

## Design handoffs
When you receive a design from Claude (a Design artifact) or a design export:
1. Save it to `design/YYYY-MM-DD-<short-feature-slug>/` before implementing anything.
2. Never overwrite or edit an existing folder in `design/`. Those are historical records.
3. Add a `README.md` in the folder: what the design covers, which app(s), and which
   screens are in scope.
4. Commit the design folder on its own, before any implementation commits.