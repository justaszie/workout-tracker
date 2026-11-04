import { FlagItem, FlagList } from 'workout-coach'

export const Problem = () => (
  <div style={{ width: 320 }}>
    <FlagList><FlagItem icon="up" tone="red" title="Bench press">RPE 9.5, target was 8.</FlagItem></FlagList>
  </div>
)

export const Neutral = () => (
  <div style={{ width: 320 }}>
    <FlagList><FlagItem icon="plus" title="Back squat">85 kg at RPE 7, planned 80 kg</FlagItem></FlagList>
  </div>
)
