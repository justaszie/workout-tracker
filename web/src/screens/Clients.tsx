import { useRef, useState, type FormEvent } from 'react'
import {
  clientStatus, currentWeek, gapsText, isWaitingOnCoach, joinedText, lastActivityText, shortTheme,
  statusLabel, toDateString, waitingText, weekSummary, weekTitle,
  type Client, type ClientStatus, type Data,
} from '../../shared/model.ts'
import { addClient, ApiError } from '../api.ts'
import { Icon } from '../icons.tsx'
import { Link } from '../router.tsx'

type Filter = 'all' | 'you' | 'training'

const chipClass: Record<ClientStatus, string> = {
  review: 'chip-red',
  new: 'chip-red',
  progress: 'chip-grey',
  notstarted: 'chip-grey',
  quiet: 'chip-amber',
}

const clientLink = (client: Client) =>
  currentWeek(client) ? `/clients/${client.id}` : `/clients/${client.id}/plan`

function actionLabel(status: ClientStatus) {
  if (status === 'review') return 'Review'
  return status === 'new' ? 'Plan first week' : 'View'
}

function ClientRow({ client, today }: { client: Client; today: string }) {
  const week = currentWeek(client)
  const summary = week && weekSummary(week)
  const status = clientStatus(client, today)
  const primary = status === 'review' || status === 'new'
  return (
    <div role="row" className="row clients-grid clients-row">
      <div role="cell" className="client-cell">
        <span className="avatar" aria-hidden="true">{client.initials}</span>
        <span className="client-name">{client.name}</span>
      </div>
      <div role="cell" className="stack">
        <span className="medium">{week ? weekTitle(week) : 'No program yet'}</span>
        <span className="caption">{week ? shortTheme(week.theme) : joinedText(client)}</span>
      </div>
      <div role="cell" className="progress-cell">
        <span>{summary ? `${summary.done} of ${summary.total} workouts` : '—'}</span>
        <span className="track" aria-hidden="true">
          <span style={{ width: summary ? `${Math.round((summary.done / summary.total) * 100)}%` : 0 }} />
        </span>
        <span className="caption">{summary && gapsText(summary)}</span>
      </div>
      <span role="cell" className="muted">{lastActivityText(client, today)}</span>
      <div role="cell"><span className={`chip ${chipClass[status]}`}>{statusLabel(client, today)}</span></div>
      <div role="cell" className="right">
        <Link to={clientLink(client)} className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-outline'}`}>
          {actionLabel(status)}
        </Link>
      </div>
    </div>
  )
}

function AddClient({ onData }: { onData: (data: Data) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      onData(await addClient(name))
      setName('')
      setError('')
      dialog.current?.close()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach the server.")
    }
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-icon-left" onClick={() => dialog.current?.showModal()}>
        <Icon name="plus" />Add client
      </button>
      <dialog ref={dialog} className="dialog" aria-label="Add client">
        <form onSubmit={submit}>
          <h2>Add client</h2>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          {error && <p role="alert" className="error-text">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-text" onClick={() => dialog.current?.close()}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add client</button>
          </div>
        </form>
      </dialog>
    </>
  )
}

export function Clients({ data, onData }: { data: Data; onData: (data: Data) => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const today = toDateString(new Date())

  const { clients, coach } = data
  const waiting = clients.filter((client) => isWaitingOnCoach(client, today))
  const counts: Record<Filter, number> = {
    all: clients.length,
    you: waiting.length,
    training: clients.length - waiting.length,
  }
  const labels: Record<Filter, string> = { all: 'All', you: 'Waiting on you', training: 'Training' }

  const visible = clients
    .filter((client) => filter === 'all' || isWaitingOnCoach(client, today) === (filter === 'you'))
    .filter((client) => client.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">{clients.length} {clients.length === 1 ? 'client' : 'clients'} · {coach.name}</p>
        </div>
        <div className="header-actions">
          <div className="search">
            <Icon name="search" />
            <input
              type="search" aria-label="Search clients" placeholder="Search clients"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <AddClient onData={onData} />
        </div>
      </header>

      {waiting.length > 0 && (
        <section className="banner">
          <span className="banner-icon" aria-hidden="true"><Icon name="clipboard" size={22} /></span>
          <div className="banner-text">
            <p className="banner-title">
              {waiting.length} {waiting.length === 1 ? 'client is' : 'clients are'} waiting on you
            </p>
            <p>{waitingText(waiting, today)}</p>
          </div>
          <Link to={clientLink(waiting[0])} className="btn btn-sm btn-white">Start reviewing</Link>
        </section>
      )}

      <div role="group" aria-label="Filter clients" className="filters">
        {(['all', 'you', 'training'] as const).map((key) => (
          <button
            key={key} type="button" aria-pressed={filter === key}
            className="filter" onClick={() => setFilter(key)}
          >
            {labels[key]} · {counts[key]}
          </button>
        ))}
      </div>

      <div className="card table-scroll">
        <div role="table" aria-label="Clients" className="clients-table">
          <div role="row" className="row-head clients-grid">
            <span role="columnheader">Client</span>
            <span role="columnheader">Current week</span>
            <span role="columnheader">Progress</span>
            <span role="columnheader">Last activity</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="right">Action</span>
          </div>
          {visible.map((client) => <ClientRow key={client.id} client={client} today={today} />)}
          {visible.length === 0 && <p className="empty">No clients match.</p>}
        </div>
      </div>
    </>
  )
}
