import { useMemo, useState, type DragEvent } from 'react'
import {
  aboveTargetRpe, currentWeek, firstName, formatDate, formatKg, gapsText, loadDifference, missedReps,
  repsText, weekSummary, weekTitle,
  type Client, type Data, type Exercise, type PlanExercise, type PlanForm, type PlanWorkout, type Week,
} from '../../shared/model.ts'
import {
  blankExercise, blankPlan, blankWorkout, copyWeek, duplicateWorkout, isFinished, planChanges, toPlanForm,
  type PlanChange,
} from '../../shared/plan.ts'
import { ApiError, editWeek, publishWeek, saveDraft } from '../api.ts'
import {
  Breadcrumbs, Button, Callout, Card, Chip, Dialog, ErrorList, FlagItem, FlagList, GripIcon, IconButton, Input,
  Link, ListRow, NumberBadge, PageHeader, SegmentedControl, TextField, TextLink, type IconName, type Option,
} from '../components/index.ts'
import { navigate } from '../router.tsx'

const TARGET_TYPES: Option[] = [
  { value: 'kg', label: 'Load' },
  { value: 'rpe', label: 'RPE' },
  { value: 'none', label: 'None' },
]

const replaceAt = <T,>(list: T[], index: number, item: T) => list.map((it, i) => (i === index ? item : it))
const removeAt = <T,>(list: T[], index: number) => list.filter((_, i) => i !== index)

function move<T>(list: T[], from: number, to: number) {
  const result = removeAt(list, from)
  result.splice(to, 0, list[from])
  return result
}

interface ExerciseRowProps {
  exercise: PlanExercise
  n: number
  /** Logged by the client, so only its note and link can change. */
  locked: boolean
  onChange: (patch: Partial<PlanExercise>) => void
  onRemove: () => void
  onDragStart: (event: DragEvent) => void
  onDrop: () => void
}

function ExerciseRow({ exercise, n, locked, onChange, onRemove, onDragStart, onDrop }: ExerciseRowProps) {
  return (
    <div
      className="exercise"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDrop() }}
    >
      <div className="exercise-grid">
        <span className="grip" aria-hidden="true" draggable onDragStart={onDragStart}><GripIcon /></span>
        <Input
          aria-label={`Exercise ${n} name`} disabled={locked} placeholder="Exercise name" variant="strong"
          value={exercise.name} onChange={(e) => onChange({ name: e.target.value })}
        />
        <Input
          aria-label={`Exercise ${n} sets`} type="number" inputMode="numeric" min="1" center disabled={locked}
          value={exercise.sets} onChange={(e) => onChange({ sets: e.target.value })}
        />
        <Input
          aria-label={`Exercise ${n} reps`} center disabled={locked}
          value={exercise.reps} onChange={(e) => onChange({ reps: e.target.value })}
        />
        <SegmentedControl
          label={`Exercise ${n} target type`} options={TARGET_TYPES} value={exercise.type}
          onChange={(type) => onChange({ type: type as PlanExercise['type'] })} disabled={locked}
        />
        {exercise.type === 'kg' && (
          <Input
            aria-label={`Exercise ${n} load in kg`} type="number" inputMode="decimal" step="0.5" min="0"
            unit="kg" disabled={locked} value={exercise.kg} onChange={(e) => onChange({ kg: e.target.value })}
          />
        )}
        {exercise.type === 'rpe' && (
          <Input
            aria-label={`Exercise ${n} target RPE, 1 to 10`} type="number" inputMode="numeric" min="1" max="10"
            unit="RPE" unitPosition="left" disabled={locked} value={exercise.rpe} onChange={(e) => onChange({ rpe: e.target.value })}
          />
        )}
        {exercise.type === 'none' && <span className="no-target">No target</span>}
        {locked ? <span /> : <IconButton icon="trash" label={`Remove exercise ${n}`} onClick={onRemove} />}
      </div>
      <div className="exercise-extra">
        <span />
        <Input
          aria-label={`Exercise ${n} note for client`} placeholder="Note for client (optional)"
          variant="quiet" value={exercise.note} onChange={(e) => onChange({ note: e.target.value })}
        />
        <Input
          aria-label={`Exercise ${n} video or guide link`} type="url" icon="link"
          placeholder="Video or guide link (optional)" variant="quiet"
          value={exercise.link} onChange={(e) => onChange({ link: e.target.value })}
        />
        <span />
      </div>
    </div>
  )
}

interface WorkoutEditorProps {
  workout: PlanWorkout
  n: number
  logged: Set<string>
  onChange: (workout: PlanWorkout) => void
  onDuplicate: () => void
  onDelete: () => void
  onCollapse: () => void
}

