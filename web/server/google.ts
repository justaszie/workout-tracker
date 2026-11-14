import { OAuth2Client } from 'google-auth-library'

export interface GoogleIdentity {
  /** Google's id for the account. Unlike the email address, it never changes. */
  sub: string
  email: string
}

export type VerifyGoogleToken = (idToken: string) => Promise<GoogleIdentity | null>

/**
 * Checks ID tokens from Sign in with Google: that Google signed them, that they haven't expired,
 * and that they were issued for [clientId], the OAuth client ID of this app. Without the last
 * check, a token someone got by signing in to any other app would be accepted here.
 */
export function googleVerifier(clientId: string): VerifyGoogleToken {
  const google = new OAuth2Client()
  return async (idToken) => {
    try {
      const ticket = await google.verifyIdToken({ idToken, audience: clientId })
      const payload = ticket.getPayload()
      if (!payload?.email || !payload.email_verified) return null
      return { sub: payload.sub, email: payload.email }
    } catch (error) {
      console.warn('Google sign-in refused:', (error as Error).message)
      return null
    }
  }
}
