import { Avatar } from 'workout-coach'

export const Initials = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <Avatar initials="AP" />
    <Avatar initials="RJ" />
    <Avatar initials="LS" />
  </div>
)

export const WithName = () => <Avatar initials="AP" name="Alex Petrauskas" />

export const Large = () => <Avatar initials="RJ" name="Rūta Jonaitė" large />
