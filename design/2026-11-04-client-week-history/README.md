# Client week history

Source: Claude Design artifact "Client week history"
(https://claude.ai/artifact/2ojbLZVfLRZmFfyBmF7m12, version `1793818532-43c5`),
saved 2026-11-04. It is built on the "Workout Coach" design system, which is the
component library in `web/` synced to Claude Design; that copy (`project/ds/`) is
not saved here.

**App:** coach web app (`web/`) only. The Android client app is not affected.

**Screens in scope**

- `Main.dc.html` — *Client history — all weeks*: a client's training history.
  Header with the client and a "Open current week" link, four summary cards
  (weeks finished, workouts done, a lift's top-set trend, off-target results),
  a block picker (segmented control), and a table of that block's weeks, newest
  first: week and theme, dates, workouts progress, result flags, status, View.
- `Week.dc.html` — *Past week*: one week in full. A strip of every week with a
  dot per workout (done, partly, skipped, to do, not started), previous/next
  week buttons, the client's note for the week, a summary line with flag chips,
  and per workout a results table: planned, last set, RPE, reps, change versus
  the previous week, and the client's note.

`canvas.json` is the board layout. The data in both boards is sample data.
