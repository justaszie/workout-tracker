package com.example.workoutprogram.data

import android.content.Context
import android.util.AtomicFile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException

/**
 * The session token the server gave this device at sign-in, and which client it was for. The file
 * is private to the app and left out of backups, so a restored phone has to sign in again.
 *
 * The screens and [WeekUploadWorker] share one instance.
 */
class SessionStore private constructor(file: File) {
    private val file = AtomicFile(file)
    /** The client who signed in last, even after they signed out. */
    var clientId: String? = null
        private set
    private val _token = MutableStateFlow<String?>(null)

    /** Null while signed out. */
    val token: StateFlow<String?> = _token.asStateFlow()

    init {
        try {
            val saved = JSONObject(String(this.file.readFully()))
            clientId = saved.optString("clientId").ifEmpty { null }
            _token.value = saved.optString("token").ifEmpty { null }
        } catch (_: IOException) {
        } catch (_: JSONException) {
        }
    }

    @Synchronized
    fun start(token: String, clientId: String) {
        this.clientId = clientId
        _token.value = token
        save()
    }

    /** Signs out. The client is remembered, so signing in again as them keeps what they logged. */
    @Synchronized
    fun end() {
        _token.value = null
        save()
    }

    private fun save() {
        val json = JSONObject().putOpt("clientId", clientId).putOpt("token", _token.value)
        val stream = file.startWrite()
        try {
            stream.write(json.toString().toByteArray())
            file.finishWrite(stream)
        } catch (_: IOException) {
            // Not saved, so the next launch starts signed out.
            file.failWrite(stream)
        }
    }

    companion object {
        private var instance: SessionStore? = null

        @Synchronized
        fun of(context: Context): SessionStore =
            instance ?: SessionStore(File(context.noBackupFilesDir, "session.json")).also { instance = it }
    }
}
