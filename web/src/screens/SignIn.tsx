import { useEffect, useRef, useState } from 'react'
import { ApiError, coachSignIn, signInWithGoogle } from '../api.ts'
import { ErrorList, Icon } from '../components/index.ts'

// The part of Google Identity Services this screen uses.
interface GoogleId {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let googleScript: Promise<GoogleId> | undefined

/** Loads Google's sign-in script once. A failed load is forgotten, so reopening the screen retries. */
function loadGoogle(): Promise<GoogleId> {
  googleScript ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('No Google')))
    script.onerror = () => {
      script.remove()
      reject(new Error('Google sign-in did not load'))
    }
    document.head.append(script)
  }).catch((error) => {
    googleScript = undefined
    throw error
  })
  return googleScript
}

/** Shown instead of the app while the server doesn't know the browser as the coach. */
export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const button = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    let closed = false
    const start = async () => {
      const { googleClientId } = await coachSignIn()
      if (closed) return
      // A server with only a password signs the coach in through the browser's own prompt.
      if (!googleClientId) return setErrors(['Reload the page to sign in.'])
      const google = await loadGoogle()
      if (closed || !button.current) return
      google.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          signInWithGoogle(credential).then(onSignedIn, (error) => {
            setErrors(error instanceof ApiError ? error.errors : ["Couldn't sign in. Try again."])
          })
        },
      })
      google.renderButton(button.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280 })
    }
    start().catch(() => {
      if (!closed) setErrors(["Couldn't load Google sign-in. Check your connection and reload."])
    })
    return () => { closed = true }
  }, [onSignedIn])

  return (
    <main className="sign-in">
      <section className="card card-padded sign-in-card" aria-labelledby="sign-in-title">
        <span className="rail-logo" aria-hidden="true"><Icon name="logo" size={26} /></span>
        <h1 id="sign-in-title">Sign in</h1>
        <p className="subtitle">Use the coach's Google account.</p>
        <div ref={button} className="sign-in-button" />
        {errors.length > 0 && <ErrorList title="Couldn't sign in" errors={errors} />}
      </section>
    </main>
  )
}
