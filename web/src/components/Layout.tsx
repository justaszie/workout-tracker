import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons.tsx'
import { Link } from '../router.tsx'

export interface PageHeaderProps {
  /** Uppercase condensed page title. */
  title: ReactNode
  /** One muted line under the title. */
  subtitle?: ReactNode
  /** Shown above the title, such as an Avatar with the client's name. */
  leading?: ReactNode
  /** Shown under the title, such as a lead paragraph and Chips. */
  children?: ReactNode
  /** Buttons aligned to the right, wrapping under the title on narrow screens. */
  actions?: ReactNode
}

/** Top of every screen: big condensed title, optional subtitle and the screen's main actions. */
export function PageHeader({ title, subtitle, leading, children, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className={leading || children ? 'page-title-stack' : undefined}>
        {leading}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  )
}

export interface Crumb {
  label: string
  /** In-app path; leave out for a crumb that isn't a link. */
  to?: string
}

export interface BreadcrumbsProps {
  /** From the top level down; the last one is the current page and is never a link. */
  items: Crumb[]
}

/** Trail of links above the PageHeader on detail screens. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} className="crumb">
            {last ? <span aria-current="page">{item.label}</span>
              : item.to ? <Link to={item.to}>{item.label}</Link>
              : <span>{item.label}</span>}
            {!last && <span aria-hidden="true">›</span>}
          </span>
        )
      })}
    </nav>
  )
}

export interface CardProps {
  /** Accessible name; when set the card is a `<section>`. */
  label?: string
  /** 20px padding and a 16px column gap, for cards with free content rather than rows. */
  padded?: boolean
  /** Clip children to the rounded corners, for cards holding rows or tables. */
  clip?: boolean
  className?: string
  children: ReactNode
}

/** White surface with a light border and 16px corners. Cards sit on the grey page background. */
export function Card({ label, padded, clip, className, children }: CardProps) {
  const classes = ['card', padded && 'card-padded', clip && 'clip', className].filter(Boolean).join(' ')
  if (label) return <section aria-label={label} className={classes}>{children}</section>
  return <div className={classes}>{children}</div>
}

export interface NavItem {
  label: string
  icon: IconName
  /** In-app path; leave out with `disabled` for sections not built yet. */
  to?: string
  current?: boolean
  disabled?: boolean
}

export interface NavRailProps {
  items: NavItem[]
  /** Accessible name of the red logo tile. */
  title?: string
}

/** Vertical navigation rail on the left of the app, with the logo tile on top. */
export function NavRail({ items, title = 'Workout Program' }: NavRailProps) {
  return (
    <nav className="rail" aria-label="Main">
      <span className="rail-logo" role="img" aria-label={title}><Icon name="logo" size={26} /></span>
      {items.map((item) => {
        const content = <><span className="rail-pill"><Icon name={item.icon} size={22} /></span>{item.label}</>
        if (item.to && !item.disabled) {
          return (
            <Link key={item.label} to={item.to} className="rail-item" aria-current={item.current ? 'page' : undefined}>
              {content}
            </Link>
          )
        }
        return (
          <span key={item.label} className="rail-item" aria-disabled={item.disabled || undefined} title={item.disabled ? 'Not built yet' : undefined}>
            {content}
          </span>
        )
      })}
    </nav>
  )
}

export interface AppShellProps {
  /** Usually a NavRail. */
  nav: ReactNode
  children: ReactNode
}

/** Full-page layout: navigation on the left and a centred 1180px column of page content with 24px gaps. */
export function AppShell({ nav, children }: AppShellProps) {
  return (
    <div className="shell">
      {nav}
      <main className="main">
        <div className="page">{children}</div>
      </main>
    </div>
  )
}
