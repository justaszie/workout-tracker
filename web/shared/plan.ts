// Turning a finished week into a plan form, and a plan form into a publishable week.

import {
  newId, nextWeekTitle, weekTitle,
  type Exercise, type LastWeek, type PlanExercise, type PlanForm, type PlanWorkout,
  type Resource, type Week, type Workout,
} from './model.ts'

export const blankExercise = (): PlanExercise => ({
  id: newId(), name: '', sets: '3', reps: '10', type: 'none',
  kg: '', rpe: '', note: '', link: '', otherLinks: [],
})

export const blankWorkout = (name = ''): PlanWorkout => ({
  id: newId(), name, exercises: [blankExercise()],
})

export function blankPlan(title = 'Block 1 · Week 1'): PlanForm {
  return { title, purpose: '', workouts: [blankWorkout('Workout 1')] }
}

function toPlanExercise(exercise: Exercise): PlanExercise {
  const { load, resources } = exercise
  return {
    id: exercise.id,
    name: exercise.name,
    sets: String(exercise.sets),
    reps: exercise.perSide ? `${exercise.reps} / side` : String(exercise.reps),
    type: load.type === 'fixed' ? 'kg' : load.type,
    kg: load.type === 'fixed' ? String(load.kg) : '',
    rpe: load.type === 'rpe' ? String(load.rpe) : '',
    note: exercise.coachNote ?? '',
    link: resources[0]?.url ?? '',
    otherLinks: resources.slice(1).map((resource) => resource.url),
  }
}

const toPlanWorkout = (workout: Workout): PlanWorkout => ({
  id: workout.id,
  name: workout.name,
  exercises: workout.exercises.map(toPlanExercise),
})

/** The next week starts as a copy of the last one, without its results. */
export function copyWeek(week: Week): PlanForm {
  return { title: nextWeekTitle(week), purpose: '', workouts: week.workouts.map(toPlanWorkout) }
}

/** A published week's plan as builder fields, for editing it. */
export function toPlanForm(week: Week): PlanForm {
  return { title: weekTitle(week), purpose: week.theme, workouts: week.workouts.map(toPlanWorkout) }
}

export function duplicateWorkout(workout: PlanWorkout): PlanWorkout {
  return {
    id: newId(),
    name: `${workout.name} copy`,
    exercises: workout.exercises.map((exercise) => ({ ...exercise, id: newId() })),
  }
}

function resource(url: string): Resource {
  const video = /youtu\.?be|vimeo/i.test(url)
  return { kind: video ? 'demoVideo' : 'setupGuide', url }
}

const isCount = (text: string, min: number) => /^\d+$/.test(text.trim()) && Number(text) >= min

function exerciseErrors(exercise: PlanExercise, where: string): string[] {
  const errors = []
  if (!exercise.name.trim()) errors.push(`${where} needs a name.`)
  if (!isCount(exercise.sets, 1)) errors.push(`${where}: sets must be a whole number.`)
  if (!/^[1-9]\d*\s*(\/\s*side|per side)?$/i.test(exercise.reps.trim())) {
    errors.push(`${where}: reps must look like "10" or "10 / side".`)
  }
  if (exercise.type === 'kg' && !(exercise.kg.trim() && Number(exercise.kg) >= 0)) {
    errors.push(`${where} needs a load in kg.`)
  }
  if (exercise.type === 'rpe' && !(isCount(exercise.rpe, 1) && Number(exercise.rpe) <= 10)) {
    errors.push(`${where} needs a target RPE from 1 to 10.`)
  }
  if (exercise.link.trim() && !/^https?:\/\/\S+$/i.test(exercise.link.trim())) {
    errors.push(`${where}: the link must start with http:// or https://.`)
  }
  return errors
}

export function planErrors(form: PlanForm): string[] {
  const errors = []
  if (!parseTitle(form.title)) errors.push('Week title must look like "Block 2 · Week 4".')
  if (!form.workouts.length) errors.push('Add at least one workout.')
  form.workouts.forEach((workout, w) => {
    const name = workout.name.trim() || `Workout ${w + 1}`
    if (!workout.name.trim()) errors.push(`Workout ${w + 1} needs a name.`)
    if (!workout.exercises.length) errors.push(`${name} has no exercises.`)
    workout.exercises.forEach((exercise, e) => {
      errors.push(...exerciseErrors(exercise, `${name}, exercise ${e + 1}`))
    })
  })
  return errors
}

