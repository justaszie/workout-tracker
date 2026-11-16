// The client app's state: the session, the current week, and what still has to reach the server.
//
// Like the Android app, the week and everything the client enters are kept on the phone, so the
// app works without a connection. Unlike it, a web page can't upload in the background: changes
// are sent while the app is open, and again each time it is opened or comes back online.

import { useSyncExternalStore } from 'react'
import { toDateString } from '../../shared/model.ts'
import { progressOf, withProgress, type ClientWeek } from '../../shared/progress.ts'
import * as api from './api.ts'
import { SignedOut, type Session } from './api.ts'
import { paths, replace } from './nav.ts'

/** Why there is no week to show. Once one is saved, failed refreshes go unnoticed. */
export type LoadState = 'loading' | 'none' | 'failed'

/** Past weeks newest first, or null until they have been loaded once. */
export interface PastWeeks {
  weeks: ClientWeek[] | null
  loading: boolean
  failed: boolean
}

interface State {
  /** Null while the sign-in screen should show. It turns null by itself when a session expires. */
  token: string | null
  week: ClientWeek | null
  load: LoadState
  /** Whether the coach is still missing some of what the client entered. */
  pending: boolean
  /** Whether the last attempt to reach the server found no connection. */
  offline: boolean
  history: PastWeeks
  /** Why the last sign-in was refused, in the server's words. */
  signInError: string | null
}

// Storage can be unavailable, as in some private windows. The app then works until it is closed.
function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(`workout.${key}`) ?? 'null')
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(`workout.${key}`)
    else localStorage.setItem(`workout.${key}`, JSON.stringify(value))
  } catch {
    // Nothing to do: the value stays in memory.
  }
}

let state: State = {
  token: read('token'),
  week: read('week'),
  load: 'loading',
  pending: read('pending') ?? false,
  offline: !navigator.onLine,
  history: { weeks: null, loading: false, failed: false },
  signInError: null,
}

const listeners = new Set<() => void>()

function set(change: Partial<State>) {
  state = { ...state, ...change }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useApp = () => useSyncExternalStore(subscribe, () => state)

export const today = () => toDateString(new Date())

// Signing in and out

function start(session: Session) {
  // What is saved on the phone belongs to whoever signed in last.
  if (read('clientId') !== session.clientId) {
    write('week', null)
    write('pending', null)
    write('history', null)
    set({ week: null, pending: false, history: { weeks: null, loading: false, failed: false } })
  }
  write('token', session.token)
  write('clientId', session.clientId)
  set({ token: session.token, signInError: null, load: 'loading' })
  if (location.pathname !== paths.week) replace(paths.week)
  // Sends anything logged before the last session ended.
  upload()
  refresh()
}

/** What was logged stays on the phone, for when the same client signs in again. */
function end() {
  write('token', null)
  set({ token: null })
}

export function signOut() {
  const { token } = state
  if (!token) return
  end()
  // The phone is signed out either way; the server's copy of the session expires unused.
  api.signOut(token).catch(() => {})
}

export async function devSignIn(clientId: string) {
  try {
    start(await api.devSignIn(clientId))
  } catch {
    set({ signInError: "Couldn't sign in. Check your connection and try again." })
  }
}

/** Google sends the browser back with the session, or the reason there is none, after the #. */
function finishGoogleSignIn() {
  const answer = new URLSearchParams(location.hash.slice(1))
  const token = answer.get('token')
  const clientId = answer.get('clientId')
  const error = answer.get('error')
  if (!error && !(token && clientId)) return
  history.replaceState(history.state, '', location.pathname)
  if (token && clientId) start({ token, clientId })
  else set({ signInError: error })
}

// The week

let refreshing = false
/** Counts the client's changes, to notice one made while a request was under way. */
let changes = 0

export async function refresh() {
  const { token } = state
  if (refreshing || !token) return
  refreshing = true
  set({ load: 'loading' })
  const before = { changes, pending: state.pending }
  try {
    const plan = await api.currentWeek(token)
    if (state.token !== token) return
    if (!plan) return set({ load: 'none', offline: false })
    const local = state.week
    // The phone's copy wins while it holds something the server may not have. Otherwise the
    // server's does, which may have changes from the client's other devices.
    const unsent = before.pending || state.pending || changes !== before.changes
    const week = unsent && local ? withProgress(plan, progressOf(local)) : plan
    write('week', week)
    if (local && local.id !== plan.id) {
      // Nothing entered in an earlier week can be sent any more.
      write('pending', null)
      set({ week, pending: false, offline: false })
    } else {
      set({ week, offline: false })
    }
  } catch (error) {
    if (error instanceof SignedOut) end()
    else set({ load: 'failed', offline: error instanceof TypeError })
  } finally {
    refreshing = false
  }
}

/** Applies what the client just did to the week, saves it on the phone and sends it to the coach. */
export function change(update: (week: ClientWeek) => ClientWeek) {
  if (!state.week) return
  const week = update(state.week)
  changes++
  write('week', week)
  write('pending', true)
  set({ week, pending: true })
  // A moment's wait, so typing a link doesn't send every letter.
  uploadIn(700)
}

const RETRY_FIRST_MS = 5_000
const RETRY_LONGEST_MS = 60_000
let uploading = false
let retryAfter = RETRY_FIRST_MS
let timer: ReturnType<typeof setTimeout> | undefined

function uploadIn(ms: number) {
  clearTimeout(timer)
  timer = setTimeout(upload, ms)
}

async function upload() {
  clearTimeout(timer)
  const { token, week } = state
  if (uploading || !state.pending || !token || !week) return
  uploading = true
  let sent = false
  try {
    await api.saveProgress(token, progressOf(week))
    sent = true
    retryAfter = RETRY_FIRST_MS
    if (state.week === week) {
      write('pending', null)
      set({ pending: false, offline: false })
    } else {
      set({ offline: false })
    }
  } catch (error) {
    if (error instanceof SignedOut) {
      end()
    } else {
      set({ offline: error instanceof TypeError })
      uploadIn(retryAfter)
      retryAfter = Math.min(retryAfter * 2, RETRY_LONGEST_MS)
    }
  } finally {
    uploading = false
  }
  // The client changed something else while this was on its way.
  if (sent && state.pending) upload()
}

// Past weeks

/** Shows the saved past weeks at once, then replaces them with the server's. */
export async function refreshHistory() {
  const { token } = state
  if (state.history.loading || !token) return
  set({ history: { weeks: state.history.weeks ?? read('history'), loading: true, failed: false } })
  try {
    const weeks = await api.pastWeeks(token)
    write('history', weeks)
    set({ history: { weeks, loading: false, failed: false } })
  } catch (error) {
    set({ history: { ...state.history, loading: false, failed: !(error instanceof SignedOut) } })
    if (error instanceof SignedOut) end()
  }
}

// Each return to the app picks up whatever the coach has published since, and sends what is waiting.

addEventListener('online', () => {
  set({ offline: false })
  upload()
  refresh()
})
addEventListener('offline', () => set({ offline: true }))
document.addEventListener('visibilitychange', () => {
  // On the way out there may be no later chance to send the last change.
  upload()
  if (document.visibilityState === 'visible') refresh()
})

finishGoogleSignIn()
upload()
refresh()
