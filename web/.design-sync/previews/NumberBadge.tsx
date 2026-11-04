import { NumberBadge } from 'workout-coach'

export const States = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <NumberBadge>1</NumberBadge>
    <NumberBadge active>2</NumberBadge>
    <NumberBadge>3</NumberBadge>
  </div>
)
