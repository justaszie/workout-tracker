import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, beforeEach, describe, it } from 'node:test'
import type { Data, PlanForm, Week } from '../shared/model.ts'
import { blankExercise, blankPlan, toPlanForm } from '../shared/plan.ts'
import { createApp } from './app.ts'
import { databaseUrl, openStore, type Store } from './store.ts'

// Needs a running Postgres. Everything happens in the `test` schema of DATABASE_URL's database.
const database = { url: databaseUrl, schema: 'test' }
const today = '2026-10-31'
let now = today
let server: Server
let store: Store
let base: string

const seed = (): Data => ({
  coach: { name: 'Coach', initials: 'C' },
  clients: [{ id: 'me', name: 'Me', initials: 'M', joinedOn: today, email: null, weeks: [], draft: null }],
})

async function stop() {
  server?.close()
  await store?.close()
}

// Stands in for Google: a token is 'sub email', and anything else is a token Google didn't sign.
const verifyGoogleToken = async (idToken: string) => {
  const [sub, email] = idToken.split(' ')
  return email ? { sub, email } : null
}

async function start(password?: string, google = true) {
  await stop()
  now = today
  store = await openStore({ ...database, reset: true }, seed)
  server = createApp(store, {
    password, today: () => now, verifyGoogleToken: google ? verifyGoogleToken : undefined,
  }).listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
}

