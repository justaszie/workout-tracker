package com.example.workoutprogram.ui.history

import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.workoutprogram.PastWeeks
import com.example.workoutprogram.R
import com.example.workoutprogram.data.Exercise
import com.example.workoutprogram.data.ExerciseLog
import com.example.workoutprogram.data.Load
import com.example.workoutprogram.data.ProgramWeek
import com.example.workoutprogram.data.SampleWeek
import com.example.workoutprogram.data.SetLog
import com.example.workoutprogram.data.Workout
import com.example.workoutprogram.data.WorkoutStatus
import com.example.workoutprogram.data.formatKg
import com.example.workoutprogram.ui.components.AppIcons
import com.example.workoutprogram.ui.components.BackRow
import com.example.workoutprogram.ui.components.Card
import com.example.workoutprogram.ui.components.Eyebrow
import com.example.workoutprogram.ui.components.LeadInText
import com.example.workoutprogram.ui.components.ScreenTitle
import com.example.workoutprogram.ui.components.SectionLabel
import com.example.workoutprogram.ui.components.SupportText
import com.example.workoutprogram.ui.components.Tag
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme
import com.example.workoutprogram.ui.week.WorkoutRow
import com.example.workoutprogram.ui.week.rowShape
import java.time.LocalDate
import java.time.format.DateTimeFormatter

// Read-only screens for the weeks before the current one. There are no stats: the client sees
// their progress by stepping from week to week.

private val DayDate = DateTimeFormatter.ofPattern("EEE d MMM")
private val DayMonth = DateTimeFormatter.ofPattern("d MMM")
private val DayOnly = DateTimeFormatter.ofPattern("d")

/** "19–25 Oct", or "28 Sep – 4 Oct" across a month. A week without a finish date runs 7 days. */
internal fun dateRange(week: ProgramWeek): String {
    val start = week.startedOn
    val end = week.finishedOn ?: start.plusDays(6)
    return if (start.month == end.month && start.year == end.year) {
        "${start.format(DayOnly)}–${end.format(DayMonth)}"
    } else {
        "${start.format(DayMonth)} – ${end.format(DayMonth)}"
    }
}

@Composable
fun HistoryScreen(
    history: PastWeeks,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onOpenWeek: (String) -> Unit,
) {
    val weeks = history.weeks
    Scaffold { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
                .verticalScroll(rememberScrollState())
                .padding(bottom = padding.calculateBottomPadding() + 32.dp),
        ) {
            BackRow(onBack)
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Eyebrow(stringResource(R.string.history))
                ScreenTitle(stringResource(R.string.past_weeks))
                if (!weeks.isNullOrEmpty()) {
                    SupportText(
                        pluralStringResource(R.plurals.weeks_finished, weeks.size, weeks.size, weeks.first().coach.name),
                    )
                }
            }
            when {
                weeks == null && history.failed -> FailedMessage(onRetry)
                weeks == null -> Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                    CircularProgressIndicator()
                }
                weeks.isEmpty() -> EmptyMessage()
                else -> weeks.groupConsecutiveBy { it.block }.forEachIndexed { groupIndex, (block, group) ->
                    SectionLabel(
                        text = stringResource(R.string.block_n, block),
                        modifier = Modifier.padding(
                            start = 16.dp,
                            end = 16.dp,
                            top = if (groupIndex == 0) 4.dp else 24.dp,
                            bottom = 8.dp,
                        ),
                    )
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        group.forEachIndexed { index, week ->
                            PastWeekRow(week, rowShape(index, group.lastIndex)) { onOpenWeek(week.id) }
                        }
                    }
                }
            }
        }
    }
}

private fun <T, K> List<T>.groupConsecutiveBy(key: (T) -> K): List<Pair<K, List<T>>> =
    fold(mutableListOf<Pair<K, MutableList<T>>>()) { groups, item ->
        val k = key(item)
        if (groups.lastOrNull()?.first == k) groups.last().second.add(item) else groups.add(k to mutableListOf(item))
        groups
    }

@Composable
private fun PastWeekRow(week: ProgramWeek, shape: RoundedCornerShape, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Surface(onClick = onClick, shape = shape, color = colors.surfaceContainerLowest) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 72.dp)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                modifier = Modifier.size(48.dp).background(colors.surfaceContainerHigh, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(week.number.toString(), style = MaterialTheme.typography.titleLarge)
            }
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.week_n, week.number), style = MaterialTheme.typography.titleMedium)
                Text(
                    text = stringResource(
                        R.string.past_week_detail,
                        dateRange(week),
                        week.count(WorkoutStatus.Done),
                        week.workouts.size,
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.onSurfaceVariant,
                )
            }
            Icon(AppIcons.Chevron, contentDescription = null, tint = colors.onSurfaceVariant)
        }
    }
}

