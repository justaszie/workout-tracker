import { Breadcrumbs } from 'workout-coach'

export const ThreeLevels = () => (
  <Breadcrumbs items={[{ label: 'Clients', to: '#' }, { label: 'Alex Petrauskas', to: '#' }, { label: 'Plan next week' }]} />
)

export const UnlinkedMiddle = () => (
  <Breadcrumbs items={[{ label: 'Clients', to: '#' }, { label: 'Rūta Jonaitė' }, { label: 'Block 1 · Week 4' }]} />
)
