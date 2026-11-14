import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blocksOf, clientStatus, compareWithWeek, droppedExercises, exerciseResult, lastSetText, previousExercise, formatDate, liftTrend, pastWeeks, weekDates, lastActivityText, loadDifference, missedReps, plannedText, safeUrl,
  statusLabel, waitingText, weekSummary, workoutState,
  type Client, type Exercise, type Week, type Workout,
} from './model.ts'
import { blankPlan, copyWeek, editErrors, editWeek, planChanges, planErrors, toPlanForm, toWeek } from './plan.ts'

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
  id: 'c', name, initials: 'AP', joinedOn: '2026-10-01', email: null, weeks, draft: null,
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

describe('history', () => {
  it('shows week dates within a month and across months', () => {
    assert.equal(weekDates(week({ startedOn: '2026-10-05', finishedOn: '2026-10-10' })), 'Mon 5 – Sat 10 Oct')
    assert.equal(weekDates(week({ startedOn: '2026-10-26', finishedOn: null })), 'Mon 26 Oct – Sun 1 Nov')
  })

  it('groups weeks into blocks, newest first', () => {
    const weeks = [week({ id: 'a', block: 1 }), week({ id: 'b', block: 1 }), week({ id: 'c', block: 2 })]
    assert.deepEqual(
      blocksOf(client(weeks)).map((block) => [block.number, block.weeks.map((it) => it.id)]),
      [[2, ['c']], [1, ['a', 'b']]],
    )
  })

  it('leaves the week still being trained out of past weeks', () => {
    const done = week({ id: 'a', finishedOn: today })
    const open = week({ id: 'b' })
    assert.deepEqual(pastWeeks(client([done, open])).map((it) => it.id), ['a'])
    assert.deepEqual(pastWeeks(client([open, done])).map((it) => it.id), ['b', 'a'])
  })

  it('follows the lift logged in the most weeks', () => {
    const lifted = (name: string, kg: number) => workout({ exercises: [exercise({ name, log: log(undefined, 8, kg) })] })
    const weeks = [
      week({ id: 'a', workouts: [lifted('Squat', 80), lifted('Bench', 60)] }),
      week({ id: 'b', workouts: [lifted('Squat', 90)] }),
    ]
    const trend = liftTrend(client(weeks))
    assert.equal(trend?.name, 'Squat')
    assert.deepEqual([trend?.first.kg, trend?.last.kg], [80, 90])
    assert.equal(liftTrend(client([week()])), null)
  })

  it('compares an exercise with the same one the week before', () => {
    const previous = (weightKg: number | null, rpe = 8) =>
      week({ workouts: [workout({ exercises: [exercise({ log: log(undefined, rpe, weightKg) })] })] })
    const now = exercise({ log: log(undefined, 9, 52.5) })
    assert.deepEqual(compareWithWeek(now, previous(50)), { change: '+2.5 kg', before: 'was 50 kg', up: true })
    assert.deepEqual(compareWithWeek(now, previous(52.5, 8)), { change: 'RPE +1', before: 'was RPE 8', up: false })
    assert.deepEqual(compareWithWeek(now, previous(52.5, 9)), { change: 'Same', before: '52.5 kg', up: false })
    assert.equal(compareWithWeek(now, undefined), null)
    assert.equal(compareWithWeek(exercise(), previous(50)), null)
  })
})

describe('editing a published week', () => {
  const live = () => week({
    workouts: [
      workout({ id: 'a', name: 'Lower', finishedOn: '2026-10-26', exercises: [exercise({ id: 'sq', name: 'Squat', log: log() })] }),
      workout({
        id: 'b', name: 'Upper',
        exercises: [
          exercise({ id: 'bp', name: 'Bench press', log: log() }),
          exercise({ id: 'oh', name: 'Overhead press', load: { type: 'fixed', kg: 47.5 } }),
        ],
      }),
    ],
  })

  it('round-trips a week through the builder unchanged', () => {
    const form = toPlanForm(live())
    assert.equal(form.title, 'Block 2 · Week 3')
    assert.deepEqual(editErrors(live(), form), [])
    assert.deepEqual(editWeek(live(), form, undefined), live())
    assert.deepEqual(planChanges(form, toPlanForm(live())), [])
  })

  it('locks finished workouts and logged targets, but not notes', () => {
    const form = toPlanForm(live())
    form.workouts[1].exercises[0].note = 'Pause the first rep'
    assert.deepEqual(editErrors(live(), form), [])
    assert.equal(editWeek(live(), form, undefined).workouts[1].exercises[0].coachNote, 'Pause the first rep')

    form.workouts[1].exercises[0].kg = '80'
    form.workouts[1].exercises[0].type = 'kg'
    form.workouts[0].name = 'Legs'
    assert.deepEqual(editErrors(live(), form), [
      "Lower is finished, so it can't change.",
      'Bench press in Upper is logged, so only its note can change.',
    ])
    form.workouts = []
    assert.ok(editErrors(live(), form).includes("Lower is finished, so it can't be removed."))
  })

  it('lists what changed', () => {
    const before = toPlanForm(live())
    const after = toPlanForm(live())
    after.workouts[1].exercises[1].kg = '45'
    after.workouts[1].exercises.push({ ...after.workouts[1].exercises[1], id: 'fp', name: 'Face pull', type: 'none' })
    after.workouts.splice(0, 1)
    assert.deepEqual(planChanges(before, after), [
      { kind: 'removed', title: 'Lower removed', detail: 'Had 1 exercise' },
      { kind: 'changed', title: 'Overhead press · Upper', detail: '47.5 kg → 45 kg' },
      { kind: 'added', title: 'Face pull added to Upper', detail: '3 × 10, no target' },
    ])
  })
})

