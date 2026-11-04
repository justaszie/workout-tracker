// The data model, mirroring data/Model.kt in the Android app, plus everything derived from it.
// Imported by both the server and the browser. Dates are 'YYYY-MM-DD' strings.

export type Load = { type: 'none' } | { type: 'fixed'; kg: number } | { type: 'rpe'; rpe: number }

export interface Resource {
  kind: 'demoVideo' | 'setupGuide'
  url: string
}

export interface LastWeek {
  weightKg: number
  rpe: number
}

export interface ExerciseLog {
  weightKg: number | null
  rpe: number
  repsPerSet: number[]
  note: string
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  perSide: boolean
  load: Load
  coachNote: string | null
  resources: Resource[]
  lastWeek: LastWeek | null
  log: ExerciseLog | null
}

export interface Workout {
  id: string
  name: string
  exercises: Exercise[]
  finishedOn: string | null
  albumLink: string
}

export interface Week {
  id: string
  block: number
  number: number
  theme: string
  startedOn: string
  workouts: Workout[]
  finishedOn: string | null
  note: string
  /** The last day the client changed anything in this week. */
  lastActivityOn: string | null
}

/** The plan builder's fields, kept as typed so a half-finished draft can be saved. */
export interface PlanForm {
  title: string
  purpose: string
  workouts: PlanWorkout[]
}

export interface PlanWorkout {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface PlanExercise {
  id: string
  name: string
  sets: string
  reps: string
  type: 'kg' | 'rpe' | 'none'
  kg: string
  rpe: string
  note: string
  link: string
  /** Links beyond the one the builder edits, carried over so publishing doesn't drop them. */
  otherLinks: string[]
}

export interface Client {
  id: string
  name: string
  initials: string
  joinedOn: string
  /** Oldest first. The last week is the one the client is on. */
  weeks: Week[]
  draft: PlanForm | null
}

export interface Data {
  coach: { name: string; initials: string }
  clients: Client[]
}

export const newId = () => Math.random().toString(36).slice(2, 10)

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/)
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return letters.map((word) => word[0] ?? '').join('').toUpperCase()
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0]

// Dates

export function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000)
}

/** 'Sat 31 Oct' */
export function formatDate(date: string): string {
  const parsed = parseDate(date)
  const weekday = parsed.toLocaleDateString('en-GB', { weekday: 'short' })
  const month = parsed.toLocaleDateString('en-GB', { month: 'short' })
  return `${weekday} ${parsed.getDate()} ${month}`
}

const weekday = (date: string) => parseDate(date).toLocaleDateString('en-GB', { weekday: 'short' })

function daysAgo(date: string, today: string): string {
  const days = daysBetween(date, today)
  if (days <= 0) return 'today'
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Formatting

/** Whole numbers have no trailing zeros: 70 reads "70", 72.5 stays "72.5". */
export const formatKg = (kg: number) => String(kg)

export const weekTitle = (week: Pick<Week, 'block' | 'number'>) =>
  `Block ${week.block} · Week ${week.number}`

export const nextWeekTitle = (week: Week) =>
  weekTitle({ block: week.block, number: week.number + 1 })

export function plannedText(exercise: Exercise): string {
  const volume = `${exercise.sets} × ${exercise.reps}${exercise.perSide ? ' per side' : ''}`
  const { load } = exercise
  if (load.type === 'fixed') return `${volume} · ${formatKg(load.kg)} kg`
  if (load.type === 'rpe') return `${volume} · RPE ${load.rpe}`
  return volume
}

export const repsText = (log: ExerciseLog) => log.repsPerSet.join(' · ')

/** Only http(s) links are rendered, since links come from free-text fields. */
export function safeUrl(url: string): string | null {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol) ? url : null
  } catch {
    return null
  }
}

// Results

export function aboveTargetRpe(exercise: Exercise): boolean {
  return exercise.load.type === 'rpe' && !!exercise.log && exercise.log.rpe > exercise.load.rpe
}

export function missedReps(exercise: Exercise): boolean {
  return !!exercise.log && exercise.log.repsPerSet.some((reps) => reps < exercise.reps)
}

/** Kilos above or below a fixed load, or null when the client lifted what was planned. */
export function loadDifference(exercise: Exercise): number | null {
  const { load, log } = exercise
  if (load.type !== 'fixed' || log?.weightKg == null || log.weightKg === load.kg) return null
  return log.weightKg - load.kg
}

