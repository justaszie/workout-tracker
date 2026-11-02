# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

A client app for people working with a private coach: view the current program week, log exercises, and send the finished week to the coach. It is a single Compose activity in Material 3, implemented from a design with six boards.

The Android app isn't connected to a backend yet. `SampleWeek` stands in for the coach-published plan and `WeekStore` saves the client's input to a JSON file, so "sending" a week to the coach only changes local state. Navigation is a small back stack in `WeekViewModel`, not a library.

`web/` holds the coach web app, covered in its own section below.

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

## Coach web app

`web/` is one Node process serving a React + TypeScript app and its API. It needs Node 22.18+, which runs the server's TypeScript directly, so the server has no build step, and a Postgres server. `DATABASE_URL` defaults to `postgres://localhost/coach` outside production; create that database once with `createdb coach`. Run these from `web/`:

```sh
npm run dev      # app and API on http://localhost:3000
npm run demo     # same, with the six clients from the design, in a `demo` schema reset on each start
npm test         # node:test, for shared/ and server/; server tests need Postgres and use a `test` schema
npm run build    # type-check and bundle into dist/
DATABASE_URL=... APP_PASSWORD=... npm start   # production; serves dist/ on all interfaces
```

- `shared/model.ts` mirrors `data/Model.kt` and holds all derived logic, such as client status and result flags. Both the server and the browser import it; keep the two models in step.
- `server/store.ts` is the only code that talks to Postgres. It creates missing tables on start and seeds an empty database; there are no migrations yet, so a change to an existing table has to be applied by hand. A week's workouts, exercises and logs are one `jsonb` value, which doesn't keep key order, so compare them with `isDeepStrictEqual`, not as JSON strings.
- Any change to a client goes through `store.update`, which holds that client's row lock. Throw `Refused` inside it to roll back and answer with an error status. Only the draft and the latest week are written back.
- The database sits behind this API. Client apps use the endpoints below and never connect to Postgres directly.
- Without `APP_PASSWORD` the server has no auth and binds to localhost only. With it, every request needs HTTP Basic auth with any username and that password.
- On Vercel (project Root Directory `web`), `vercel.json` sends `/api/*` to `api/index.ts`, which refuses to start without `APP_PASSWORD` and `DATABASE_URL`; everything else is `dist/` on the CDN. `server/index.ts` isn't used there, so static files aren't behind Basic auth; the API is.
- The plan builder saves its fields as typed (`PlanForm`), so drafts can be incomplete. `shared/plan.ts` validates them and converts them to a `Week` on publish.
- The client app's endpoints are `GET /api/clients/:id/current-week` and `PUT /api/clients/:id/weeks/:weekId/progress`. The progress body is the JSON `WeekStore` already writes, with exercise logs keyed by the ids from the published week.
- Routing is a few lines in `src/router.tsx`, not a library. Colours in `src/styles.css` match `ui/theme/Color.kt`.
