package com.example.workoutprogram.ui.week

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.workoutprogram.R
import com.example.workoutprogram.data.ProgramWeek
import com.example.workoutprogram.data.SampleWeek
import com.example.workoutprogram.data.Workout
import com.example.workoutprogram.data.WorkoutStatus
import com.example.workoutprogram.ui.components.AppIcons
import com.example.workoutprogram.ui.components.Eyebrow
import com.example.workoutprogram.ui.components.IconTextButton
import com.example.workoutprogram.ui.components.LabeledField
import com.example.workoutprogram.ui.components.LeadInText
import com.example.workoutprogram.ui.components.ScreenTitle
import com.example.workoutprogram.ui.components.SectionLabel
import com.example.workoutprogram.ui.components.StepProgress
import com.example.workoutprogram.ui.components.SupportText
import com.example.workoutprogram.ui.components.Tag
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val DayDate = DateTimeFormatter.ofPattern("EEE d MMM")
private val Day = DateTimeFormatter.ofPattern("EEE")

@Composable
fun WeekScreen(
    week: ProgramWeek,
    onOpenWorkout: (String) -> Unit,
    onFinishWeek: (note: String) -> Unit,
    onReopenWeek: () -> Unit,
    uploading: Boolean = false,
) {
    var showDialog by rememberSaveable { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val noPastWeeks = stringResource(R.string.no_past_weeks)

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
                .verticalScroll(rememberScrollState())
                .padding(bottom = padding.calculateBottomPadding()),
        ) {
            Header(week, onPastWeeks = { scope.launch { snackbar.showSnackbar(noPastWeeks) } })
            if (week.isFinished) FinishedBanner(week, uploading) else CoachCard(week)
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
                        weekFinished = week.isFinished,
                        shape = rowShape(index, week.workouts.lastIndex),
                        onClick = { onOpenWorkout(workout.id) },
                    )
                }
            }
            if (week.isFinished) {
                ReopenSection(nextWeek = week.number + 1, onReopen = onReopenWeek)
            } else {
                FinishSection(onFinish = { showDialog = true })
            }
        }
    }

    if (showDialog) {
        FinishWeekDialog(
            week = week,
            onDismiss = { showDialog = false },
            onConfirm = {
                showDialog = false
                onFinishWeek(it)
            },
        )
    }
}

private fun rowShape(index: Int, last: Int) = RoundedCornerShape(
    topStart = if (index == 0) 16.dp else 4.dp,
    topEnd = if (index == 0) 16.dp else 4.dp,
    bottomStart = if (index == last) 16.dp else 4.dp,
    bottomEnd = if (index == last) 16.dp else 4.dp,
)

@Composable
private fun Header(week: ProgramWeek, onPastWeeks: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(Modifier.padding(start = 16.dp, end = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().height(64.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onPastWeeks) {
                Icon(
                    imageVector = AppIcons.History,
                    contentDescription = stringResource(R.string.past_weeks),
                    tint = colors.onSurfaceVariant,
                )
            }
        }
        Column(
            modifier = Modifier.padding(end = 12.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (week.isFinished) {
                Eyebrow(stringResource(R.string.finished_waiting), colors.tertiary)
            } else {
                Eyebrow(stringResource(R.string.current_week))
            }
            ScreenTitle(stringResource(R.string.block_week, week.block, week.number))
            Text(week.theme, style = MaterialTheme.typography.bodyLarge)
            val started = week.startedOn.format(DayDate)
            SupportText(
                week.finishedOn?.let {
                    stringResource(R.string.started_finished_on, started, it.format(DayDate))
                } ?: stringResource(R.string.started_on, started),
            )
        }
    }
}

@Composable
private fun CoachCard(week: ProgramWeek) {
    val colors = MaterialTheme.colorScheme
    val total = week.workouts.size
    val done = week.count(WorkoutStatus.Done)
    val inProgress = week.count(WorkoutStatus.InProgress)
    Column(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .background(colors.surfaceContainerLowest, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                modifier = Modifier.size(40.dp).background(colors.surfaceContainerHigh, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(week.coach.initials, style = MaterialTheme.typography.titleMedium)
            }
            Column {
                Text(week.coach.name, style = MaterialTheme.typography.titleMedium)
                SupportText(stringResource(R.string.your_coach))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.workouts_done, done, total),
                    style = MaterialTheme.typography.labelLarge,
                )
                if (inProgress > 0) {
                    Text(
                        text = stringResource(R.string.in_progress_count, inProgress),
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceVariant,
                    )
                }
            }
            StepProgress(done, total)
        }
    }
}