function parseTitle(title: string) {
  const match = /block\s*(\d+)\D+week\s*(\d+)/i.exec(title)
  return match && { block: Number(match[1]), number: Number(match[2]) }
}

function lastWeekOf(name: string, previous: Week | undefined): LastWeek | null {
  const log = previous?.workouts
    .flatMap((workout) => workout.exercises)
    .find((exercise) => exercise.name === name)?.log
  return log?.weightKg != null ? { weightKg: log.weightKg, rpe: log.rpe } : null
}

function toExercise(form: PlanExercise, previous: Week | undefined): Exercise {
  const name = form.name.trim()
  const load = form.type === 'kg' ? { type: 'fixed' as const, kg: Number(form.kg) }
    : form.type === 'rpe' ? { type: 'rpe' as const, rpe: Number(form.rpe) }
    : { type: 'none' as const }
  return {
    id: form.id,
    name,
    sets: Number(form.sets),
    reps: parseInt(form.reps, 10),
    perSide: /side/i.test(form.reps),
    load,
    coachNote: form.note.trim() || null,
    resources: [form.link.trim(), ...form.otherLinks].filter(Boolean).map(resource),
    lastWeek: lastWeekOf(name, previous),
    log: null,
  }
}

/** Builds the week to publish. The form must have passed [planErrors]. */
export function toWeek(form: PlanForm, previous: Week | undefined, today: string): Week {
  return {
    id: newId(),
    ...parseTitle(form.title)!,
    theme: form.purpose.trim(),
    startedOn: today,
    workouts: form.workouts.map((workout) => ({
      id: workout.id,
      name: workout.name.trim(),
      exercises: workout.exercises.map((exercise) => toExercise(exercise, previous)),
      finishedOn: null,
      albumLink: '',
    })),
    finishedOn: null,
    note: '',
    lastActivityOn: null,
  }
}

// Editing a published week. The client may be part way through it, so whatever they have
// finished or logged keeps the plan it was done against.

/** A finished workout can't change at all. */
export const isFinished = (workout: Workout) => workout.finishedOn !== null

/** A logged exercise keeps its name, sets, reps and target; only its note can change. */
const sameTarget = (a: PlanExercise, b: PlanExercise) =>
  a.name === b.name && a.sets === b.sets && a.reps === b.reps && a.type === b.type
  && (a.type !== 'kg' || a.kg === b.kg) && (a.type !== 'rpe' || a.rpe === b.rpe)

const sameExercise = (a: PlanExercise, b: PlanExercise) =>
  sameTarget(a, b) && a.note === b.note && a.link === b.link
  && a.otherLinks.length === b.otherLinks.length && a.otherLinks.every((link, i) => link === b.otherLinks[i])

const sameWorkout = (a: PlanWorkout, b: PlanWorkout) =>
  a.name === b.name && a.exercises.length === b.exercises.length
  && a.exercises.every((exercise, i) => exercise.id === b.exercises[i].id && sameExercise(exercise, b.exercises[i]))

/** What stops [form] from replacing the plan of [week], which the client may have started. */
export function editErrors(week: Week, form: PlanForm): string[] {
  const errors = planErrors(form)
  const edited = new Map(form.workouts.map((workout) => [workout.id, workout]))
  for (const workout of week.workouts) {
    const after = edited.get(workout.id)
    if (isFinished(workout)) {
      if (!after) errors.push(`${workout.name} is finished, so it can't be removed.`)
      else if (!sameWorkout(toPlanWorkout(workout), after)) errors.push(`${workout.name} is finished, so it can't change.`)
      continue
    }
    for (const exercise of workout.exercises.filter((it) => it.log)) {
      const kept = after?.exercises.find((it) => it.id === exercise.id)
      const where = `${exercise.name} in ${workout.name}`
      if (!kept) errors.push(`${where} is logged, so it can't be removed.`)
      else if (!sameTarget(toPlanExercise(exercise), kept)) errors.push(`${where} is logged, so only its note can change.`)
    }
  }
  return errors
}

/**
 * [week] with the plan in [form], keeping its ids, dates and everything the client entered.
 * The form must have passed [editErrors].
 */
