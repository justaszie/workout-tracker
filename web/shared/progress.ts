// What the client web app does to a week: the changes a client can make, and the progress JSON
// it uploads. Mirrors ProgramWeek in data/Model.kt and progressJson in data/WeekJson.kt.

import type { Data, Exercise, ExerciseLog, Week, Workout } from './model.ts'

/** A week as the client app's endpoints answer it. */
export type ClientWeek = Week & { coach: Data['coach'] }

/** What the client entered in a week: the body of PUT /api/me/weeks/:weekId/progress. */
export interface Progress {
  weekId: string
  finishedOn: string | null
  note: string
  workouts: Record<string, {
    finishedOn: string | null
    albumLink: string
    /** Keyed by exercise id. An exercise without a log is left out. */
    logs: Record<string, ExerciseLog>
  }>
}

export function progressOf(week: Week): Progress {
  return {
    weekId: week.id,
    finishedOn: week.finishedOn,
    note: week.note,
    workouts: Object.fromEntries(week.workouts.map((workout) => [workout.id, {
      finishedOn: workout.finishedOn,
      albumLink: workout.albumLink,
      logs: Object.fromEntries(
        workout.exercises.flatMap((exercise) => exercise.log ? [[exercise.id, exercise.log]] : []),
      ),
    }])),
  }
}

/**
 * [plan] with [progress] in place of whatever the client had entered in it, or unchanged if the
 * progress belongs to another week. A workout the progress doesn't know, such as one the coach
 * added since, stays as the plan has it.
 */
export function withProgress<W extends Week>(plan: W, progress: Progress | null): W {
  if (progress?.weekId !== plan.id) return plan
  return {
    ...plan,
    finishedOn: progress.finishedOn,
    note: progress.note,
    workouts: plan.workouts.map((workout) => {
      const saved = progress.workouts[workout.id]
      if (!saved) return workout
      return {
        ...workout,
        finishedOn: saved.finishedOn,
        albumLink: saved.albumLink,
        exercises: workout.exercises.map((exercise) => ({ ...exercise, log: saved.logs[exercise.id] ?? null })),
      }
    }),
  }
}

function updateWorkout<W extends Week>(week: W, workoutId: string, change: (workout: Workout) => Workout): W {
  return { ...week, workouts: week.workouts.map((it) => (it.id === workoutId ? change(it) : it)) }
}

export const logExercise = <W extends Week>(week: W, workoutId: string, exerciseId: string, log: ExerciseLog): W =>
  updateWorkout(week, workoutId, (workout) => ({
    ...workout,
    exercises: workout.exercises.map((it) => (it.id === exerciseId ? { ...it, log } : it)),
  }))

export const finishWorkout = <W extends Week>(week: W, workoutId: string, on: string): W =>
  updateWorkout(week, workoutId, (workout) => ({ ...workout, finishedOn: on }))

export const setAlbumLink = <W extends Week>(week: W, workoutId: string, link: string): W =>
  updateWorkout(week, workoutId, (workout) => ({ ...workout, albumLink: link }))

export const finishWeek = <W extends Week>(week: W, on: string, note: string): W =>
  ({ ...week, finishedOn: on, note: note.trim() })

export const reopenWeek = <W extends Week>(week: W): W => ({ ...week, finishedOn: null })

/** The next exercise after [exerciseId] still waiting for a log, if any. */
export function nextUnlogged(workout: Workout, exerciseId: string): Exercise | undefined {
  const index = workout.exercises.findIndex((it) => it.id === exerciseId)
  return workout.exercises.slice(index + 1).find((it) => !it.log)
}
