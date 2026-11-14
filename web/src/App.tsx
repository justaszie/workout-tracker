import { useCallback, useEffect, useState } from 'react'
import type { Data } from '../shared/model.ts'
import { ApiError, coachSignIn, loadData, signOut } from './api.ts'
import { AppShell, NavRail, type NavItem } from './components/index.ts'
import { usePath } from './router.tsx'
import { Clients } from './screens/Clients.tsx'
import { History } from './screens/History.tsx'
import { PlanWeek } from './screens/PlanWeek.tsx'
import { Review } from './screens/Review.tsx'
import { SignIn } from './screens/SignIn.tsx'

const NAV: NavItem[] = [
  { label: 'Clients', icon: 'clients', to: '/', current: true },
  { label: 'Library', icon: 'library', disabled: true },
  { label: 'Settings', icon: 'settings', disabled: true },
]

export function App() {
  const path = usePath()
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)

  const [signedOut, setSignedOut] = useState(false)
  // Only a server where the coach signs in with Google has anything to sign out of.
  const [canSignOut, setCanSignOut] = useState(false)

  const refresh = useCallback(() => {
    loadData().then((data) => {
      setData(data)
      setFailed(false)
      setSignedOut(false)
    }, (error) => {
      if (error instanceof ApiError && error.status === 401) {
        setData(null)
        setSignedOut(true)
      } else {
        setFailed(true)
      }
    })
  }, [])

  useEffect(() => {
    coachSignIn().then(({ googleClientId }) => setCanSignOut(googleClientId != null), () => {})
  }, [])

  // Clients log from their phones, so pick up what changed whenever the coach comes back.
  useEffect(refresh, [refresh, path])
  useEffect(() => {
    addEventListener('focus', refresh)
    return () => removeEventListener('focus', refresh)
  }, [refresh])

  const [, clientId, page, weekId] = /^\/clients\/([^/]+)(?:\/(plan|edit|history|weeks\/([^/]+)))?$/.exec(path) ?? []
  if (signedOut) return <SignIn onSignedIn={refresh} />

  // Even if the server can't be told, the screen goes: the coach asked to leave.
  const leave = () => signOut().catch(() => {}).then(refresh)
  const nav = canSignOut ? [...NAV, { label: 'Sign out', icon: 'signOut' as const, onClick: leave }] : NAV
  return (
    <AppShell nav={<NavRail items={nav} />}>
      {failed && !data && <p role="alert">Couldn't reach the server. Reload to try again.</p>}
      {data && !clientId && <Clients data={data} onData={setData} />}
      {data && clientId && (!page || weekId) && <Review data={data} clientId={clientId} weekId={weekId} />}
      {data && page === 'history' && <History data={data} clientId={clientId} />}
      {data && page === 'plan' && <PlanWeek key={clientId} data={data} clientId={clientId} onData={setData} />}
      {data && page === 'edit' && <PlanWeek key={`${clientId}-edit`} data={data} clientId={clientId} onData={setData} edit />}
    </AppShell>
  )
}
