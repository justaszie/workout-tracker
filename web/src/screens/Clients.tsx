import { useState, type FormEvent } from 'react'
import {
  clientStatus, currentWeek, gapsText, isWaitingOnCoach, joinedText, lastActivityText, shortTheme,
  statusLabel, toDateString, waitingText, weekSummary, weekTitle,
  type Client, type ClientStatus, type Data,
} from '../../shared/model.ts'
import { addClient, ApiError } from '../api.ts'
import {
  Avatar, Banner, Button, Card, Chip, Dialog, FilterGroup, PageHeader, ProgressBar, SearchField,
  Table, TableCell, TableRow, TextField, type ChipProps, type Column,
} from '../components/index.ts'

type Filter = 'all' | 'you' | 'training'

const chipTone: Record<ClientStatus, ChipProps['tone']> = {
  review: 'red',
  new: 'red',
  progress: 'grey',
  notstarted: 'grey',
  quiet: 'amber',
}

const COLUMNS: Column[] = [
  { header: 'Client', width: 'minmax(200px, 1.3fr)' },
  { header: 'Current week', width: 'minmax(150px, 1.1fr)' },
  { header: 'Progress', width: '170px' },
  { header: 'Last activity', width: '150px' },
  { header: 'Status', width: '150px' },
  { header: 'Action', width: '150px', align: 'right' },
]

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
    <TableRow>
      <TableCell><Avatar initials={client.initials} name={client.name} /></TableCell>
      <TableCell stack>
        <span className="medium">{week ? weekTitle(week) : 'No program yet'}</span>
        <span className="caption">{week ? shortTheme(week.theme) : joinedText(client)}</span>
      </TableCell>
      <TableCell>
        <ProgressBar
          value={summary ? summary.done / summary.total : 0}
          label={summary ? `${summary.done} of ${summary.total} workouts` : '—'}
          caption={summary ? gapsText(summary) : ''}
        />
      </TableCell>
      <TableCell tone="muted">{lastActivityText(client, today)}</TableCell>
      <TableCell><Chip tone={chipTone[status]}>{statusLabel(client, today)}</Chip></TableCell>
      <TableCell align="right">
        <Button to={clientLink(client)} size="sm" variant={primary ? 'primary' : 'outline'}>
          {actionLabel(status)}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function AddClient({ onData }: { onData: (data: Data) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      onData(await addClient(name))
      setName('')
      setError('')
      setOpen(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach the server.")
    }
  }

  return (
    <>
      <Button icon="plus" onClick={() => setOpen(true)}>Add client</Button>
      <Dialog
        open={open} onClose={() => setOpen(false)} title="Add client" onSubmit={submit}
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add client</Button>
          </>
        }
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        {error && <p role="alert" className="error-text">{error}</p>}
      </Dialog>
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
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} ${clients.length === 1 ? 'client' : 'clients'} · ${coach.name}`}
        actions={
          <>
            <SearchField label="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
            <AddClient onData={onData} />
          </>
        }
      />

      {waiting.length > 0 && (
        <Banner
          icon="clipboard"
          title={`${waiting.length} ${waiting.length === 1 ? 'client is' : 'clients are'} waiting on you`}
          action={<Button to={clientLink(waiting[0])} variant="white" size="sm">Start reviewing</Button>}
        >
          {waitingText(waiting, today)}
        </Banner>
      )}

      <FilterGroup
        label="Filter clients"
        options={(['all', 'you', 'training'] as const).map((key) => ({ value: key, label: `${labels[key]} · ${counts[key]}` }))}
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
      />

      <Card clip>
        <Table label="Clients" columns={COLUMNS} minWidth={1000} empty="No clients match.">
          {visible.map((client) => <ClientRow key={client.id} client={client} today={today} />)}
        </Table>
      </Card>
    </>
  )
}
