import {
  initialsOf, newId, toDateString,
  type Client, type Data, type Exercise, type ExerciseLog, type Load, type Week, type Workout,
} from '../shared/model.ts'

const coach = { name: 'Coach Marta', initials: 'MK' }

const dayOffset = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateString(date)
}

function client(name: string, joinedDaysAgo: number, weeks: Week[] = []): Client {
  return {
    id: newId(), name, initials: initialsOf(name), joinedOn: dayOffset(joinedDaysAgo), weeks, draft: null,
  }
}

/** What a real install starts with: no invented training history. */
export const seed = (): Data => ({ coach, clients: [client('Justas Zieminykas', 0)] })

// Everything below only feeds `npm run demo`, which reproduces the six clients in the design.

const fixed = (kg: number): Load => ({ type: 'fixed', kg })
const rpe = (target: number): Load => ({ type: 'rpe', rpe: target })

function log(weightKg: number | null, rpeValue: number, reps: number[], note = ''): ExerciseLog {
  return { weightKg, rpe: rpeValue, repsPerSet: reps, note }
}

const all = (sets: number, reps: number) => Array.from({ length: sets }, () => reps)

function exercise(
  name: string, sets: number, reps: number, load: Load = { type: 'none' },
  logged: ExerciseLog | null = null, perSide = false,
): Exercise {
  return {
    id: newId(), name, sets, reps, perSide, load, coachNote: null, resources: [], lastWeek: null, log: logged,
  }
}

function workout(name: string, exercises: Exercise[], finishedOn: string | null = null, albumLink = ''): Workout {
  return { id: newId(), name, exercises, finishedOn, albumLink }
}

function week(fields: Pick<Week, 'block' | 'number' | 'theme' | 'startedOn' | 'workouts'> & Partial<Week>): Week {
  return { id: newId(), finishedOn: null, note: '', lastActivityOn: null, ...fields }
}

/** A week of [total] one-exercise workouts, the first [done] of them finished. */
function shortWeek(
  block: number, number: number, theme: string, startedDaysAgo: number, total: number, done: number,
): Week {
  return week({
    block, number, theme,
    startedOn: dayOffset(startedDaysAgo),
    workouts: Array.from({ length: total }, (_, i) => workout(
      `Workout ${i + 1}`,
      [exercise('Goblet squat', 3, 10, fixed(20), i < done ? log(20, 7, all(3, 10)) : null)],
      i < done ? dayOffset(startedDaysAgo) : null,
    )),
  })
}

function alexWeek(): Week {
  const album = 'https://photos.google.com/'
  return week({
    block: 2,
    number: 3,
    theme: 'Volume week — last push before the deload',
    startedOn: dayOffset(5),
    finishedOn: dayOffset(0),
    lastActivityOn: dayOffset(0),
    note: 'Travelling Thu–Sun, no gym at the hotel.',
    workouts: [
      workout('Lower A', [
        exercise('Back squat', 4, 5, fixed(100), log(100, 8, all(4, 5))),
        exercise('Romanian deadlift', 3, 8, rpe(7), log(80, 7, all(3, 8))),
        exercise('Walking lunge', 3, 10, fixed(16), log(16, 8, all(3, 10)), true),
        exercise('Lying leg curl', 3, 12, rpe(8), log(35, 9, all(3, 12), 'Hamstrings cramped a bit on set 3')),
        exercise('Standing calf raise', 3, 15, undefined, log(null, 7, all(3, 15))),
        exercise('Pallof press', 3, 12, undefined, log(null, 6, all(3, 12))),
      ], dayOffset(5), album),
      workout('Upper A', [
        exercise('Incline dumbbell press', 4, 8, rpe(8), {
          ...log(26, 8, all(4, 8)),
          perSet: [{ weightKg: 22, rpe: 6 }, { weightKg: 24, rpe: 7 }, { weightKg: 26, rpe: 7 }, { weightKg: 26, rpe: 8 }],
        }),
        exercise('Lat pulldown', 3, 10, fixed(55), log(55, 9, [10, 10, 8], 'Grip gave out on the last set')),
        exercise('Seated cable row', 3, 12, rpe(8), log(50, 7, all(3, 12))),
        exercise('Dumbbell lateral raise', 3, 15, undefined, log(8, 9, all(3, 15))),
        exercise('Band face pull', 3, 15, undefined, log(null, 6, all(3, 15))),
      ], dayOffset(3)),
      workout('Upper B', [
        exercise('Bench press', 4, 6, fixed(70), log(72.5, 8, all(4, 6))),
        exercise('Seated dumbbell shoulder press', 3, 10, rpe(8)),
        exercise('Chest-supported row', 3, 12, fixed(24)),
        exercise('Band pull-apart', 3, 15),
        exercise('Dead bug', 3, 8, undefined, null, true),
      ], null, album),
      workout('Lower B', [
        exercise('Deadlift', 4, 5, fixed(110)),
        exercise('Front squat', 3, 8, rpe(8)),
        exercise('Bulgarian split squat', 3, 10, rpe(8)),
        exercise('Barbell hip thrust', 3, 10, fixed(80)),
        exercise('Leg extension', 3, 15, rpe(8)),
        exercise('Side plank reach', 3, 10),
      ]),
      workout('Conditioning', [
        exercise('Kettlebell swing', 4, 20, fixed(20)),
        exercise('Box step-up', 3, 12),
        exercise('Mountain climber', 3, 30),
        exercise('Burpee', 3, 10),
      ]),
    ],
  })
}

