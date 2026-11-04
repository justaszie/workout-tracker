import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons.tsx'

export interface ChipProps {
  /** `red` needs attention, `green` is done, `amber` is a warning, `grey` is neutral. */
  tone?: 'red' | 'green' | 'amber' | 'grey'
  /** Optional leading icon, such as `check` on a finished chip. */
  icon?: IconName
  children: ReactNode
}

/** Small 28px status label with a tinted background, for client and workout states. */
export function Chip({ tone = 'grey', icon, children }: ChipProps) {
  return (
    <span className={`chip chip-${tone}${icon ? ' chip-icon' : ''}`}>
      {icon && <Icon name={icon} size={16} weight={2.5} />}
      {children}
    </span>
  )
}

export interface ChipsProps {
  children: ReactNode
}

/** Wrapping row of Chips with an 8px gap. */
export function Chips({ children }: ChipsProps) {
  return <div className="chips">{children}</div>
}

export interface LinkChipProps {
  /** External URL; opens in a new tab. */
  href: string
  /** Leading icon in red; defaults to `album`. */
  icon?: IconName
  children: ReactNode
}

/** Outlined chip that links to an external page, such as a client's videos and photos. */
export function LinkChip({ href, icon = 'album', children }: LinkChipProps) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link-chip">
      <Icon name={icon} size={18} />{children}
    </a>
  )
}
