import { useId, useState } from 'react'
import { formatDate, loggedCount, nextWeekTitle, weekSummary, weekTitle, workoutState } from '../../shared/model.ts'
import { finishWeek, reopenWeek, type ClientWeek } from '../../shared/progress.ts'
import { open, paths } from './nav.ts'
import { change, refresh, signOut, today, type LoadState } from './store.ts'
import {
  Dialog, Field, Header, Icon, IconButton, loggedOf, Message, SectionLabel, StepProgress, TopBar, WorkoutRow,
} from './ui.tsx'

export function WeekScreen({ week, sending, offline }: { week: ClientWeek; sending: boolean; offline: boolean }) {
  const [dialog, setDialog] = useState<'finish' | 'signOut' | null>(null)
  const finished = !!week.finishedOn
  const started = `Started ${formatDate(week.startedOn)}`
  return (
    <main className="screen">
      <TopBar>
        <IconButton icon="history" label="Past weeks" onClick={() => open(paths.history)} />
        <IconButton icon="signOut" label="Sign out" onClick={() => setDialog('signOut')} />
      </TopBar>
      <Header
        eyebrow={finished ? 'Finished · waiting for coach' : 'Current week'}
        title={weekTitle(week)}
        finished={finished}
      >
        <p className="lead">{week.theme}</p>
        <p className="support">{finished ? `${started} · finished ${formatDate(week.finishedOn!)}` : started}</p>
      </Header>

      {offline && (
        <div className="notice" role="status">
          <Icon name="offline" size={20} />
          <div><strong>You're offline.</strong> What you log is saved on this phone and sent when you're back online.</div>
        </div>
      )}
      {finished ? <FinishedBanner week={week} sending={sending} /> : <CoachCard week={week} />}

      <SectionLabel>Workouts</SectionLabel>
      <div className="rows">
        {week.workouts.map((workout, index) => (
          <WorkoutRow key={workout.id} week={week} workout={workout} number={index + 1} to={paths.workout(workout.id)} />
        ))}
      </div>

      {finished ? (
        <div className="reopen">
          <button type="button" className="text-button" onClick={() => change(reopenWeek)}>
            <Icon name="reopen" size={20} />Reopen week
          </button>
          <p className="caption">
            Finished too early? You can reopen it until your coach publishes Week {week.number + 1}.
          </p>
        </div>
      ) : (
        <div className="finish-box">
          <h2 className="card-title">Done for this week?</h2>
          <p className="support">Finishing sends your results to the coach.</p>
          <button type="button" className="button button-outline" onClick={() => setDialog('finish')}>
            <Icon name="flag" size={20} />Finish week
          </button>
        </div>
      )}

      {dialog === 'finish' && <FinishDialog week={week} onClose={() => setDialog(null)} />}
      {dialog === 'signOut' && <SignOutDialog onClose={() => setDialog(null)} />}
    </main>
  )
}

function CoachCard({ week }: { week: ClientWeek }) {
  const summary = weekSummary(week)
  return (
    <div className="card card-large">
      <div className="coach">
        <div className="avatar">{week.coach.initials}</div>
        <div>
          <div className="card-title">{week.coach.name}</div>
          <div className="support">Your coach</div>
        </div>
      </div>
      <div className="progress">
        <div className="progress-text">
          <div className="label">{summary.done} of {summary.total} workouts done</div>
          {summary.started > 0 && <div className="caption">{summary.started} in progress</div>}
        </div>
        <StepProgress done={summary.done} total={summary.total} label="Workouts done" />
      </div>
    </div>
  )
}

function FinishedBanner({ week, sending }: { week: ClientWeek; sending: boolean }) {
  return (
    <div className="banner" role="status">
      <div className="banner-head">
        <div className="banner-icon"><Icon name="hourglass" size={22} /></div>
        <div>
          <div className="card-title">{sending ? `Sending to ${week.coach.name}…` : `Sent to ${week.coach.name}`}</div>
          <div>
            {sending ? "It goes out as soon as you're online. Keep this page open." : "They're reviewing your week."}
          </div>
        </div>
      </div>
      <div>{nextWeekTitle(week)} will show up here once your coach publishes it.</div>
      {week.note.trim() && <div className="banner-note"><strong>Your note:</strong> {week.note}</div>}
    </div>
  )
}

function FinishDialog({ week, onClose }: { week: ClientWeek; onClose: () => void }) {
  const [note, setNote] = useState(week.note)
  const id = useId()
  // The week isn't finished yet, so what would become partly done or skipped is worked out here.
  const open = week.workouts.filter((workout) => workoutState(week, workout) !== 'done')
  const partly = open.filter((workout) => loggedCount(workout) > 0)
  const skipped = open.filter((workout) => loggedCount(workout) === 0)
  return (
    <Dialog title={`Finish ${weekTitle(week)}?`} icon="flag" onClose={onClose}>
      <p className="support">
        {week.coach.name} gets your results and plans Week {week.number + 1}. Anything you haven't done is marked as
        skipped.
      </p>
      {open.length > 0 && (
        <div className="gaps">
          {partly.length > 0 && (
            <div>
              <strong>Partly done:</strong> {partly.map((workout) => `${workout.name} (${loggedOf(workout)})`).join(', ')}
            </div>
          )}
          {skipped.length > 0 && <div><strong>Skipped:</strong> {skipped.map((workout) => workout.name).join(', ')}</div>}
        </div>
      )}
      <Field label="Note for coach (optional)" htmlFor={id} tall>
        <textarea
          id={id} rows={3} placeholder="e.g. Travelling Thu–Sun, no gym"
          value={note} onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <div className="dialog-actions">
        <button type="button" className="text-button" onClick={onClose}>Cancel</button>
        <button
          type="button" className="button"
          onClick={() => {
            change((it) => finishWeek(it, today(), note))
            onClose()
            scrollTo(0, 0)
          }}
        >
          Finish week
        </button>
      </div>
    </Dialog>
  )
}

function SignOutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Sign out?" onClose={onClose}>
      <p className="support">
        Anything you logged that hasn't reached your coach yet is sent when you sign in again.
      </p>
      <div className="dialog-actions">
        <button type="button" className="text-button" onClick={onClose}>Cancel</button>
        <button type="button" className="text-button" onClick={signOut}>Sign out</button>
      </div>
    </Dialog>
  )
}

/** Shown while there is no week on the phone yet. */
export function WeekUnavailable({ load }: { load: LoadState }) {
  if (load === 'loading') {
    return <Message title="Loading your week…"><span /></Message>
  }
  return (
    <Message title={load === 'none' ? 'No week yet' : "Couldn't load your week"}>
      <p className="support">
        {load === 'none'
          ? 'Your first week will show up here once your coach publishes it.'
          : 'Check your connection and try again.'}
      </p>
      <div className="message-actions">
        <button type="button" className="button" onClick={refresh}>Try again</button>
        <button type="button" className="text-button" onClick={signOut}>Sign out</button>
      </div>
    </Message>
  )
}
