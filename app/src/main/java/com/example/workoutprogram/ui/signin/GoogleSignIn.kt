package com.example.workoutprogram.ui.signin

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.io.IOException

/**
 * Shows Google's account picker and returns the ID token for the account the client chose, or
 * null if they backed out. The token is issued for [serverClientId], the coach server's OAuth
 * client ID, so the server can check it was meant for this app.
 *
 * [activity] has to be an Activity context, since the picker opens on top of it.
 */
suspend fun googleIdToken(activity: Context, serverClientId: String): String? {
    val request = GetCredentialRequest.Builder()
        .addCredentialOption(GetSignInWithGoogleOption.Builder(serverClientId).build())
        .build()
    val credential = try {
        CredentialManager.create(activity).getCredential(activity, request).credential
    } catch (_: GetCredentialCancellationException) {
        return null
    } catch (e: GetCredentialException) {
        throw IOException(e)
    }
    if (credential !is CustomCredential ||
        credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
    ) {
        throw IOException("Google returned a ${credential.type} credential.")
    }
    return GoogleIdTokenCredential.createFrom(credential.data).idToken
}
