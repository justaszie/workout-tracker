import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clientStatus, formatDate, lastActivityText, loadDifference, missedReps, plannedText, safeUrl,
  statusLabel, waitingText, weekSummary, workoutState,
  type Client, type Exercise, type Week, type Workout,
} from './model.ts'
import { blankPlan, copyWeek, planErrors, toWeek } from './plan.ts'

const exercise = (fields: Partial<Exercise> = {}): Exercise => ({
  id: 'e', name: 'Bench press', sets: 3, reps: 10, perSide: false, load: { type: 'none' },
  coachNote: null, resources: [], lastWeek: null, log: null, ...fields,
})

const log = (reps = [10, 10, 10], rpe = 8, weightKg: number | null = 50) =>
  ({ weightKg, rpe, repsPerSet: reps, note: '' })

const workout = (fields: Partial<Workout> = {}): Workout => ({
  id: 'w', name: 'Upper', exercises: [exercise()], finishedOn: null, albumLink: '', ...fields,
})

const week = (fields: Partial<Week> = {}): Week => ({
  id: 'wk', block: 2, number: 3, theme: '', startedOn: '2026-10-26', workouts: [workout()],
  finishedOn: null, note: '', lastActivityOn: null, ...fields,
})

const client = (weeks: Week[], name = 'Alex Petrauskas'): Client => ({
  id: 'c', name, initials: 'AP', joinedOn: '2026-10-01', weeks, draft: null,
})

const today = '2026-10-31'

describe('client status', () => {
  it('asks for a first week when nothing is published', () => {
    assert.equal(clientStatus(client([]), today), 'new')
  })

  it('asks for a review once the week is finished', () => {
    assert.equal(clientStatus(client([week({ finishedOn: today })]), today), 'review')
  })

  it('separates not started, in progress and quiet', () => {
    assert.equal(clientStatus(client([week()]), today), 'notstarted')
    assert.equal(clientStatus(client([week({ lastActivityOn: '2026-10-30' })]), today), 'progress')
    const quiet = client([week({ lastActivityOn: '2026-10-25' })])
    assert.equal(statusLabel(quiet, today), 'Quiet for 6 days')
    assert.equal(lastActivityText(quiet, today), '6 days ago')
  })
})

describe('waiting text', () => {
  it('names clients and uses the singular for one', () => {
    assert.equal(
      waitingText([client([week({ finishedOn: today })])], today),
      "Alex finished their week. They can't train until you publish.",
    )
  })

  it('joins finished clients and new clients', () => {
    const clients = [
      client([week({ finishedOn: today })]),
      client([week({ finishedOn: today })], 'Rūta Jonaitė'),
      client([], 'Lukas Stankevičius'),
    ]
    assert.equal(
      waitingText(clients, today),
      'Alex and Rūta finished their weeks, and Lukas needs a first week. None of them can train until you publish.',
    )
  })
})

describe('results', () => {
  it('labels workouts differently before and after the week is closed', () => {
    const started = workout({ exercises: [exercise({ log: log() })] })
    assert.equal(workoutState(week(), started), 'started')
    assert.equal(workoutState(week({ finishedOn: today }), started), 'partly')
    assert.equal(workoutState(week({ finishedOn: today }), workout()), 'skipped')
    assert.equal(workoutState(week(), workout({ finishedOn: today })), 'done')
  })

  it('flags reps below the plan and RPE above a target', () => {
    const summary = weekSummary(week({
      workouts: [workout({
        exercises: [
          exercise({ log: log([10, 10, 8]) }),
          exercise({ load: { type: 'rpe', rpe: 7 }, log: log([10, 10, 10], 9) }),
          exercise({ load: { type: 'rpe', rpe: 8 }, log: log([10, 10, 10], 8) }),
          exercise({ log: log([10, 10, 10], 10) }),
        ],
      })],
    }))
    assert.equal(summary.missedReps, 1)
    assert.equal(summary.aboveRpe, 1)
    assert.equal(summary.logged, 4)
  })

  it('reports the difference from a fixed load only', () => {
    assert.equal(loadDifference(exercise({ load: { type: 'fixed', kg: 70 }, log: log(undefined, 8, 72.5) })), 2.5)
    assert.equal(loadDifference(exercise({ load: { type: 'fixed', kg: 70 }, log: log(undefined, 8, 70) })), null)
    assert.equal(loadDifference(exercise({ load: { type: 'rpe', rpe: 8 }, log: log() })), null)
    assert.equal(missedReps(exercise()), false)
  })
})

describe('formatting', () => {
  it('reads the way the design does', () => {
    assert.equal(formatDate('2026-10-31'), 'Sat 31 Oct')
    assert.equal(plannedText(exercise({ sets: 3, reps: 10, perSide: true, load: { type: 'fixed', kg: 16 } })), '3 × 10 per side · 16 kg')
    assert.equal(plannedText(exercise({ sets: 3, reps: 8, load: { type: 'rpe', rpe: 7 } })), '3 × 8 · RPE 7')
  })

  it('rejects links that are not http', () => {
    assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a')
    assert.equal(safeUrl('javascript:alert(1)'), null)
    assert.equal(safeUrl(''), null)
  })
})

describe('planning', () => {
  it('copies a week without its results and round-trips the prescription', () => {
    const previous = week({
      finishedOn: today,
      workouts: [workout({
        exercises: [exercise({
          sets: 3, reps: 8, perSide: true, load: { type: 'fixed', kg: 16 }, coachNote: 'Slow',
          resources: [
            { kind: 'demoVideo', url: 'https://youtu.be/a' },
            { kind: 'setupGuide', url: 'https://example.com/guide' },
          ],
          log: log([8, 8, 8], 7, 16),
        })],
      })],
    })
    const form = copyWeek(previous)
    assert.equal(form.title, 'Block 2 · Week 4')
    assert.deepEqual(planErrors(form), [])

    const next = toWeek(form, previous, today)
    assert.equal(next.number, 4)
    const copied = next.workouts[0].exercises[0]
    assert.equal(copied.log, null)
    assert.equal(copied.perSide, true)
    assert.equal(copied.reps, 8)
    assert.deepEqual(copied.load, { type: 'fixed', kg: 16 })
    assert.deepEqual(copied.resources, previous.workouts[0].exercises[0].resources)
    assert.deepEqual(copied.lastWeek, { weightKg: 16, rpe: 7 })
  })

  it('lists what stops a plan from being published', () => {
    const form = blankPlan('Next week')
    form.workouts[0].exercises[0].type = 'rpe'
    form.workouts[0].exercises[0].rpe = '11'
    form.workouts[0].exercises[0].link = 'javascript:alert(1)'
    const errors = planErrors(form)
    assert.equal(errors.length, 4)
    assert.match(errors[0], /Week title/)
  })
})
