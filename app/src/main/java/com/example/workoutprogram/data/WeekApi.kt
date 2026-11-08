package com.example.workoutprogram.data

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.Base64

/** The coach server's endpoints for this client. Calls block, so keep them off the main thread. */
class WeekApi(
    private val baseUrl: String,
    private val clientId: String,
    private val password: String,
) {
    /** The current week as JSON, or null if the server has none for this client. */
    fun currentWeek(): String? {
        val connection = connect("current-week")
        try {
            return when (val status = connection.responseCode) {
                HttpURLConnection.HTTP_OK -> connection.inputStream.bufferedReader().use { it.readText() }
                HttpURLConnection.HTTP_NOT_FOUND -> null
                else -> throw IOException("Server answered $status.")
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
                else -> throw IOException("Server answered $status.")
            }
        } finally {
            connection.disconnect()
        }
    }

    /**
     * Replaces what the server holds for week [weekId] with [progress]. Saving the same progress
     * again changes nothing. Throws IOException if the upload is worth trying again; progress for
     * a week that's no longer current isn't, so it's dropped without one.
     */
    fun saveProgress(weekId: String, progress: String) {
        val connection = connect("weeks/$weekId/progress")
        connection.requestMethod = "PUT"
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        try {
            connection.outputStream.use { it.write(progress.toByteArray()) }
            when (val status = connection.responseCode) {
                HttpURLConnection.HTTP_OK,
                HttpURLConnection.HTTP_NOT_FOUND,
                HttpURLConnection.HTTP_CONFLICT -> Unit
                else -> throw IOException("Server answered $status.")
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun connect(path: String): HttpURLConnection {
        if (clientId.isEmpty()) throw IOException("coach.clientId is not set in local.properties.")
        val connection = URL("$baseUrl/api/clients/$clientId/$path").openConnection() as HttpURLConnection
        connection.connectTimeout = TIMEOUT_MILLIS
        connection.readTimeout = TIMEOUT_MILLIS
        if (password.isNotEmpty()) {
            // The server ignores the username.
            val credentials = Base64.getEncoder().encodeToString("client:$password".toByteArray())
            connection.setRequestProperty("Authorization", "Basic $credentials")
        }
        return connection
    }

    private companion object {
        const val TIMEOUT_MILLIS = 15_000
    }
}