function WorkoutEditor({ workout, n, logged, onChange, onDuplicate, onDelete, onCollapse }: WorkoutEditorProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const { exercises } = workout
  const count = exercises.length

  const setExercises = (next: PlanExercise[]) => onChange({ ...workout, exercises: next })
  const startDrag = (index: number) => (event: DragEvent) => {
    const row = (event.target as HTMLElement).closest('.exercise')!
    event.dataTransfer.setDragImage(row, 12, 24)
    event.dataTransfer.effectAllowed = 'move'
    setDragging(index)
  }

  return (
    <Card label={`Workout ${n}`} padded>
      <div className="editor-head">
        <NumberBadge active>{n}</NumberBadge>
        <input
          aria-label={`Workout ${n} name`} className="workout-name"
          value={workout.name} onChange={(e) => onChange({ ...workout, name: e.target.value })}
        />
        <span className="muted small">{count} {count === 1 ? 'exercise' : 'exercises'}</span>
        <div className="icon-row">
          <IconButton icon="copy" iconSize={22} label="Duplicate workout" onClick={onDuplicate} />
          <IconButton
            icon="trash" iconSize={22} label="Delete workout" onClick={onDelete}
            disabled={exercises.some((it) => logged.has(it.id))}
          />
          <IconButton icon="collapse" iconSize={22} label="Collapse workout" aria-expanded="true" onClick={onCollapse} />
        </div>
      </div>

      <div className="table-scroll exercises-scroll">
        <div className="exercises">
          <div className="exercise-grid exercise-labels" aria-hidden="true">
            <span /><span>Exercise</span><span>Sets</span><span>Reps</span><span>Target</span><span /><span />
          </div>
          {exercises.map((exercise, i) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              n={i + 1}
              locked={logged.has(exercise.id)}
              onChange={(patch) => setExercises(replaceAt(exercises, i, { ...exercise, ...patch }))}
              onRemove={() => setExercises(removeAt(exercises, i))}
              onDragStart={startDrag(i)}
              onDrop={() => {
                if (dragging !== null) setExercises(move(exercises, dragging, i))
                setDragging(null)
              }}
            />
          ))}
        </div>
      </div>

      <Button variant="text" size="compact" icon="plus" onClick={() => setExercises([...exercises, blankExercise()])}>
        Add exercise
      </Button>
    </Card>
  )
}

const flagIcon = (exercise: Exercise): IconName =>
  aboveTargetRpe(exercise) ? 'up' : missedReps(exercise) ? 'alert' : 'plus'

function flagText(exercise: Exercise): string {
  const { load, log } = exercise
  if (!log) return ''
  const note = log.note ? ` “${log.note}”` : ''
  if (aboveTargetRpe(exercise) && load.type === 'rpe') return `RPE ${log.rpe}, target was ${load.rpe}.${note}`
  const weight = log.weightKg === null ? '' : ` at ${formatKg(log.weightKg)} kg`
  if (missedReps(exercise)) return `${repsText(log)} reps${weight}.${note}`
  return `${formatKg(log.weightKg ?? 0)} kg at RPE ${log.rpe}, planned ${load.type === 'fixed' ? formatKg(load.kg) : 0} kg`
}

function PreviousWeek({ client, week }: { client: Client; week: Week }) {
  const summary = weekSummary(week)
  const gaps = gapsText(summary).replace(' partly done', ' partly').replace(' · ', ', ')
  const flagged = week.workouts
    .flatMap((workout) => workout.exercises)
    .filter((it) => aboveTargetRpe(it) || missedReps(it) || (loadDifference(it) ?? 0) > 0)
  const skipped = week.workouts.filter((workout) => !workout.finishedOn && !workout.exercises.some((it) => it.log))

  return (
    <aside className="aside">
      <Card label="Previous week at a glance" padded className="glance">
        <div>
          <h2>Previous week at a glance</h2>
          <p className="muted small">{weekTitle(week)} · {summary.done} of {summary.total} done{gaps && `, ${gaps}`}</p>
        </div>
        <FlagList>
          {flagged.map((exercise) => (
            <FlagItem
              key={exercise.id} icon={flagIcon(exercise)} title={exercise.name}
              tone={aboveTargetRpe(exercise) || missedReps(exercise) ? 'red' : 'neutral'}
            >
              {flagText(exercise)}
            </FlagItem>
          ))}
          {skipped.length > 0 && (
            <FlagItem icon="minus" title={`Skipped ${skipped.map((workout) => workout.name).join(' and ')}`}>
              {week.note && `“${week.note}”`}
            </FlagItem>
          )}
        </FlagList>
        {flagged.length === 0 && skipped.length === 0 && <p className="muted small">Nothing to flag.</p>}
        <TextLink to={`/clients/${client.id}`}>Open full review</TextLink>
      </Card>
    </aside>
  )
}

