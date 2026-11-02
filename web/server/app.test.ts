import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, beforeEach, describe, it } from 'node:test'
import type { Data, PlanForm, Week } from '../shared/model.ts'
import { blankPlan } from '../shared/plan.ts'
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
  clients: [{ id: 'me', name: 'Me', initials: 'M', joinedOn: today, weeks: [], draft: null }],
})

async function stop() {
  server?.close()
  await store?.close()
}

async function start(password?: string) {
  await stop()
  now = today
  store = await openStore({ ...database, reset: true }, seed)
  server = createApp(store, { password, today: () => now }).listen(0)
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
