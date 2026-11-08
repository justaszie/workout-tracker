package com.example.workoutprogram.ui.history

import com.example.workoutprogram.data.SampleWeek
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.time.LocalDate
import java.util.Locale

class DateRangeTest {
    private val locale = Locale.getDefault()

    // Month abbreviations depend on the locale ("Sep" in en-US, "Sept" in en-GB).
    @Before
    fun useUsEnglish() = Locale.setDefault(Locale.US)

    @After
    fun restoreLocale() = Locale.setDefault(locale)

    @Test
    fun dateRange_namesTheMonthOnceWithinAMonth() {
        val week = SampleWeek.copy(startedOn = LocalDate.of(2026, 10, 19), finishedOn = LocalDate.of(2026, 10, 25))

        assertEquals("19–25 Oct", dateRange(week))
    }

    @Test
    fun dateRange_namesBothMonthsAcrossAMonth() {
        val week = SampleWeek.copy(startedOn = LocalDate.of(2026, 9, 28), finishedOn = LocalDate.of(2026, 10, 4))

        assertEquals("28 Sep – 4 Oct", dateRange(week))
    }

    @Test
    fun dateRange_runsSevenDaysWithoutAFinishDate() {
        val week = SampleWeek.copy(startedOn = LocalDate.of(2026, 10, 12), finishedOn = null)

        assertEquals("12–18 Oct", dateRange(week))
    }
}
