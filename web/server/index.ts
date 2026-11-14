import { join, resolve } from 'node:path'
import express from 'express'
import { createApp, emailList } from './app.ts'
import { googleVerifier } from './google.ts'
import { demoSeed, seed } from './seed.ts'
import { databaseUrl, openStore } from './store.ts'

const root = resolve(import.meta.dirname, '..')
const password = process.env.APP_PASSWORD
const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 3000)

// The OAuth client ID of type "Web application" from the Google Cloud console. The Android app and
// the web app both ask Google for ID tokens issued to it.
const googleClientId = process.env.GOOGLE_CLIENT_ID
// The Google accounts that may sign in to the web app as the coach, separated by commas.
const coachEmails = emailList(process.env.COACH_EMAILS)
if (coachEmails.length && !googleClientId) throw new Error('COACH_EMAILS needs GOOGLE_CLIENT_ID.')

// With nothing for the coach to sign in with, the server only accepts connections from this machine.
const host = password || coachEmails.length ? '0.0.0.0' : '127.0.0.1'
if (production && host === '127.0.0.1') {
  console.warn('Neither COACH_EMAILS nor APP_PASSWORD is set; listening on localhost only.')
}

if (production && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.')

// The demo lives in its own schema, so resetting it can't touch real data.
const store = await openStore(
  process.env.DEMO ? { url: databaseUrl, schema: 'demo', reset: true } : { url: databaseUrl },
  process.env.DEMO ? demoSeed : seed,
)
if (production && !googleClientId) console.warn('GOOGLE_CLIENT_ID is not set; clients cannot sign in.')
const app = createApp(store, {
  password,
  coach: googleClientId ? { emails: coachEmails, googleClientId } : undefined,
  verifyGoogleToken: googleClientId ? googleVerifier(googleClientId) : undefined,
})

if (production) {
  const dist = join(root, 'dist')
  app.use(express.static(dist))
  app.get('/{*path}', (_req, res) => res.sendFile(join(dist, 'index.html')))
} else {
  const { createServer } = await import('vite')
  // The default loader imports a temp file and deletes it, which sends `node --watch` into a restart loop.
  const vite = await createServer({
    root,
    configLoader: 'native',
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

app.listen(port, host, () => console.log(`Coach app on http://${host}:${port}`))
