import { useCallback, useEffect, useState } from 'react'
import type { Data } from '../shared/model.ts'
import { loadData } from './api.ts'
import { Icon } from './icons.tsx'
import { Link, usePath } from './router.tsx'
import { Clients } from './screens/Clients.tsx'
import { PlanWeek } from './screens/PlanWeek.tsx'
import { Review } from './screens/Review.tsx'

function Rail() {
  return (
    <nav className="rail" aria-label="Main">
      <span className="rail-logo" role="img" aria-label="Workout Program"><Icon name="logo" size={26} /></span>
      <Link to="/" className="rail-item" aria-current="page">
        <span className="rail-pill"><Icon name="clients" size={22} /></span>Clients
      </Link>
      <span className="rail-item" aria-disabled="true" title="Not built yet">
        <span className="rail-pill"><Icon name="library" size={22} /></span>Library
      </span>
      <span className="rail-item" aria-disabled="true" title="Not built yet">
        <span className="rail-pill"><Icon name="settings" size={22} /></span>Settings
      </span>
    </nav>
  )
}

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

  const [, clientId, plan] = /^\/clients\/([^/]+)(\/plan)?$/.exec(path) ?? []
  return (
    <div className="shell">
      <Rail />
      <main className="main">
        <div className="page">
          {failed && !data && <p role="alert">Couldn't reach the server. Reload to try again.</p>}
          {data && !clientId && <Clients data={data} onData={setData} />}
          {data && clientId && !plan && <Review data={data} clientId={clientId} />}
          {data && plan && <PlanWeek key={clientId} data={data} clientId={clientId} onData={setData} />}
        </div>
      </main>
    </div>
  )
}
