import { Button, Card, ListRow, NumberBadge } from 'workout-coach'

export const Workout = () => (
  <div style={{ width: 560 }}>
    <Card clip>
      <ListRow
        leading={<NumberBadge>2</NumberBadge>} title="Upper A" subtitle="6 exercises · copied from Week 3"
        action={<Button variant="outline" size="sm">Edit</Button>}
      />
    </Card>
  </div>
)
