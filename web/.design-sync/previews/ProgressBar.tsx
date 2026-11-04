import { ProgressBar } from 'workout-coach'

export const Partial = () => <ProgressBar value={2 / 5} label="2 of 5 workouts" caption="1 partly done · 2 skipped" />

export const Complete = () => <ProgressBar value={1} label="4 of 4 workouts" caption="" />

export const NotStarted = () => <ProgressBar value={0} label="0 of 3 workouts" caption="" />
