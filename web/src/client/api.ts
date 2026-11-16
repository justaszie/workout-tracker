// The server's endpoints for the client app. A failed fetch throws TypeError, which callers take
// to mean the phone is offline.

import type { Client } from '../../shared/model.ts'
import type { ClientWeek, Progress } from '../../shared/progress.ts'

/** The server no longer accepts this session. Sign in again. */
export class SignedOut extends Error {}

export interface Session {
  token: string
  clientId: string
}

export interface SignInConfig {
  /** Null when the server can't check Google sign-ins. */
  googleClientId: string | null
  /** Whether the server lets anyone sign in as any client, as it does when run without a password. */
  devSignIn: boolean
}

async function send(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...init.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init.token ? { Authorization: `Bearer ${init.token}` } : undefined,
    },
  })
  if (response.status === 401 && init.token) throw new SignedOut()
  return response
}

const failure = (response: Response) => new Error(`Server answered ${response.status}.`)

export async function signInConfig(): Promise<SignInConfig> {
  const response = await send('/auth/config')
  if (!response.ok) throw failure(response)
  return response.json()
}

/** The clients a developer can sign in as, on a server that allows it. */
export async function devClients(): Promise<Pick<Client, 'id' | 'name'>[]> {
  const response = await send('/data')
  if (!response.ok) throw failure(response)
  return (await response.json()).clients
}

export async function devSignIn(clientId: string): Promise<Session> {
  const response = await send('/auth/dev', { method: 'POST', body: JSON.stringify({ clientId }) })
  if (!response.ok) throw failure(response)
  return response.json()
}

/** Ends the session on the server. The phone is signed out either way. */
export const signOut = (token: string) => send('/auth/sign-out', { method: 'POST', token, keepalive: true })

/** The current week, or null if the coach hasn't published one for this client. */
export async function currentWeek(token: string): Promise<ClientWeek | null> {
  const response = await send('/me/current-week', { token })
  if (response.status === 404) return null
  if (!response.ok) throw failure(response)
  return response.json()
}

/** Every week before the current one, newest first. */
export async function pastWeeks(token: string): Promise<ClientWeek[]> {
  const response = await send('/me/past-weeks', { token })
  if (!response.ok) throw failure(response)
  return response.json()
}

/**
 * Replaces what the server holds for the week with [progress]. Saving the same progress again
 * changes nothing. Throws if the upload is worth trying again; progress for a week that's no
 * longer current isn't, so it's dropped without an error.
 */
export async function saveProgress(token: string, progress: Progress): Promise<void> {
  const response = await send(`/me/weeks/${progress.weekId}/progress`, {
    method: 'PUT',
    token,
    body: JSON.stringify(progress),
    // Lets the request finish if the client closes the app right after logging.
    keepalive: true,
  })
  if (!response.ok && response.status !== 404 && response.status !== 409) throw failure(response)
}
