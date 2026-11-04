import { Banner, Button } from 'workout-coach'

export const WaitingOnCoach = () => (
  <Banner
    icon="clipboard" title="3 clients are waiting on you"
    action={<Button variant="white" size="sm">Start reviewing</Button>}
  >
    Alex and Rūta finished their weeks, and Lukas needs a first week. None of them can train until you publish.
  </Banner>
)

export const TitleOnly = () => (
  <Banner icon="clipboard" title="1 client is waiting on you" action={<Button variant="white" size="sm">Start reviewing</Button>} />
)
