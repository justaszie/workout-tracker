import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import {
  currentWeek, initialsOf, newId, toDateString,
  type ExerciseLog, type PlanForm, type SetLog, type Week,
} from '../shared/model.ts'
import { editErrors, editWeek, planErrors, toWeek } from '../shared/plan.ts'
import type { VerifyGoogleToken } from './google.ts'
import { Refused, type Store } from './store.ts'

interface Options {
  /**
   * The coach's password. When set, HTTP Basic auth with it and any username lets a request in as
   * the coach. The client app's own routes under /api/auth and /api/me never need it.
   */
  password?: string
  /**
   * Lets the coach sign in to the web app with any of these Google accounts. They all see and
   * change the same clients. [verifyGoogleToken] has to be set too. With neither this nor a
   * password, anyone who can reach the server is the coach, and can sign in as any client through
   * /api/auth/dev.
   */
  coach?: {
    emails: string[]
    /** The OAuth client ID the web app asks Google for ID tokens with. */
    googleClientId: string
  }
  today?: () => string
  /** Checks a Google ID token. Without it, nobody can sign in with Google. */
  verifyGoogleToken?: VerifyGoogleToken
}

/** The addresses in a comma-separated setting such as COACH_EMAILS, in lower case. */
export const emailList = (setting = '') =>
  setting.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)

const sha256 = (text: string) => createHash('sha256').update(text).digest()

function hasPassword(req: Request, password: string) {
  const encoded = req.headers.authorization?.match(/^Basic (.+)$/)?.[1] ?? ''
  const supplied = Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':')
  return timingSafeEqual(sha256(supplied), sha256(password))
}

// The coach's session token lives in a cookie that scripts can't read and that browsers don't
// send with requests from other sites.
const coachCookie = 'coach_session'
const sessionSeconds = 90 * 24 * 60 * 60

const coachToken = (req: Request) =>
  req.headers.cookie?.match(new RegExp(`(?:^|; )${coachCookie}=([^;]+)`))?.[1]

function setCoachCookie(req: Request, res: Response, token: string | null) {
  const https = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.append('Set-Cookie', [
    `${coachCookie}=${token ?? ''}`, 'Path=/api', 'HttpOnly', 'SameSite=Lax',
    `Max-Age=${token ? sessionSeconds : 0}`, ...https ? ['Secure'] : [],
  ].join('; '))
}

/** Session tokens are only ever stored hashed, as text. */
const tokenHash = (token: string) => sha256(token).toString('hex')

const bearerToken = (req: Request) => req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]

const forClientApp = (path: string) => /^\/api\/(auth|me)(\/|$)/.test(path)

/** The email as stored: trimmed and in lower case, or null when the coach left it empty. */
function parseEmail(value: unknown): string | null {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : value
  if (email == null || email === '') return null
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Refused(400, 'That is not an email address.')
  }
  return email
}

function isPlanForm(body: unknown): body is PlanForm {
  const form = body as PlanForm | null
  return typeof form?.title === 'string' && typeof form.purpose === 'string'
    && Array.isArray(form.workouts)
    && form.workouts.every((workout) => Array.isArray(workout?.exercises))
}

function isLog(value: unknown): value is ExerciseLog {
  const log = value as ExerciseLog | null
  return typeof log?.rpe === 'number' && Array.isArray(log.repsPerSet)
    && log.repsPerSet.every((reps) => typeof reps === 'number')
}

/** Each set's weight and RPE, if the client logged them for every set. */
function perSet(log: ExerciseLog): SetLog[] | undefined {
  const sets: unknown = log.perSet
  if (!Array.isArray(sets) || sets.length !== log.repsPerSet.length) return undefined
  const valid = sets.every((set) => typeof set?.rpe === 'number'
    && (set.weightKg == null || typeof set.weightKg === 'number'))
  return valid ? sets.map((set) => ({ weightKg: set.weightKg ?? null, rpe: set.rpe })) : undefined
}

/** The JSON the Android WeekStore saves. It omits null values, so every field may be missing. */
interface WeekProgress {
  finishedOn?: string
  note?: string
  workouts?: Record<string, {
    finishedOn?: string
    albumLink?: string
    logs?: Record<string, unknown>
  }>
}

