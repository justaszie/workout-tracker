package com.example.workoutprogram.data

import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.time.LocalDate

/**
 * Saves what the client entered as JSON. The plan itself comes from the [base] week, so only
 * logs, notes, links and finish dates are stored and merged back on load.
 */
class WeekStore(file: File, private val base: ProgramWeek = SampleWeek) {
    private val file = AtomicFile(file)

    fun load(): ProgramWeek = try {
        merge(JSONObject(String(file.readFully())))
    } catch (_: IOException) {
        base
    } catch (_: JSONException) {
        base
    }

    fun save(week: ProgramWeek) {
        val stream = file.startWrite()
        try {
            stream.write(toJson(week).toString().toByteArray())
            file.finishWrite(stream)
        } catch (e: IOException) {
            file.failWrite(stream)
            throw e
        }
    }

    private fun toJson(week: ProgramWeek) = JSONObject().apply {
        put("finishedOn", week.finishedOn?.toString())
        put("note", week.note)
        put("workouts", JSONObject().apply {
            week.workouts.forEach { workout -> put(workout.id, toJson(workout)) }
        })
    }

    private fun toJson(workout: Workout) = JSONObject().apply {
        put("finishedOn", workout.finishedOn?.toString())
        put("albumLink", workout.albumLink)
        put("logs", JSONObject().apply {
            workout.exercises.forEach { exercise ->
                exercise.log?.let { put(exercise.id, toJson(it)) }
            }
        })
    }

    private fun toJson(log: ExerciseLog) = JSONObject().apply {
        put("weightKg", log.weightKg)
        put("rpe", log.rpe)
        put("repsPerSet", JSONArray(log.repsPerSet))
        put("note", log.note)
    }

    private fun merge(json: JSONObject): ProgramWeek {
        val workouts = json.getJSONObject("workouts")
        return base.copy(
            finishedOn = json.date("finishedOn"),
            note = json.getString("note"),
            workouts = base.workouts.map { workout ->
                workouts.optJSONObject(workout.id)?.let { merge(workout, it) } ?: workout
            },
        )
    }

    private fun merge(workout: Workout, json: JSONObject): Workout {
        val logs = json.getJSONObject("logs")
        return workout.copy(
            finishedOn = json.date("finishedOn"),
            albumLink = json.getString("albumLink"),
            exercises = workout.exercises.map { exercise ->
                exercise.copy(log = logs.optJSONObject(exercise.id)?.let(::parseLog))
            },
        )
    }

    private fun parseLog(json: JSONObject): ExerciseLog {
        val reps = json.getJSONArray("repsPerSet")
        return ExerciseLog(
            weightKg = if (json.isNull("weightKg")) null else json.getDouble("weightKg"),
            rpe = json.getInt("rpe"),
            repsPerSet = List(reps.length()) { reps.getInt(it) },
            note = json.getString("note"),
        )
    }

    private fun JSONObject.date(key: String): LocalDate? =
        if (isNull(key)) null else LocalDate.parse(getString(key))
}
