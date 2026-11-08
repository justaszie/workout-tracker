import { useEffect, useId, useRef, useState } from 'react'
import { exerciseResult, formatKg, plannedText, type Exercise, type Week } from '../../shared/model.ts'

const show = (value: number | null, unit = '') => (value == null ? '—' : `${formatKg(value)}${unit}`)

/** Every set of [exercise]: reps, weight and RPE, with what the client said about it. */
function SetsPanel({ exercise, week, client }: { exercise: Exercise; week: Week; client: string }) {
  const { sets, lastSetOnly } = exerciseResult(exercise)
  return (
    <>
      <div className="stack">
        <span className="medium">{exercise.name} · Week {week.number}</span>
        <span className="caption">Planned {plannedText(exercise)}</span>
      </div>
      <table className="sets-table">
        <thead><tr><th>Set</th><th>Reps</th><th>Weight</th><th>RPE</th></tr></thead>
        <tbody>
          {sets?.map((set, i) => (
            <tr key={i}>
              <td className="muted">Set {i + 1}</td>
              <td className={set.missed ? 'flagged' : undefined}>{set.reps}</td>
              <td>{show(set.weightKg, ' kg')}</td>
              <td className={set.aboveRpe ? 'flagged' : undefined}>{show(set.rpe)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lastSetOnly && <p className="caption">{client} logged weight and RPE for the last set only.</p>}
      {exercise.log?.note && <p className="small sets-note">“{exercise.log.note}”</p>}
    </>
  )
}

interface SetsButtonProps {
  exercise: Exercise
  /** The week [exercise] is from. */
  week: Week
  /** The client's first name. */
  client: string
}

/**
 * "Show all sets", opening a panel of every set. Renders nothing unless there is more to see than the last set:
 * each set was logged, or reps were missed.
 */
export function SetsButton({ exercise, week, client }: SetsButtonProps) {
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const hasSets = exerciseResult(exercise).sets !== null

  // The panel sits in the top layer, so scrolling tables don't clip it. It is placed under the button before it
  // shows, and kept there while the page scrolls.
  const place = () => {
    const anchor = button.current?.getBoundingClientRect()
    const box = panel.current
    if (!anchor || !box) return
    const width = Math.min(340, innerWidth - 32)
    // Right-aligned with the button, or left-aligned when that would run off the left edge.
    const left = anchor.right - width >= 16 ? anchor.right - width : anchor.left
    box.style.top = `${anchor.bottom + 8}px`
    box.style.left = `${Math.max(16, Math.min(left, innerWidth - 16 - width))}px`
  }

  useEffect(() => {
    const box = panel.current
    if (!box) return
    const beforeToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === 'open') place()
    }
    const toggle = (event: Event) => setOpen((event as ToggleEvent).newState === 'open')
    box.addEventListener('beforetoggle', beforeToggle)
    box.addEventListener('toggle', toggle)
    return () => {
      box.removeEventListener('beforetoggle', beforeToggle)
      box.removeEventListener('toggle', toggle)
    }
  }, [hasSets])

  useEffect(() => {
    if (!open) return
    addEventListener('resize', place)
    addEventListener('scroll', place, true)
    return () => {
      removeEventListener('resize', place)
      removeEventListener('scroll', place, true)
    }
  }, [open])

  if (!hasSets) return null
  return (
    <>
      <button ref={button} type="button" className={`sets-toggle${open ? ' open' : ''}`} popoverTarget={id}>
        {open ? 'Hide sets' : 'Show all sets'}
      </button>
      <div ref={panel} id={id} popover="auto" className="sets-panel" aria-label={`All sets of ${exercise.name}`}>
        <SetsPanel exercise={exercise} week={week} client={client} />
      </div>
    </>
  )
}
