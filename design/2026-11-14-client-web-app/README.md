# Client web app

Source: Claude Design artifact "Client web app"
(https://claude.ai/artifact/3Y5g6XeukHqRpxwAU6fLzG, version `1794663713-3364`),
saved 2026-11-14. It uses the colours of the "Workout Coach" design system, but
the layout follows the Android app's own screens (`ui/week`, `ui/workout`,
`ui/log`, `ui/signin`); no design system components are mounted, and its copy
(`project/ds/`) is not saved here.

**App:** a new web version of the client app, served from `web/`, so clients on
an iPhone can use it without an App Store build. The Android app and the coach
web app are not affected.

The boards are 390 px wide, for a phone browser. There is no desktop board: on
a wider screen the same column sits in the centre.

**Screens in scope**

- `Install.dc.html` — *First open*: asks the client to add the app to their
  Home Screen before signing in, because an iPhone Home Screen app keeps its
  storage apart from Safari. Three steps on iPhone, an "Install app" button on
  Android (the `platform` tweak), and "Continue in the browser".
- `SignIn.dc.html` — *Sign in*: the Android app's copy. The Google button is a
  placeholder, since Google draws its own on the web. The `refused` tweak shows
  the message for an email the coach hasn't added.
- `Main.dc.html` — *Current week*: coach card with progress, workout rows and
  "Finish week". The `offline` tweak shows an amber notice: the web can't
  upload in the background, so logs are sent only while the app is open.
- `Workout.dc.html` — *Workout*: exercise cards with coach notes and resource
  links, the album link, and "Finish workout".
- `Log.dc.html` — *Log exercise*: weight stepper, RPE picker, "Log each set"
  and a note for the coach.
- `Finish.dc.html` — *Finish week*: the confirmation dialog, listing what is
  partly done or skipped, with an optional note.
- `Finished.dc.html` — *Week sent to coach*: the finished week with Done /
  Partly done / Skipped tags and "Reopen week". The `sending` tweak shows the
  state while the week hasn't reached the server yet.

Past weeks are not redrawn; they follow `design/2026-11-08-client-training-history`.

`canvas.json` is the board layout. The data in all boards is sample data.
