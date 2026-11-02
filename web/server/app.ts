import { createHash, timingSafeEqual } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import {
  currentWeek, initialsOf, newId, toDateString,
  type ExerciseLog, type PlanForm, type Week,
} from '../shared/model.ts'
import { planErrors, toWeek } from '../shared/plan.ts'
import { Refused, type Store } from './store.ts'

interface Options {
  /** When set, every request needs HTTP Basic auth with this password and any username. */
  password?: string
  today?: () => string
}

const sha256 = (text: string) => createHash('sha256').update(text).digest()

function basicAuth(password: string) {
  const expected = sha256(password)
  return (req: Request, res: Response, next: NextFunction) => {
    const encoded = req.headers.authorization?.match(/^Basic (.+)$/)?.[1] ?? ''
    const supplied = Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':')
    if (timingSafeEqual(sha256(supplied), expected)) return next()
    res.set('WWW-Authenticate', 'Basic realm="Coach"').status(401).end()
  }
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
          return {
            ...exercise,
            log: {
              weightKg: log.weightKg ?? null,
              rpe: log.rpe,
              repsPerSet: log.repsPerSet,
              note: log.note ?? '',
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
  if (options.password) app.use(basicAuth(options.password))

  const api = express.Router()
  api.use(express.json({ limit: '1mb' }))

  // Used by the web app.

  api.get('/data', async (_req, res) => {
    res.json(await store.data())
  })

  api.post('/clients', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) return void res.status(400).json({ errors: ['A client needs a name.'] })
    await store.addClient({
      id: newId(), name, initials: initialsOf(name), joinedOn: today(), weeks: [], draft: null,
    })
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

  // Used by the client app.

  api.get('/clients/:clientId/current-week', async (req, res) => {
    const week = currentWeek(await store.client(req.params.clientId))
    if (!week) return void res.status(404).json({ errors: ['No week published yet.'] })
    res.json({ ...week, coach: await store.coach() })
  })

  api.put('/clients/:clientId/weeks/:weekId/progress', async (req, res) => {
    const merged = await store.update(req.params.clientId, (client) => {
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
