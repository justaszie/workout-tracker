import { Card, ListRow, NumberBadge, Button } from 'workout-coach'

export const Padded = () => (
  <div style={{ width: 360 }}>
    <Card label="Previous week at a glance" padded className="glance">
      <div>
        <h2>Previous week at a glance</h2>
        <p className="muted small">Block 2 · Week 3 · 2 of 5 done, 1 partly, 2 skipped</p>
      </div>
      <p>Squats moved well; bench felt heavy on the last set.</p>
    </Card>
  </div>
)

export const WithRows = () => (
  <div style={{ width: 560 }}>
    <Card label="Other workouts" clip>
      <ListRow leading={<NumberBadge>1</NumberBadge>} title="Lower A" subtitle="5 exercises · copied from Week 3" action={<Button variant="outline" size="sm">Edit</Button>} />
      <ListRow leading={<NumberBadge>3</NumberBadge>} title="Conditioning" subtitle="3 exercises" action={<Button variant="outline" size="sm">Edit</Button>} />
    </Card>
  </div>
)
