import { Avatar, Button, Card, Chip, ProgressBar, Table, TableCell, TableRow } from 'workout-coach'

const clientColumns = [
  { header: 'Client', width: 'minmax(180px, 1.3fr)' },
  { header: 'Progress', width: '170px' },
  { header: 'Status', width: '140px' },
  { header: 'Action', width: '100px', align: 'right' as const },
]

export const Clients = () => (
  <Card clip>
    <Table label="Clients" columns={clientColumns}>
      <TableRow>
        <TableCell><Avatar initials="AP" name="Alex Petrauskas" /></TableCell>
        <TableCell><ProgressBar value={2 / 5} label="2 of 5 workouts" caption="1 partly done · 2 skipped" /></TableCell>
        <TableCell><Chip tone="red">Needs review</Chip></TableCell>
        <TableCell align="right"><Button size="sm">Review</Button></TableCell>
      </TableRow>
      <TableRow>
        <TableCell><Avatar initials="MV" name="Mantas Vaitkus" /></TableCell>
        <TableCell><ProgressBar value={1 / 4} label="1 of 4 workouts" caption="" /></TableCell>
        <TableCell><Chip tone="amber">Quiet for 6 days</Chip></TableCell>
        <TableCell align="right"><Button size="sm" variant="outline">View</Button></TableCell>
      </TableRow>
    </Table>
  </Card>
)

const resultColumns = [
  { header: 'Exercise', width: 'minmax(120px, 1fr)' },
  { header: 'Planned', width: '120px' },
  { header: 'Last set', width: '90px' },
  { header: 'RPE', width: '100px' },
  { header: 'Reps', width: '70px' },
]

export const Results = () => (
  <Card clip>
    <Table label="Lower A results" columns={resultColumns} tinted>
      <TableRow align="start">
        <TableCell tone="medium">Back squat</TableCell>
        <TableCell tone="muted">4 × 6 at 80 kg</TableCell>
        <TableCell tone="bold">85 kg (+5)</TableCell>
        <TableCell>7</TableCell>
        <TableCell>All done</TableCell>
      </TableRow>
      <TableRow align="start">
        <TableCell tone="medium">Bench press</TableCell>
        <TableCell tone="muted">3 × 5 at RPE 8</TableCell>
        <TableCell>70 kg</TableCell>
        <TableCell tone="flagged">9.5 (target 8)</TableCell>
        <TableCell tone="flagged">5, 5, 3</TableCell>
      </TableRow>
    </Table>
  </Card>
)

export const Empty = () => (
  <Card clip>
    <Table label="Clients" columns={clientColumns} empty="No clients match." />
  </Card>
)
