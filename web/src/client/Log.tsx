import { useId, useState } from 'react'
import { formatKg, type Exercise, type ExerciseLog, type Workout } from '../../shared/model.ts'
import { logExercise, nextUnlogged } from '../../shared/progress.ts'
import { back, paths, replace } from './nav.ts'
import { change } from './store.ts'
import { CoachNote, Field, Header, Icon, ResourceChips, SectionLabel, TopBar } from './ui.tsx'

const WEIGHT_STEP_KG = 2
const DEFAULT_RPE = 7
const RPE_DESCRIPTIONS = [
  'very light, barely any effort', 'very light', 'light', 'light, easy to keep going',
  'moderate, warm-up pace', 'about 4 more reps in the tank', 'about 3 more reps in the tank',
  'about 2 more reps in the tank', 'maybe 1 more rep', 'max effort, nothing left',
]

/** The weight typed in a field, or null if it isn't one. A comma works as the decimal point. */
function parseKg(text: string): number | null {
  const kg = Number(text.trim().replace(',', '.'))
  return text.trim() && Number.isFinite(kg) && kg >= 0 ? kg : null
}

const parseCount = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : null)

const kgText = (kg: number | null | undefined) => (kg == null ? '' : formatKg(kg))

const initialWeight = (exercise: Exercise) =>
  exercise.log?.weightKg ?? (exercise.load.type === 'fixed' ? exercise.load.kg : exercise.lastWeek?.weightKg) ?? null

interface SetFields {
  reps: string
  weight: string
  rpe: string
}

