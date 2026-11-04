import { Card, Table, TableCell, TableRow } from 'workout-coach'

const columns = [
  { header: 'Exercise', width: '1fr' },
  { header: 'Planned', width: '170px' },
  { header: 'Last set', width: '130px' },
]

export const Rows = () => (
  <Card clip>
    <Table label="Results" columns={columns}>
      <TableRow><TableCell tone="medium">Romanian deadlift</TableCell><TableCell tone="muted">3 × 8 at 70 kg</TableCell><TableCell>70 kg</TableCell></TableRow>
      <TableRow><TableCell tone="medium">Walking lunge</TableCell><TableCell tone="muted">3 × 10</TableCell><TableCell tone="muted">Not logged</TableCell></TableRow>
    </Table>
  </Card>
)
