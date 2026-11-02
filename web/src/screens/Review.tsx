import {
  aboveTargetRpe, currentWeek, firstName, formatDate, formatKg, loadDifference, loggedCount,
  missedReps, nextWeekTitle, plannedText, repsText, safeUrl, weekSummary, weekTitle, workoutState,
  type Client, type Data, type Exercise, type Week, type Workout, type WorkoutState,
} from '../../shared/model.ts'
import { Icon } from '../icons.tsx'
import { Link } from '../router.tsx'

const stateChip: Record<WorkoutState, { label: string; className: string }> = {
  done: { label: 'Done', className: 'chip-green' },
  partly: { label: 'Partly done', className: 'chip-grey' },
  skipped: { label: 'Skipped', className: 'chip-red' },
  started: { label: 'In progress', className: 'chip-grey' },
  todo: { label: 'To do', className: 'chip-grey' },
}

function workoutSubtitle(week: Week, workout: Workout) {
  const logged = loggedCount(workout)
  const total = workout.exercises.length
  if (!logged) return `${total} ${total === 1 ? 'exercise' : 'exercises'} · nothing logged`
  const date = workout.finishedOn ?? week.finishedOn
  return `${date ? `${formatDate(date)} · ` : ''}${logged} of ${total} logged`
}

function weightText(exercise: Exercise) {
  const weight = exercise.log?.weightKg
  if (weight == null) return '—'
  const difference = loadDifference(exercise)
  if (difference === null) return `${formatKg(weight)} kg`
  return `${formatKg(weight)} kg (${difference > 0 ? '+' : '−'}${formatKg(Math.abs(difference))})`
}

function ResultRow({ exercise }: { exercise: Exercise }) {
  const { load, log } = exercise
  return (
    <div role="row" className="row results-grid results-row">
      <span role="cell" className="medium">{exercise.name}</span>
      <span role="cell" className="muted">{plannedText(exercise)}</span>
      {log ? (
        <>
          <span role="cell" className={(loadDifference(exercise) ?? 0) > 0 ? 'bold' : ''}>{weightText(exercise)}</span>
          <span role="cell" className={aboveTargetRpe(exercise) ? 'flagged' : ''}>
            {load.type === 'rpe' ? `${log.rpe} (target ${load.rpe})` : log.rpe}
          </span>
          <span role="cell" className={missedReps(exercise) ? 'flagged' : ''}>
            {missedReps(exercise) ? repsText(log) : 'All done'}
          </span>
          <span role="cell" className="muted">{log.note}</span>
        </>
      ) : (
        <>
          <span role="cell" className="muted">Not logged</span>
          <span role="cell" className="muted">—</span>
          <span role="cell" className="muted">—</span>
          <span role="cell" />
        </>
      )}
    </div>
  )
}

function WorkoutCard({ week, workout, n }: { week: Week; workout: Workout; n: number }) {
  const chip = stateChip[workoutState(week, workout)]
  const album = safeUrl(workout.albumLink)
  const logged = loggedCount(workout) > 0
  return (
    <section aria-label={workout.name} className="card clip">
      <div className="workout-head">
        <span className="number" aria-hidden="true">{n}</span>
        <div className="grow">
          <h2>{workout.name}</h2>
          <p className="muted small">{workoutSubtitle(week, workout)}</p>
        </div>
        {album && (
          <a href={album} target="_blank" rel="noreferrer" className="link-chip">
            <Icon name="album" size={18} />Videos &amp; photos
          </a>
        )}
        <span className={`chip ${chip.className}`}>{chip.label}</span>
      </div>
      {logged && (
        <div className="table-scroll">
          <div role="table" aria-label={`${workout.name} results`} className="results-table">
            <div role="row" className="row-head row-head-tinted results-grid">
              <span role="columnheader">Exercise</span>
              <span role="columnheader">Planned</span>
              <span role="columnheader">Last set</span>
              <span role="columnheader">RPE</span>
              <span role="columnheader">Reps</span>
              <span role="columnheader">Client note</span>
            </div>
            {workout.exercises.map((exercise) => <ResultRow key={exercise.id} exercise={exercise} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function WeekResults({ client, week }: { client: Client; week: Week }) {
  const summary = weekSummary(week)
  const title = weekTitle(week)
  const rest = [
    summary.partly && `${summary.partly} partly done`,
    summary.skipped && `${summary.skipped} skipped`,
    summary.started && `${summary.started} in progress`,
    summary.todo && `${summary.todo} to do`,
    `${summary.logged} of ${summary.exercises} exercises logged`,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <nav aria-label="Breadcrumb" className="crumbs">
        <Link to="/">Clients</Link><span aria-hidden="true">›</span>
        <span>{client.name}</span><span aria-hidden="true">›</span>
        <span aria-current="page">{title}</span>
      </nav>

      <header className="page-header">
        <div className="review-title">
          <div className="client-cell">
            <span className="avatar" aria-hidden="true">{client.initials}</span>
            <span className="client-name-large">{client.name}</span>
          </div>
          <h1>{title}</h1>
          {week.theme && <p className="lead">{week.theme}</p>}
          <div className="chips">
            {week.finishedOn && (
              <span className="chip chip-green chip-icon">
                <Icon name="check" size={16} weight={2.5} />Finished {formatDate(week.finishedOn)}
              </span>
            )}
            <span className="chip chip-grey">Started {formatDate(week.startedOn)}</span>
          </div>
        </div>
        {week.finishedOn && (
          <Link to={`/clients/${client.id}/plan`} className="btn btn-primary btn-icon-right">
            Plan {nextWeekTitle(week)}<Icon name="arrow" />
          </Link>
        )}
      </header>

      {week.note && (
        <section aria-label="Client's note for the week" className="card note">
          <span className="note-icon" aria-hidden="true"><Icon name="chat" size={22} /></span>
          <div>
            <p className="eyebrow">{firstName(client.name)}'s note when finishing the week</p>
            <p className="lead">“{week.note}”</p>
          </div>
        </section>
      )}

      <div className="summary">
        <p>
          <strong>{summary.done} of {summary.total} workouts done</strong>
          <span className="muted"> · {rest}</span>
        </p>
        {summary.aboveRpe > 0 && <span className="chip chip-red">{summary.aboveRpe} above target RPE</span>}
        {summary.missedReps > 0 && <span className="chip chip-red">{summary.missedReps} with missed reps</span>}
        {summary.notes > 0 && (
          <span className="chip chip-grey">
            {summary.notes} exercise {summary.notes === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      {week.workouts.map((workout, i) => (
        <WorkoutCard key={workout.id} week={week} workout={workout} n={i + 1} />
      ))}
    </>
  )
}

export function Review({ data, clientId }: { data: Data; clientId: string }) {
  const client = data.clients.find((it) => it.id === clientId)
  if (!client) return <p>No such client. <Link to="/">Back to clients</Link></p>
  const week = currentWeek(client)
  if (!week) {
    return <p>{client.name} has no program yet. <Link to={`/clients/${client.id}/plan`}>Plan first week</Link></p>
  }
  return <WeekResults client={client} week={week} />
}
