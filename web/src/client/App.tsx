import { useState } from 'react'
import { HistoryScreen, PastWeekScreen, PastWorkoutScreen } from './History.tsx'
import { InstallScreen, shouldOfferInstall } from './Install.tsx'
import { LogScreen } from './Log.tsx'
import { useRoute } from './nav.ts'
import { SignInScreen } from './SignIn.tsx'
import { useApp } from './store.ts'
import { WeekScreen, WeekUnavailable } from './Week.tsx'
import { WorkoutScreen } from './Workout.tsx'

export function App() {
  const app = useApp()
  const route = useRoute()
  const [offerInstall, setOfferInstall] = useState(shouldOfferInstall)

  if (!app.token) {
    // Being sent back from Google with a refusal means the client chose to sign in here.
    return offerInstall && !app.signInError
      ? <InstallScreen onContinue={() => setOfferInstall(false)} />
      : <SignInScreen error={app.signInError} />
  }

  if (route.screen === 'history') return <HistoryScreen history={app.history} />
  if (route.screen === 'pastWeek' || route.screen === 'pastWorkout') {
    const weeks = app.history.weeks ?? []
    const index = weeks.findIndex((it) => it.id === route.weekId)
    // Opened directly, before the list has loaded: the list loads them and leads back here.
    if (index < 0) return <HistoryScreen history={app.history} />
    const workout = route.screen === 'pastWorkout' && weeks[index].workouts.find((it) => it.id === route.workoutId)
    return workout
      ? <PastWorkoutScreen week={weeks[index]} workout={workout} />
      : <PastWeekScreen key={weeks[index].id} week={weeks[index]} older={weeks[index + 1]} newer={weeks[index - 1]} />
  }

  const { week } = app
  if (!week) return <WeekUnavailable load={app.load} />

  // A workout or exercise the week doesn't have, as after the coach changed the plan, shows the week.
  const workout = route.screen !== 'week' ? week.workouts.find((it) => it.id === route.workoutId) : undefined
  const exercise = route.screen === 'log' ? workout?.exercises.find((it) => it.id === route.exerciseId) : undefined
  if (workout && exercise && !week.finishedOn) return <LogScreen key={exercise.id} workout={workout} exercise={exercise} />
  if (workout) return <WorkoutScreen key={workout.id} week={week} workout={workout} />
  return <WeekScreen week={week} sending={app.pending} offline={app.offline} />
}
