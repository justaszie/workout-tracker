// Where each screen lives, and moving between them. The paths are real history entries, so the
// phone's back button and swipe go back a screen.

import { usePath } from '../router.tsx'

export const paths = {
  week: '/app/',
  workout: (workoutId: string) => `/app/workouts/${workoutId}`,
  log: (workoutId: string, exerciseId: string) => `/app/workouts/${workoutId}/log/${exerciseId}`,
  history: '/app/history',
  pastWeek: (weekId: string) => `/app/history/${weekId}`,
  pastWorkout: (weekId: string, workoutId: string) => `/app/history/${weekId}/${workoutId}`,
}

export type Route =
  | { screen: 'week' }
  | { screen: 'workout'; workoutId: string }
  | { screen: 'log'; workoutId: string; exerciseId: string }
  | { screen: 'history' }
  | { screen: 'pastWeek'; weekId: string }
  | { screen: 'pastWorkout'; weekId: string; workoutId: string }

export function useRoute(): Route {
  const [, section, first, second, third] = usePath().replace(/\/$/, '').split('/').slice(1).map(decodeURIComponent)
  if (section === 'workouts' && first) {
    return second === 'log' && third
      ? { screen: 'log', workoutId: first, exerciseId: third }
      : { screen: 'workout', workoutId: first }
  }
  if (section === 'history') {
    if (first && second) return { screen: 'pastWorkout', weekId: first, workoutId: second }
    return first ? { screen: 'pastWeek', weekId: first } : { screen: 'history' }
  }
  return { screen: 'week' }
}

function show(top = true) {
  dispatchEvent(new PopStateEvent('popstate'))
  if (top) scrollTo(0, 0)
}

/** Entries the app added are marked, so [back] can tell them from the page the client arrived on. */
export function open(to: string) {
  history.pushState({ inApp: true }, '', to)
  show()
}

/** Swaps the screen on top for [to], so back still leads where it did. */
export function replace(to: string) {
  history.replaceState(history.state, '', to)
  show()
}

/** Goes back a screen, or to [parent] when the app was opened on this one. */
export function back(parent: string) {
  if (history.state?.inApp) history.back()
  else replace(parent)
}
