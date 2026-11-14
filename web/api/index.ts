// The Vercel Function behind /api. Vercel's CDN serves dist/, so unlike server/index.ts this has no static files.
import { createApp, emailList } from '../server/app.ts'
import { googleVerifier } from '../server/google.ts'
import { seed } from '../server/seed.ts'
import { databaseUrl, openStore } from '../server/store.ts'

const password = process.env.APP_PASSWORD
// Optional, so the coach's app keeps working with a password before Google sign-in is set up.
const googleClientId = process.env.GOOGLE_CLIENT_ID
const coachEmails = emailList(process.env.COACH_EMAILS)
if (coachEmails.length && !googleClientId) throw new Error('COACH_EMAILS needs GOOGLE_CLIENT_ID.')
// server/index.ts falls back to binding to localhost when the coach has nothing to sign in with.
// There is no such fallback here.
if (!password && !coachEmails.length) throw new Error('Neither COACH_EMAILS nor APP_PASSWORD is set.')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.')

const store = await openStore({ url: databaseUrl }, seed)

export default createApp(store, {
  password,
  coach: googleClientId ? { emails: coachEmails, googleClientId } : undefined,
  verifyGoogleToken: googleClientId ? googleVerifier(googleClientId) : undefined,
})
