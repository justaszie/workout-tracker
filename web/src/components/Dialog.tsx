import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  /** Called when the dialog closes, including with Escape. */
  onClose: () => void
  title: string
  children: ReactNode
  /** Buttons aligned to the right at the bottom: a `text` Cancel, then the `primary` action. */
  actions?: ReactNode
  /** When set, the dialog is a form and a `type="submit"` action submits it. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

/** Modal dialog with 28px corners and a dimmed backdrop, 400px wide. */
export function Dialog({ open, onClose, title, children, actions, onSubmit }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const body = (
    <>
      <h2>{title}</h2>
      {children}
      {actions && <div className="dialog-actions">{actions}</div>}
    </>
  )
  return (
    <dialog ref={ref} className="dialog" aria-label={title} onClose={onClose}>
      {onSubmit ? <form onSubmit={onSubmit}>{body}</form> : body}
    </dialog>
  )
}
