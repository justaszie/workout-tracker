import { useState } from 'react'
import {
  blocksOf, currentWeek, formatDate, formatKg, gapsText, liftTrend, pastWeeks, weekDates, weekSummary,
  weekTitle, type Block, type Client, type Data, type Week,
} from '../../shared/model.ts'
import {
  Avatar, Breadcrumbs, Button, Card, Chip, Chips, Link, PageHeader, ProgressBar, SegmentedControl,
  Table, TableCell, TableRow, type ChipProps, type Column,
} from '../components/index.ts'

const COLUMNS: Column[] = [
  { header: 'Week', width: 'minmax(200px, 1.4fr)' },
  { header: 'Dates', width: '160px' },
  { header: 'Workouts', width: '190px' },
  { header: 'Results', width: 'minmax(220px, 1.2fr)' },
  { header: 'Status', width: '170px' },
  { header: 'Action', width: '100px', align: 'right' },
]

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The current week lives at the client's page; earlier ones under /weeks. */
export const weekPath = (client: Client, week: Week) =>
  week === currentWeek(client) ? `/clients/${client.id}` : `/clients/${client.id}/weeks/${week.id}`

function Stat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <Card padded className="stat">
      <p className="eyebrow">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="caption">{caption}</p>
    </Card>
  )
}

function Stats({ client }: { client: Client }) {
  const past = pastWeeks(client)
  const open = past.filter((week) => !week.finishedOn)
  const totals = past.map(weekSummary).reduce(
    (sum, it) => ({
      done: sum.done + it.done, total: sum.total + it.total, partly: sum.partly + it.partly, skipped: sum.skipped + it.skipped,
    }),
    { done: 0, total: 0, partly: 0, skipped: 0 },
  )
  const flags = client.weeks.map(weekSummary).reduce(
    (sum, it) => ({
      aboveRpe: sum.aboveRpe + it.aboveRpe, missedReps: sum.missedReps + it.missedReps, underLoad: sum.underLoad + it.underLoad,
    }),
    { aboveRpe: 0, missedReps: 0, underLoad: 0 },
  )
  const offTarget = flags.aboveRpe + flags.missedReps + flags.underLoad
  const lift = liftTrend(client)

  return (
    <div className="stats">
      <Stat
        label="Weeks finished"
        value={`${past.length - open.length} of ${past.length}`}
        caption={
          !past.length ? 'No past weeks yet'
            : open.length === 1 ? `${weekTitle(open[0])} was never closed`
            : open.length ? `${open.length} weeks were never closed`
            : 'Every past week was closed'
        }
      />
      <Stat
        label="Workouts done"
        value={totals.total ? `${Math.round((totals.done / totals.total) * 100)}%` : '—'}
        caption={[
          `${totals.done} of ${totals.total} in past weeks`,
          totals.partly && `${totals.partly} partly done`,
          totals.skipped && `${totals.skipped} skipped`,
        ].filter(Boolean).join(' · ')}
      />
      {lift ? (
        <Stat
          label={`${lift.name}, last set`}
          value={lift.first.week === lift.last.week
            ? `${formatKg(lift.last.kg)} kg`
            : `${formatKg(lift.first.kg)} → ${formatKg(lift.last.kg)} kg`}
          caption={lift.first.week === lift.last.week
            ? `Logged in ${weekTitle(lift.last.week)}`
            : `${lift.last.kg >= lift.first.kg ? '+' : '−'}${formatKg(Math.abs(lift.last.kg - lift.first.kg))} kg since ${weekTitle(lift.first.week)}`}
        />
      ) : (
        <Stat label="Heaviest lift" value="—" caption="No weights logged yet" />
      )}
      <Stat
        label="Off-target results"
        value={String(offTarget)}
        caption={offTarget
          ? [
            flags.aboveRpe && `${flags.aboveRpe} above target RPE`,
            flags.missedReps && `${flags.missedReps} missed reps`,
            flags.underLoad && `${flags.underLoad} under load`,
          ].filter(Boolean).join(' · ')
          : 'Everything on target'}
      />
    </div>
  )
}

function weekStatus(client: Client, week: Week): { label: string; tone: ChipProps['tone']; icon?: 'check' | 'alert' } {
  if (week.finishedOn) return { label: `Finished ${formatDate(week.finishedOn)}`, tone: 'green', icon: 'check' }
  if (week === currentWeek(client)) return { label: 'In progress', tone: 'grey' }
  return { label: 'Not closed', tone: 'amber', icon: 'alert' }
}

