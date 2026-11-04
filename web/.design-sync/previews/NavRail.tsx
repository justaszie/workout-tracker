import { NavRail } from 'workout-coach'

export const Main = () => (
  <div style={{ display: 'flex', height: 360, width: 96 }}>
    <NavRail
      items={[
        { label: 'Clients', icon: 'clients', to: '#', current: true },
        { label: 'Library', icon: 'library', disabled: true },
        { label: 'Settings', icon: 'settings', disabled: true },
      ]}
    />
  </div>
)