const changeIcon: Record<PlanChange['kind'], IconName> = { added: 'plus', removed: 'minus', changed: 'arrow' }

interface PlannerProps {
  client: Client
  onData: (data: Data) => void
  /** The published week to change, instead of planning the next one. */
  editing?: Week
}

function Planner({ client, onData, editing }: PlannerProps) {
  const previous = editing ? client.weeks.at(-2) : currentWeek(client)
  const published = useMemo(() => editing && toPlanForm(editing), [editing?.id])
  const [form, setForm] = useState<PlanForm>(
    () => published ?? client.draft ?? (previous ? copyWeek(previous) : blankPlan()),
  )
  const [confirming, setConfirming] = useState(false)
  const changes = published ? planChanges(published, form) : []
  // What the client has already done keeps the plan it was done against.
  const finished = new Set(editing?.workouts.filter(isFinished).map((it) => it.id))
  const logged = new Set(editing?.workouts.flatMap((it) => it.exercises).filter((it) => it.log).map((it) => it.id))
  const started = finished.size > 0 || logged.size > 0
  const [openId, setOpenId] = useState<string | null>(
    form.workouts.find((it) => !editing?.workouts.some((done) => done.id === it.id && isFinished(done)))?.id ?? null,
  )
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const name = firstName(client.name)

  const change = (next: PlanForm) => {
    setForm(next)
    setSaved(false)
  }
  const setWorkouts = (workouts: PlanWorkout[]) => change({ ...form, workouts })

  const send = async (action: () => Promise<Data>, after: () => void) => {
    try {
      onData(await action())
      setErrors([])
      after()
    } catch (e) {
      setErrors(e instanceof ApiError ? e.errors : ["Couldn't reach the server."])
    }
  }
  const save = () => send(() => saveDraft(client.id, form), () => setSaved(true))
  const publish = () => send(() => publishWeek(client.id, form), () => navigate('/'))
  const publishChanges = () => {
    setConfirming(false)
    send(() => editWeek(client.id, editing!.id, form), () => navigate(`/clients/${client.id}`))
  }
  const discard = () => {
    if (changes.length && !confirm('Discard your changes to this week?')) return
    navigate(`/clients/${client.id}`)
  }

  const startFromScratch = () => {
    if (!confirm('Clear this plan and start from an empty week?')) return
    const blank = blankPlan(form.title)
    change({ ...blank, purpose: form.purpose })
    setOpenId(blank.workouts[0].id)
  }

  const addWorkout = (workout: PlanWorkout) => {
    setWorkouts([...form.workouts, workout])
    setOpenId(workout.id)
  }

  const heading = editing ? `Edit ${weekTitle(editing)}` : previous ? 'Plan next week' : 'Plan first week'
  const copiedFrom = previous && `copied from Week ${previous.number}`
  const subtitle = (workout: PlanWorkout) => {
    const count = workout.exercises.length
    const copied = !editing && previous?.workouts.some((it) => it.id === workout.id)
    return `${count} ${count === 1 ? 'exercise' : 'exercises'}${copied ? ` · ${copiedFrom}` : ''}`
  }

  const openIndex = form.workouts.findIndex((workout) => workout.id === openId)
  const before = openIndex < 0 ? form.workouts : form.workouts.slice(0, openIndex)
  const after = openIndex < 0 ? [] : form.workouts.slice(openIndex + 1)
  const collapsed = (workouts: PlanWorkout[], offset: number) => workouts.length > 0 && (
    <Card label="Other workouts" clip>
      {workouts.map((workout, i) => (
        <ListRow
          key={workout.id}
          leading={<NumberBadge>{offset + i + 1}</NumberBadge>}
          title={workout.name || 'Unnamed workout'}
          subtitle={subtitle(workout)}
          action={finished.has(workout.id) ? <Chip tone="green" icon="check">Finished</Chip> : (
            <Button
              variant="outline" size="sm" aria-label={`Edit workout ${offset + i + 1}, ${workout.name}`}
              onClick={() => setOpenId(workout.id)}
            >
              Edit
            </Button>
          )}
        />
      ))}
    </Card>
  )

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Clients', to: '/' },
          { label: client.name, to: (editing || previous) && `/clients/${client.id}` },
          { label: heading },
        ]}
      />

      <PageHeader
        title={heading}
        subtitle={editing
          ? `Live for ${client.name} since ${formatDate(editing.startedOn)}`
          : `For ${client.name}${previous ? ` · follows ${weekTitle(previous)}` : ''}`}
        actions={editing ? (
          <>
            {changes.length > 0 && (
              <span role="status" className="muted small">
                {changes.length} {changes.length === 1 ? 'change' : 'changes'}, not published
              </span>
            )}
            <Button variant="text" onClick={discard}>Discard changes</Button>
            <Button icon="send" disabled={!changes.length} onClick={() => setConfirming(true)}>Publish changes</Button>
          </>
        ) : (
          <>
            {saved && <span role="status" className="muted small">Draft saved</span>}
            <Button variant="outline" onClick={save}>Save draft</Button>
            <Button icon="send" onClick={publish}>Publish to {name}</Button>
          </>
        )}
      />

      {errors.length > 0 && <ErrorList title="Fix these before publishing:" errors={errors} />}

      <div className="plan-layout">
        <div className="plan-main">
          <Card label="Week details" padded className="week-details">
            <div className="week-fields">
              <TextField
                label="Week title" className="field-title"
                value={form.title} onChange={(e) => change({ ...form, title: e.target.value })}
              />
              <TextField
                label="Purpose (shown to client)" className="field-purpose"
                placeholder="What is this week for?" value={form.purpose}
                onChange={(e) => change({ ...form, purpose: e.target.value })}
              />
            </div>
            {editing && started && (
              <Callout icon="alert">
                {name} has started this week. <strong>Finished workouts and logged exercises stay as planned</strong>;
                you can still change their notes.
              </Callout>
            )}
            {!editing && previous && (
              <Callout
                icon="copy"
                action={<Button variant="text" size="compact" onClick={startFromScratch}>Start from scratch</Button>}
              >
                Copied from <strong>{weekTitle(previous)}</strong>. Change what's different.
              </Callout>
            )}
          </Card>

          {collapsed(before, 0)}
          {openIndex >= 0 && (
            <WorkoutEditor
              key={openId}
              workout={form.workouts[openIndex]}
              n={openIndex + 1}
              logged={logged}
              onChange={(workout) => setWorkouts(replaceAt(form.workouts, openIndex, workout))}
              onDuplicate={() => addWorkout(duplicateWorkout(form.workouts[openIndex]))}
              onDelete={() => {
                if (!confirm(`Delete ${form.workouts[openIndex].name || 'this workout'}?`)) return
                setWorkouts(removeAt(form.workouts, openIndex))
                setOpenId(null)
              }}
              onCollapse={() => setOpenId(null)}
            />
          )}
          {collapsed(after, openIndex + 1)}

          <Button
            variant="outline" icon="plus" className="self-start"
            onClick={() => addWorkout(blankWorkout(`Workout ${form.workouts.length + 1}`))}
          >
            Add workout
          </Button>
        </div>
        {previous?.finishedOn && <PreviousWeek client={client} week={previous} />}
      </div>

      {editing && (
        <Dialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Publish ${changes.length === 1 ? 'this change' : `${changes.length} changes`} to ${name}?`}
          actions={
            <>
              <Button variant="text" onClick={() => setConfirming(false)}>Keep editing</Button>
              <Button icon="send" onClick={publishChanges}>Publish changes</Button>
            </>
          }
        >
          <div className="stack" style={{ gap: 16 }}>
            <FlagList>
              {changes.map((change, i) => (
                <FlagItem key={i} icon={changeIcon[change.kind]} title={change.title}>{change.detail}</FlagItem>
              ))}
            </FlagList>
            <p className="muted small">The week updates on {name}'s phone the next time the app opens.</p>
          </div>
        </Dialog>
      )}
    </>
  )
}

interface PlanWeekProps {
  data: Data
  clientId: string
  onData: (data: Data) => void
  /** Change the week the client is on instead of planning the next one. */
  edit?: boolean
}

export function PlanWeek({ data, clientId, onData, edit }: PlanWeekProps) {
  const client = data.clients.find((it) => it.id === clientId)
  if (!client) return <p>No such client. <Link to="/">Back to clients</Link></p>
  if (!edit) return <Planner client={client} onData={onData} />
  const week = currentWeek(client)
  if (!week || week.finishedOn) {
    return <p>There is no week in progress to edit. <Link to={`/clients/${client.id}`}>Back to {client.name}</Link></p>
  }
  return <Planner client={client} onData={onData} editing={week} />
}
