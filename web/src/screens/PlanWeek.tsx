import { useState, type DragEvent } from 'react'
import {
  aboveTargetRpe, currentWeek, firstName, formatKg, gapsText, loadDifference, missedReps,
  repsText, weekSummary, weekTitle,
  type Client, type Data, type Exercise, type PlanExercise, type PlanForm, type PlanWorkout, type Week,
} from '../../shared/model.ts'
import { blankExercise, blankPlan, blankWorkout, copyWeek, duplicateWorkout } from '../../shared/plan.ts'
import { ApiError, publishWeek, saveDraft } from '../api.ts'
import {
  Breadcrumbs, Button, Callout, Card, ErrorList, FlagItem, FlagList, GripIcon, IconButton, Input, Link,
  ListRow, NumberBadge, PageHeader, SegmentedControl, TextField, TextLink, type IconName, type Option,
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
  onChange: (patch: Partial<PlanExercise>) => void
  onRemove: () => void
  onDragStart: (event: DragEvent) => void
  onDrop: () => void
}

function ExerciseRow({ exercise, n, onChange, onRemove, onDragStart, onDrop }: ExerciseRowProps) {
  return (
    <div
      className="exercise"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDrop() }}
    >
      <div className="exercise-grid">
        <span className="grip" aria-hidden="true" draggable onDragStart={onDragStart}><GripIcon /></span>
        <Input
          aria-label={`Exercise ${n} name`} placeholder="Exercise name" variant="strong"
          value={exercise.name} onChange={(e) => onChange({ name: e.target.value })}
        />
        <Input
          aria-label={`Exercise ${n} sets`} type="number" inputMode="numeric" min="1" center
          value={exercise.sets} onChange={(e) => onChange({ sets: e.target.value })}
        />
        <Input
          aria-label={`Exercise ${n} reps`} center
          value={exercise.reps} onChange={(e) => onChange({ reps: e.target.value })}
        />
        <SegmentedControl
          label={`Exercise ${n} target type`} options={TARGET_TYPES} value={exercise.type}
          onChange={(type) => onChange({ type: type as PlanExercise['type'] })}
        />
        {exercise.type === 'kg' && (
          <Input
            aria-label={`Exercise ${n} load in kg`} type="number" inputMode="decimal" step="0.5" min="0"
            unit="kg" value={exercise.kg} onChange={(e) => onChange({ kg: e.target.value })}
          />
        )}
        {exercise.type === 'rpe' && (
          <Input
            aria-label={`Exercise ${n} target RPE, 1 to 10`} type="number" inputMode="numeric" min="1" max="10"
            unit="RPE" unitPosition="left" value={exercise.rpe} onChange={(e) => onChange({ rpe: e.target.value })}
          />
        )}
        {exercise.type === 'none' && <span className="no-target">No target</span>}
        <IconButton icon="trash" label={`Remove exercise ${n}`} onClick={onRemove} />
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
  onChange: (workout: PlanWorkout) => void
  onDuplicate: () => void
  onDelete: () => void
  onCollapse: () => void
}

function WorkoutEditor({ workout, n, onChange, onDuplicate, onDelete, onCollapse }: WorkoutEditorProps) {
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
          <IconButton icon="trash" iconSize={22} label="Delete workout" onClick={onDelete} />
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

function Planner({ client, onData }: { client: Client; onData: (data: Data) => void }) {
  const previous = currentWeek(client)
  const [form, setForm] = useState<PlanForm>(
    () => client.draft ?? (previous ? copyWeek(previous) : blankPlan()),
  )
  const [openId, setOpenId] = useState<string | null>(form.workouts[0]?.id ?? null)
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

  const heading = previous ? 'Plan next week' : 'Plan first week'
  const copiedFrom = previous && `copied from Week ${previous.number}`
  const subtitle = (workout: PlanWorkout) => {
    const count = workout.exercises.length
    const copied = previous?.workouts.some((it) => it.id === workout.id)
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
          action={
            <Button
              variant="outline" size="sm" aria-label={`Edit workout ${offset + i + 1}, ${workout.name}`}
              onClick={() => setOpenId(workout.id)}
            >
              Edit
            </Button>
          }
        />
      ))}
    </Card>
  )

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Clients', to: '/' },
          { label: client.name, to: previous && `/clients/${client.id}` },
          { label: heading },
        ]}
      />

      <PageHeader
        title={heading}
        subtitle={`For ${client.name}${previous ? ` · follows ${weekTitle(previous)}` : ''}`}
        actions={
          <>
            {saved && <span role="status" className="muted small">Draft saved</span>}
            <Button variant="outline" onClick={save}>Save draft</Button>
            <Button icon="send" onClick={publish}>Publish to {name}</Button>
          </>
        }
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
            {previous && (
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
    </>
  )
}

export function PlanWeek({ data, clientId, onData }: { data: Data; clientId: string; onData: (data: Data) => void }) {
  const client = data.clients.find((it) => it.id === clientId)
  if (!client) return <p>No such client. <Link to="/">Back to clients</Link></p>
  return <Planner client={client} onData={onData} />
}
