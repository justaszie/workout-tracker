import {
  aboveTargetRpe, compareWithWeek, currentWeek, firstName, formatDate, formatKg, loadDifference, loggedCount,
  missedReps, nextWeekTitle, plannedText, relativeWeekTitle, repsText, safeUrl, setRpesText, setWeightsText, shortWeekTitle, weekSummary,
  weekTitle, workoutState,
  type Client, type Data, type Exercise, type Week, type Workout, type WorkoutState,
} from '../../shared/model.ts'
import {
  Avatar, Breadcrumbs, Button, Card, Chip, Chips, Icon, Link, LinkChip, NoteCard, NumberBadge, PageHeader,
  Table, TableCell, TableRow, type ChipProps, type Column,
} from '../components/index.ts'
import { weekPath } from './History.tsx'

const stateChip: Record<WorkoutState, { label: string; tone: ChipProps['tone'] }> = {
  done: { label: 'Done', tone: 'green' },
  partly: { label: 'Partly done', tone: 'grey' },
  skipped: { label: 'Skipped', tone: 'red' },
  started: { label: 'In progress', tone: 'grey' },
  todo: { label: 'To do', tone: 'grey' },
}

const columns = (previous: Week | undefined, week: Week): Column[] => [
  { header: 'Exercise', width: 'minmax(180px, 1.2fr)' },
  { header: 'Planned', width: '160px' },
  { header: 'Last set', width: '120px' },
  { header: 'RPE', width: '110px' },
  { header: 'Reps', width: '110px' },
  ...previous ? [{ header: `Vs ${relativeWeekTitle(previous, week).toLowerCase()}`, width: '120px' }] : [],
  { header: 'Client note', width: 'minmax(180px, 1.3fr)' },
]

/** Dot shades in the week strip, one per workout. */
const dotClass: Record<WorkoutState, string> = {
  done: 'dot-done',
  partly: 'dot-partly',
  skipped: 'dot-skipped',
  started: 'dot-started',
  todo: 'dot-todo',
}

const stateWords: Record<WorkoutState, string> = {
  done: 'done', partly: 'partly done', skipped: 'skipped', started: 'in progress', todo: 'to do',
}