@Composable
private fun EmptyMessage() {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .background(colors.surfaceContainerLowest, RoundedCornerShape(16.dp))
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier.size(56.dp).background(colors.surfaceContainer, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(AppIcons.History, contentDescription = null, modifier = Modifier.size(28.dp), tint = colors.onSurfaceVariant)
        }
        Text(stringResource(R.string.no_past_weeks), style = MaterialTheme.typography.titleMedium)
        Text(
            text = stringResource(R.string.no_past_weeks_body),
            style = MaterialTheme.typography.bodyMedium,
            color = colors.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun FailedMessage(onRetry: () -> Unit) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SupportText(stringResource(R.string.past_weeks_failed))
        Button(onClick = onRetry) { Text(stringResource(R.string.try_again)) }
    }
}

/** [older] and [newer] are the neighbouring past weeks, if there are any. */
@Composable
fun PastWeekScreen(
    week: ProgramWeek,
    older: ProgramWeek?,
    newer: ProgramWeek?,
    onBack: () -> Unit,
    onOpenWorkout: (String) -> Unit,
    onOpenWeek: (String) -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    Scaffold { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
                .verticalScroll(rememberScrollState())
                .padding(bottom = padding.calculateBottomPadding()),
        ) {
            BackRow(onBack)
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Eyebrow(stringResource(R.string.past_week))
                ScreenTitle(stringResource(R.string.block_week, week.block, week.number))
                Text(week.theme, style = MaterialTheme.typography.bodyLarge)
                val started = week.startedOn.format(DayDate)
                SupportText(
                    week.finishedOn?.let {
                        stringResource(R.string.started_finished_on, started, it.format(DayDate))
                    } ?: stringResource(R.string.started_on, started),
                )
            }
            if (week.note.isNotBlank()) {
                LeadInText(
                    lead = stringResource(R.string.your_note),
                    text = week.note,
                    color = colors.onSurface,
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .fillMaxWidth()
                        .background(colors.surfaceContainerLowest, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                )
            }
            SectionLabel(
                text = stringResource(R.string.workouts),
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 8.dp),
            )
            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                week.workouts.forEachIndexed { index, workout ->
                    WorkoutRow(
                        number = index + 1,
                        workout = workout,
                        weekFinished = true,
                        shape = rowShape(index, week.workouts.lastIndex),
                        onClick = { onOpenWorkout(workout.id) },
                    )
                }
            }
            if (older != null || newer != null) {
                Row(
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 32.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    WeekStepButton(week, older, isOlder = true, onOpenWeek, Modifier.weight(1f))
                    WeekStepButton(week, newer, isOlder = false, onOpenWeek, Modifier.weight(1f))
                }
            } else {
                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

/** An empty slot keeps the other button on its own side. */
@Composable
private fun WeekStepButton(
    current: ProgramWeek,
    target: ProgramWeek?,
    isOlder: Boolean,
    onOpenWeek: (String) -> Unit,
    modifier: Modifier,
) {
    if (target == null) return Spacer(modifier)
    val label = if (target.block == current.block) {
        stringResource(R.string.week_n, target.number)
    } else {
        stringResource(R.string.block_week, target.block, target.number)
    }
    val description = stringResource(if (isOlder) R.string.older_week else R.string.newer_week, label)
    OutlinedButton(
        onClick = { onOpenWeek(target.id) },
        modifier = modifier.height(48.dp).semantics { contentDescription = description },
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
    ) {
        if (isOlder) {
            Icon(AppIcons.ChevronLeft, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(label, maxLines = 1)
        if (!isOlder) {
            Spacer(Modifier.width(8.dp))
            Icon(AppIcons.Chevron, contentDescription = null, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
fun PastWorkoutScreen(week: ProgramWeek, workout: Workout, onBack: () -> Unit) {
    val total = workout.exercises.size
    Scaffold { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
                .verticalScroll(rememberScrollState())
                .padding(bottom = padding.calculateBottomPadding() + 32.dp),
        ) {
            BackRow(onBack)
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Eyebrow(
                    stringResource(
                        R.string.workout_eyebrow,
                        stringResource(R.string.block_week, week.block, week.number),
                        week.workouts.indexOf(workout) + 1,
                        week.workouts.size,
                    ),
                )
                ScreenTitle(workout.name)
                val count = pluralStringResource(R.plurals.exercise_count, total, total)
                SupportText(
                    workout.finishedOn?.let {
                        stringResource(R.string.exercises_done_on, count, it.format(DayDate))
                    } ?: count,
                )
            }
            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                workout.exercises.forEachIndexed { index, exercise -> PastExerciseCard(index + 1, exercise) }
                if (isWebLink(workout.albumLink)) {
                    SectionLabel(
                        text = stringResource(R.string.videos_photos),
                        modifier = Modifier.padding(top = 12.dp),
                    )
                    val uriHandler = LocalUriHandler.current
                    AssistChip(
                        onClick = { uriHandler.openUri(workout.albumLink) },
                        label = { Text(stringResource(R.string.open_album)) },
                        leadingIcon = { Icon(AppIcons.Album, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    )
                }
            }
        }
    }
}

/** The album link is free text, and opening one nothing can handle would crash the app. */
private fun isWebLink(link: String): Boolean =
    link.isNotBlank() && Uri.parse(link.trim()).scheme?.lowercase() in setOf("http", "https")

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PastExerciseCard(number: Int, exercise: Exercise) {
    val colors = MaterialTheme.colorScheme
    Card {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(
                modifier = Modifier.size(40.dp).background(colors.surfaceContainerHigh, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(number.toString(), style = MaterialTheme.typography.titleLarge.copy(fontSize = 18.sp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = exercise.name,
                    modifier = Modifier.padding(top = 8.dp),
                    style = MaterialTheme.typography.titleMedium,
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val prescription = if (exercise.perSide) R.string.sets_reps_per_side else R.string.sets_reps
                    Tag(stringResource(prescription, exercise.sets, exercise.reps))
                    when (val load = exercise.load) {
                        Load.None -> Unit
                        is Load.Fixed -> Tag(stringResource(R.string.kg, formatKg(load.kg)))
                        is Load.TargetRpe -> Tag(
                            text = stringResource(R.string.target_rpe, load.rpe),
                            container = colors.primaryContainer,
                            content = colors.onPrimaryContainer,
                        )
                    }
                }
            }
        }
        val log = exercise.log
        when {
            log == null -> SupportText(stringResource(R.string.not_logged))
            log.perSet != null -> SetTable(log.perSet, log.repsPerSet)
            else -> LastSetSummary(log)
        }
        if (log != null && log.note.isNotBlank()) {
            LeadInText(stringResource(R.string.your_note), log.note, color = colors.onSurface)
        }
    }
}

private val ResultBox = RoundedCornerShape(12.dp)

@Composable
private fun LastSetSummary(log: ExerciseLog) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, ResultBox)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = log.weightKg?.let { stringResource(R.string.last_set_weight, formatKg(it), log.rpe) }
                ?: stringResource(R.string.last_set_no_weight, log.rpe),
            style = MaterialTheme.typography.labelLarge,
        )
        SupportText(stringResource(R.string.reps_list, log.repsPerSet.joinToString(" · ")))
    }
}

@Composable
private fun SetTable(sets: List<SetLog>, reps: List<Int>) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surface, ResultBox)
            .padding(horizontal = 12.dp, vertical = 4.dp),
    ) {
        SetRow(
            stringResource(R.string.set).uppercase(),
            stringResource(R.string.weight_reps).uppercase(),
            stringResource(R.string.rpe),
            header = true,
        )
        sets.zip(reps).forEachIndexed { index, (set, setReps) ->
            HorizontalDivider(color = colors.surfaceContainerHigh)
            SetRow(
                (index + 1).toString(),
                set.weightKg?.let { stringResource(R.string.set_weight_reps, formatKg(it), setReps) }
                    ?: pluralStringResource(R.plurals.set_reps, setReps, setReps),
                set.rpe.toString(),
            )
        }
    }
}