const send = (method: string, path: string, body?: unknown) => fetch(base + path, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

function plan(): PlanForm {
  const form = blankPlan()
  form.workouts[0].id = 'w1'
  form.workouts[0].exercises[0] = { ...form.workouts[0].exercises[0], id: 'e1', name: 'Squat' }
  return form
}

async function publish(): Promise<Week> {
  assert.equal((await send('POST', '/clients/me/publish', plan())).status, 200)
  return (await fetch(`${base}/clients/me/current-week`)).json()
}

const log = { rpe: 8, repsPerSet: [10, 10, 10] }

after(stop)

describe('plans', () => {
  beforeEach(() => start())

  it('keeps an incomplete draft but refuses to publish it', async () => {
    const form = blankPlan('not a title')
    assert.equal((await send('PUT', '/clients/me/draft', form)).status, 200)
    const data: Data = await (await fetch(`${base}/data`)).json()
    assert.equal(data.clients[0].draft?.title, 'not a title')

    const response = await send('POST', '/clients/me/publish', form)
    assert.equal(response.status, 422)
    assert.ok((await response.json()).errors.length > 0)
  })

  it('publishes, clears the draft and persists to the database', async () => {
    await send('PUT', '/clients/me/draft', plan())
    const week = await publish()
    assert.equal(week.startedOn, today)
    const saved = await store.data()
    assert.equal(saved.clients[0].draft, null)
    assert.equal(saved.clients[0].weeks.length, 1)
  })

  it('refuses a new week while the current one is open', async () => {
    await publish()
    assert.equal((await send('POST', '/clients/me/publish', plan())).status, 409)
  })

  it('lets only one of two simultaneous publishes through', async () => {
    const responses = await Promise.all([
      send('POST', '/clients/me/publish', plan()),
      send('POST', '/clients/me/publish', plan()),
    ])
    assert.deepEqual(responses.map((it) => it.status).sort(), [200, 409])
    assert.equal((await store.data()).clients[0].weeks.length, 1)
  })

  it('answers 404 for an unknown client', async () => {
    assert.equal((await send('PUT', '/clients/nobody/draft', plan())).status, 404)
    assert.equal((await fetch(`${base}/clients/nobody/current-week`)).status, 404)
  })

  it('names the coach with the current week', async () => {
    const week = await publish() as Week & { coach: unknown }
    assert.deepEqual(week.coach, (await store.data()).coach)
  })

  it('has no week before the first publish', async () => {
    assert.equal((await fetch(`${base}/clients/me/current-week`)).status, 404)
  })
})

describe('progress from the client app', () => {
  beforeEach(() => start())

  it('merges the WeekStore JSON, where nulls are left out', async () => {
    const week = await publish()
    const response = await send('PUT', `/clients/me/weeks/${week.id}/progress`, {
      note: 'Good week',
      workouts: { w1: { albumLink: 'https://example.com', logs: { e1: log } } },
    })
    const merged: Week = await response.json()
    assert.equal(merged.finishedOn, null)
    assert.equal(merged.note, 'Good week')
    assert.equal(merged.lastActivityOn, today)
    assert.deepEqual(merged.workouts[0].exercises[0].log, { ...log, weightKg: null, note: '' })
  })

  it('keeps the weight and RPE of each set', async () => {
    const week = await publish()
    const perSet = log.repsPerSet.map((_, i) => ({ weightKg: i === 0 ? null : 20 + i, rpe: 7 + i }))
    const response = await send('PUT', `/clients/me/weeks/${week.id}/progress`, {
      workouts: { w1: { logs: { e1: { ...log, perSet } } } },
    })
    const merged: Week = await response.json()
    assert.deepEqual(merged.workouts[0].exercises[0].log?.perSet, perSet)
  })

  it('drops per-set values that do not match the sets', async () => {
    const week = await publish()
    const response = await send('PUT', `/clients/me/weeks/${week.id}/progress`, {
      workouts: { w1: { logs: { e1: { ...log, perSet: [{ weightKg: 20, rpe: 8 }, { weightKg: 'x' }] } } } },
    })
    const merged: Week = await response.json()
    assert.equal(merged.workouts[0].exercises[0].log?.perSet, undefined)
  })

  it('does not count an unchanged save as activity', async () => {
    const week = await publish()
    const response = await send('PUT', `/clients/me/weeks/${week.id}/progress`, {})
    assert.equal((await response.json()).lastActivityOn, null)
  })

  it('does not count saving the same progress again as activity', async () => {
    const week = await publish()
    const progress = { workouts: { w1: { logs: { e1: log } } } }
    await send('PUT', `/clients/me/weeks/${week.id}/progress`, progress)
    now = '2026-11-02'
    const response = await send('PUT', `/clients/me/weeks/${week.id}/progress`, progress)
    assert.equal((await response.json()).lastActivityOn, today)
  })

  it('rejects progress for a week that is no longer current', async () => {
    await publish()
    assert.equal((await send('PUT', '/clients/me/weeks/old/progress', {})).status, 409)
  })
})

describe('past weeks for the client app', () => {
  beforeEach(() => start())

  const pastWeeks = async (): Promise<(Week & { coach: Data['coach'] })[]> =>
    (await fetch(`${base}/clients/me/past-weeks`)).json()

  it('has none while the client is on their first week', async () => {
    assert.deepEqual(await pastWeeks(), [])
    await publish()
    assert.deepEqual(await pastWeeks(), [])
  })

  it('lists the weeks before the current one, newest first, with what was logged', async () => {
    const first = await publish()
    await send('PUT', `/clients/me/weeks/${first.id}/progress`, {
      finishedOn: today, workouts: { w1: { logs: { e1: log } } },
    })
    const second = await publish()
    await send('PUT', `/clients/me/weeks/${second.id}/progress`, { finishedOn: today })
    await publish()

    const weeks = await pastWeeks()
    assert.deepEqual(weeks.map((week) => week.id), [second.id, first.id])
    assert.deepEqual(weeks[0].coach, { name: 'Coach', initials: 'C' })
    assert.equal(weeks[1].workouts[0].exercises[0].log?.rpe, log.rpe)
  })

  it('answers 404 for an unknown client', async () => {
    assert.equal((await fetch(`${base}/clients/nobody/past-weeks`)).status, 404)
  })
})

describe('editing the current week', () => {
  beforeEach(() => start())

  const edit = (week: Week, form: PlanForm) => send('PUT', `/clients/me/weeks/${week.id}/plan`, form)

  it('changes the plan and keeps the week, its ids and the client logs', async () => {
    const week = await publish()
    await send('PUT', `/clients/me/weeks/${week.id}/progress`, { workouts: { w1: { logs: { e1: log } } } })
    const form = toPlanForm((await store.client('me')).weeks[0])
    form.purpose = 'Heavier'
    form.workouts[0].exercises[0].note = 'Brace first'
    form.workouts[0].exercises.push({ ...blankExercise(), id: 'e2', name: 'Lunge' })
    assert.equal((await edit(week, form)).status, 200)

    const [saved] = (await store.client('me')).weeks
    assert.equal(saved.id, week.id)
    assert.equal(saved.theme, 'Heavier')
    assert.deepEqual(saved.workouts[0].exercises.map((it) => it.id), ['e1', 'e2'])
    assert.equal(saved.workouts[0].exercises[0].coachNote, 'Brace first')
    assert.deepEqual(saved.workouts[0].exercises[0].log, { ...log, weightKg: null, note: '' })

    const current: Week = await (await fetch(`${base}/clients/me/current-week`)).json()
    assert.equal(current.workouts[0].exercises[1].name, 'Lunge')
  })

  it('refuses to change or remove what the client has logged', async () => {
    const week = await publish()
    await send('PUT', `/clients/me/weeks/${week.id}/progress`, { workouts: { w1: { logs: { e1: log } } } })
    const form = toPlanForm((await store.client('me')).weeks[0])
    form.workouts[0].exercises[0].sets = '5'
    const changed = await edit(week, form)
    assert.equal(changed.status, 422)
    assert.match((await changed.json()).errors.join(' '), /logged/)

    form.workouts[0].exercises = [{ ...blankExercise(), name: 'Lunge' }]
    assert.equal((await edit(week, form)).status, 422)
  })

  it('refuses to change a finished workout', async () => {
    const week = await publish()
    await send('PUT', `/clients/me/weeks/${week.id}/progress`, { workouts: { w1: { finishedOn: today } } })
    const form = toPlanForm((await store.client('me')).weeks[0])
    form.workouts[0].name = 'Renamed'
    assert.equal((await edit(week, form)).status, 422)
  })

  it('refuses an old or finished week', async () => {
    const week = await publish()
    const form = toPlanForm(week)
    assert.equal((await send('PUT', '/clients/me/weeks/old/plan', form)).status, 409)
    await send('PUT', `/clients/me/weeks/${week.id}/progress`, { finishedOn: today })
    assert.equal((await edit(week, form)).status, 409)
  })
})

describe('password', () => {
  it('protects every route when set', async () => {
    await start('secret')
    assert.equal((await fetch(`${base}/data`)).status, 401)
    const wrong = { Authorization: `Basic ${btoa('coach:nope')}` }
    assert.equal((await fetch(`${base}/data`, { headers: wrong })).status, 401)
    const right = { Authorization: `Basic ${btoa('coach:secret')}` }
    assert.equal((await fetch(`${base}/data`, { headers: right })).status, 200)
  })
})

describe('client sign-in', () => {
  const coach = { Authorization: `Basic ${btoa('coach:secret')}`, 'Content-Type': 'application/json' }
  const asCoach = (method: string, path: string, body?: unknown) =>
    fetch(base + path, { method, headers: coach, body: JSON.stringify(body) })
  const signIn = (idToken: unknown) => send('POST', '/auth/google', { idToken })
  const withToken = (token: string, path: string, method = 'GET', body?: unknown) => fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const tokenFor = async (idToken: string): Promise<string> => {
    const response = await signIn(idToken)
    assert.equal(response.status, 200)
    return (await response.json()).token
  }

  beforeEach(async () => {
    await start('secret')
    await asCoach('PUT', '/clients/me/email', { email: ' Me@Example.com ' })
    await asCoach('POST', '/clients', { name: 'Other Client', email: 'other@example.com' })
  })

  it('refuses a token Google did not sign, and an account the coach has not added', async () => {
    assert.equal((await signIn('forged')).status, 401)
    assert.equal((await signIn(undefined)).status, 401)
    const stranger = await signIn('g-9 stranger@example.com')
    assert.equal(stranger.status, 403)
    assert.match((await stranger.json()).errors[0], /stranger@example.com/)
  })

  it('gives the client their own week and nothing of the coach or other clients', async () => {
    await asCoach('POST', '/clients/me/publish', plan())
    const token = await tokenFor('g-1 me@example.com')

    const week: Week = await (await withToken(token, '/me/current-week')).json()
    assert.equal(week.workouts[0].exercises[0].name, 'Squat')
    const saved = await withToken(token, `/me/weeks/${week.id}/progress`, 'PUT', { note: 'Done' })
    assert.equal((await saved.json()).note, 'Done')
    assert.equal((await store.client('me')).weeks[0].note, 'Done')
    assert.deepEqual(await (await withToken(token, '/me/past-weeks')).json(), [])

    assert.equal((await withToken(token, '/data')).status, 401)
    assert.equal((await withToken(token, '/clients/me/current-week')).status, 401)
    // The other client has no week, so their session finds none rather than this one.
    const other = await tokenFor('g-2 other@example.com')
    assert.equal((await withToken(other, '/me/current-week')).status, 404)
  })

  it('needs a session for /me, and the password does not count as one', async () => {
    assert.equal((await fetch(`${base}/me/current-week`)).status, 401)
    assert.equal((await fetch(`${base}/me/current-week`, { headers: coach })).status, 401)
    assert.equal((await withToken('made-up', '/me/current-week')).status, 401)
  })

  it('remembers the Google account, not the address it had', async () => {
    await tokenFor('g-1 me@example.com')
    // The same account under a new address still signs in; another account with the old one doesn't.
    await tokenFor('g-1 renamed@example.com')
    assert.equal((await signIn('g-7 me@example.com')).status, 403)
  })

  it('signs out one session and leaves the others', async () => {
    const phone = await tokenFor('g-1 me@example.com')
    const tablet = await tokenFor('g-1 me@example.com')
    assert.equal((await withToken(phone, '/auth/sign-out', 'POST')).status, 204)
    assert.equal((await withToken(phone, '/me/past-weeks')).status, 401)
    assert.equal((await withToken(tablet, '/me/past-weeks')).status, 200)
  })

  it('signs the client out when the coach changes their email', async () => {
    const token = await tokenFor('g-1 me@example.com')
    assert.equal((await asCoach('PUT', '/clients/me/email', { email: 'me@example.com' })).status, 200)
    assert.equal((await withToken(token, '/me/past-weeks')).status, 200)

    const data: Data = await (await asCoach('PUT', '/clients/me/email', { email: 'new@example.com' })).json()
    assert.equal(data.clients[0].email, 'new@example.com')
    assert.equal((await withToken(token, '/me/past-weeks')).status, 401)
    assert.equal((await signIn('g-1 me@example.com')).status, 403)
    await tokenFor('g-3 new@example.com')
  })

  it('refuses an email that is malformed or already used', async () => {
    assert.equal((await asCoach('PUT', '/clients/me/email', { email: 'nope' })).status, 400)
    assert.equal((await asCoach('PUT', '/clients/me/email', { email: 'OTHER@example.com' })).status, 409)
    assert.equal((await asCoach('POST', '/clients', { name: 'Twin', email: 'me@example.com' })).status, 409)
    assert.equal((await asCoach('PUT', '/clients/nobody/email', { email: 'a@example.com' })).status, 404)
    assert.equal((await asCoach('PUT', '/clients/me/email', { email: '' })).status, 200)
    assert.equal((await store.client('me')).email, null)
  })

  it('has no development sign-in when a password is set', async () => {
    assert.equal((await send('POST', '/auth/dev', { clientId: 'me' })).status, 404)
  })

  it('signs in as any client without a password, for development', async () => {
    await start()
    const response = await send('POST', '/auth/dev', { clientId: 'me' })
    const { token } = await response.json()
    assert.equal((await withToken(token, '/me/past-weeks')).status, 200)
    assert.equal((await send('POST', '/auth/dev', { clientId: 'nobody' })).status, 404)
  })

  it('says so when Google sign-in is not set up', async () => {
    await start('secret', false)
    assert.equal((await signIn('g-1 me@example.com')).status, 503)
  })
})

describe('store', () => {
  beforeEach(() => start())

  it('shares data between server processes and seeds only once', async () => {
    const other = await openStore(database, () => ({ ...seed(), clients: [] }))
    try {
      await send('POST', '/clients', { name: 'New Client' })
      const names = (await other.data()).clients.map((client) => client.name)
      assert.deepEqual(names, ['Me', 'New Client'])
    } finally {
      await other.close()
    }
  })

  it('rolls a refused change back', async () => {
    await assert.rejects(store.update('me', (client) => {
      client.draft = plan()
      throw new Error('refused')
    }))
    assert.equal((await store.client('me')).draft, null)
  })

  it('keeps weeks in publish order with dates as plain strings', async () => {
    const first = await publish()
    await send('PUT', `/clients/me/weeks/${first.id}/progress`, { finishedOn: today })
    now = '2026-11-02'
    const second = await publish()
    const { weeks, joinedOn } = await store.client('me')
    assert.deepEqual(weeks.map((week) => week.id), [first.id, second.id])
    assert.equal(weeks[0].finishedOn, today)
    assert.equal(joinedOn, today)
  })
})
