import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Exercise, ExerciseLog, Week } from './model.ts'
import {
  finishWeek, finishWorkout, logExercise, nextUnlogged, progressOf, reopenWeek, setAlbumLink, withProgress,
} from './progress.ts'

const exercise = (id: string, log: ExerciseLog | null = null): Exercise => ({
  id, name: id, sets: 3, reps: 10, perSide: false, load: { type: 'none' },
  coachNote: null, resources: [], lastWeek: null, log,
})

const logged: ExerciseLog = { weightKg: 20, rpe: 8, repsPerSet: [10, 10, 10], note: '' }

const week = (): Week => ({
  id: 'week', block: 1, number: 1, theme: '', startedOn: '2026-10-26',
  workouts: [
    { id: 'a', name: 'A', exercises: [exercise('a1'), exercise('a2'), exercise('a3')], finishedOn: null, albumLink: '' },
    { id: 'b', name: 'B', exercises: [exercise('b1')], finishedOn: null, albumLink: '' },
  ],
  finishedOn: null, note: '', lastActivityOn: null,
})

describe('progress', () => {
  it('carries everything the client entered onto a fresh copy of the plan', () => {
    let changed = logExercise(week(), 'a', 'a2', logged)
    changed = setAlbumLink(changed, 'a', 'https://example.com/album')
    changed = finishWorkout(changed, 'a', '2026-10-27')
    changed = finishWeek(changed, '2026-10-30', '  Sore knee.  ')
    assert.equal(changed.note, 'Sore knee.')
    assert.deepEqual(withProgress(week(), progressOf(changed)), changed)
  })

  it('removes a log the plan has but the progress does not', () => {
    const plan = logExercise(week(), 'a', 'a1', logged)
    assert.equal(withProgress(plan, progressOf(week())).workouts[0].exercises[0].log, null)
  })

  it('ignores progress from another week', () => {
    const other = { ...logExercise(week(), 'a', 'a1', logged), id: 'earlier' }
    assert.deepEqual(withProgress(week(), progressOf(other)), week())
    assert.deepEqual(withProgress(week(), null), week())
  })

  it('keeps a workout the coach added after the progress was saved', () => {
    const before = progressOf(week())
    const plan = week()
    plan.workouts.push({ id: 'c', name: 'C', exercises: [exercise('c1', logged)], finishedOn: '2026-10-28', albumLink: '' })
    assert.deepEqual(withProgress(plan, before).workouts[2], plan.workouts[2])
  })

  it('leaves the plan itself out of what is uploaded', () => {
    const progress = progressOf(logExercise(week(), 'b', 'b1', logged))
    assert.deepEqual(progress.workouts.b, { finishedOn: null, albumLink: '', logs: { b1: logged } })
    assert.deepEqual(progress.workouts.a.logs, {})
  })

  it('reopens a finished week without losing its note', () => {
    const reopened = reopenWeek(finishWeek(week(), '2026-10-30', 'Travelling'))
    assert.equal(reopened.finishedOn, null)
    assert.equal(reopened.note, 'Travelling')
  })
})

describe('nextUnlogged', () => {
  it('finds the next exercise without a log, skipping logged ones', () => {
    const workout = logExercise(week(), 'a', 'a2', logged).workouts[0]
    assert.equal(nextUnlogged(workout, 'a1')?.id, 'a3')
  })

  it('does not go back to an earlier exercise', () => {
    assert.equal(nextUnlogged(week().workouts[0], 'a3'), undefined)
  })
})
