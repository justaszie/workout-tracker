import { Chip } from 'workout-coach'

export const Tones = () => (
  <div className="chips">
    <Chip tone="red">Needs review</Chip>
    <Chip tone="amber">Quiet for 6 days</Chip>
    <Chip tone="green">Done</Chip>
    <Chip>In progress</Chip>
  </div>
)

export const WithIcon = () => <Chip tone="green" icon="check">Finished Sun 2 Nov</Chip>

export const Results = () => (
  <div className="chips">
    <Chip tone="red">2 above target RPE</Chip>
    <Chip tone="red">1 with missed reps</Chip>
    <Chip>3 exercise notes</Chip>
  </div>
)