/** The form starts from the exercise's saved log, so callers must key this by exercise. */
export function LogScreen({ workout, exercise }: { workout: Workout; exercise: Exercise }) {
  const { log, load } = exercise
  // Without a prescribed load the weight is optional, as for bodyweight work.
  const weightRequired = load.type !== 'none'
  const targetRpe = load.type === 'rpe' ? load.rpe : null

  const [weight, setWeight] = useState(kgText(initialWeight(exercise)))
  const [rpe, setRpe] = useState(log?.rpe ?? targetRpe ?? DEFAULT_RPE)
  // Logging only the last set means every set hit its reps, so a log with a short set opens set
  // by set, as does one that recorded each set.
  const [eachSet, setEachSet] = useState(!!log && (!!log.perSet || log.repsPerSet.some((reps) => reps < exercise.reps)))
  const [sets, setSets] = useState<SetFields[]>(() => Array.from({ length: exercise.sets }, (_, set) => {
    const saved = log?.perSet?.[set]
    return {
      reps: String(log?.repsPerSet[set] ?? exercise.reps),
      weight: kgText(saved ? saved.weightKg : initialWeight(exercise)),
      rpe: String(saved?.rpe ?? rpe),
    }
  }))
  const [note, setNote] = useState(log?.note ?? '')
  const [showNote, setShowNote] = useState(!!log?.note)
  const noteId = useId()

  const perSet = sets.map((set) => ({ weightKg: parseKg(set.weight), rpe: parseCount(set.rpe) ?? 0 }))
  const validRpe = (value: number) => value >= 1 && value <= 10
  const canSave = eachSet
    ? perSet.every((set) => validRpe(set.rpe) && (!weightRequired || set.weightKg != null))
    : !weightRequired || parseKg(weight) != null

  const switchEachSet = () => {
    // Carry the last set across, so switching doesn't lose what was entered.
    if (!eachSet) {
      setSets(sets.map((set, index) => (index === sets.length - 1
        ? { ...set, weight, rpe: String(rpe) }
        : { ...set, weight: set.weight || weight })))
    } else {
      setWeight(sets[sets.length - 1].weight)
      const lastRpe = perSet[perSet.length - 1].rpe
      if (validRpe(lastRpe)) setRpe(lastRpe)
    }
    setEachSet(!eachSet)
  }

  const next = nextUnlogged(workout, exercise.id)
  const save = () => {
    const last = perSet[perSet.length - 1]
    const entered: ExerciseLog = eachSet
      ? {
        weightKg: last.weightKg, rpe: last.rpe,
        repsPerSet: sets.map((set) => parseCount(set.reps) ?? 0),
        note: note.trim(), perSet,
      }
      : {
        weightKg: parseKg(weight), rpe,
        repsPerSet: Array.from({ length: exercise.sets }, () => exercise.reps),
        note: note.trim(),
      }
    change((week) => logExercise(week, workout.id, exercise.id, entered))
    if (next) replace(paths.log(workout.id, next.id))
    else back(paths.workout(workout.id))
  }

  const lastWeek = exercise.lastWeek
    ? `Last week: ${formatKg(exercise.lastWeek.weightKg)} kg at RPE ${exercise.lastWeek.rpe}`
    : null
  const volume = `${exercise.sets} sets × ${exercise.reps} reps${exercise.perSide ? ' per side' : ''}`

  return (
    <main className="screen screen-log">
      <TopBar parent={paths.workout(workout.id)} />
      <Header
        eyebrow={`${workout.name} · Exercise ${workout.exercises.indexOf(exercise) + 1} of ${workout.exercises.length}`}
        title={exercise.name}
        small
      />
      <div className="log-body">
        <PrescriptionCard exercise={exercise} />

        {eachSet ? (
          <>
            <SectionLabel>Your sets</SectionLabel>
            <div className="sets">
              {(targetRpe || lastWeek) && (
                <p className="support">
                  {[targetRpe && `Target RPE ${targetRpe} on the last set`, lastWeek].filter(Boolean).join(' · ')}
                </p>
              )}
              {sets.map((set, index) => (
                <SetRow
                  key={index} number={index + 1} fields={set} planned={exercise.reps} weightRequired={weightRequired}
                  onChange={(changed) => setSets(sets.map((it, i) => (i === index ? changed : it)))}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>Your last set</SectionLabel>
            <WeightStepper
              value={weight} onChange={setWeight} hint={lastWeek}
              label={weightRequired ? 'Weight used' : 'Weight used (optional)'}
            />
            <RpePicker rpe={rpe} target={targetRpe} onPick={setRpe} />
          </>
        )}

        <button type="button" className="switch-row" role="switch" aria-checked={eachSet} onClick={switchEachSet}>
          <span className="switch-text">
            <span className="switch-title">Log each set</span>
            <span className="support">For a short set, or a weight that changed. Off means all {volume} done.</span>
          </span>
          <span className="switch" aria-hidden="true" />
        </button>
        <hr className="divider" />

        {showNote ? (
          <Field label="Note for coach" htmlFor={noteId} tall>
            <textarea
              id={noteId} rows={3} placeholder="How did it go? Anything unusual?"
              value={note} onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        ) : (
          <button type="button" className="text-button" onClick={() => setShowNote(true)}>
            <Icon name="plus" size={20} />Add note for coach
          </button>
        )}
      </div>

      <div className="save-bar">
        <button type="button" className="button button-wide" disabled={!canSave} onClick={save}>
          {next ? 'Save and next exercise' : 'Save'}
        </button>
      </div>
    </main>
  )
}

function PrescriptionCard({ exercise }: { exercise: Exercise }) {
  const { load } = exercise
  const links = exercise.resources.length > 0
  return (
    <div className="card card-prescription">
      <div className="stats">
        <Stat label="Sets" value={exercise.sets} />
        <Stat label="Reps" value={exercise.reps} />
        {load.type === 'none' && <Stat label="Load" value="—" tone="muted" />}
        {load.type === 'fixed' && <Stat label="Load (kg)" value={formatKg(load.kg)} />}
        {load.type === 'rpe' && <Stat label="Target RPE" value={load.rpe} tone="target" />}
      </div>
      {load.type === 'none' && (
        <p className="support">No load or RPE target for this one — log any weight you used and how the last set felt.</p>
      )}
      {load.type === 'rpe' && (
        <p className="support">No set weight — choose one that gets you to about RPE {load.rpe} on the last set.</p>
      )}
      {(exercise.coachNote || links) && <hr className="divider divider-flush" />}
      {exercise.coachNote && <CoachNote note={exercise.coachNote} />}
      <ResourceChips resources={exercise.resources} />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'muted' | 'target' }) {
  return (
    <div className={tone ? `stat stat-${tone}` : 'stat'}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function WeightStepper({ value, onChange, label, hint }: {
  value: string
  onChange: (value: string) => void
  label: string
  hint: string | null
}) {
  const id = useId()
  const step = (by: number) => onChange(formatKg(Math.max(0, Math.round(((parseKg(value) ?? 0) + by) * 100) / 100)))
  return (
    <div className="stepper">
      <button type="button" className="step-button" aria-label="Decrease weight" onClick={() => step(-WEIGHT_STEP_KG)}>
        <Icon name="minus" />
      </button>
      <Field label={label} htmlFor={id} hint={hint}>
        <input
          id={id} className="input-weight" type="text" inputMode="decimal" autoComplete="off"
          value={value} onChange={(event) => onChange(event.target.value)}
        />
        <span className="unit">kg</span>
      </Field>
      <button type="button" className="step-button" aria-label="Increase weight" onClick={() => step(WEIGHT_STEP_KG)}>
        <Icon name="plus" />
      </button>
    </div>
  )
}

function RpePicker({ rpe, target, onPick }: { rpe: number; target: number | null; onPick: (rpe: number) => void }) {
  return (
    <div className="rpe">
      <div className="rpe-head">
        <div className="card-title">RPE on last set</div>
        {target && <div className="rpe-target">Target {target}</div>}
      </div>
      <div className="rpe-grid">
        {RPE_DESCRIPTIONS.map((_, index) => {
          const value = index + 1
          const selected = value === rpe
          return (
            <button
              key={value} type="button" aria-label={`RPE ${value}`} aria-pressed={selected}
              className={selected ? 'rpe-button rpe-selected' : value === target ? 'rpe-button rpe-is-target' : 'rpe-button'}
              onClick={() => onPick(value)}
            >
              {value}
            </button>
          )
        })}
      </div>
      <p className="support"><strong>RPE {rpe}</strong> — {RPE_DESCRIPTIONS[rpe - 1]}</p>
    </div>
  )
}

/** Reps, weight and RPE for one set. */
function SetRow({ number, fields, planned, weightRequired, onChange }: {
  number: number
  fields: SetFields
  planned: number
  weightRequired: boolean
  onChange: (fields: SetFields) => void
}) {
  const id = useId()
  const reps = parseCount(fields.reps)
  const rpe = parseCount(fields.rpe)
  const short = reps != null && reps < planned ? planned - reps : 0
  const input = (key: keyof SetFields, mode: 'numeric' | 'decimal') => (
    <input
      id={`${id}-${key}`} type="text" inputMode={mode} autoComplete="off"
      value={fields[key]} onChange={(event) => onChange({ ...fields, [key]: event.target.value })}
    />
  )
  return (
    <div className="set">
      <div className="set-head">
        <div className="label">Set {number}</div>
        {short > 0 && <div className="set-short">{short} short</div>}
      </div>
      <div className="set-fields">
        <Field label="Reps" htmlFor={`${id}-reps`}>{input('reps', 'numeric')}</Field>
        <Field label="Load (kg)" htmlFor={`${id}-weight`} error={weightRequired && parseKg(fields.weight) == null}>
          {input('weight', 'decimal')}
        </Field>
        <Field label="RPE" htmlFor={`${id}-rpe`} error={rpe == null || rpe < 1 || rpe > 10}>{input('rpe', 'numeric')}</Field>
      </div>
    </div>
  )
}
