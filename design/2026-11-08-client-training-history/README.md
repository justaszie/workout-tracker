# Client training history

Source: Claude Design artifact "Client training history"
(https://claude.ai/artifact/PRX7hqwRWcDsS6NBB2GCaR, version `1794130918-8f42`),
saved 2026-11-08. It uses the colours of the "Workout Coach" design system, but
the layout follows the Android app's own screens (`ui/week`, `ui/workout`); no
design system components are mounted, and its copy (`project/ds/`) is not saved
here.

**App:** Android client app only. The coach web app is not affected.

The client can look back at finished weeks to see their progress. There are no
stats or charts by design: progress is read by stepping between weeks.

**Screens in scope**

- `Main.dc.html` — *Past weeks*: opened from the history icon in the week
  screen's top bar (which today only shows "No past weeks yet"). Finished weeks,
  newest first, grouped by block; each row has the week number, its dates and
  how many workouts were done.
- `Week.dc.html` — *Past week*: a read-only version of the week screen. Theme,
  start and finish dates, the client's note to the coach, and the workouts with
  Done / Partly done / Skipped tags. Older and Newer buttons step to the
  neighbouring weeks.
- `Workout.dc.html` — *Past workout*: each exercise's prescription (sets × reps,
  load or target RPE) next to what was logged. Per-set logs show as a set table;
  otherwise the last set's weight and RPE plus reps per set. Exercise notes and
  the album link are shown as well.
- `Empty.dc.html` — *Past weeks, none yet*: the empty state.

`canvas.json` is the board layout. The data in all boards is sample data.
