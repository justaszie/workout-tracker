# Edit the live week

Source: Claude Design artifact "Coach plan view and edit"
(https://claude.ai/artifact/KVuyJiZbWgzQK5g5tAWyNK, version `1793820408-3ec7`),
saved 2026-11-04. It is built on the "Workout Coach" design system, which is the
component library in `web/` synced to Claude Design; that copy (`project/ds/`) is
not saved here.

**App:** coach web app (`web/`) only. The Android client app is not redesigned,
but it receives the edited week the next time it refreshes.

The coach can see the whole plan of the week a client is doing and change it
after publishing. This adds to existing screens rather than a new section.

**Screens in scope**

- `Main.dc.html`: *Current week*, the existing client review page with two
  changes: workouts with nothing logged show their planned exercises (sets × reps
  and target, note for the client, link) instead of only a header, exercises not
  logged yet in a started workout read "Not logged yet", and the header has an
  **Edit plan** button.
- `Edit.dc.html`: *Edit plan*, the plan builder opened on the live week. Finished
  workouts are locked (View only). Logged exercises keep their sets, reps and
  target; only their note can change. A side panel lists the changes since
  publishing. Actions: Discard changes, Publish changes.
- `Confirm.dc.html`: *Publish changes*, a dialog listing the changes before they
  go to the client.

`canvas.json` is the board layout. The data in all boards is sample data.