describe('last week in the plan', () => {
  const previous = week({
    workouts: [
      workout({ id: 'w1', name: 'Upper A', exercises: [
        exercise({ id: 'e1', name: 'Bench press' }),
        exercise({ id: 'e2', name: 'Lateral raise' }),
        exercise({ id: 'e3', name: 'Dumbbell fly' }),
      ] }),
      workout({ id: 'w2', name: 'Lower A', exercises: [exercise({ id: 'e4', name: 'Back squat' })] }),
    ],
  })

  it('finds an exercise by id, then by name in the same workout, then anywhere', () => {
    const upper = { id: 'w1', name: 'Upper A' }
    assert.equal(previousExercise({ id: 'e2', name: 'Renamed' }, upper, previous)?.id, 'e2')
    assert.equal(previousExercise({ id: 'new', name: ' lateral RAISE ' }, upper, previous)?.id, 'e2')
    assert.equal(previousExercise({ id: 'new', name: 'Back squat' }, upper, previous)?.id, 'e4')
    assert.equal(previousExercise({ id: 'new', name: 'Face pull' }, upper, previous), undefined)
    assert.equal(previousExercise({ id: 'new', name: '' }, upper, previous), undefined)
  })

  it('lists exercises the plan dropped', () => {
    const form = copyWeek(previous)
    form.workouts[0].exercises.splice(2, 1)
    assert.deepEqual(droppedExercises(previous.workouts[0], form, previous).map((it) => it.name), ['Dumbbell fly'])
    assert.deepEqual(droppedExercises(previous.workouts[1], form, previous), [])
  })

  it('flags missed reps before RPE, and shows every set', () => {
    const result = exerciseResult(exercise({ load: { type: 'rpe', rpe: 8 }, log: log([10, 9, 7], 9, 22) }))
    assert.equal(result.flag, 'missedReps')
    assert.equal(result.repsShort, 4)
    assert.equal(result.lastSetOnly, true)
    assert.deepEqual(result.sets, [
      { reps: 10, weightKg: null, rpe: null, missed: false, aboveRpe: false },
      { reps: 9, weightKg: null, rpe: null, missed: true, aboveRpe: false },
      { reps: 7, weightKg: 22, rpe: 9, missed: true, aboveRpe: true },
    ])
  })

  it('has nothing more to show when the last set says it all', () => {
    const result = exerciseResult(exercise({ load: { type: 'rpe', rpe: 8 }, log: log([10, 10, 10], 9) }))
    assert.equal(result.flag, 'aboveRpe')
    assert.equal(result.sets, null)
    assert.equal(exerciseResult(exercise({ log: log() })).flag, null)
    assert.equal(exerciseResult(exercise()).flag, 'notLogged')
  })

  it('notices weights that changed from set to set', () => {
    const perSet = [{ weightKg: 8, rpe: 7 }, { weightKg: 9, rpe: 8 }, { weightKg: 10, rpe: 9 }]
    const varied = exerciseResult(exercise({ log: { ...log([10, 10, 10], 9, 10), perSet } }))
    assert.equal(varied.flag, 'weightVaried')
    assert.equal(varied.lastSetOnly, false)
    assert.deepEqual(varied.sets?.map((set) => set.weightKg), [8, 9, 10])
    const same = perSet.map((set) => ({ ...set, weightKg: 10 }))
    const steady = exerciseResult(exercise({ log: { ...log([10, 10, 10], 9, 10), perSet: same } }))
    assert.equal(steady.flag, null)
    assert.equal(steady.sets?.length, 3)
  })

  it('writes the last set without a weight for bodyweight work', () => {
    assert.equal(lastSetText(log([10], 7, null)), 'RPE 7')
    assert.equal(lastSetText(log([10], 9, 62.5)), '62.5 kg · RPE 9')
  })
})
