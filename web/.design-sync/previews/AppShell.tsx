import { AppShell, Button, Card, ListRow, NavRail, NumberBadge, PageHeader } from 'workout-coach'

const nav = [
  { label: 'Clients', icon: 'clients' as const, to: '#', current: true },
  { label: 'Library', icon: 'library' as const, disabled: true },
  { label: 'Settings', icon: 'settings' as const, disabled: true },
]

export const ClientPage = () => (
  <AppShell nav={<NavRail items={nav} />}>
    <PageHeader title="Plan next week" subtitle="For Alex Petrauskas · follows Block 2 · Week 3" actions={<Button icon="send">Publish to Alex</Button>} />
    <Card label="Workouts" clip>
      <ListRow leading={<NumberBadge>1</NumberBadge>} title="Lower A" subtitle="5 exercises" action={<Button variant="outline" size="sm">Edit</Button>} />
      <ListRow leading={<NumberBadge>2</NumberBadge>} title="Upper A" subtitle="6 exercises" action={<Button variant="outline" size="sm">Edit</Button>} />
    </Card>
  </AppShell>
)
