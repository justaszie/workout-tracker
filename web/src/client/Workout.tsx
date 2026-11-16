import { useId, useState } from 'react'
import { lastSetText, loggedCount, weekTitle, type Exercise, type Workout } from '../../shared/model.ts'
import { finishWorkout, setAlbumLink, type ClientWeek } from '../../shared/progress.ts'
import { back, paths } from './nav.ts'
import { change, today } from './store.ts'
import {
  CoachNote, exerciseCount, Field, Header, Icon, IconButton, loggedOf, PrescriptionTags, ResourceChips,
  ScreenLink, SectionLabel, StepProgress, TopBar,
} from './ui.tsx'

export function WorkoutScreen({ week, workout }: { week: ClientWeek; workout: Workout }) {
  const total = workout.exercises.length
  const logged = loggedCount(workout)
  // A finished week is with the coach, so it can only be read until it is reopened.
  const canEdit = !week.finishedOn
  return (
    <main className="screen">
      <TopBar parent={paths.week} />
      <Header
        eyebrow={`${weekTitle(week)} · Workout ${week.workouts.indexOf(workout) + 1} of ${week.workouts.length}`}
        title={workout.name}
      >
        <p className="support">{exerciseCount(total)}</p>
      </Header>
      <div className="progress progress-page">
        <div className="label">{loggedOf(workout)}</div>
        <StepProgress done={logged} total={total} label="Exercises logged" />
      </div>

      <div className="cards">
        {workout.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id} number={index + 1} exercise={exercise}
            logPath={canEdit ? paths.log(workout.id, exercise.id) : null}
          />
        ))}
        <SectionLabel>Videos &amp; photos</SectionLabel>
        <AlbumCard workout={workout} canEdit={canEdit} />
      </div>

      {canEdit && (
        <div className="finish-footer">
          <div className="support">{logged < total ? `${total - logged} not logged yet` : 'All logged'}</div>
          <button
            type="button" className="button button-dark" disabled={logged === 0}
            onClick={() => {
              change((it) => finishWorkout(it, workout.id, today()))
              back(paths.week)
            }}
          >
            <Icon name="check" bold />Finish workout
          </button>
        </div>
      )}
    </main>
  )
}

function ExerciseCard({ number, exercise, logPath }: { number: number; exercise: Exercise; logPath: string | null }) {
  const { log } = exercise
  return (
    <div className="card">
      <div className="exercise-head">
        {log
          ? <div className="badge badge-logged" role="img" aria-label="Logged"><Icon name="check" size={20} bold /></div>
          : <div className="badge">{number}</div>}
        <div className="exercise-text">
          <div className="card-title">{exercise.name}</div>
          <PrescriptionTags exercise={exercise} />
        </div>
        {/* Beside the name, so it sits in the same place on every card whatever is below. */}
        {logPath && (
          <ScreenLink to={logPath} className={log ? 'button button-small button-outline button-plain' : 'button button-small'}>
            {log ? 'Edit' : 'Log'}
          </ScreenLink>
        )}
      </div>
      {exercise.coachNote && <CoachNote note={exercise.coachNote} boxed />}
      {log ? <div className="logged-result">Last set {lastSetText(log)}</div> : <ResourceChips resources={exercise.resources} />}
    </div>
  )
}

function AlbumCard({ workout, canEdit }: { workout: Workout; canEdit: boolean }) {
  // Kept here as typed: the saved week only follows it.
  const [link, setLink] = useState(workout.albumLink)
  const id = useId()
  const update = (value: string) => {
    setLink(value)
    change((it) => setAlbumLink(it, workout.id, value))
  }
  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) update(text)
    } catch {
      // The browser refused, or the client said no. They can still paste into the field.
    }
  }
  return (
    <div className="card card-album">
      <div className="exercise-head">
        <div className="album-icon"><Icon name="album" size={22} /></div>
        <p className="support">
          Put your clips for this workout in a Google Photos album or Drive folder, then paste the share link here.
        </p>
      </div>
      <Field label="Album or folder link" htmlFor={id} hint="Check the album is shared so your coach can open it.">
        <input
          id={id} type="url" inputMode="url" autoComplete="off" placeholder="https://photos.app.goo.gl/…"
          value={link} disabled={!canEdit} onChange={(event) => update(event.target.value)}
        />
        {canEdit && 'clipboard' in navigator && <IconButton icon="paste" label="Paste link" onClick={paste} />}
      </Field>
    </div>
  )
}
