import { join, resolve } from 'node:path'
import express from 'express'
import { createApp } from './app.ts'
import { demoSeed, seed } from './seed.ts'
import { databaseUrl, openStore } from './store.ts'

const root = resolve(import.meta.dirname, '..')
const password = process.env.APP_PASSWORD
const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 3000)

// Without a password the server only accepts connections from this machine.
const host = password ? '0.0.0.0' : '127.0.0.1'
if (production && !password) console.warn('APP_PASSWORD is not set; listening on localhost only.')

if (production && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.')

// The demo lives in its own schema, so resetting it can't touch real data.
const store = await openStore(
  process.env.DEMO ? { url: databaseUrl, schema: 'demo', reset: true } : { url: databaseUrl },
  process.env.DEMO ? demoSeed : seed,
)
const app = createApp(store, { password })

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
