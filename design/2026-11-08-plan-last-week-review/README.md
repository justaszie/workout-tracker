# Last week review in the plan builder

Source: Claude Design artifact "Last week review in plan builder"
(https://claude.ai/artifact/LtKPdh4E4HFNssJwmd6RQH, version `1794152590-c410`),
saved 2026-11-08. It mounts the "Workout Coach" design system's components; the
system's copy on the canvas (`project/ds/`) is not saved here.

**App:** coach web app only (`web/`), the *Plan next week* screen
(`src/screens/PlanWeek.tsx`). The Android app is not affected.

While planning the next week, the coach sees what the client did with each
exercise last week: what was planned, the last set's weight and RPE, and the
reps per set.

**Screens in scope**

- `Main.dc.html` — *Option A, chosen*: a "Week 3" strip under each exercise in
  the open workout. It shows Planned, Last set and Reps on one row, with a status
  chip on the right (red "RPE above target" or "N reps short", amber "Weight
  varied" when sets were logged separately with different weights) and a "Show
  all sets" / "Hide sets" button that opens a panel of every set's reps, weight
  and RPE plus the client's note. The strip never wraps: the values are cut off
  with "…" before the chip and button move. Exercises new this week say so;
  exercises dropped since last week get a row with "Add back". The workout
  header counts flags and drops, collapsed workouts get a chip, and "Previous
  week at a glance" summarises each workout instead of listing exercises.
- `FirstWeek.dc.html` — *No previous week*: the first week of a block. A notice
  replaces the review and the exercise rows have no strips. Its "Compare with
  Block 2 · Week 4 instead" button is out of scope for now.

**Not in scope**

- `Separate.dc.html` — *Option B*: last week as a separate panel with workout
  tabs. Kept as the alternative that was compared and not chosen.

`canvas.json` is the board layout. The data in all boards is sample data.