export const loggedCount = (workout: Workout) =>
  workout.exercises.filter((exercise) => exercise.log).length

export type WorkoutState = 'done' | 'partly' | 'skipped' | 'started' | 'todo'

/** Partly done and skipped only apply once the client has closed the week. */
export function workoutState(week: Week, workout: Workout): WorkoutState {
  if (workout.finishedOn) return 'done'
  const started = loggedCount(workout) > 0
  if (week.finishedOn) return started ? 'partly' : 'skipped'
  return started ? 'started' : 'todo'
}

export function weekSummary(week: Week) {
  const states = week.workouts.map((workout) => workoutState(week, workout))
  const count = (state: WorkoutState) => states.filter((it) => it === state).length
  const exercises = week.workouts.flatMap((workout) => workout.exercises)
  return {
    total: week.workouts.length,
    done: count('done'),
    partly: count('partly'),
    skipped: count('skipped'),
    started: count('started'),
    todo: count('todo'),
    exercises: exercises.length,
    logged: exercises.filter((exercise) => exercise.log).length,
    aboveRpe: exercises.filter(aboveTargetRpe).length,
    missedReps: exercises.filter(missedReps).length,
    underLoad: exercises.filter((exercise) => (loadDifference(exercise) ?? 0) < 0).length,
    notes: exercises.filter((exercise) => exercise.log?.note).length,
  }
}

/** "1 partly done · 2 skipped", leaving out whatever is zero. */
export function gapsText(summary: ReturnType<typeof weekSummary>): string {
  return [
    summary.partly && `${summary.partly} partly done`,
    summary.skipped && `${summary.skipped} skipped`,
  ].filter(Boolean).join(' · ')
}

// History

const addDays = (date: string, days: number) => {
  const parsed = parseDate(date)
  parsed.setDate(parsed.getDate() + days)
  return toDateString(parsed)
}

/** 'Mon 5 – Sat 10 Oct', or 'Mon 28 Sep – Sun 4 Oct' across months. Open weeks run a full seven days. */
export function weekDates(week: Week): string {
  const end = week.finishedOn ?? addDays(week.startedOn, 6)
  const [startDay, , startMonth] = formatDate(week.startedOn).split(' ')
  const [endDay, endDate, endMonth] = formatDate(end).split(' ')
  const from = startMonth === endMonth ? startDay + ' ' + parseDate(week.startedOn).getDate() : formatDate(week.startedOn)
  return `${from} – ${endDay} ${endDate} ${endMonth}`
}

/** 'Week 3' within the same block as [from], 'Block 1 · Week 4' otherwise. */
export const relativeWeekTitle = (week: Week, from: Week) =>
  week.block === from.block ? `Week ${week.number}` : weekTitle(week)

/** 'B2 · W3' */
export const shortWeekTitle = (week: Week) => `B${week.block} · W${week.number}`

/** Every week except the one the client is still training. */
export const pastWeeks = (client: Client) =>
  client.weeks.filter((week) => week.finishedOn || week !== currentWeek(client))

export interface Block {
  number: number
  /** Oldest first. */
  weeks: Week[]
}

/** The client's weeks grouped by block, newest block first. */
export function blocksOf(client: Client): Block[] {
  const blocks: Block[] = []
  for (const week of client.weeks) {
    const block = blocks.find((it) => it.number === week.block)
    if (block) block.weeks.push(week)
    else blocks.push({ number: week.block, weeks: [week] })
  }
  return blocks.reverse()
}

export interface LiftTrend {
  name: string
  first: { kg: number; week: Week }
  last: { kg: number; week: Week }
}

/** The weighted lift logged in the most weeks, from its first logged weight to its latest. */
export function liftTrend(client: Client): LiftTrend | null {
  const logged = new Map<string, { kg: number; week: Week }[]>()
  for (const week of client.weeks) {
    for (const exercise of week.workouts.flatMap((workout) => workout.exercises)) {
      const kg = exercise.log?.weightKg
      if (kg == null) continue
      const entries = logged.get(exercise.name) ?? []
      // One entry per week, keeping the first time the lift appears in it.
      if (entries.at(-1)?.week !== week) entries.push({ kg, week })
      logged.set(exercise.name, entries)
    }
  }
  let most: { kg: number; week: Week }[] = []
  let name = ''
  for (const [lift, entries] of logged) {
    if (entries.length > most.length) [name, most] = [lift, entries]
  }
  return most.length ? { name, first: most[0], last: most[most.length - 1] } : null
}

