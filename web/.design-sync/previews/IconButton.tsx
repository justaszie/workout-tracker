import { IconButton } from 'workout-coach'

export const RowActions = () => (
  <div className="icon-row">
    <IconButton icon="copy" iconSize={22} label="Duplicate workout" />
    <IconButton icon="trash" iconSize={22} label="Delete workout" />
    <IconButton icon="collapse" iconSize={22} label="Collapse workout" />
  </div>
)

export const InRow = () => <IconButton icon="trash" label="Remove exercise 1" />
