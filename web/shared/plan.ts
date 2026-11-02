// Turning a finished week into a plan form, and a plan form into a publishable week.

import {
  newId, nextWeekTitle,
  type Exercise, type LastWeek, type PlanExercise, type PlanForm, type PlanWorkout,
  type Resource, type Week,
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

/** The next week starts as a copy of the last one, without its results. */
export function copyWeek(week: Week): PlanForm {
  return {
    title: nextWeekTitle(week),
    purpose: '',
    workouts: week.workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      exercises: workout.exercises.map(toPlanExercise),
    })),
  }
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
