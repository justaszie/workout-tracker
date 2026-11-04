import { useCallback, useEffect, useState } from 'react'
import type { Data } from '../shared/model.ts'
import { loadData } from './api.ts'
import { AppShell, NavRail, type NavItem } from './components/index.ts'
import { usePath } from './router.tsx'
import { Clients } from './screens/Clients.tsx'
import { History } from './screens/History.tsx'
import { PlanWeek } from './screens/PlanWeek.tsx'
import { Review } from './screens/Review.tsx'

const NAV: NavItem[] = [
  { label: 'Clients', icon: 'clients', to: '/', current: true },
  { label: 'Library', icon: 'library', disabled: true },
  { label: 'Settings', icon: 'settings', disabled: true },
]

export function App() {
  const path = usePath()
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(() => {
    loadData().then(setData).then(() => setFailed(false), () => setFailed(true))
  }, [])

  // Clients log from their phones, so pick up what changed whenever the coach comes back.
  useEffect(refresh, [refresh, path])
  useEffect(() => {
    addEventListener('focus', refresh)
    return () => removeEventListener('focus', refresh)
  }, [refresh])

  const [, clientId, page, weekId] = /^\/clients\/([^/]+)(?:\/(plan|edit|history|weeks\/([^/]+)))?$/.exec(path) ?? []
  return (
    <AppShell nav={<NavRail items={NAV} />}>
      {failed && !data && <p role="alert">Couldn't reach the server. Reload to try again.</p>}
      {data && !clientId && <Clients data={data} onData={setData} />}
      {data && clientId && (!page || weekId) && <Review data={data} clientId={clientId} weekId={weekId} />}
      {data && page === 'history' && <History data={data} clientId={clientId} />}
      {data && page === 'plan' && <PlanWeek key={clientId} data={data} clientId={clientId} onData={setData} />}
      {data && page === 'edit' && <PlanWeek key={`${clientId}-edit`} data={data} clientId={clientId} onData={setData} edit />}
    </AppShell>
  )
}