@Composable
private fun FinishedBanner(week: ProgramWeek, uploading: Boolean) {
    val colors = MaterialTheme.colorScheme
    val nextWeek = stringResource(R.string.block_week, week.block, week.number + 1)
    Column(
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth()
            .background(colors.tertiaryContainer, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                modifier = Modifier.size(40.dp).background(colors.surfaceContainerLowest, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = AppIcons.Hourglass,
                    contentDescription = null,
                    modifier = Modifier.size(22.dp),
                    tint = colors.tertiary,
                )
            }
            Column {
                Text(
                    text = stringResource(
                        if (uploading) R.string.sending_to else R.string.sent_to,
                        week.coach.name,
                    ),
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.onTertiaryContainer,
                )
                Text(
                    text = stringResource(if (uploading) R.string.sending_hint else R.string.reviewing),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.onTertiaryContainer,
                )
            }
        }
        Text(
            text = stringResource(R.string.next_week_soon, nextWeek),
            style = MaterialTheme.typography.bodyMedium,
            color = colors.onTertiaryContainer,
        )
        if (week.note.isNotBlank()) {
            LeadInText(
                lead = stringResource(R.string.your_note),
                text = week.note,
                color = colors.onSurface,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceContainerLowest, RoundedCornerShape(12.dp))
                    .padding(12.dp),
            )
        }
    }
}

@Composable
private fun WorkoutRow(
    number: Int,
    workout: Workout,
    weekFinished: Boolean,
    shape: RoundedCornerShape,
    onClick: () -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val status = workout.status
    val highlighted = !weekFinished && status == WorkoutStatus.InProgress
    val content = if (highlighted) colors.onPrimary else colors.onSurface
    Surface(
        onClick = onClick,
        shape = shape,
        color = if (highlighted) colors.primary else colors.surfaceContainerLowest,
        contentColor = content,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = if (highlighted) 80.dp else 72.dp)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = if (highlighted) colors.onPrimary else colors.surfaceContainerHigh,
                        shape = RoundedCornerShape(12.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = number.toString(),
                    style = MaterialTheme.typography.titleLarge,
                    color = if (highlighted) colors.primary else colors.onSurface,
                )
            }
            Column(Modifier.weight(1f)) {
                Text(
                    text = workout.name,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = if (highlighted) FontWeight.Medium else FontWeight.Normal,
                    ),
                )
                Text(
                    text = workoutDetail(workout, highlighted),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (highlighted) colors.onPrimary else colors.onSurfaceVariant,
                )
            }
            when {
                status == WorkoutStatus.Done -> DoneTag()
                highlighted -> ContinuePill()
                weekFinished -> {
                    val label = if (status == WorkoutStatus.InProgress) R.string.partly_done else R.string.skipped
                    Tag(
                        text = stringResource(label),
                        container = colors.surfaceContainer,
                        content = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium,
                        border = BorderStroke(1.dp, colors.outlineVariant),
                    )
                }
                else -> Icon(AppIcons.Chevron, contentDescription = null, tint = colors.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun workoutDetail(workout: Workout, highlighted: Boolean): String {
    val exercises = workout.exercises.size
    val count = pluralStringResource(R.plurals.exercise_count, exercises, exercises)
    val logged = stringResource(R.string.logged_of, workout.loggedCount, exercises)
    return when {
        workout.finishedOn != null ->
            stringResource(R.string.exercises_done_on, count, workout.finishedOn.format(Day))
        highlighted -> stringResource(R.string.in_progress_detail, logged)
        workout.status == WorkoutStatus.InProgress -> logged
        else -> count
    }
}

@Composable
private fun DoneTag() {
    val colors = MaterialTheme.colorScheme
    Tag(
        text = stringResource(R.string.done),
        container = colors.tertiaryContainer,
        content = colors.onTertiaryContainer,
        style = MaterialTheme.typography.labelMedium,
        leading = { Icon(AppIcons.Check, contentDescription = null, modifier = Modifier.size(18.dp)) },
    )
}

@Composable
private fun ContinuePill() {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .height(40.dp)
            .background(colors.onPrimary, RoundedCornerShape(20.dp))
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stringResource(R.string.continue_workout),
            style = MaterialTheme.typography.labelLarge,
            color = colors.primary,
        )
    }
}

