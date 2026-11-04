# design-sync notes

- Synced to the Claude Design project "Workout Coach" (`projectId` in config.json). The first sync was on 2026-11-04: 33 components, all with authored previews graded good.
- The library is `src/components/` (exported from `src/components/index.ts`); the screens are built from it. There is no Storybook; shape is `package`.
- The app emits no `.d.ts`. `buildCmd` (`npx tsc -p .design-sync/tsconfig.types.json`) writes them to `dist/types/`, and `package.json` `types` points there so the converter finds the entry. **`npm run build` (vite) empties `dist/`, so run `buildCmd` after any vite build and before the converter.**
- Converter command, from `web/`: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./src/components/index.ts --out ./ds-bundle` (or `resync.mjs` with the same args).
- Fonts: `src/styles.css` starts with a Google Fonts `@import` (Roboto and Roboto Condensed). It replaced the `<link>` that used to sit in `index.html`, so the bundle and the app load fonts the same way; validate reports `[FONT_REMOTE]`, which is expected.
- Groups come from the stub files in `.design-sync/groups/` through `docsMap`. A new component needs a `docsMap` entry, or it lands in `general`.
- Playwright 1.64.1 matches the cached chromium-1248 on this machine.
- A personal dev server may already be on port 3000 with real data. Run demo servers on another port (`PORT=3002 DEMO=1 node server/index.ts`).

## Known render warns
- `[RENDER_THIN]` IconButton: the icon-only buttons are transparent with muted 20px icons, which the paint heuristic counts as empty. The sheet shows them rendering correctly.

## Re-sync risks
- `.design-sync/previews/*.tsx` hold hand-written content mirroring the screens. If a component's props change, update its preview.
- The `.d.ts` contracts omit native DOM props (`onClick`, `value`…). `conventions.md` states this for Button, IconButton, TextField, SearchField and Input; keep that list in step if components change.
- Fonts come from Google Fonts at runtime (a network dependency for rendered designs).
- TypeScript 7 (`tsc` native) emits the declarations; a TS upgrade could change emitted shapes.
