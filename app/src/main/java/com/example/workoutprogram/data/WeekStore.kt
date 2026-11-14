package com.example.workoutprogram.data

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException

/**
 * Keeps the published plan and what the client entered as separate JSON files, so the week is
 * still there without a connection. Progress is merged back onto the plan on load.
 *
 * The screens and [WeekUploadWorker] share one instance: reading an AtomicFile during a write
 * deletes that write, so every access is synchronized.
 */
class WeekStore private constructor(planFile: File, progressFile: File, historyFile: File) {
    private val planFile = AtomicFile(planFile)
    private val progressFile = AtomicFile(progressFile)
    private val historyFile = AtomicFile(historyFile)

    /** The saved week, or null if no plan has been saved yet. */
    @Synchronized
    fun load(): ProgramWeek? {
        val plan = read(planFile, ::parseWeek) ?: return null
        return read(progressFile) { withProgress(plan, it) } ?: plan
    }

    /** Saves [json], the plan as the server sent it. */
    @Synchronized
    fun savePlan(json: String) = write(planFile, json)

    @Synchronized
    fun save(week: ProgramWeek) = write(progressFile, progressJson(week).toString())

    /** What [save] last saved, or null if nothing has been. */
    @Synchronized
    fun progress(): JSONObject? = read(progressFile) { it }

    /** The past weeks last saved, newest first, or null if none have been saved yet. */
    @Synchronized
    fun loadPastWeeks(): List<ProgramWeek>? = readText(historyFile) { parseWeeks(JSONArray(it)) }

    /** Saves [json], the past weeks as the server sent them. */
    @Synchronized
    fun savePastWeeks(json: String) = write(historyFile, json)

    /** Forgets everything, for when a different client signs in on this device. */
    @Synchronized
    fun clear() = listOf(planFile, progressFile, historyFile).forEach { it.delete() }

    private fun <T> read(file: AtomicFile, parse: (JSONObject) -> T): T? =
        readText(file) { parse(JSONObject(it)) }

    private fun <T> readText(file: AtomicFile, parse: (String) -> T): T? = try {
        parse(String(file.readFully()))
    } catch (_: IOException) {
        null
    } catch (_: JSONException) {
        null
    }

    private fun write(file: AtomicFile, text: String) {
        val stream = file.startWrite()
        try {
            stream.write(text.toByteArray())
            file.finishWrite(stream)
        } catch (e: IOException) {
            file.failWrite(stream)
            throw e
        }
    }

    companion object {
        private var instance: WeekStore? = null

        @Synchronized
        fun of(context: Context): WeekStore = instance ?: WeekStore(
            planFile = File(context.filesDir, "plan.json"),
            progressFile = File(context.filesDir, "week.json"),
            historyFile = File(context.filesDir, "history.json"),
        ).also { instance = it }
    }
}
