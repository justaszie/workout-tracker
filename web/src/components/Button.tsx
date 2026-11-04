import type { ComponentProps, ReactNode } from 'react'
import { Icon, type IconName } from '../icons.tsx'
import { Link } from '../router.tsx'

export interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** `primary` is the one main action on a screen; `outline` and `text` are secondary; `white` sits on the red Banner. */
  variant?: 'primary' | 'outline' | 'text' | 'white'
  /** `md` is 48px tall, `sm` 40px (table rows, banners), `compact` is a 44px text button aligned to the start. */
  size?: 'md' | 'sm' | 'compact'
  /** Icon shown before the label, or after it with `iconPosition="right"`. */
  icon?: IconName
  iconPosition?: 'left' | 'right'
  /** When set, renders an in-app link to this path instead of a button. */
  to?: string
  children: ReactNode
}

/** Pill-shaped button in the coach app's red brand colour. Pass `to` to make it a link. */
export function Button({
  variant = 'primary', size = 'md', icon, iconPosition = 'left', to, className, children, type = 'button', ...props
}: ButtonProps) {
  const classes = [
    'btn', `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    icon && `btn-icon-${iconPosition}`,
    className,
  ].filter(Boolean).join(' ')
  const content = (
    <>
      {icon && iconPosition === 'left' && <Icon name={icon} />}
      {children}
      {icon && iconPosition === 'right' && <Icon name={icon} />}
    </>
  )
  if (to) return <Link to={to} className={classes} aria-label={props['aria-label']}>{content}</Link>
  return <button type={type} className={classes} {...props}>{content}</button>
}

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  icon: IconName
  /** Accessible name; the button shows only the icon. */
  label: string
  /** Icon size in px; 20 inside rows, 22 in card headers. */
  iconSize?: number
}

/** Round 44px icon-only button in muted ink, for row and card actions like delete or duplicate. */
export function IconButton({ icon, label, iconSize = 20, type = 'button', className, ...props }: IconButtonProps) {
  return (
    <button type={type} className={className ? `icon-btn ${className}` : 'icon-btn'} aria-label={label} {...props}>
      <Icon name={icon} size={iconSize} />
    </button>
  )
}

export interface TextLinkProps {
  /** In-app path to navigate to. */
  to: string
  children: ReactNode
  /** Trailing icon; defaults to an arrow. */
  icon?: IconName
}

/** Red medium-weight link with a trailing arrow, for "open more" links at the end of a card. */
export function TextLink({ to, children, icon = 'arrow' }: TextLinkProps) {
  return <Link to={to} className="text-link">{children}<Icon name={icon} size={18} /></Link>
}