@Composable
private fun FinishSection(onFinish: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = Modifier
            .padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 32.dp)
            .fillMaxWidth()
            .border(1.dp, colors.outlineVariant, shape)
            .padding(16.dp),
    ) {
        Text(stringResource(R.string.done_for_week), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        SupportText(stringResource(R.string.finishing_sends))
        Spacer(Modifier.height(16.dp))
        OutlinedButton(
            onClick = onFinish,
            modifier = Modifier.height(48.dp),
            border = BorderStroke(1.dp, colors.outline),
        ) {
            Icon(AppIcons.Flag, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(stringResource(R.string.finish_week))
        }
    }
}

@Composable
private fun ReopenSection(nextWeek: Int, onReopen: () -> Unit) {
    Column(
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        IconTextButton(
            text = stringResource(R.string.reopen_week),
            icon = AppIcons.Reopen,
            onClick = onReopen,
        )
        Text(
            text = stringResource(R.string.reopen_hint, nextWeek),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun FinishWeekDialog(
    week: ProgramWeek,
    onDismiss: () -> Unit,
    onConfirm: (note: String) -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val note = rememberTextFieldState(week.note)
    val partlyDone = week.workouts.filter { it.status == WorkoutStatus.InProgress }
    val skipped = week.workouts.filter { it.status == WorkoutStatus.Todo }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.surfaceContainerLowest,
        icon = { Icon(AppIcons.Flag, contentDescription = null, tint = colors.primary) },
        title = {
            Text(
                text = stringResource(
                    R.string.finish_title,
                    stringResource(R.string.block_week, week.block, week.number),
                ),
                textAlign = TextAlign.Center,
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                SupportText(stringResource(R.string.finish_body, week.coach.name, week.number + 1))
                if (partlyDone.isNotEmpty() || skipped.isNotEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(colors.surfaceContainer, RoundedCornerShape(12.dp))
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        if (partlyDone.isNotEmpty()) {
                            LeadInText(
                                lead = stringResource(R.string.partly_done_prefix),
                                text = partlyDone.map { workout ->
                                    stringResource(
                                        R.string.partly_done_item,
                                        workout.name,
                                        stringResource(R.string.logged_of, workout.loggedCount, workout.exercises.size),
                                    )
                                }.joinToString(),
                                color = colors.onSurface,
                            )
                        }
                        if (skipped.isNotEmpty()) {
                            LeadInText(
                                lead = stringResource(R.string.skipped_prefix),
                                text = skipped.joinToString { it.name },
                                color = colors.onSurface,
                            )
                        }
                    }
                }
                LabeledField(
                    state = note,
                    label = stringResource(R.string.week_note_label),
                    placeholder = stringResource(R.string.week_note_placeholder),
                    singleLine = false,
                    minLines = 3,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, modifier = Modifier.height(48.dp)) {
                Text(stringResource(R.string.cancel))
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(note.text.toString()) }, modifier = Modifier.height(48.dp)) {
                Text(stringResource(R.string.finish_week))
            }
        },
    )
}

@Preview(widthDp = 412, heightDp = 900)
@Composable
private fun WeekScreenPreview() {
    WorkoutProgramTheme {
        WeekScreen(SampleWeek, {}, {}, {})
    }
}

@Preview(widthDp = 412, heightDp = 900)
@Composable
private fun WeekFinishedPreview() {
    WorkoutProgramTheme {
        WeekScreen(SampleWeek.finish(LocalDate.of(2026, 10, 31), "Travelling Thu–Sun, no gym at the hotel."), {}, {}, {})
    }
}
