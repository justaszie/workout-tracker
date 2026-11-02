// The Vercel Function behind /api. Vercel's CDN serves dist/, so unlike server/index.ts this has no static files.
import { createApp } from '../server/app.ts'
import { seed } from '../server/seed.ts'
import { databaseUrl, openStore } from '../server/store.ts'

// server/index.ts falls back to binding to localhost without a password. There is no such fallback here.
const password = process.env.APP_PASSWORD
if (!password) throw new Error('APP_PASSWORD is not set.')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.')

const store = await openStore({ url: databaseUrl }, seed)

export default createApp(store, { password })
