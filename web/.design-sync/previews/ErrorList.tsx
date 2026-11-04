import { ErrorList } from 'workout-coach'

export const BeforePublishing = () => (
  <div style={{ width: 560 }}>
    <ErrorList
      title="Fix these before publishing:"
      errors={['Workout 2 has no name.', 'Back squat: sets must be a whole number.', 'Bench press: target RPE must be 1 to 10.']}
    />
  </div>
)
