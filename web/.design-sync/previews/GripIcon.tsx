import { GripIcon } from 'workout-coach'

export const DragHandle = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <span className="grip"><GripIcon /></span>
    <span className="medium">Back squat</span>
  </div>
)