export function editWeek(week: Week, form: PlanForm, previous: Week | undefined): Week {
  const before = new Map(week.workouts.map((workout) => [workout.id, workout]))
  return {
    ...week,
    ...parseTitle(form.title)!,
    theme: form.purpose.trim(),
    workouts: form.workouts.map((planned) => {
      const workout = before.get(planned.id)
      if (workout && isFinished(workout)) return workout
      const exercises = new Map(workout?.exercises.map((exercise) => [exercise.id, exercise]))
      return {
        id: planned.id,
        name: planned.name.trim(),
        finishedOn: null,
        albumLink: workout?.albumLink ?? '',
        exercises: planned.exercises.map((form) => {
          const exercise = exercises.get(form.id)
          const made = toExercise(form, previous)
          if (exercise?.log) return { ...exercise, coachNote: made.coachNote }
          return made
        }),
      }
    }),
  }
}

export interface PlanChange {
  kind: 'added' | 'removed' | 'changed'
  title: string
  detail: string
}

const volumeText = (exercise: PlanExercise) => `${exercise.sets} × ${exercise.reps}`
const targetText = (exercise: PlanExercise) =>
  exercise.type === 'kg' ? `${exercise.kg} kg` : exercise.type === 'rpe' ? `RPE ${exercise.rpe}` : 'no target'
const exerciseText = (exercise: PlanExercise) => `${volumeText(exercise)}, ${targetText(exercise)}`
const named = (name: string, fallback: string) => name.trim() || fallback

function exerciseDifferences(a: PlanExercise, b: PlanExercise): string[] {
  const differences = []
  if (a.name.trim() !== b.name.trim()) differences.push(`renamed from ${named(a.name, 'unnamed')}`)
  if (volumeText(a) !== volumeText(b)) differences.push(`${volumeText(a)} → ${volumeText(b)}`)
  if (targetText(a) !== targetText(b)) differences.push(`${targetText(a)} → ${targetText(b)}`)
  if (a.note.trim() !== b.note.trim()) differences.push(b.note.trim() ? 'note changed' : 'note removed')
  if (a.link.trim() !== b.link.trim()) differences.push(b.link.trim() ? 'link changed' : 'link removed')
  return differences
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** What [after] changes in the plan [before], for the coach to check before publishing. */
export function planChanges(before: PlanForm, after: PlanForm): PlanChange[] {
  const changes: PlanChange[] = []
  if (before.title.trim() !== after.title.trim()) {
    changes.push({ kind: 'changed', title: 'Week title', detail: `${before.title.trim()} → ${after.title.trim()}` })
  }
  if (before.purpose.trim() !== after.purpose.trim()) {
    changes.push({ kind: 'changed', title: 'Purpose', detail: after.purpose.trim() || 'Removed' })
  }
  const kept = new Map(after.workouts.map((workout) => [workout.id, workout]))
  const old = new Map(before.workouts.map((workout) => [workout.id, workout]))
  for (const workout of before.workouts) {
    if (!kept.has(workout.id)) {
      changes.push({ kind: 'removed', title: `${named(workout.name, 'Workout')} removed`, detail: `Had ${workout.exercises.length} ${workout.exercises.length === 1 ? 'exercise' : 'exercises'}` })
    }
  }
  after.workouts.forEach((workout, i) => {
    const name = named(workout.name, `Workout ${i + 1}`)
    const was = old.get(workout.id)
    if (!was) {
      const count = workout.exercises.length
      changes.push({ kind: 'added', title: `${name} added`, detail: `${count} ${count === 1 ? 'exercise' : 'exercises'}` })
      return
    }
    if (was.name.trim() !== workout.name.trim()) {
      changes.push({ kind: 'changed', title: `${name}`, detail: `Renamed from ${named(was.name, 'unnamed')}` })
    }
    const now = new Map(workout.exercises.map((exercise) => [exercise.id, exercise]))
    const then = new Map(was.exercises.map((exercise) => [exercise.id, exercise]))
    for (const exercise of was.exercises) {
      if (!now.has(exercise.id)) {
        changes.push({ kind: 'removed', title: `${named(exercise.name, 'Exercise')} removed from ${name}`, detail: `Was ${exerciseText(exercise)}` })
      }
    }
    for (const exercise of workout.exercises) {
      const previous = then.get(exercise.id)
      if (!previous) {
        changes.push({ kind: 'added', title: `${named(exercise.name, 'Exercise')} added to ${name}`, detail: exerciseText(exercise) })
        continue
      }
      const differences = exerciseDifferences(previous, exercise)
      if (differences.length) {
        changes.push({ kind: 'changed', title: `${named(exercise.name, 'Exercise')} · ${name}`, detail: capitalized(differences.join(', ')) })
      }
    }
  })
  return changes
}
