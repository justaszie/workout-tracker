import { Icon } from 'workout-coach'

const names = ['logo', 'clients', 'library', 'settings', 'search', 'plus', 'clipboard', 'check', 'arrow', 'chat',
  'album', 'send', 'copy', 'trash', 'collapse', 'link', 'up', 'alert', 'minus'] as const

export const AllIcons = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 96px)', gap: 16 }}>
    {names.map((name) => (
      <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Icon name={name} size={24} />
        <span className="caption">{name}</span>
      </div>
    ))}
  </div>
)

export const SizesAndWeights = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--red)' }}>
    <Icon name="check" size={16} weight={2.5} />
    <Icon name="check" size={20} />
    <Icon name="check" size={26} />
  </div>
)
