import { useSyncExternalStore, type ComponentProps, type MouseEvent } from 'react'

function subscribe(onChange: () => void) {
  addEventListener('popstate', onChange)
  return () => removeEventListener('popstate', onChange)
}

export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname)

export function navigate(to: string) {
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
  scrollTo(0, 0)
}

export function Link({ to, ...props }: { to: string } & ComponentProps<'a'>) {
  const onClick = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={onClick} {...props} />
}
