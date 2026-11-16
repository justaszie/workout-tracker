// The pieces the client app's screens share. They follow the Android app's components
// (ui/components/Components.kt), not the coach app's design system.

import { useId, type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import {
  formatDate, formatKg, loggedCount, safeUrl, workoutState,
  type Exercise, type Resource, type Week, type Workout,
} from '../../shared/model.ts'
import { back, open } from './nav.ts'

const icons = {
  back: <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  signOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  offline: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.5 8.6A5 5 0 0 0 7 18h10" />
      <path d="M19.6 16.5A4 4 0 0 0 17 10h-1a6 6 0 0 0-4.5-3.8" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h13l-2 4 2 4H5" /></>,
  hourglass: <><path d="M6 3h12" /><path d="M6 21h12" /><path d="M7 3v4l5 5 5-5V3" /><path d="M7 21v-4l5-5 5 5v4" /></>,
  reopen: <><path d="M4 9h10a6 6 0 0 1 0 12H8" /><path d="M8 5L4 9l4 4" /></>,
  note: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  play: <path d="M7 5l12 7-12 7z" />,
  guide: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  album: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></>,
  paste: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9z" /></>,
  minus: <path d="M5 12h14" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  share: (
    <>
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </>
  ),
  addBox: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8" /><path d="M8 12h8" /></>,
}

export type IconName = keyof typeof icons

export function Icon({ name, size = 24, bold }: { name: IconName; size?: number; bold?: boolean }) {
  return (
    <svg
      className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={bold ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

/** A link to another screen of the app. */
export function ScreenLink({ to, ...props }: { to: string } & ComponentProps<'a'>) {
  const onClick = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    open(to)
  }
  return <a href={to} onClick={onClick} {...props} />
}

export function IconButton({ icon, label, ...props }: { icon: IconName; label: string } & ComponentProps<'button'>) {
  return (
    <button type="button" className="icon-button" aria-label={label} {...props}>
      <Icon name={icon} />
    </button>
  )
}

/** The row above a screen's title. [parent] is where Back leads when there is nothing to go back to. */
export function TopBar({ parent, children }: { parent?: string; children?: ReactNode }) {
  return (
    <div className="top-bar">
      {parent && <IconButton icon="back" label="Back" onClick={() => back(parent)} />}
      <div className="top-bar-actions">{children}</div>
    </div>
  )
}

export function Header({ eyebrow, title, finished, small, children }: {
  eyebrow: string
  title: string
  finished?: boolean
  small?: boolean
  children?: ReactNode
}) {
  return (
    <header className="header">
      <div className={finished ? 'eyebrow eyebrow-finished' : 'eyebrow'}>{eyebrow}</div>
      <h1 className={small ? 'title title-small' : 'title'}>{title}</h1>
      {children}
    </header>
  )
}

export const SectionLabel = ({ children }: { children: ReactNode }) => <h2 className="section-label">{children}</h2>

/** A bar filled up to [done] of [total], with a dot marking the end. */
export function StepProgress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="steps" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      {done > 0 && <div className="steps-done" style={{ flexGrow: done }} />}
      {done < total && <div className="steps-left" style={{ flexGrow: total - done }} />}
    </div>
  )
}

export function Dialog({ title, icon, onClose, children }: {
  title: string
  icon?: IconName
  onClose: () => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="scrim" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={id}>
        {icon && <div className="dialog-icon"><Icon name={icon} /></div>}
        <h2 id={id} className="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/** An outlined field with its label on the border. [children] is the input, and anything beside it. */
export function Field({ label, htmlFor, hint, error, tall, children }: {
  label: string
  htmlFor: string
  hint?: ReactNode
  error?: boolean
  tall?: boolean
  children: ReactNode
}) {
  return (
    <div className="field-stack">
      <div className={`field${tall ? ' field-tall' : ''}${error ? ' field-error' : ''}`}>
        <label htmlFor={htmlFor}>{label}</label>
        {children}
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

// Weeks and workouts

export const exerciseCount = (count: number) => `${count} ${count === 1 ? 'exercise' : 'exercises'}`

export const loggedOf = (workout: Workout) => `${loggedCount(workout)} of ${workout.exercises.length} logged`

const weekdayOf = (date: string) => formatDate(date).split(' ')[0]

/** One workout in a week's list. The one the client has started stands out, with a way back in. */
export function WorkoutRow({ week, workout, number, to }: { week: Week; workout: Workout; number: number; to: string }) {
  const state = workoutState(week, workout)
  const count = exerciseCount(workout.exercises.length)
  return (
    <ScreenLink to={to} className={state === 'started' ? 'row row-active' : 'row'}>
      <div className="row-number">{number}</div>
      <div className="row-text">
        <div className="row-title">{workout.name}</div>
        <div className="row-detail">
          {state === 'done' && `${count} · done ${weekdayOf(workout.finishedOn!)}`}
          {state === 'started' && `In progress · ${loggedOf(workout)}`}
          {state === 'partly' && loggedOf(workout)}
          {(state === 'todo' || state === 'skipped') && count}
        </div>
      </div>
      {state === 'done' && <span className="tag tag-done"><Icon name="check" size={18} bold />Done</span>}
      {state === 'started' && <span className="row-continue">Continue</span>}
      {state === 'partly' && <span className="tag tag-outline">Partly done</span>}
      {state === 'skipped' && <span className="tag tag-outline">Skipped</span>}
      {state === 'todo' && <Icon name="chevron" />}
    </ScreenLink>
  )
}

// Exercises

/** What the coach prescribed, as the tags under an exercise's name. */
export function PrescriptionTags({ exercise }: { exercise: Exercise }) {
  const { load } = exercise
  return (
    <div className="tags">
      <span className="tag">{exercise.sets} × {exercise.reps}{exercise.perSide && ' per side'}</span>
      {load.type === 'fixed' && <span className="tag">{formatKg(load.kg)} kg</span>}
      {load.type === 'rpe' && <span className="tag tag-target">Target RPE {load.rpe}</span>}
    </div>
  )
}

export function CoachNote({ note, boxed }: { note: string; boxed?: boolean }) {
  return (
    <div className={boxed ? 'coach-note coach-note-boxed' : 'coach-note'}>
      <Icon name="note" size={20} />
      <div><strong>Coach:</strong> {note}</div>
    </div>
  )
}

/** Links come from free text the coach typed, so only web links are shown. */
export function ResourceChips({ resources }: { resources: Resource[] }) {
  const links = resources.filter((resource) => safeUrl(resource.url))
  if (!links.length) return null
  return (
    <div className="tags">
      {links.map((resource) => (
        <a key={resource.url} className="chip" href={resource.url} target="_blank" rel="noreferrer">
          <Icon name={resource.kind === 'demoVideo' ? 'play' : 'guide'} size={18} />
          {resource.kind === 'demoVideo' ? 'Demo video' : 'Setup guide'}
        </a>
      ))}
    </div>
  )
}

/** A screen with only a message on it: signing in, or no week to show. */
export function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="message">
      <div className="eyebrow">Workout Program</div>
      <h1 className="title">{title}</h1>
      {children}
    </main>
  )
}
