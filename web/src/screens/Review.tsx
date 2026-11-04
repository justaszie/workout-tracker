import {
  aboveTargetRpe, currentWeek, firstName, formatDate, formatKg, loadDifference, loggedCount,
  missedReps, nextWeekTitle, plannedText, repsText, safeUrl, weekSummary, weekTitle, workoutState,
  type Client, type Data, type Exercise, type Week, type Workout, type WorkoutState,
} from '../../shared/model.ts'
import {
  Avatar, Breadcrumbs, Button, Card, Chip, Chips, Link, LinkChip, NoteCard, NumberBadge, PageHeader,
  Table, TableCell, TableRow, type ChipProps, type Column,
} from '../components/index.ts'

const stateChip: Record<WorkoutState, { label: string; tone: ChipProps['tone'] }> = {
  done: { label: 'Done', tone: 'green' },
  partly: { label: 'Partly done', tone: 'grey' },
  skipped: { label: 'Skipped', tone: 'red' },
  started: { label: 'In progress', tone: 'grey' },
  todo: { label: 'To do', tone: 'grey' },
}

const COLUMNS: Column[] = [
  { header: 'Exercise', width: 'minmax(190px, 1.3fr)' },
  { header: 'Planned', width: '170px' },
  { header: 'Last set', width: '130px' },
  { header: 'RPE', width: '120px' },
  { header: 'Reps', width: '120px' },
  { header: 'Client note', width: 'minmax(200px, 1.4fr)' },
]

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
    <TableRow align="start">
      <TableCell tone="medium">{exercise.name}</TableCell>
      <TableCell tone="muted">{plannedText(exercise)}</TableCell>
      {log ? (
        <>
          <TableCell tone={(loadDifference(exercise) ?? 0) > 0 ? 'bold' : undefined}>{weightText(exercise)}</TableCell>
          <TableCell tone={aboveTargetRpe(exercise) ? 'flagged' : undefined}>
            {load.type === 'rpe' ? `${log.rpe} (target ${load.rpe})` : log.rpe}
          </TableCell>
          <TableCell tone={missedReps(exercise) ? 'flagged' : undefined}>
            {missedReps(exercise) ? repsText(log) : 'All done'}
          </TableCell>
          <TableCell tone="muted">{log.note}</TableCell>
        </>
      ) : (
        <>
          <TableCell tone="muted">Not logged</TableCell>
          <TableCell tone="muted">—</TableCell>
          <TableCell tone="muted">—</TableCell>
          <TableCell />
        </>
      )}
    </TableRow>
  )
}

function WorkoutCard({ week, workout, n }: { week: Week; workout: Workout; n: number }) {
  const chip = stateChip[workoutState(week, workout)]
  const album = safeUrl(workout.albumLink)
  const logged = loggedCount(workout) > 0
  return (
    <Card label={workout.name} clip>
      <div className="workout-head">
        <NumberBadge>{n}</NumberBadge>
        <div className="grow">
          <h2>{workout.name}</h2>
          <p className="muted small">{workoutSubtitle(week, workout)}</p>
        </div>
        {album && <LinkChip href={album}>Videos &amp; photos</LinkChip>}
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      {logged && (
        <Table label={`${workout.name} results`} columns={COLUMNS} minWidth={880} tinted>
          {workout.exercises.map((exercise) => <ResultRow key={exercise.id} exercise={exercise} />)}
        </Table>
      )}
    </Card>
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
      <Breadcrumbs items={[{ label: 'Clients', to: '/' }, { label: client.name }, { label: title }]} />

      <PageHeader
        title={title}
        leading={<Avatar initials={client.initials} name={client.name} large />}
        actions={week.finishedOn && (
          <Button to={`/clients/${client.id}/plan`} icon="arrow" iconPosition="right">
            Plan {nextWeekTitle(week)}
          </Button>
        )}
      >
        {week.theme && <p className="lead">{week.theme}</p>}
        <Chips>
          {week.finishedOn && <Chip tone="green" icon="check">Finished {formatDate(week.finishedOn)}</Chip>}
          <Chip>Started {formatDate(week.startedOn)}</Chip>
        </Chips>
      </PageHeader>

      {week.note && (
        <NoteCard label="Client's note for the week" eyebrow={`${firstName(client.name)}'s note when finishing the week`}>
          “{week.note}”
        </NoteCard>
      )}

      <div className="summary">
        <p>
          <strong>{summary.done} of {summary.total} workouts done</strong>
          <span className="muted"> · {rest}</span>
        </p>
        {summary.aboveRpe > 0 && <Chip tone="red">{summary.aboveRpe} above target RPE</Chip>}
        {summary.missedReps > 0 && <Chip tone="red">{summary.missedReps} with missed reps</Chip>}
        {summary.notes > 0 && <Chip>{summary.notes} exercise {summary.notes === 1 ? 'note' : 'notes'}</Chip>}
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
