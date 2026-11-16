// Read-only screens for the weeks before the current one. There are no stats: the client sees
// their progress by stepping from week to week.

import { useEffect } from 'react'
import {
  formatDate, formatKg, lastSetText, relativeWeekTitle, repsText, safeUrl, weekSummary, weekTitle,
  type Exercise, type ExerciseLog, type Week, type Workout,
} from '../../shared/model.ts'
import type { ClientWeek } from '../../shared/progress.ts'
import { paths, replace } from './nav.ts'
import { refreshHistory, type PastWeeks } from './store.ts'
import {
  exerciseCount, Header, Icon, PrescriptionTags, ScreenLink, SectionLabel, TopBar, WorkoutRow,
} from './ui.tsx'

/** '19–25 Oct', or '28 Sep – 4 Oct' across a month. Every past week has a finish date. */
function dateRange(week: Week): string {
  const [, startDay, startMonth] = formatDate(week.startedOn).split(' ')
  const [, endDay, endMonth] = formatDate(week.finishedOn ?? week.startedOn).split(' ')
  return startMonth === endMonth ? `${startDay}–${endDay} ${endMonth}` : `${startDay} ${startMonth} – ${endDay} ${endMonth}`
}

export function HistoryScreen({ history }: { history: PastWeeks }) {
  // The saved weeks show at once; the server's replace them when they arrive.
  useEffect(() => void refreshHistory(), [])
  const { weeks } = history
  const blocks: ClientWeek[][] = []
  for (const week of weeks ?? []) {
    if (blocks.at(-1)?.[0].block === week.block) blocks.at(-1)!.push(week)
    else blocks.push([week])
  }
  return (
    <main className="screen screen-padded">
      <TopBar parent={paths.week} />
      <Header eyebrow="History" title="Past weeks">
        {!!weeks?.length && (
          <p className="support">
            {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'} finished with {weeks[0].coach.name}
          </p>
        )}
      </Header>
      {!weeks && history.failed && (
        <div className="cards">
          <p className="support">Couldn't load your past weeks. Check your connection and try again.</p>
          <button type="button" className="button button-start" onClick={refreshHistory}>Try again</button>
        </div>
      )}
      {!weeks && !history.failed && <p className="support loading">Loading…</p>}
      {weeks?.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><Icon name="history" size={28} /></div>
          <h2 className="card-title">No past weeks yet</h2>
          <p className="support">Each week you finish and send to your coach shows up here, with everything you logged.</p>
        </div>
      )}
      {blocks.map((block) => (
        <section key={block[0].block}>
          <SectionLabel>Block {block[0].block}</SectionLabel>
          <div className="rows">
            {block.map((week) => {
              const summary = weekSummary(week)
              return (
                <ScreenLink key={week.id} to={paths.pastWeek(week.id)} className="row">
                  <div className="row-number">{week.number}</div>
                  <div className="row-text">
                    <div className="row-title">Week {week.number}</div>
                    <div className="row-detail">{dateRange(week)} · {summary.done} of {summary.total} done</div>
                  </div>
                  <Icon name="chevron" />
                </ScreenLink>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}

/** [older] and [newer] are the neighbouring past weeks, if there are any. */
export function PastWeekScreen({ week, older, newer }: { week: ClientWeek; older?: ClientWeek; newer?: ClientWeek }) {
  const started = `Started ${formatDate(week.startedOn)}`
  return (
    <main className="screen screen-padded">
      <TopBar parent={paths.history} />
      <Header eyebrow="Past week" title={weekTitle(week)}>
        <p className="lead">{week.theme}</p>
        <p className="support">{week.finishedOn ? `${started} · finished ${formatDate(week.finishedOn)}` : started}</p>
      </Header>
      {week.note.trim() && <div className="past-note"><strong>Your note:</strong> {week.note}</div>}
      <SectionLabel>Workouts</SectionLabel>
      <div className="rows">
        {week.workouts.map((workout, index) => (
          <WorkoutRow
            key={workout.id} week={week} workout={workout} number={index + 1}
            to={paths.pastWorkout(week.id, workout.id)}
          />
        ))}
      </div>
      {(older || newer) && (
        <div className="week-steps">
          <WeekStep from={week} to={older} older />
          <WeekStep from={week} to={newer} />
        </div>
      )}
    </main>
  )
}

/** An empty slot keeps the other button on its own side. */
function WeekStep({ from, to, older }: { from: Week; to?: Week; older?: boolean }) {
  if (!to) return <span />
  const label = relativeWeekTitle(to, from)
  return (
    // Swapped in, so Back still leads to the list of weeks.
    <button
      type="button" className="button button-outline button-plain"
      aria-label={`${older ? 'Older' : 'Newer'} week, ${label}`} onClick={() => replace(paths.pastWeek(to.id))}
    >
      {older && <Icon name="chevronLeft" size={20} />}
      {label}
      {!older && <Icon name="chevron" size={20} />}
    </button>
  )
}

export function PastWorkoutScreen({ week, workout }: { week: ClientWeek; workout: Workout }) {
  const count = exerciseCount(workout.exercises.length)
  const album = safeUrl(workout.albumLink.trim())
  return (
    <main className="screen screen-padded">
      <TopBar parent={paths.pastWeek(week.id)} />
      <Header
        eyebrow={`${weekTitle(week)} · Workout ${week.workouts.indexOf(workout) + 1} of ${week.workouts.length}`}
        title={workout.name}
      >
        <p className="support">{workout.finishedOn ? `${count} · done ${formatDate(workout.finishedOn)}` : count}</p>
      </Header>
      <div className="cards">
        {workout.exercises.map((exercise, index) => (
          <PastExerciseCard key={exercise.id} number={index + 1} exercise={exercise} />
        ))}
        {album && (
          <>
            <SectionLabel>Videos &amp; photos</SectionLabel>
            <div className="tags">
              <a className="chip" href={album} target="_blank" rel="noreferrer"><Icon name="album" size={18} />Open album</a>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function PastExerciseCard({ number, exercise }: { number: number; exercise: Exercise }) {
  const { log } = exercise
  return (
    <div className="card">
      <div className="exercise-head">
        <div className="badge">{number}</div>
        <div className="exercise-text">
          <div className="card-title">{exercise.name}</div>
          <PrescriptionTags exercise={exercise} />
        </div>
      </div>
      {!log && <p className="support">Not logged</p>}
      {log && (log.perSet ? <SetTable log={log} /> : (
        <div className="result">
          <div className="label">Last set {lastSetText(log)}</div>
          <div className="support">Reps {repsText(log)}</div>
        </div>
      ))}
      {log?.note.trim() && <div><strong>Your note:</strong> {log.note}</div>}
    </div>
  )
}

function SetTable({ log }: { log: ExerciseLog }) {
  return (
    <table className="result set-table">
      <thead>
        <tr><th>Set</th><th>Weight × reps</th><th>RPE</th></tr>
      </thead>
      <tbody>
        {log.perSet!.map((set, index) => {
          const reps = log.repsPerSet[index]
          return (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{set.weightKg == null ? `${reps} ${reps === 1 ? 'rep' : 'reps'}` : `${formatKg(set.weightKg)} kg × ${reps}`}</td>
              <td>{set.rpe}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