function WeekStrip({ client, week }: { client: Client; week: Week }) {
  return (
    <nav aria-label="All weeks" className="card week-strip">
      <Link to={`/clients/${client.id}/history`} className="week-strip-all">
        <Icon name="clipboard" />All weeks
      </Link>
      {client.weeks.map((it) => {
        const states = it.workouts.map((workout) => workoutState(it, workout))
        const described = states.map((state, i) => `${it.workouts[i].name} ${stateWords[state]}`).join(', ')
        return (
          <Link
            key={it.id} to={weekPath(client, it)} className="week-pill"
            aria-current={it === week ? 'page' : undefined}
            aria-label={`${weekTitle(it)}: ${described}`}
          >
            <span className="week-pill-label">{shortWeekTitle(it)}</span>
            <span className="week-pill-dots" aria-hidden="true">
              {states.map((state, i) => <span key={i} className={`dot ${dotClass[state]}`} />)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
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

function ResultRow({ exercise, previous }: { exercise: Exercise; previous: Week | undefined }) {
  const { load, log } = exercise
  const comparison = compareWithWeek(exercise, previous)
  const versus = previous && (
    <TableCell stack>
      {comparison ? (
        <>
          <span className={comparison.up ? 'bold' : 'muted'}>{comparison.change}</span>
          <span className="caption">{comparison.before}</span>
        </>
      ) : <span className="muted">—</span>}
    </TableCell>
  )
  return (
    <TableRow align="start">
      <TableCell tone="medium">{exercise.name}</TableCell>
      <TableCell tone="muted">{plannedText(exercise)}</TableCell>
      {log ? (
        <>
          <TableCell tone={(loadDifference(exercise) ?? 0) > 0 ? 'bold' : undefined} stack>
            <span>{weightText(exercise)}</span>
            {setWeightsText(log) && <span className="caption">Sets: {setWeightsText(log)}</span>}
          </TableCell>
          <TableCell tone={aboveTargetRpe(exercise) ? 'flagged' : undefined} stack>
            <span>{load.type === 'rpe' ? `${log.rpe} (target ${load.rpe})` : log.rpe}</span>
            {setRpesText(log) && <span className="caption">Sets: {setRpesText(log)}</span>}
          </TableCell>
          <TableCell tone={missedReps(exercise) ? 'flagged' : undefined}>
            {missedReps(exercise) ? repsText(log) : 'All done'}
          </TableCell>
          {versus}
          <TableCell tone="muted">{log.note}</TableCell>
        </>
      ) : (
        <>
          <TableCell tone="muted">Not logged</TableCell>
          <TableCell tone="muted">—</TableCell>
          <TableCell tone="muted">—</TableCell>
          {versus}
          <TableCell />
        </>
      )}
    </TableRow>
  )
}

const PLAN_COLUMNS: Column[] = [
  { header: 'Exercise', width: 'minmax(180px, 1.2fr)' },
  { header: 'Planned', width: '200px' },
  { header: 'Note for client', width: 'minmax(220px, 1.6fr)' },
  { header: 'Link', width: '170px' },
]

/** A workout nothing has been logged in yet shows what was planned. */
function PlanRow({ exercise }: { exercise: Exercise }) {
  const links = exercise.resources.flatMap((resource) => {
    const url = safeUrl(resource.url)
    return url ? [{ url, label: resource.kind === 'demoVideo' ? 'Demo video' : 'Setup guide' }] : []
  })
  return (
    <TableRow align="start">
      <TableCell tone="medium">{exercise.name}</TableCell>
      <TableCell>{plannedText(exercise)}</TableCell>
      <TableCell tone="muted">{exercise.coachNote || '—'}</TableCell>
      <TableCell>
        {links.length ? (
          <Chips>{links.map((link) => <LinkChip key={link.url} href={link.url} icon="link">{link.label}</LinkChip>)}</Chips>
        ) : <span className="muted">—</span>}
      </TableCell>
    </TableRow>
  )
}

function WorkoutCard({ week, previous, workout, n }: { week: Week; previous: Week | undefined; workout: Workout; n: number }) {
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
      {logged ? (
        <Table label={`${workout.name} results`} columns={columns(previous, week)} minWidth={previous ? 1040 : 880} tinted>
          {workout.exercises.map((exercise) => <ResultRow key={exercise.id} exercise={exercise} previous={previous} />)}
        </Table>
      ) : workout.exercises.length > 0 && (
        <Table label={`${workout.name} plan`} columns={PLAN_COLUMNS} minWidth={800} tinted>
          {workout.exercises.map((exercise) => <PlanRow key={exercise.id} exercise={exercise} />)}
        </Table>
      )}
    </Card>
  )
}

function WeekResults({ client, week }: { client: Client; week: Week }) {
  const summary = weekSummary(week)
  const title = weekTitle(week)
  const index = client.weeks.indexOf(week)
  const previous = client.weeks[index - 1]
  const next = client.weeks[index + 1]
  const isCurrent = week === currentWeek(client)
  const editable = isCurrent && !week.finishedOn
  const rest = [
    summary.partly && `${summary.partly} partly done`,
    summary.skipped && `${summary.skipped} skipped`,
    summary.started && `${summary.started} in progress`,
    summary.todo && `${summary.todo} to do`,
    `${summary.logged} of ${summary.exercises} exercises logged`,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <Breadcrumbs items={[
        { label: 'Clients', to: '/' },
        { label: client.name, to: isCurrent ? undefined : `/clients/${client.id}` },
        { label: 'History', to: `/clients/${client.id}/history` },
        { label: title },
      ]} />

      <WeekStrip client={client} week={week} />

      <PageHeader
        title={title}
        leading={<Avatar initials={client.initials} name={client.name} large />}
        actions={(previous || next || isCurrent) && (
          <>
            {previous && (
              <Button to={weekPath(client, previous)} variant="outline" aria-label={`Previous: ${weekTitle(previous)}`}>
                {relativeWeekTitle(previous, week)}
              </Button>
            )}
            {next && (
              <Button
                to={weekPath(client, next)} variant="outline" icon="arrow" iconPosition="right"
                aria-label={`Next: ${weekTitle(next)}`}
              >
                {relativeWeekTitle(next, week)}
              </Button>
            )}
            {editable && <Button to={`/clients/${client.id}/edit`}>Edit plan</Button>}
            {isCurrent && week.finishedOn && (
              <Button to={`/clients/${client.id}/plan`} icon="arrow" iconPosition="right">
                Plan {nextWeekTitle(week)}
              </Button>
            )}
          </>
        )}
      >
        {week.theme && <p className="lead">{week.theme}</p>}
        <Chips>
          {week.finishedOn && <Chip tone="green" icon="check">Finished {formatDate(week.finishedOn)}</Chip>}
          <Chip>Started {formatDate(week.startedOn)}</Chip>
          {client.weeks.length > 1 && <Chip>Week {index + 1} of {client.weeks.length}</Chip>}
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
      </div>

      {week.workouts.map((workout, i) => (
        <WorkoutCard key={workout.id} week={week} previous={previous} workout={workout} n={i + 1} />
      ))}
    </>
  )
}

/** One week's results: the current week, or the week with [weekId] when given. */
export function Review({ data, clientId, weekId }: { data: Data; clientId: string; weekId?: string }) {
  const client = data.clients.find((it) => it.id === clientId)
  if (!client) return <p>No such client. <Link to="/">Back to clients</Link></p>
  const week = weekId ? client.weeks.find((it) => it.id === weekId) : currentWeek(client)
  if (weekId && !week) {
    return <p>No such week. <Link to={`/clients/${client.id}/history`}>Back to {firstName(client.name)}'s history</Link></p>
  }
  if (!week) {
    return <p>{client.name} has no program yet. <Link to={`/clients/${client.id}/plan`}>Plan first week</Link></p>
  }
  return <WeekResults client={client} week={week} />
}
