package com.example.workoutprogram.data

import org.json.JSONException
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class WeekJsonTest {
    private val serverWeek = """
        {
          "id": "w9", "block": 2, "number": 3, "theme": "Volume", "startedOn": "2026-10-26",
          "finishedOn": null, "note": "", "lastActivityOn": null,
          "coach": { "name": "Coach Marta", "initials": "MK" },
          "workouts": [{
            "id": "a", "name": "Lower A", "finishedOn": "2026-10-27", "albumLink": "",
            "exercises": [{
              "id": "squat", "name": "Back squat", "sets": 4, "reps": 6, "perSide": true,
              "load": { "type": "fixed", "kg": 90 }, "coachNote": null,
              "resources": [
                { "kind": "demoVideo", "url": "https://example.com/a" },
                { "kind": "setupGuide", "url": "youtube.com/no-scheme" },
                { "kind": "setupGuide", "url": "not a link" }
              ],
              "lastWeek": null,
              "log": { "weightKg": null, "rpe": 8, "repsPerSet": [6, 6, 5, 6], "note": "" }
            }, {
              "id": "curl", "name": "Leg curl", "sets": 3, "reps": 12, "perSide": false,
              "load": { "type": "rpe", "rpe": 8 }, "coachNote": "Slowly",
              "resources": [], "lastWeek": { "weightKg": 16.5, "rpe": 7 }, "log": null
            }, {
              "id": "plank", "name": "Plank", "sets": 3, "reps": 20, "perSide": false,
              "load": { "type": "none" }, "coachNote": null,
              "resources": [], "lastWeek": null, "log": null
            }]
          }]
        }
    """.trimIndent()

    private val plan = parseWeek(JSONObject(serverWeek))
    private val log = ExerciseLog(weightKg = 18.0, rpe = 8, repsPerSet = listOf(10, 10, 10))

    @Test
    fun parseWeek_readsWeekFields() {
        assertEquals("w9", plan.id)
        assertEquals(Coach("Coach Marta", "MK"), plan.coach)
        assertEquals(LocalDate.of(2026, 10, 26), plan.startedOn)
        assertNull(plan.finishedOn)
        assertEquals(LocalDate.of(2026, 10, 27), plan.workouts[0].finishedOn)
    }

    @Test
    fun parseWeek_readsEachLoadType() {
        assertEquals(
            listOf(Load.Fixed(90.0), Load.TargetRpe(8), Load.None),
            plan.workouts[0].exercises.map { it.load },
        )
    }

    @Test
    fun parseWeek_keepsNullsAsNull() {
        val squat = plan.workouts[0].exercises[0]

        assertNull(squat.coachNote)
        assertNull(squat.lastWeek)
        assertNull(squat.log!!.weightKg)
    }

    @Test
    fun parseWeek_readsNestedValues() {
        val curl = plan.workouts[0].exercises[1]

        assertEquals("Slowly", curl.coachNote)
        assertEquals(LastWeek(16.5, 7), curl.lastWeek)
        assertEquals(listOf(6, 6, 5, 6), plan.workouts[0].exercises[0].log!!.repsPerSet)
    }

    @Test
    fun parseWeek_dropsLinksThatCannotBeOpened() {
        assertEquals(
            listOf(Resource(Resource.Kind.DemoVideo, "https://example.com/a")),
            plan.workouts[0].exercises[0].resources,
        )
    }

    @Test(expected = JSONException::class)
    fun parseWeek_refusesUnknownLoadType() {
        parseWeek(JSONObject(serverWeek.replace("\"type\": \"none\"", "\"type\": \"bands\"")))
    }

    @Test
    fun withProgress_restoresWhatTheClientEntered() {
        val today = LocalDate.of(2026, 10, 31)
        val local = plan.logExercise("a", "plank", log).setAlbumLink("a", "https://album")
            .finish(today, "Travelling")

        assertEquals(local, withProgress(plan, progressJson(local)))
    }

    @Test
    fun withProgress_ignoresAnotherWeek() {
        val otherWeek = plan.copy(id = "w8").finish(LocalDate.of(2026, 10, 25), "Old")

        assertEquals(plan, withProgress(plan, progressJson(otherWeek)))
    }

    @Test
    fun withProgress_ignoresFilesFromBeforeWeekIds() {
        val old = progressJson(plan.finish(LocalDate.of(2026, 10, 25), "Old")).apply { remove("weekId") }

        assertEquals(plan, withProgress(plan, old))
    }

    @Test
    fun withProgress_acceptsNoLocalWeek() {
        assertEquals(plan, withProgress(plan, null as ProgramWeek?))
    }
}
