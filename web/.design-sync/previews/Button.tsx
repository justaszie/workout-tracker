import { Button } from 'workout-coach'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button>Publish to Alex</Button>
    <Button variant="outline">Save draft</Button>
    <Button variant="text">Cancel</Button>
  </div>
)

export const WithIcons = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button icon="plus">Add client</Button>
    <Button icon="send">Publish to Rūta</Button>
    <Button icon="arrow" iconPosition="right">Plan Block 2 · Week 4</Button>
    <Button variant="outline" icon="plus">Add workout</Button>
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button>Review</Button>
    <Button size="sm">Review</Button>
    <Button size="sm" variant="outline">View</Button>
    <Button size="compact" variant="text" icon="plus">Add exercise</Button>
  </div>
)

export const OnBanner = () => (
  <div style={{ background: 'var(--red)', padding: 16, borderRadius: 16, display: 'inline-flex' }}>
    <Button variant="white" size="sm">Start reviewing</Button>
  </div>
)
