import { useCallback, useEffect, useRef, useState } from 'react'
import type { Client } from '../../shared/model.ts'
import { devClients, signInConfig, type SignInConfig } from './api.ts'
import { devSignIn } from './store.ts'
import { Message } from './ui.tsx'

// The part of Google's sign-in script this screen uses.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; ux_mode: 'redirect'; login_uri: string }): void
          renderButton(parent: HTMLElement, options: Record<string, string | number>): void
        }
      }
    }
  }
}

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client'

function loadGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) return resolve()
    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Couldn't load Google sign-in."))
    document.head.append(script)
  })
}

/** [error] is why the last attempt was refused, in the server's words. */
export function SignInScreen({ error }: { error: string | null }) {
  const [config, setConfig] = useState<SignInConfig | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const onGoogleFailed = useCallback(() => setFailed(true), [])

  useEffect(() => {
    setFailed(false)
    signInConfig().then(setConfig, () => setFailed(true))
  }, [attempt])

  return (
    <Message title="Sign in">
      <p className="support">Use the Google account your coach has for you.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {failed && (
        <>
          <p className="error" role="alert">Couldn't reach the server. Check your connection and try again.</p>
          <div className="message-actions">
            <button type="button" className="button" onClick={() => setAttempt(attempt + 1)}>Try again</button>
          </div>
        </>
      )}
      {config?.googleClientId && <GoogleButton clientId={config.googleClientId} onFailed={onGoogleFailed} />}
      {config && !config.googleClientId && <p className="support">Google sign-in is not set up on this server.</p>}
      {config?.devSignIn && <DevSignIn />}
    </Message>
  )
}

/**
 * Google draws the button itself. Tapping it leaves for Google's page, which sends the browser to
 * the server and from there back to the app, signed in. A popup would be simpler, but can't
 * report back to an app opened from an iPhone's Home Screen.
 */
function GoogleButton({ clientId, onFailed }: { clientId: string; onFailed: () => void }) {
  const holder = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let current = true
    loadGoogle().then(() => {
      if (!current || !holder.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'redirect',
        login_uri: `${location.origin}/api/auth/google/redirect`,
      })
      window.google.accounts.id.renderButton(holder.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left',
      })
    }, () => current && onFailed())
    return () => {
      current = false
    }
  }, [clientId, onFailed])
  return <div ref={holder} className="google-button" />
}

/** Signs in as any client without Google, on a server run without a password. */
function DevSignIn() {
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  useEffect(() => {
    devClients().then(setClients, () => {})
  }, [])
  if (!clients.length) return null
  return (
    <div className="dev-sign-in">
      <p className="caption">Developer sign-in</p>
      {clients.map((client) => (
        <button key={client.id} type="button" className="button button-outline button-plain" onClick={() => devSignIn(client.id)}>
          {client.name}
        </button>
      ))}
    </div>
  )
}
