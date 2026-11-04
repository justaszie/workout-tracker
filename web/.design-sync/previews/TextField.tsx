import { TextField } from 'workout-coach'

export const Default = () => (
  <div style={{ width: 360, paddingTop: 8 }}>
    <TextField label="Week title" defaultValue="Block 2 · Week 4" />
  </div>
)

export const Placeholder = () => (
  <div style={{ width: 360, paddingTop: 8 }}>
    <TextField label="Purpose (shown to client)" placeholder="What is this week for?" />
  </div>
)

export const Row = () => (
  <div className="week-fields" style={{ width: 640 }}>
    <TextField label="Week title" className="field-title" defaultValue="Block 2 · Week 4" />
    <TextField label="Purpose (shown to client)" className="field-purpose" defaultValue="Deload before testing" />
  </div>
)
