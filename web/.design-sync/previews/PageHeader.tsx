import { Avatar, Button, Chip, Chips, PageHeader, SearchField } from 'workout-coach'

export const ListScreen = () => (
  <PageHeader
    title="Clients" subtitle="6 clients · Coach Marta"
    actions={<><SearchField label="Search clients" /><Button icon="plus">Add client</Button></>}
  />
)

export const EditorScreen = () => (
  <PageHeader
    title="Plan next week" subtitle="For Rūta Jonaitė · follows Block 1 · Week 4"
    actions={<><Button variant="outline">Save draft</Button><Button icon="send">Publish to Rūta</Button></>}
  />
)

export const DetailScreen = () => (
  <PageHeader
    title="Block 2 · Week 3"
    leading={<Avatar initials="AP" name="Alex Petrauskas" large />}
    actions={<Button icon="arrow" iconPosition="right">Plan Block 2 · Week 4</Button>}
  >
    <p className="lead">Volume week: more sets at moderate load before next week's deload.</p>
    <Chips>
      <Chip tone="green" icon="check">Finished Sun 2 Nov</Chip>
      <Chip>Started Mon 27 Oct</Chip>
    </Chips>
  </PageHeader>
)
