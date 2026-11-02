package com.example.workoutprogram.data

import android.content.Context
import android.util.AtomicFile
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
class WeekStore private constructor(planFile: File, progressFile: File) {
    private val planFile = AtomicFile(planFile)
    private val progressFile = AtomicFile(progressFile)

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

    private fun <T> read(file: AtomicFile, parse: (JSONObject) -> T): T? = try {
        parse(JSONObject(String(file.readFully())))
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
        ).also { instance = it }
    }
}
