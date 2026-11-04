import { useState } from 'react'
import { SegmentedControl } from 'workout-coach'

const options = [
  { value: 'kg', label: 'Load' },
  { value: 'rpe', label: 'RPE' },
  { value: 'none', label: 'None' },
]

export const TargetType = () => {
  const [value, setValue] = useState('kg')
  return <div style={{ width: 204 }}><SegmentedControl label="Target type" options={options} value={value} onChange={setValue} /></div>
}

export const SecondSelected = () => (
  <div style={{ width: 204 }}><SegmentedControl label="Target type" options={options} value="rpe" onChange={() => {}} /></div>
)