function mergeProgress(week: Week, progress: WeekProgress): Week {
  return {
    ...week,
    finishedOn: progress.finishedOn ?? null,
    note: progress.note ?? '',
    workouts: week.workouts.map((workout) => {
      const saved = progress.workouts?.[workout.id]
      if (!saved) return workout
      return {
        ...workout,
        finishedOn: saved.finishedOn ?? null,
        albumLink: saved.albumLink ?? '',
        exercises: workout.exercises.map((exercise) => {
          const log = saved.logs?.[exercise.id]
          if (!isLog(log)) return { ...exercise, log: null }
          const sets = perSet(log)
          return {
            ...exercise,
            log: {
              weightKg: log.weightKg ?? null,
              rpe: log.rpe,
              repsPerSet: log.repsPerSet,
              note: log.note ?? '',
              // Left out rather than null, so logs saved before per-set logging compare equal.
              ...sets && { perSet: sets },
            },
          }
        }),
      }
    }),
  }
}

export function createApp(store: Store, options: Options = {}) {
  const today = options.today ?? (() => toDateString(new Date()))
  const app = express()
  const { password } = options
  const verifyGoogleToken = options.verifyGoogleToken
  const coach = verifyGoogleToken && options.coach?.emails.length
    ? { ...options.coach, verify: verifyGoogleToken }
    : null
  if (password || coach) {
    app.use(async (req, res, next) => {
      if (forClientApp(req.path)) return next()
      // The web app has to load before the coach can sign in to it, so only the API is closed.
      if (coach && !req.path.startsWith('/api/')) return next()
      if (password && hasPassword(req, password)) return next()
      const token = coach && coachToken(req)
      if (token && await store.coachSession(tokenHash(token))) return next()
      // With only a password, the browser's own prompt is the sign-in screen.
      if (!coach) res.set('WWW-Authenticate', 'Basic realm="Coach"')
      res.status(401).json({ errors: ['Sign in to continue.'] })
    })
  }

  const api = express.Router()
  api.use(express.json({ limit: '1mb' }))

  // Signing in from the client app. A session is a random token that the app sends back as
  // `Authorization: Bearer <token>` on every request to /api/me.

  const startSession = async (clientId: string, res: Response) => {
    const token = randomBytes(32).toString('base64url')
    await store.createSession(tokenHash(token), clientId)
    // The app keeps what one client logged, so it has to notice when a different one signs in.
    res.json({ token, clientId })
  }

  api.post('/auth/google', async (req, res) => {
    if (!verifyGoogleToken) {
      return void res.status(503).json({ errors: ['Google sign-in is not set up on this server.'] })
    }
    const idToken: unknown = req.body?.idToken
    const identity = typeof idToken === 'string' ? await verifyGoogleToken(idToken) : null
    if (!identity) return void res.status(401).json({ errors: ['Google sign-in failed. Try again.'] })
    const clientId = await store.clientForGoogle(identity.sub, identity.email)
    if (!clientId) {
      return void res.status(403).json({ errors: [`Your coach hasn't added ${identity.email} yet.`] })
    }
    await startSession(clientId, res)
  })

  // For development without a Google account. With no password and no coach sign-in the server
  // only listens on localhost and the whole API is open anyway, so this gives away nothing more.
  if (!password && !coach) {
    api.post('/auth/dev', async (req, res) => {
      const client = await store.client(String(req.body?.clientId))
      await startSession(client.id, res)
    })
  }

  api.post('/auth/sign-out', async (req, res) => {
    const token = bearerToken(req)
    if (token) await store.deleteSession(tokenHash(token))
    res.status(204).end()
  })

  // Signing in to the web app. It asks here first, to learn whether it has to and with which
  // Google client ID.
  api.get('/auth/coach', (_req, res) => {
    res.json({ googleClientId: coach ? coach.googleClientId : null })
  })

  api.post('/auth/coach/google', async (req, res) => {
    if (!coach) {
      return void res.status(503).json({ errors: ['Coach sign-in is not set up on this server.'] })
    }
    const idToken: unknown = req.body?.idToken
    const identity = typeof idToken === 'string' ? await coach.verify(idToken) : null
    if (!identity) return void res.status(401).json({ errors: ['Google sign-in failed. Try again.'] })
    if (!coach.emails.includes(identity.email.toLowerCase())) {
      return void res.status(403).json({ errors: [`${identity.email} is not a coach's account.`] })
    }
    const token = randomBytes(32).toString('base64url')
    await store.createCoachSession(tokenHash(token))
    setCoachCookie(req, res, token)
    res.status(204).end()
  })

  api.post('/auth/coach/sign-out', async (req, res) => {
    const token = coachToken(req)
    if (token) await store.deleteCoachSession(tokenHash(token))
    setCoachCookie(req, res, null)
    res.status(204).end()
  })

  const me = express.Router()
  me.use(async (req, res, next) => {
    const token = bearerToken(req)
    const clientId = token ? await store.sessionClient(tokenHash(token)) : null
    if (!clientId) return void res.status(401).json({ errors: ['Sign in to continue.'] })
    res.locals.clientId = clientId
    next()
  })
  api.use('/me', me)

  /**
   * Each client app route exists twice: under /me for the signed-in client, and under
   * /clients/:clientId behind the coach's password, which the Android app used before it had
   * sign-in. The second can go once no installed app uses it.
   */
  const clientRoute = (
    method: 'get' | 'put',
    path: string,
    handler: (clientId: string, req: Request, res: Response) => Promise<void>,
  ) => {
    me[method](path, (req, res) => handler(res.locals.clientId, req, res))
    api[method](`/clients/:clientId${path}`, (req, res) => handler(String(req.params.clientId), req, res))
  }

  // Used by the web app.

  api.get('/data', async (_req, res) => {
    res.json(await store.data())
  })

  api.post('/clients', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) return void res.status(400).json({ errors: ['A client needs a name.'] })
    await store.addClient({
      id: newId(), name, initials: initialsOf(name), joinedOn: today(),
      email: parseEmail(req.body.email), weeks: [], draft: null,
    })
    res.json(await store.data())
  })

  // The Google account a client signs in with. Changing it signs the client out everywhere.
  api.put('/clients/:clientId/email', async (req, res) => {
    await store.setEmail(req.params.clientId, parseEmail(req.body?.email))
    res.json(await store.data())
  })

  api.put('/clients/:clientId/draft', async (req, res) => {
    await store.update(req.params.clientId, (client) => {
      if (!isPlanForm(req.body)) throw new Refused(400, 'Malformed plan.')
      client.draft = req.body
    })
    res.json(await store.data())
  })

  api.post('/clients/:clientId/publish', async (req, res) => {
    await store.update(req.params.clientId, (client) => {
      if (!isPlanForm(req.body)) throw new Refused(400, 'Malformed plan.')
      const previous = currentWeek(client)
      if (previous && !previous.finishedOn) {
        throw new Refused(409, 'The client is still training the current week.')
      }
      const errors = planErrors(req.body)
      if (errors.length) throw new Refused(422, ...errors)
      client.weeks.push(toWeek(req.body, previous, today()))
      client.draft = null
    })
    res.json(await store.data())
  })

  // Changes the plan of the week the client is on. What they have finished or logged stays as it was.
  api.put('/clients/:clientId/weeks/:weekId/plan', async (req, res) => {
    await store.update(req.params.clientId, (client) => {
      if (!isPlanForm(req.body)) throw new Refused(400, 'Malformed plan.')
      const week = currentWeek(client)
      if (week?.id !== req.params.weekId) throw new Refused(409, 'That is not the current week.')
      if (week.finishedOn) throw new Refused(409, "This week is finished, so its plan can't change.")
      const errors = editErrors(week, req.body)
      if (errors.length) throw new Refused(422, ...errors)
      client.weeks[client.weeks.length - 1] = editWeek(week, req.body, client.weeks.at(-2))
    })
    res.json(await store.data())
  })

  // Used by the client app.

  clientRoute('get', '/current-week', async (clientId, _req, res) => {
    const week = currentWeek(await store.client(clientId))
    if (!week) return void res.status(404).json({ errors: ['No week published yet.'] })
    res.json({ ...week, coach: await store.coach() })
  })

  // Every week before the current one, newest first. They are all finished, since a new week can
  // only be published once the one before it is.
  clientRoute('get', '/past-weeks', async (clientId, _req, res) => {
    const [client, coach] = await Promise.all([store.client(clientId), store.coach()])
    res.json(client.weeks.slice(0, -1).reverse().map((week) => ({ ...week, coach })))
  })

  clientRoute('put', '/weeks/:weekId/progress', async (clientId, req, res) => {
    const merged = await store.update(clientId, (client) => {
      const week = currentWeek(client)
      if (week?.id !== req.params.weekId) throw new Refused(409, 'That is not the current week.')
      const merged = mergeProgress(week, req.body ?? {})
      // Not a JSON.stringify comparison: Postgres doesn't keep the key order of a jsonb value.
      if (!isDeepStrictEqual(merged, week)) merged.lastActivityOn = today()
      client.weeks[client.weeks.length - 1] = merged
      return merged
    })
    res.json(merged)
  })

  api.use((_req, res) => {
    res.status(404).json({ errors: ['Not found.'] })
  })

  api.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (!(error instanceof Refused)) return next(error)
    res.status(error.status).json({ errors: error.errors })
  })

  app.use('/api', api)
  return app
}
