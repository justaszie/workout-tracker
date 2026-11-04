import { FlagItem, FlagList } from 'workout-coach'

export const PreviousWeek = () => (
  <div style={{ width: 320 }}>
    <FlagList>
      <FlagItem icon="up" tone="red" title="Bench press">RPE 9.5, target was 8. “Last set was a grind”</FlagItem>
      <FlagItem icon="alert" tone="red" title="Pull-ups">8, 6, 5 reps.</FlagItem>
      <FlagItem icon="plus" title="Back squat">85 kg at RPE 7, planned 80 kg</FlagItem>
      <FlagItem icon="minus" title="Skipped Upper B and Conditioning">“Work trip on Thursday”</FlagItem>
    </FlagList>
  </div>
)
