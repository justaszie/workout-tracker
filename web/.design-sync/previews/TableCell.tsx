import { Card, Table, TableCell, TableRow } from 'workout-coach'

const columns = ['Default', 'Muted', 'Medium', 'Bold', 'Flagged', 'Right'].map((header) => ({
  header, width: '1fr', align: header === 'Right' ? 'right' as const : undefined,
}))

export const Tones = () => (
  <Card clip>
    <Table label="Cell tones" columns={columns}>
      <TableRow>
        <TableCell>7</TableCell>
        <TableCell tone="muted">Not logged</TableCell>
        <TableCell tone="medium">Back squat</TableCell>
        <TableCell tone="bold">85 kg (+5)</TableCell>
        <TableCell tone="flagged">9.5 (target 8)</TableCell>
        <TableCell align="right">Finished today</TableCell>
      </TableRow>
    </Table>
  </Card>
)
