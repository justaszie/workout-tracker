package com.example.workoutprogram.data

import java.time.LocalDate

data class Coach(val name: String, val initials: String)

sealed interface Load {
    /** No weight is prescribed, so none is logged. */
    data object None : Load
    data class Fixed(val kg: Double) : Load
    /** The client picks a weight that reaches this RPE. */
    data class TargetRpe(val rpe: Int) : Load
}

data class Resource(val kind: Kind, val url: String) {
    enum class Kind { DemoVideo, SetupGuide }
}

data class LastWeek(val weightKg: Double, val rpe: Int)

data class ExerciseLog(
    val weightKg: Double?,
    val rpe: Int,
    val repsPerSet: List<Int>,
    val note: String = "",
)

data class Exercise(
    val id: String,
    val name: String,
    val sets: Int,
    val reps: Int,
    val perSide: Boolean = false,
    val load: Load = Load.None,
    val coachNote: String? = null,
    val resources: List<Resource> = emptyList(),
    val lastWeek: LastWeek? = null,
    val log: ExerciseLog? = null,
)

enum class WorkoutStatus { Todo, InProgress, Done }

data class Workout(
    val id: String,
    val name: String,
    val exercises: List<Exercise>,
    val finishedOn: LocalDate? = null,
    val albumLink: String = "",
) {
    val loggedCount: Int get() = exercises.count { it.log != null }

    val status: WorkoutStatus
        get() = when {
            finishedOn != null -> WorkoutStatus.Done
            loggedCount > 0 -> WorkoutStatus.InProgress
            else -> WorkoutStatus.Todo
        }

    /** The next exercise after [exerciseId] still waiting for a log, if any. */
    fun nextUnlogged(exerciseId: String): Exercise? =
        exercises.dropWhile { it.id != exerciseId }.drop(1).firstOrNull { it.log == null }
}

data class ProgramWeek(
    val block: Int,
    val number: Int,
    val theme: String,
    val startedOn: LocalDate,
    val coach: Coach,
    val workouts: List<Workout>,
    val finishedOn: LocalDate? = null,
    val note: String = "",
) {
    val isFinished: Boolean get() = finishedOn != null

    fun workout(id: String): Workout? = workouts.firstOrNull { it.id == id }

    fun count(status: WorkoutStatus): Int = workouts.count { it.status == status }

    fun logExercise(workoutId: String, exerciseId: String, log: ExerciseLog): ProgramWeek =
        updateWorkout(workoutId) { workout ->
            workout.copy(
                exercises = workout.exercises.map {
                    if (it.id == exerciseId) it.copy(log = log) else it
                },
            )
        }

    fun finishWorkout(workoutId: String, on: LocalDate): ProgramWeek =
        updateWorkout(workoutId) { it.copy(finishedOn = on) }

    fun setAlbumLink(workoutId: String, link: String): ProgramWeek =
        updateWorkout(workoutId) { it.copy(albumLink = link) }

    fun finish(on: LocalDate, note: String): ProgramWeek =
        copy(finishedOn = on, note = note.trim())

    fun reopen(): ProgramWeek = copy(finishedOn = null)

    private fun updateWorkout(id: String, change: (Workout) -> Workout) =
        copy(workouts = workouts.map { if (it.id == id) change(it) else it })
}

/** Whole numbers lose the trailing ".0": 70.0 reads "70", 72.5 stays "72.5". */
fun formatKg(kg: Double): String =
    if (kg % 1.0 == 0.0) kg.toLong().toString() else kg.toString()
