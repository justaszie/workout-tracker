package com.example.workoutprogram.data

import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** The server no longer accepts this device's session, or it has none. Sign in again. */
class SignedOutException : IOException("Not signed in.")

sealed interface SignInResult {
    data class SignedIn(val token: String, val clientId: String) : SignInResult

    /** The server's reason, such as the coach not having added this Google account. */
    data class Refused(val reason: String) : SignInResult
}

/**
 * The coach server's endpoints for the signed-in client. Calls block, so keep them off the main
 * thread. [token] is read on each call; the week calls throw [SignedOutException] without one.
 */
class WeekApi(
    private val baseUrl: String,
    private val token: () -> String?,
) {
    /** Trades the ID token from Sign in with Google for a session. */
    fun signInWithGoogle(idToken: String): SignInResult =
        signIn("google", JSONObject().put("idToken", idToken))

    /** Signs in as [clientId] without Google. Only a server running without a password allows it. */
    fun signInForDevelopment(clientId: String): SignInResult =
        signIn("dev", JSONObject().put("clientId", clientId))

    private fun signIn(method: String, body: JSONObject): SignInResult {
        val connection = open("auth/$method")
        try {
            connection.send("POST", body.toString())
            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val session = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                return SignInResult.SignedIn(session.getString("token"), session.getString("clientId"))
            }
            val refusal = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val reason = JSONObject(refusal).getJSONArray("errors").getString(0)
            return SignInResult.Refused(reason)
        } catch (_: JSONException) {
            throw IOException("Server answered ${connection.responseCode}.")
        } finally {
            connection.disconnect()
        }
    }

    /** Ends the session [token] on the server. The device is signed out either way. */
    fun signOut(token: String) {
        val connection = open("auth/sign-out")
        try {
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.requestMethod = "POST"
            connection.responseCode
        } finally {
            connection.disconnect()
        }
    }

    /** The current week as JSON, or null if the server has none for this client. */
    fun currentWeek(): String? {
        val connection = connect("current-week")
        try {
            return when (val status = connection.responseCode) {
                HttpURLConnection.HTTP_OK -> connection.inputStream.bufferedReader().use { it.readText() }
                HttpURLConnection.HTTP_NOT_FOUND -> null
                else -> throw failure(status)
            }
        } finally {
            connection.disconnect()
        }
    }

    /** Every week before the current one, newest first, as a JSON array of weeks. */
    fun pastWeeks(): String {
        val connection = connect("past-weeks")
        try {
            return when (val status = connection.responseCode) {
                HttpURLConnection.HTTP_OK -> connection.inputStream.bufferedReader().use { it.readText() }
                else -> throw failure(status)
            }
        } finally {
            connection.disconnect()
        }
    }

    /**
     * Replaces what the server holds for week [weekId] with [progress]. Saving the same progress
     * again changes nothing. Throws IOException if the upload is worth trying again, which for
     * [SignedOutException] is after signing in; progress for a week that's no longer current
     * isn't, so it's dropped without one.
     */
    fun saveProgress(weekId: String, progress: String) {
        val connection = connect("weeks/$weekId/progress")
        try {
            connection.send("PUT", progress)
            when (val status = connection.responseCode) {
                HttpURLConnection.HTTP_OK,
                HttpURLConnection.HTTP_NOT_FOUND,
                HttpURLConnection.HTTP_CONFLICT -> Unit
                else -> throw failure(status)
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun connect(path: String): HttpURLConnection {
        val session = token() ?: throw SignedOutException()
        return open("me/$path").apply { setRequestProperty("Authorization", "Bearer $session") }
    }

    private fun open(path: String): HttpURLConnection {
        val connection = URL("$baseUrl/api/$path").openConnection() as HttpURLConnection
        connection.connectTimeout = TIMEOUT_MILLIS
        connection.readTimeout = TIMEOUT_MILLIS
        return connection
    }

    private fun HttpURLConnection.send(method: String, json: String) {
        requestMethod = method
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        outputStream.use { it.write(json.toByteArray()) }
    }

    private fun failure(status: Int): IOException =
        if (status == HttpURLConnection.HTTP_UNAUTHORIZED) SignedOutException() else IOException("Server answered $status.")

    private companion object {
        const val TIMEOUT_MILLIS = 15_000
    }
}
