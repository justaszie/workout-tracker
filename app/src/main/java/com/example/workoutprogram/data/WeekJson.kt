package com.example.workoutprogram.data

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.net.URI
import java.net.URISyntaxException
import java.time.LocalDate

// The server's JSON for a week, whose shape is `Week` in web/shared/model.ts, and the smaller
// progress JSON holding only what the client entered.

/** Throws JSONException if [json] isn't a week. */
fun parseWeek(json: JSONObject): ProgramWeek {
    val coach = json.getJSONObject("coach")
    return ProgramWeek(
        id = json.getString("id"),
        block = json.getInt("block"),
        number = json.getInt("number"),
        theme = json.getString("theme"),
        startedOn = LocalDate.parse(json.getString("startedOn")),
        coach = Coach(coach.getString("name"), coach.getString("initials")),
        workouts = json.getJSONArray("workouts").map(::parseWorkout),
        finishedOn = json.date("finishedOn"),
        note = json.getString("note"),
    )
}

private fun parseWorkout(json: JSONObject) = Workout(
    id = json.getString("id"),
    name = json.getString("name"),
    exercises = json.getJSONArray("exercises").map(::parseExercise),
    finishedOn = json.date("finishedOn"),
    albumLink = json.getString("albumLink"),
)

private fun parseExercise(json: JSONObject) = Exercise(
    id = json.getString("id"),
    name = json.getString("name"),
    sets = json.getInt("sets"),
    reps = json.getInt("reps"),
    perSide = json.getBoolean("perSide"),
    load = parseLoad(json.getJSONObject("load")),
    coachNote = json.string("coachNote"),
    resources = json.getJSONArray("resources").map(::parseResource).filter { isWebLink(it.url) },
    lastWeek = json.optJSONObject("lastWeek")?.let {
        LastWeek(it.getDouble("weightKg"), it.getInt("rpe"))
    },
    log = json.optJSONObject("log")?.let(::parseLog),
)

private fun parseLoad(json: JSONObject) = when (val type = json.getString("type")) {
    "none" -> Load.None
    "fixed" -> Load.Fixed(json.getDouble("kg"))
    "rpe" -> Load.TargetRpe(json.getInt("rpe"))
    else -> throw JSONException("Unknown load type $type")
}

private fun parseResource(json: JSONObject) = Resource(
    kind = when (val kind = json.getString("kind")) {
        "demoVideo" -> Resource.Kind.DemoVideo
        "setupGuide" -> Resource.Kind.SetupGuide
        else -> throw JSONException("Unknown resource kind $kind")
    },
    url = json.getString("url"),
)

/** Links are free text from the coach, and opening one nothing can handle would crash the app. */
private fun isWebLink(url: String): Boolean = try {
    URI(url).scheme?.lowercase() in setOf("http", "https")
} catch (_: URISyntaxException) {
    false
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

/** What the client entered in [week]. Null values are left out, which the server allows for. */
fun progressJson(week: ProgramWeek): JSONObject = JSONObject().apply {
    put("weekId", week.id)
    put("finishedOn", week.finishedOn?.toString())
    put("note", week.note)
    put("workouts", JSONObject().apply {
        week.workouts.forEach { workout -> put(workout.id, progressJson(workout)) }
    })
}

private fun progressJson(workout: Workout) = JSONObject().apply {
    put("finishedOn", workout.finishedOn?.toString())
    put("albumLink", workout.albumLink)
    put("logs", JSONObject().apply {
        workout.exercises.forEach { exercise ->
            exercise.log?.let { put(exercise.id, progressJson(it)) }
        }
    })
}

private fun progressJson(log: ExerciseLog) = JSONObject().apply {
    put("weightKg", log.weightKg)
    put("rpe", log.rpe)
    put("repsPerSet", JSONArray(log.repsPerSet))
    put("note", log.note)
}

/** [plan] with [progress] applied, or unchanged if the progress belongs to another week. */
fun withProgress(plan: ProgramWeek, progress: JSONObject): ProgramWeek {
    if (progress.optString("weekId") != plan.id) return plan
    val workouts = progress.getJSONObject("workouts")
    return plan.copy(
        finishedOn = progress.date("finishedOn"),
        note = progress.getString("note"),
        workouts = plan.workouts.map { workout ->
            workouts.optJSONObject(workout.id)?.let { withProgress(workout, it) } ?: workout
        },
    )
}

/** [plan] with whatever the client entered in [local], the week shown so far. */
fun withProgress(plan: ProgramWeek, local: ProgramWeek?): ProgramWeek =
    if (local == null) plan else withProgress(plan, progressJson(local))

private fun withProgress(workout: Workout, json: JSONObject): Workout {
    val logs = json.getJSONObject("logs")
    return workout.copy(
        finishedOn = json.date("finishedOn"),
        albumLink = json.getString("albumLink"),
        exercises = workout.exercises.map { exercise ->
            exercise.copy(log = logs.optJSONObject(exercise.id)?.let(::parseLog))
        },
    )
}

private fun <T> JSONArray.map(parse: (JSONObject) -> T): List<T> =
    List(length()) { parse(getJSONObject(it)) }

// getString would turn a JSON null into the text "null".
private fun JSONObject.string(key: String): String? = if (isNull(key)) null else getString(key)

private fun JSONObject.date(key: String): LocalDate? = string(key)?.let(LocalDate::parse)
