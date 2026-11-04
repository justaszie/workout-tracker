import { Children, type CSSProperties, type ReactNode } from 'react'

export interface Column {
  header: string
  /** CSS grid track size, such as `170px` or `minmax(200px, 1.3fr)`. */
  width: string
  align?: 'left' | 'right'
}

export interface TableProps {
  /** Accessible name of the table. */
  label: string
  columns: Column[]
  /** Width below which the table scrolls sideways instead of squeezing. */
  minWidth?: number
  /** Grey header row with a top border, for a table under a card header. */
  tinted?: boolean
  /** Shown instead of rows when there are none. */
  empty?: ReactNode
  /** TableRows. */
  children?: ReactNode
}

/** Grid table with uppercase column headers that scrolls sideways when narrow. Put it in a `<Card clip>`. */
export function Table({ label, columns, minWidth, tinted, empty, children }: TableProps) {
  const style = { '--cols': columns.map((column) => column.width).join(' '), minWidth } as CSSProperties
  return (
    <div className="table-scroll">
      <div role="table" aria-label={label} style={style}>
        <div role="row" className={tinted ? 'row-head row-head-tinted' : 'row-head'}>
          {columns.map((column) => (
            <span key={column.header} role="columnheader" className={column.align === 'right' ? 'right' : undefined}>
              {column.header}
            </span>
          ))}
        </div>
        {children}
        {empty && Children.count(children) === 0 && <p className="empty">{empty}</p>}
      </div>
    </div>
  )
}

export interface TableRowProps {
  /** Vertical alignment of the cells. */
  align?: 'center' | 'start'
  /** One TableCell per column. */
  children: ReactNode
}

/** One row of a Table. */
export function TableRow({ align = 'center', children }: TableRowProps) {
  return <div role="row" className={`row row-${align}`}>{children}</div>
}

export interface TableCellProps {
  align?: 'left' | 'right'
  /** Text style: `muted` grey, `medium` or `bold` weight, `flagged` red and bold for a result off target. */
  tone?: 'muted' | 'medium' | 'bold' | 'flagged'
  /** Lay children out in a column, as for a title with a caption under it. */
  stack?: boolean
  children?: ReactNode
}

/** One cell of a TableRow. */
export function TableCell({ align, tone, stack, children }: TableCellProps) {
  const classes = [align === 'right' && 'right', tone, stack && 'stack'].filter(Boolean).join(' ')
  return <div role="cell" className={classes || undefined}>{children}</div>
}

export interface AvatarProps {
  /** One or two letters. */
  initials: string
  /** Name shown beside the avatar; `large` makes it 20px for page headers. */
  name?: ReactNode
  large?: boolean
}

/** Round grey 40px initials avatar, optionally with the person's name beside it. */
export function Avatar({ initials, name, large }: AvatarProps) {
  const avatar = <span className="avatar" aria-hidden="true">{initials}</span>
  if (!name) return avatar
  return (
    <div className="client-cell">
      {avatar}
      <span className={large ? 'client-name-large' : 'client-name'}>{name}</span>
    </div>
  )
}

export interface NumberBadgeProps {
  children: ReactNode
  /** Solid red for the item being edited. */
  active?: boolean
}

/** 40px rounded square with a condensed bold number, marking a workout's position in the week. */
export function NumberBadge({ children, active }: NumberBadgeProps) {
  return <span className={active ? 'number number-active' : 'number'} aria-hidden="true">{children}</span>
}

export interface ProgressBarProps {
  /** Fraction done, from 0 to 1. */
  value: number
  /** Text above the bar, such as `3 of 4 workouts`. */
  label?: ReactNode
  /** Muted caption under the bar. Pass `''` in table rows where only some bars have one, so the bars line up. */
  caption?: ReactNode
}

/** Thin 160px red progress track, with an optional label above and caption below. */
export function ProgressBar({ value, label, caption }: ProgressBarProps) {
  return (
    <div className="progress">
      {label && <span>{label}</span>}
      <span className="track" aria-hidden="true">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
      </span>
      {caption !== undefined && <span className="caption">{caption}</span>}
    </div>
  )
}

export interface ListRowProps {
  /** Usually a NumberBadge. */
  leading?: ReactNode
  title: ReactNode
  /** Muted line under the title. */
  subtitle?: ReactNode
  /** Usually a small outline Button. */
  action?: ReactNode
}

/** Row in a `<Card clip>` with a leading badge, title, subtitle and an action. */
export function ListRow({ leading, title, subtitle, action }: ListRowProps) {
  return (
    <div className="list-row">
      {leading}
      <div className="grow">
        <p className="list-row-title">{title}</p>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