@Composable
private fun SetRow(set: String, result: String, rpe: String, header: Boolean = false) {
    val style = if (header) MaterialTheme.typography.labelMedium else MaterialTheme.typography.bodyMedium
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(set, Modifier.width(48.dp), style = style, color = muted)
        Text(result, Modifier.weight(1f), style = style, color = if (header) muted else MaterialTheme.colorScheme.onSurface)
        Text(
            rpe,
            Modifier.width(48.dp),
            style = style,
            color = if (header) muted else MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.End,
        )
    }
}

private val PreviewWeek = SampleWeek.finish(LocalDate.of(2026, 11, 1), "Left knee a bit sore after Lower B.")

@Preview(widthDp = 412, heightDp = 900)
@Composable
private fun HistoryScreenPreview() {
    WorkoutProgramTheme {
        HistoryScreen(PastWeeks(listOf(PreviewWeek), loading = false, failed = false), {}, {}, {})
    }
}

@Preview(widthDp = 412, heightDp = 600)
@Composable
private fun HistoryEmptyPreview() {
    WorkoutProgramTheme {
        HistoryScreen(PastWeeks(emptyList(), loading = false, failed = false), {}, {}, {})
    }
}

@Preview(widthDp = 412, heightDp = 900)
@Composable
private fun PastWeekPreview() {
    WorkoutProgramTheme {
        PastWeekScreen(PreviewWeek, older = PreviewWeek, newer = null, {}, {}, {})
    }
}

@Preview(widthDp = 412, heightDp = 1200)
@Composable
private fun PastWorkoutPreview() {
    WorkoutProgramTheme {
        PastWorkoutScreen(PreviewWeek, PreviewWeek.workouts[2], {})
    }
}
