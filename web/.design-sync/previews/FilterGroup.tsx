import { useState } from 'react'
import { FilterGroup } from 'workout-coach'

export const ClientFilters = () => {
  const [value, setValue] = useState('all')
  return (
    <FilterGroup
      label="Filter clients" value={value} onChange={setValue}
      options={[
        { value: 'all', label: 'All · 6' },
        { value: 'you', label: 'Waiting on you · 3' },
        { value: 'training', label: 'Training · 3' },
      ]}
    />
  )
}
