import { Button, Callout } from 'workout-coach'

export const CopiedWeek = () => (
  <div style={{ width: 640 }}>
    <Callout icon="copy" action={<Button variant="text" size="compact">Start from scratch</Button>}>
      Copied from <strong>Block 2 · Week 3</strong>. Change what's different.
    </Callout>
  </div>
)

export const NoAction = () => (
  <div style={{ width: 480 }}>
    <Callout icon="chat">Alex sees this purpose at the top of the week.</Callout>
  </div>
)