function WeekRow({ client, week }: { client: Client; week: Week }) {
  const summary = weekSummary(week)
  const status = weekStatus(client, week)
  const gaps = [
    gapsText(summary),
    summary.started && `${summary.started} in progress`,
    summary.todo && `${summary.todo} to do`,
  ].filter(Boolean).join(' · ')
  const red = (count: number, text: string) => count ? [{ text: `${count} ${text}`, tone: 'red' as const }] : []
  const flags = [
    ...red(summary.aboveRpe, 'above RPE'),
    ...red(summary.missedReps, 'missed reps'),
    ...red(summary.underLoad, 'under planned load'),
    ...summary.notes ? [{ text: plural(summary.notes, 'note'), tone: 'grey' as const }] : [],
  ]

  return (
    <TableRow>
      <TableCell stack>
        <span className="medium">Week {week.number}</span>
        <span className="caption">{week.theme}</span>
      </TableCell>
      <TableCell tone="muted">{weekDates(week)}</TableCell>
      <TableCell>
        <ProgressBar
          value={summary.total ? summary.done / summary.total : 0}
          label={`${summary.done} of ${plural(summary.total, 'workout')}`}
          caption={gaps}
        />
      </TableCell>
      <TableCell>
        {flags.length > 0 ? (
          <Chips>{flags.map((flag) => <Chip key={flag.text} tone={flag.tone}>{flag.text}</Chip>)}</Chips>
        ) : summary.logged > 0 || week.finishedOn ? (
          <span className="muted">All on target</span>
        ) : null}
      </TableCell>
      <TableCell><Chip tone={status.tone} icon={status.icon}>{status.label}</Chip></TableCell>
      <TableCell align="right">
        <Button to={weekPath(client, week)} variant="outline" size="sm" aria-label={`View ${weekTitle(week)}`}>View</Button>
      </TableCell>
    </TableRow>
  )
}

function BlockCard({ client, block, isCurrent }: { client: Client; block: Block; isCurrent: boolean }) {
  const { weeks } = block
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  const summaries = weeks.map(weekSummary)
  const done = summaries.reduce((sum, it) => sum + it.done, 0)
  const total = summaries.reduce((sum, it) => sum + it.total, 0)
  const finished = weeks.filter((week) => week.finishedOn).length

  const caption = isCurrent
    ? `${plural(weeks.length, 'week')} so far · started ${formatDate(first.startedOn)}`
    : `${plural(weeks.length, 'week')} · ${formatDate(first.startedOn)} – ${formatDate(last.finishedOn ?? last.startedOn)}`
      + ` · ${done} of ${total} workouts done`
  const chip: { label: string; tone: ChipProps['tone'] } = isCurrent
    ? { label: 'Current block', tone: 'grey' }
    : { label: `${finished} of ${weeks.length} finished`, tone: finished === weeks.length ? 'green' : 'amber' }

  return (
    <Card label={`Block ${block.number}`} clip>
      <div className="workout-head">
        <div className="grow">
          <h2>Block {block.number}</h2>
          <p className="muted small">{caption}</p>
        </div>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      <Table label={`Block ${block.number} weeks`} columns={COLUMNS} minWidth={1000} tinted>
        {[...weeks].reverse().map((week) => <WeekRow key={week.id} client={client} week={week} />)}
      </Table>
    </Card>
  )
}

function ClientHistory({ client }: { client: Client }) {
  const blocks = blocksOf(client)
  const current = currentWeek(client)
  const [selected, setSelected] = useState(String(blocks[0]?.number ?? ''))
  const block = blocks.find((it) => String(it.number) === selected) ?? blocks[0]
  const crumbs = [{ label: 'Clients', to: '/' }, { label: client.name, to: `/clients/${client.id}` }, { label: 'History' }]

  if (!current || !block) {
    return (
      <>
        <Breadcrumbs items={crumbs} />
        <p>{client.name} has no weeks yet. <Link to={`/clients/${client.id}/plan`}>Plan first week</Link></p>
      </>
    )
  }

  const subtitle = [
    `${plural(client.weeks.length, 'week')} planned since ${formatDate(client.weeks[0].startedOn)}`,
    plural(blocks.length, 'block'),
    current.finishedOn ? `${weekTitle(current)} finished` : `on ${weekTitle(current)} now`,
  ].join(' · ')

  return (
    <>
      <Breadcrumbs items={crumbs} />

      <PageHeader
        title="Training history"
        subtitle={subtitle}
        leading={<Avatar initials={client.initials} name={client.name} large />}
        actions={<Button to={`/clients/${client.id}`} variant="outline">Open current week</Button>}
      />

      <Stats client={client} />

      <div className="history-controls">
        <SegmentedControl
          label="Block"
          options={blocks.map((it) => ({
            value: String(it.number),
            label: it.number === current.block ? `Block ${it.number} · current` : `Block ${it.number}`,
          }))}
          value={String(block.number)}
          onChange={setSelected}
        />
        <p className="muted small">Newest week first · View opens every logged set</p>
      </div>

      <BlockCard key={block.number} client={client} block={block} isCurrent={block.number === current.block} />
    </>
  )
}

export function History({ data, clientId }: { data: Data; clientId: string }) {
  const client = data.clients.find((it) => it.id === clientId)
  if (!client) return <p>No such client. <Link to="/">Back to clients</Link></p>
  return <ClientHistory client={client} />
}
