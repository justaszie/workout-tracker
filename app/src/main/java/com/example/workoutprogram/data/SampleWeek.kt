package com.example.workoutprogram.data

import java.net.URLEncoder
import java.time.LocalDate

private fun demo(name: String) = Resource(
    Resource.Kind.DemoVideo,
    "https://www.youtube.com/results?search_query=" + URLEncoder.encode("$name demo", "UTF-8"),
)

private fun guide(name: String) = Resource(
    Resource.Kind.SetupGuide,
    "https://www.google.com/search?q=" + URLEncoder.encode("$name setup", "UTF-8"),
)

private fun exercise(
    id: String,
    name: String,
    sets: Int,
    reps: Int,
    load: Load = Load.None,
    log: ExerciseLog? = null,
) = Exercise(id, name, sets, reps, load = load, resources = listOf(demo(name)), log = log)

private val MONDAY = LocalDate.of(2026, 10, 26)
private val WEDNESDAY = MONDAY.plusDays(2)

private fun done(sets: Int, reps: Int, rpe: Int, kg: Double? = null) =
    ExerciseLog(kg, rpe, List(sets) { reps })

/**
 * A week partway through, for previews and tests. The app itself shows the week the coach
 * published.
 */
val SampleWeek = ProgramWeek(
    id = "sample",
    block = 2,
    number = 3,
    theme = "Volume week — last push before the deload",
    startedOn = MONDAY,
    coach = Coach(name = "Coach Marta", initials = "MK"),
    workouts = listOf(
        Workout(
            id = "lower-a",
            name = "Lower A",
            finishedOn = MONDAY,
            exercises = listOf(
                exercise("back-squat", "Back squat", 4, 6, Load.Fixed(90.0), done(4, 6, 8, 90.0)),
                exercise("romanian-deadlift", "Romanian deadlift", 3, 8, Load.Fixed(70.0), done(3, 8, 7, 70.0)),
                exercise("leg-press", "Leg press", 3, 12, Load.TargetRpe(8), done(3, 12, 8, 120.0)),
                exercise("leg-curl", "Seated leg curl", 3, 12, Load.TargetRpe(8), done(3, 12, 8, 40.0)),
                exercise("calf-raise", "Standing calf raise", 3, 15, Load.Fixed(50.0), done(3, 15, 7, 50.0)),
                exercise("plank", "Plank shoulder tap", 3, 20, log = done(3, 20, 6)),
            ),
        ),
        Workout(
            id = "upper-a",
            name = "Upper A",
            finishedOn = WEDNESDAY,
            exercises = listOf(
                exercise("overhead-press", "Overhead press", 4, 6, Load.Fixed(45.0), done(4, 6, 8, 45.0)),
                exercise("pull-up", "Assisted pull-up", 3, 8, Load.TargetRpe(8), done(3, 8, 8, 20.0)),
                exercise("incline-press", "Incline dumbbell press", 3, 10, Load.TargetRpe(8), done(3, 10, 8, 24.0)),
                exercise("cable-row", "Seated cable row", 3, 12, Load.Fixed(55.0), done(3, 12, 7, 55.0)),
                exercise("face-pull", "Face pull", 3, 15, log = done(3, 15, 6)),
            ),
        ),
        Workout(
            id = "upper-b",
            name = "Upper B",
            exercises = listOf(
                Exercise(
                    id = "bench-press",
                    name = "Bench press",
                    sets = 4,
                    reps = 6,
                    load = Load.Fixed(70.0),
                    coachNote = "Pause 1 s on the chest every rep.",
                    resources = listOf(demo("Bench press")),
                    log = ExerciseLog(72.5, 8, List(4) { 6 }),
                ),
                Exercise(
                    id = "shoulder-press",
                    name = "Seated dumbbell shoulder press",
                    sets = 3,
                    reps = 10,
                    load = Load.TargetRpe(8),
                    coachNote = "Pick a weight you can control on the way down. " +
                        "Stop the set if your lower back arches.",
                    resources = listOf(
                        demo("Seated dumbbell shoulder press"),
                        guide("Seated dumbbell shoulder press"),
                    ),
                    lastWeek = LastWeek(16.0, 7),
                ),
                Exercise(
                    id = "chest-row",
                    name = "Chest-supported row",
                    sets = 3,
                    reps = 12,
                    load = Load.Fixed(24.0),
                    resources = listOf(demo("Chest-supported row")),
                ),
                Exercise(
                    id = "band-pull-apart",
                    name = "Band pull-apart",
                    sets = 3,
                    reps = 15,
                    coachNote = "Light band. Slow on the way back, squeeze the shoulder blades.",
                    resources = listOf(guide("Band pull-apart")),
                ),
                Exercise(
                    id = "dead-bug",
                    name = "Dead bug",
                    sets = 3,
                    reps = 8,
                    perSide = true,
                    resources = listOf(demo("Dead bug")),
                ),
            ),
        ),
        Workout(
            id = "lower-b",
            name = "Lower B",
            exercises = listOf(
                exercise("deadlift", "Deadlift", 4, 5, Load.Fixed(110.0)),
                exercise("front-squat", "Front squat", 3, 8, Load.TargetRpe(8)),
                exercise("split-squat", "Bulgarian split squat", 3, 10, Load.TargetRpe(8)),
                exercise("hip-thrust", "Barbell hip thrust", 3, 10, Load.Fixed(80.0)),
                exercise("leg-extension", "Leg extension", 3, 15, Load.TargetRpe(8)),
                exercise("side-plank", "Side plank reach", 3, 10),
            ),
        ),
        Workout(
            id = "conditioning",
            name = "Conditioning",
            exercises = listOf(
                exercise("kettlebell-swing", "Kettlebell swing", 4, 20, Load.Fixed(20.0)),
                exercise("box-step-up", "Box step-up", 3, 12),
                exercise("mountain-climber", "Mountain climber", 3, 30),
                exercise("burpee", "Burpee", 3, 10),
            ),
        ),
    ),
)
