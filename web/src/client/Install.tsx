import { useSyncExternalStore } from 'react'
import { Icon, Message } from './ui.tsx'

// On an iPhone, an app opened from the Home Screen keeps its storage apart from Safari's, so a
// client who signs in in the browser first has to sign in again there. Asking before sign-in
// means they do it once. Safari also clears a site's storage after a week or so without a visit,
// which doesn't happen to a Home Screen app.

/** Chrome's offer to install the app, which it only makes on Android and desktop. */
interface InstallPrompt extends Event {
  prompt(): Promise<unknown>
}

let installPrompt: InstallPrompt | null = null
const listeners = new Set<() => void>()
addEventListener('beforeinstallprompt', (event) => {
  // Keeps Chrome's own banner away; the button below shows the prompt instead.
  event.preventDefault()
  installPrompt = event as InstallPrompt
  listeners.forEach((listener) => listener())
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const userAgent = navigator.userAgent
// An iPad says it is a Mac, but a Mac has no touch screen.
const isIos = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)
const isAndroid = /Android/.test(userAgent)
const isSafari = isIos && !/CriOS|FxiOS|EdgiOS/.test(userAgent)
const isInstalled = matchMedia('(display-mode: standalone)').matches
  || (navigator as { standalone?: boolean }).standalone === true

const DISMISSED = 'workout.browser'

/** Whether to ask a signed-out client to install the app first: on a phone, in a browser tab, once. */
export function shouldOfferInstall(): boolean {
  if (isInstalled || !(isIos || isAndroid)) return false
  try {
    return !localStorage.getItem(DISMISSED)
  } catch {
    return false
  }
}

export function InstallScreen({ onContinue }: { onContinue: () => void }) {
  const prompt = useSyncExternalStore(subscribe, () => installPrompt)
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, '1')
    } catch {
      // Asked again next time, which is no harm.
    }
    onContinue()
  }
  return (
    <Message title="Add it to your Home Screen">
      <p className="support">It opens full screen like any other app, and you only sign in once.</p>
      {isIos ? (
        <ol className="rows install-steps">
          <li className="row">
            <div className="badge">1</div>
            <div className="row-title">Tap <strong>Share</strong> {isSafari ? "in Safari's toolbar" : "in your browser's menu"}</div>
            <Icon name="share" />
          </li>
          <li className="row">
            <div className="badge">2</div>
            <div className="row-title">Choose <strong>Add to Home Screen</strong></div>
            <Icon name="addBox" />
          </li>
          <li className="row">
            <div className="badge">3</div>
            <div className="row-title">Open <strong>Workout Program</strong> from your Home Screen and sign in there</div>
          </li>
        </ol>
      ) : prompt ? (
        <div className="message-actions">
          <button type="button" className="button" onClick={() => prompt.prompt()}>Install app</button>
        </div>
      ) : (
        <p className="support">Open your browser's menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>
      )}
      <button type="button" className="text-button" onClick={dismiss}>Continue in the browser</button>
    </Message>
  )
}
