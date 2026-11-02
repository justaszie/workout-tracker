package com.example.workoutprogram.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class ProgramWeekTest {
    private val today = LocalDate.of(2026, 10, 31)
    private val log = ExerciseLog(weightKg = 18.0, rpe = 8, repsPerSet = listOf(10, 10, 10))

    private fun ProgramWeek.status(id: String) = workout(id)!!.status

    @Test
    fun sampleWeek_matchesDesignStartingPoint() {
        assertEquals(2, SampleWeek.count(WorkoutStatus.Done))
        assertEquals(1, SampleWeek.count(WorkoutStatus.InProgress))
        assertEquals(2, SampleWeek.count(WorkoutStatus.Todo))
        assertEquals(1, SampleWeek.workout("upper-b")!!.loggedCount)
        assertEquals(listOf(6, 5, 5, 6, 4), SampleWeek.workouts.map { it.exercises.size })
    }

    @Test
    fun logExercise_movesTodoWorkoutToInProgress() {
        val week = SampleWeek.logExercise("lower-b", "deadlift", log)

        assertEquals(WorkoutStatus.InProgress, week.status("lower-b"))
        assertEquals(log, week.workout("lower-b")!!.exercises.first().log)
    }

    @Test
    fun finishWorkout_marksDoneEvenWithUnloggedExercises() {
        val week = SampleWeek.finishWorkout("upper-b", today)

        assertEquals(WorkoutStatus.Done, week.status("upper-b"))
        assertEquals(today, week.workout("upper-b")!!.finishedOn)
    }

    @Test
    fun nextUnlogged_skipsLoggedExercises() {
        val workout = SampleWeek.logExercise("upper-b", "chest-row", log).workout("upper-b")!!

        assertEquals("band-pull-apart", workout.nextUnlogged("shoulder-press")?.id)
    }

    @Test
    fun nextUnlogged_isNullAtEndOfWorkout() {
        assertNull(SampleWeek.workout("upper-b")!!.nextUnlogged("dead-bug"))
    }

    @Test
    fun finishThenReopen_keepsTheNote() {
        val finished = SampleWeek.finish(today, "  Travelling  ")
        assertTrue(finished.isFinished)
        assertEquals("Travelling", finished.note)

        val reopened = finished.reopen()
        assertFalse(reopened.isFinished)
        assertEquals("Travelling", reopened.note)
    }

    @Test
    fun formatKg_dropsOnlyWholeDecimals() {
        assertEquals("70", formatKg(70.0))
        assertEquals("72.5", formatKg(72.5))
    }
}
