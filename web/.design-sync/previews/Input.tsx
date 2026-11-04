import { Input } from 'workout-coach'

const row = { display: 'grid', gridTemplateColumns: '220px 64px 92px 104px', gap: 12, alignItems: 'center' }

export const ExerciseRow = () => (
  <div style={row}>
    <Input aria-label="Exercise name" variant="strong" defaultValue="Back squat" />
    <Input aria-label="Sets" center defaultValue="4" />
    <Input aria-label="Reps" center defaultValue="6-8" />
    <Input aria-label="Load in kg" unit="kg" defaultValue="82.5" />
  </div>
)

export const Units = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <div style={{ width: 104 }}><Input aria-label="Load in kg" unit="kg" defaultValue="60" /></div>
    <div style={{ width: 104 }}><Input aria-label="Target RPE" unit="RPE" unitPosition="left" defaultValue="8" /></div>
  </div>
)

export const Quiet = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '300px 240px', gap: 12 }}>
    <Input aria-label="Note for client" variant="quiet" placeholder="Note for client (optional)" />
    <Input aria-label="Video link" variant="quiet" icon="link" placeholder="Video or guide link (optional)" />
  </div>
)