/** Alex's earlier weeks, a week apart and finished, so the history screens have something to show. */
function alexHistory(): Week[] {
  const plans: [block: number, number: number, theme: string, squat: number, bench: number][] = [
    [1, 1, 'Foundations — learn the lifts', 80, 60],
    [1, 2, 'Build', 85, 62.5],
    [1, 3, 'Build — add a set', 87.5, 65],
    [1, 4, 'Test week', 90, 65],
    [2, 1, 'Volume week — back in', 92.5, 67.5],
    [2, 2, 'Volume week', 95, 70],
  ]
  return plans.map(([block, number, theme, squat, bench], i) => {
    const started = 7 * (plans.length - i) + 5
    const day = (offset: number) => dayOffset(started - offset)
    const lastSquat = i === 3 ? log(squat, 9, [5, 5, 5, 4], 'Last rep would not go') : log(squat, 8, all(4, 5))
    const pullUpRpe = i === 2 || i === 5 ? 9 : 8
    const skipped = i === 3
    return week({
      block, number, theme,
      startedOn: day(0),
      finishedOn: day(6),
      lastActivityOn: day(6),
      note: i === 3 ? 'Work trip at the end of the week, so Lower B did not happen.' : '',
      workouts: [
        workout('Lower A', [
          exercise('Back squat', 4, 5, fixed(squat), lastSquat),
          exercise('Romanian deadlift', 3, 8, rpe(7), log(70 + i * 2.5, 7, all(3, 8))),
        ], day(0)),
        workout('Upper A', [
          exercise('Bench press', 4, 6, fixed(bench), log(bench, 8, all(4, 6))),
          exercise('Pull-up', 4, 6, rpe(8), log(null, pullUpRpe, all(4, 6), pullUpRpe > 8 ? 'Grip went on the last set' : '')),
        ], day(1)),
        workout('Lower B', [
          exercise('Deadlift', 3, 5, fixed(100 + i * 2.5), skipped ? null : log(100 + i * 2.5, 8, all(3, 5))),
          exercise('Front squat', 3, 6, rpe(7), skipped ? null : log(60 + i * 2.5, 7, all(3, 6))),
        ], skipped ? null : day(3)),
        workout('Upper B', [
          exercise('Overhead press', 3, 8, fixed(40 + i), log(40 + i, 8, all(3, 8))),
          exercise('Chest-supported row', 3, 12, fixed(22), i === 1 ? null : log(22, 7, all(3, 12))),
        ], i === 1 ? null : day(4)),
      ],
    })
  })
}

export function demoSeed(): Data {
  const ruta = shortWeek(1, 4, 'Test week', 6, 4, 4)
  ruta.finishedOn = ruta.lastActivityOn = dayOffset(1)
  const tomas = shortWeek(3, 1, 'Strength intro', 5, 5, 3)
  tomas.lastActivityOn = dayOffset(0)
  // Greta's first week is finished, so editing her live second week has a last week to compare with.
  const greta = shortWeek(1, 1, 'Technique focus', 9, 3, 3)
  greta.finishedOn = greta.lastActivityOn = dayOffset(3)
  greta.workouts[1].exercises[0].log = log(20, 9, [10, 10, 8], 'Legs were tired from work')
  greta.workouts[2].exercises[0].log = {
    ...log(22, 8, all(3, 10)),
    perSet: [{ weightKg: 18, rpe: 7 }, { weightKg: 20, rpe: 7 }, { weightKg: 22, rpe: 8 }],
  }
  const mantas = shortWeek(2, 1, 'Rebuild week', 8, 4, 1)
  mantas.lastActivityOn = dayOffset(6)
  return {
    coach,
    clients: [
      client('Alex Petrauskas', 60, [...alexHistory(), alexWeek()]),
      client('Rūta Jonaitė', 30, [ruta]),
      client('Lukas Stankevičius', 1),
      client('Tomas Kazlauskas', 90, [tomas]),
      client('Mantas Vaitkus', 30, [mantas]),
      client('Greta Baltrušaitė', 14, [greta, shortWeek(1, 2, 'Technique focus', 2, 3, 0)]),
    ],
  }
}
