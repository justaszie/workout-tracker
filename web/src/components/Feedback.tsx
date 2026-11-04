import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons.tsx'

export interface BannerProps {
  icon: IconName
  title: ReactNode
  /** Supporting line under the title. */
  children?: ReactNode
  /** Usually a `<Button variant="white" size="sm">`. */
  action?: ReactNode
}

/** Solid red call to action across the top of a list, for work waiting on the coach. */
export function Banner({ icon, title, children, action }: BannerProps) {
  return (
    <section className="banner">
      <span className="banner-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <div className="banner-text">
        <p className="banner-title">{title}</p>
        {children && <p>{children}</p>}
      </div>
      {action}
    </section>
  )
}

export interface CalloutProps {
  icon: IconName
  /** One sentence; `<strong>` inside it shows in full ink. */
  children: ReactNode
  /** Usually a `<Button variant="text" size="compact">`. */
  action?: ReactNode
}

/** Grey inline notice inside a card, with an optional action on the right. */
export function Callout({ icon, children, action }: CalloutProps) {
  return (
    <div className="callout">
      <Icon name={icon} />
      <p>{children}</p>
      {action}
    </div>
  )
}

export interface NoteCardProps {
  /** Accessible name of the card. */
  label: string
  /** Small uppercase line naming who wrote the note. */
  eyebrow: ReactNode
  /** The note itself, shown as a 16px lead. */
  children: ReactNode
  icon?: IconName
}

/** Card quoting a note someone wrote, with a grey icon tile on the left. */
export function NoteCard({ label, eyebrow, children, icon = 'chat' }: NoteCardProps) {
  return (
    <section aria-label={label} className="card note">
      <span className="note-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <p className="lead">{children}</p>
      </div>
    </section>
  )
}

export interface ErrorListProps {
  title: ReactNode
  errors: string[]
}

/** Light red alert listing what has to be fixed before an action can go through. */
export function ErrorList({ title, errors }: ErrorListProps) {
  return (
    <section role="alert" className="errors">
      <p className="medium">{title}</p>
      <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
    </section>
  )
}

export interface FlagListProps {
  /** FlagItems. */
  children: ReactNode
}

/** Vertical list of FlagItems with a 14px gap. */
export function FlagList({ children }: FlagListProps) {
  return <ul className="flag-list">{children}</ul>
}

export interface FlagItemProps {
  icon: IconName
  /** `red` for a problem the coach should look at, `neutral` for information. */
  tone?: 'red' | 'neutral'
  /** Bold first line, usually the exercise name. */
  title: ReactNode
  /** Muted detail under the title. */
  children?: ReactNode
}

/** One flagged item: a small round icon and a title with a muted detail line. Use inside FlagList. */
export function FlagItem({ icon, tone = 'neutral', title, children }: FlagItemProps) {
  return (
    <li>
      <span className={tone === 'red' ? 'flag flag-red' : 'flag'} aria-hidden="true">
        <Icon name={icon} size={16} weight={2.5} />
      </span>
      <p>
        <strong>{title}</strong>
        {children && <><br /><span className="muted">{children}</span></>}
      </p>
    </li>
  )
}