export interface Comparison {
  /** '+2.5 kg', 'RPE +1' or 'Same'. */
  change: string
  /** What it was the week before: 'was 90 kg', 'was RPE 8', or the unchanged value. */
  before: string
  up: boolean
}

/** How [exercise] went against the same exercise, by name, in [previous]. */
export function compareWithWeek(exercise: Exercise, previous: Week | undefined): Comparison | null {
  const now = exercise.log
  const then = previous?.workouts
    .flatMap((workout) => workout.exercises)
    .find((it) => it.name === exercise.name && it.log)?.log
  if (!now || !then) return null
  const signed = (n: number) => `${n > 0 ? '+' : '−'}${formatKg(Math.abs(n))}`
  if (now.weightKg != null && then.weightKg != null && now.weightKg !== then.weightKg) {
    const difference = now.weightKg - then.weightKg
    return { change: `${signed(difference)} kg`, before: `was ${formatKg(then.weightKg)} kg`, up: difference > 0 }
  }
  if (now.rpe !== then.rpe) {
    return { change: `RPE ${signed(now.rpe - then.rpe)}`, before: `was RPE ${then.rpe}`, up: false }
  }
  return { change: 'Same', before: then.weightKg != null ? `${formatKg(then.weightKg)} kg` : `RPE ${then.rpe}`, up: false }
}

// Client status

export const currentWeek = (client: Client): Week | undefined => client.weeks.at(-1)

export type ClientStatus = 'review' | 'new' | 'progress' | 'quiet' | 'notstarted'

/** A client with no logged activity for this long is flagged as quiet. */
const QUIET_AFTER_DAYS = 5

export function clientStatus(client: Client, today: string): ClientStatus {
  const week = currentWeek(client)
  if (!week) return 'new'
  if (week.finishedOn) return 'review'
  const activity = week.lastActivityOn
  if (!activity) return 'notstarted'
  return daysBetween(activity, today) >= QUIET_AFTER_DAYS ? 'quiet' : 'progress'
}

export function statusLabel(client: Client, today: string): string {
  switch (clientStatus(client, today)) {
    case 'review': return 'Needs review'
    case 'new': return 'Needs first week'
    case 'notstarted': return 'Not started'
    case 'progress': return 'In progress'
    case 'quiet':
      return `Quiet for ${daysBetween(currentWeek(client)!.lastActivityOn!, today)} days`
  }
}

export const isWaitingOnCoach = (client: Client, today: string) =>
  ['review', 'new'].includes(clientStatus(client, today))

export function lastActivityText(client: Client, today: string): string {
  const week = currentWeek(client)
  if (!week) return '—'
  if (week.finishedOn) {
    const when = daysAgo(week.finishedOn, today)
    return `Finished ${when}`
  }
  if (!week.lastActivityOn) return `Week published ${weekday(week.startedOn)}`
  const days = daysBetween(week.lastActivityOn, today)
  return days <= 1 ? `Trained ${daysAgo(week.lastActivityOn, today)}` : `${days} days ago`
}

export const joinedText = (client: Client) => `Joined ${weekday(client.joinedOn)}`

/** The short part of a theme: "Volume week — last push" reads "Volume week". */
export const shortTheme = (theme: string) => theme.split(' — ')[0]

function joinNames(names: string[]): string {
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** "Alex and Rūta finished their weeks, and Lukas needs a first week. ..." */
export function waitingText(clients: Client[], today: string): string {
  const named = (status: ClientStatus) =>
    clients.filter((client) => clientStatus(client, today) === status).map((c) => firstName(c.name))
  const review = named('review')
  const fresh = named('new')
  const parts = []
  if (review.length) {
    parts.push(`${joinNames(review)} finished their week${review.length > 1 ? 's' : ''}`)
  }
  if (fresh.length) {
    parts.push(`${joinNames(fresh)} ${fresh.length > 1 ? 'need' : 'needs'} a first week`)
  }
  const blocked = review.length + fresh.length > 1 ? 'None of them can' : "They can't"
  return `${parts.join(', and ')}. ${blocked} train until you publish.`
}
