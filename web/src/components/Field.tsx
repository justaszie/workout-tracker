import type { ComponentProps } from 'react'
import { Icon, type IconName } from '../icons.tsx'

export interface TextFieldProps extends ComponentProps<'input'> {
  /** Label resting on the outline. */
  label: string
}

/** 56px outlined text field with its label on the border, for forms and dialogs. Set its width with `className`. */
export function TextField({ label, className, ...props }: TextFieldProps) {
  return (
    <label className={className ? `field ${className}` : 'field'}>
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}

export interface SearchFieldProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Accessible name; also the placeholder unless one is given. */
  label: string
}

/** Grey 48px pill search box with a search icon, 280px wide. */
export function SearchField({ label, placeholder, ...props }: SearchFieldProps) {
  return (
    <div className="search">
      <Icon name="search" />
      <input type="search" aria-label={label} placeholder={placeholder ?? label} {...props} />
    </div>
  )
}

export interface InputProps extends ComponentProps<'input'> {
  /** `strong` is medium weight for names; `quiet` is grey-filled for optional extras. */
  variant?: 'default' | 'strong' | 'quiet'
  /** Centre the value, for short numbers like sets and reps. */
  center?: boolean
  /** Unit text inside the field, such as `kg` or `RPE`. */
  unit?: string
  unitPosition?: 'left' | 'right'
  /** Leading icon inside the field. */
  icon?: IconName
}

/** Dense 40px input for tables and editors. Give it an `aria-label`; it has no visible label. */
export function Input({ variant = 'default', center, unit, unitPosition = 'right', icon, className, ...props }: InputProps) {
  const classes = [
    'input',
    variant !== 'default' && `input-${variant}`,
    center && 'center',
    unit && `input-unit-${unitPosition}`,
    icon && 'input-has-icon',
    className,
  ].filter(Boolean).join(' ')
  const input = <input className={classes} {...props} />
  if (!unit && !icon) return input
  return (
    <div className="input-wrap">
      {icon && <Icon name={icon} size={18} />}
      {unit && unitPosition === 'left' && <span className="unit-left" aria-hidden="true">{unit}</span>}
      {input}
      {unit && unitPosition === 'right' && <span className="unit-right" aria-hidden="true">{unit}</span>}
    </div>
  )
}

export interface Option {
  value: string
  label: string
}

export interface SegmentedControlProps {
  /** Accessible name for the group. */
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** 40px pill of mutually exclusive segments; the selected one is tinted red. */
export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className="segments">
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

export interface FilterGroupProps {
  /** Accessible name for the group. */
  label: string
  /** Labels usually carry a count, as in `Waiting on you · 2`. */
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** Row of outlined filter buttons above a list; the selected one is tinted red. */
export function FilterGroup({ label, options, value, onChange }: FilterGroupProps) {
  return (
    <div role="group" aria-label={label} className="filters">
      {options.map((option) => (
        <button
          key={option.value} type="button" aria-pressed={value === option.value}
          className="filter" onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
