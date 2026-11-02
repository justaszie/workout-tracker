import { useState, type DragEvent } from 'react'
import {
  aboveTargetRpe, currentWeek, firstName, formatKg, gapsText, loadDifference, missedReps,
  repsText, weekSummary, weekTitle,
  type Client, type Data, type Exercise, type PlanExercise, type PlanForm, type PlanWorkout, type Week,
} from '../../shared/model.ts'
import { blankExercise, blankPlan, blankWorkout, copyWeek, duplicateWorkout } from '../../shared/plan.ts'
import { ApiError, publishWeek, saveDraft } from '../api.ts'
import { GripIcon, Icon, type IconName } from '../icons.tsx'
import { Link, navigate } from '../router.tsx'

const TARGET_TYPES = [
  { key: 'kg', label: 'Load' },
  { key: 'rpe', label: 'RPE' },
  { key: 'none', label: 'None' },
] as const

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
        <input
          aria-label={`Exercise ${n} name`} placeholder="Exercise name" className="input input-strong"
          value={exercise.name} onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          aria-label={`Exercise ${n} sets`} type="number" inputMode="numeric" min="1" className="input center"
          value={exercise.sets} onChange={(e) => onChange({ sets: e.target.value })}
        />
        <input
          aria-label={`Exercise ${n} reps`} className="input center"
          value={exercise.reps} onChange={(e) => onChange({ reps: e.target.value })}
        />
        <div role="group" aria-label={`Exercise ${n} target type`} className="segments">
          {TARGET_TYPES.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={exercise.type === key} onClick={() => onChange({ type: key })}>
              {label}
            </button>
          ))}
        </div>
        <div className="target">
          {exercise.type === 'kg' && (
            <>
              <input
                aria-label={`Exercise ${n} load in kg`} type="number" inputMode="decimal" step="0.5" min="0"
                className="input input-kg" value={exercise.kg} onChange={(e) => onChange({ kg: e.target.value })}
              />
              <span className="unit-right" aria-hidden="true">kg</span>
            </>
          )}
          {exercise.type === 'rpe' && (
            <>
              <span className="unit-left" aria-hidden="true">RPE</span>
              <input
                aria-label={`Exercise ${n} target RPE, 1 to 10`} type="number" inputMode="numeric" min="1" max="10"
                className="input input-rpe" value={exercise.rpe} onChange={(e) => onChange({ rpe: e.target.value })}
              />
            </>
          )}
          {exercise.type === 'none' && <span className="no-target">No target</span>}
        </div>
        <button type="button" className="icon-btn" aria-label={`Remove exercise ${n}`} onClick={onRemove}>
          <Icon name="trash" />
        </button>
      </div>
      <div className="exercise-extra">
        <span />
        <input
          aria-label={`Exercise ${n} note for client`} placeholder="Note for client (optional)"
          className="input input-quiet" value={exercise.note} onChange={(e) => onChange({ note: e.target.value })}
        />
        <div className="link-field">
          <Icon name="link" size={18} />
          <input
            aria-label={`Exercise ${n} video or guide link`} type="url"
            placeholder="Video or guide link (optional)" className="input input-quiet input-link"
            value={exercise.link} onChange={(e) => onChange({ link: e.target.value })}
          />
        </div>
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
    <section aria-label={`Workout ${n}`} className="card editor">
      <div className="editor-head">
        <span className="number number-active" aria-hidden="true">{n}</span>
        <input
          aria-label={`Workout ${n} name`} className="workout-name"
          value={workout.name} onChange={(e) => onChange({ ...workout, name: e.target.value })}
        />
        <span className="muted small">{count} {count === 1 ? 'exercise' : 'exercises'}</span>
        <div className="icon-row">
          <button type="button" className="icon-btn" aria-label="Duplicate workout" onClick={onDuplicate}>
            <Icon name="copy" size={22} />
          </button>
          <button type="button" className="icon-btn" aria-label="Delete workout" onClick={onDelete}>
            <Icon name="trash" size={22} />
          </button>
          <button type="button" className="icon-btn" aria-label="Collapse workout" aria-expanded="true" onClick={onCollapse}>
            <Icon name="collapse" size={22} />
          </button>
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

      <button type="button" className="btn btn-text btn-compact btn-icon-left" onClick={() => setExercises([...exercises, blankExercise()])}>
        <Icon name="plus" />Add exercise
      </button>
    </section>
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
      <section aria-label="Previous week at a glance" className="card glance">
        <div>
          <h2>Previous week at a glance</h2>
          <p className="muted small">{weekTitle(week)} · {summary.done} of {summary.total} done{gaps && `, ${gaps}`}</p>
        </div>
        <ul>
          {flagged.map((exercise) => (
            <li key={exercise.id}>
              <span className={`flag ${aboveTargetRpe(exercise) || missedReps(exercise) ? 'flag-red' : ''}`} aria-hidden="true">
                <Icon name={flagIcon(exercise)} size={16} weight={2.5} />
              </span>
              <p><strong>{exercise.name}</strong><br /><span className="muted">{flagText(exercise)}</span></p>
            </li>
          ))}
          {skipped.length > 0 && (
            <li>
              <span className="flag" aria-hidden="true"><Icon name="minus" size={16} weight={2.5} /></span>
              <p>
                <strong>Skipped {skipped.map((workout) => workout.name).join(' and ')}</strong>
                {week.note && <><br /><span className="muted">“{week.note}”</span></>}
              </p>
            </li>
          )}
        </ul>
        {flagged.length === 0 && skipped.length === 0 && <p className="muted small">Nothing to flag.</p>}
        <Link to={`/clients/${client.id}`} className="text-link">Open full review<Icon name="arrow" size={18} /></Link>
      </section>
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
    <section aria-label="Other workouts" className="card clip">
      {workouts.map((workout, i) => (
        <div key={workout.id} className="other-workout">
          <span className="number" aria-hidden="true">{offset + i + 1}</span>
          <div className="grow">
            <p className="other-title">{workout.name || 'Unnamed workout'}</p>
            <p className="muted small">{subtitle(workout)}</p>
          </div>
          <button
            type="button" className="btn btn-sm btn-outline"
            aria-label={`Edit workout ${offset + i + 1}, ${workout.name}`}
            onClick={() => setOpenId(workout.id)}
          >
            Edit
          </button>
        </div>
      ))}
    </section>
  )

  return (
    <>
      <nav aria-label="Breadcrumb" className="crumbs">
        <Link to="/">Clients</Link><span aria-hidden="true">›</span>
        {previous ? <Link to={`/clients/${client.id}`}>{client.name}</Link> : <span>{client.name}</span>}
        <span aria-hidden="true">›</span>
        <span aria-current="page">{previous ? 'Plan next week' : 'Plan first week'}</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>{previous ? 'Plan next week' : 'Plan first week'}</h1>
          <p className="subtitle">For {client.name}{previous && ` · follows ${weekTitle(previous)}`}</p>
        </div>
        <div className="header-actions">
          {saved && <span role="status" className="muted small">Draft saved</span>}
          <button type="button" className="btn btn-outline" onClick={save}>Save draft</button>
          <button type="button" className="btn btn-primary btn-icon-left" onClick={publish}>
            <Icon name="send" />Publish to {name}
          </button>
        </div>
      </header>

      {errors.length > 0 && (
        <section role="alert" className="errors">
          <p className="medium">Fix these before publishing:</p>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}

      <div className="plan-layout">
        <div className="plan-main">
          <section aria-label="Week details" className="card week-details">
            <div className="week-fields">
              <label className="field field-title">
                <span>Week title</span>
                <input value={form.title} onChange={(e) => change({ ...form, title: e.target.value })} />
              </label>
              <label className="field field-purpose">
                <span>Purpose (shown to client)</span>
                <input
                  placeholder="What is this week for?" value={form.purpose}
                  onChange={(e) => change({ ...form, purpose: e.target.value })}
                />
              </label>
            </div>
            {previous && (
              <div className="copied">
                <Icon name="copy" />
                <p>Copied from <strong>{weekTitle(previous)}</strong>. Change what's different.</p>
                <button type="button" className="btn btn-text btn-compact" onClick={startFromScratch}>Start from scratch</button>
              </div>
            )}
          </section>

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

          <button
            type="button" className="btn btn-outline btn-icon-left self-start"
            onClick={() => addWorkout(blankWorkout(`Workout ${form.workouts.length + 1}`))}
          >
            <Icon name="plus" />Add workout
          </button>
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
