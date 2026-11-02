package com.example.workoutprogram.ui.workout

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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.foundation.text.input.setTextAndPlaceCursorAtEnd
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.workoutprogram.R
import com.example.workoutprogram.data.Exercise
import com.example.workoutprogram.data.ExerciseLog
import com.example.workoutprogram.data.Load
import com.example.workoutprogram.data.ProgramWeek
import com.example.workoutprogram.data.SampleWeek
import com.example.workoutprogram.data.Workout
import com.example.workoutprogram.data.formatKg
import com.example.workoutprogram.ui.components.AppIcons
import com.example.workoutprogram.ui.components.BackRow
import com.example.workoutprogram.ui.components.Card
import com.example.workoutprogram.ui.components.CoachNoteBox
import com.example.workoutprogram.ui.components.Eyebrow
import com.example.workoutprogram.ui.components.LabeledField
import com.example.workoutprogram.ui.components.ResourceChip
import com.example.workoutprogram.ui.components.ScreenTitle
import com.example.workoutprogram.ui.components.SectionLabel
import com.example.workoutprogram.ui.components.StepProgress
import com.example.workoutprogram.ui.components.SupportText
import com.example.workoutprogram.ui.components.Tag
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

/** A week sent to the coach is read-only here until it is reopened. */
@Composable
fun WorkoutScreen(
    week: ProgramWeek,
    workout: Workout,
    onBack: () -> Unit,
    onLog: (exerciseId: String) -> Unit,
    onAlbumLinkChange: (String) -> Unit,
    onFinish: () -> Unit,
) {
    val total = workout.exercises.size
    val canEdit = !week.isFinished
    Scaffold(Modifier.imePadding()) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(top = padding.calculateTopPadding())
                .verticalScroll(rememberScrollState())
                .padding(bottom = padding.calculateBottomPadding()),
        ) {
            BackRow(onBack)
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
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
                SupportText(pluralStringResource(R.plurals.exercise_count, total, total))
            }
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = stringResource(R.string.logged_of, workout.loggedCount, total),
                    style = MaterialTheme.typography.labelLarge,
                )
                StepProgress(workout.loggedCount, total)
            }
            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                workout.exercises.forEachIndexed { index, exercise ->
                    ExerciseCard(index + 1, exercise, canEdit, onLog = { onLog(exercise.id) })
                }
                SectionLabel(
                    text = stringResource(R.string.videos_photos),
                    modifier = Modifier.padding(top = 16.dp),
                )
                AlbumCard(workout, canEdit, onAlbumLinkChange)
            }
            if (canEdit) {
                FinishFooter(workout, onFinish)
            } else {
                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ExerciseCard(number: Int, exercise: Exercise, canEdit: Boolean, onLog: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val log = exercise.log
    Card {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            NumberBadge(number, logged = log != null)
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = exercise.name,
                    modifier = Modifier.padding(top = 8.dp),
                    style = MaterialTheme.typography.titleMedium,
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val prescription =
                        if (exercise.perSide) R.string.sets_reps_per_side else R.string.sets_reps
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
        exercise.coachNote?.let { CoachNoteBox(it) }
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 0.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (log != null) {
                Text(
                    text = lastSet(log),
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelLarge,
                    color = colors.tertiary,
                )
            } else {
                exercise.resources.firstOrNull()?.let { ResourceChip(it) }
            }
            if (canEdit) {
                if (log != null) {
                    OutlinedButton(
                        onClick = onLog,
                        border = BorderStroke(1.dp, colors.outline),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.onSurface),
                    ) {
                        Text(stringResource(R.string.edit))
                    }
                } else {
                    Button(onClick = onLog) { Text(stringResource(R.string.log)) }
                }
            }
        }
    }
}

@Composable
private fun lastSet(log: ExerciseLog): String = log.weightKg?.let {
    stringResource(R.string.last_set_weight, formatKg(it), log.rpe)
} ?: stringResource(R.string.last_set_no_weight, log.rpe)

@Composable
private fun NumberBadge(number: Int, logged: Boolean) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .size(40.dp)
            .background(
                color = if (logged) colors.tertiaryContainer else colors.surfaceContainerHigh,
                shape = CircleShape,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (logged) {
            Icon(
                imageVector = AppIcons.Check,
                contentDescription = stringResource(R.string.logged),
                modifier = Modifier.size(20.dp),
                tint = colors.onTertiaryContainer,
            )
        } else {
            Text(
                text = number.toString(),
                style = MaterialTheme.typography.titleLarge.copy(fontSize = 18.sp),
            )
        }
    }
}

@Composable
private fun AlbumCard(workout: Workout, canEdit: Boolean, onLinkChange: (String) -> Unit) {
    val colors = MaterialTheme.colorScheme
    val clipboard = LocalClipboard.current
    val scope = rememberCoroutineScope()
    val link = rememberTextFieldState(workout.albumLink)
    val currentOnLinkChange by rememberUpdatedState(onLinkChange)
    LaunchedEffect(link) {
        snapshotFlow { link.text.toString() }.drop(1).collect { currentOnLinkChange(it) }
    }
    Card(verticalSpacing = Arrangement.spacedBy(20.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(colors.primaryContainer, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = AppIcons.Album,
                    contentDescription = null,
                    modifier = Modifier.size(22.dp),
                    tint = colors.onPrimaryContainer,
                )
            }
            SupportText(stringResource(R.string.album_intro), Modifier.weight(1f))
        }
        LabeledField(
            state = link,
            label = stringResource(R.string.album_label),
            placeholder = stringResource(R.string.album_placeholder),
            enabled = canEdit,
            keyboardType = KeyboardType.Uri,
            trailingIcon = {
                IconButton(
                    enabled = canEdit,
                    onClick = {
                        scope.launch {
                            val clip = clipboard.getClipEntry()?.clipData
                            clip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.let {
                                link.setTextAndPlaceCursorAtEnd(it.toString().trim())
                            }
                        }
                    },
                ) {
                    Icon(
                        imageVector = AppIcons.Clipboard,
                        contentDescription = stringResource(R.string.paste_link),
                        modifier = Modifier.size(22.dp),
                    )
                }
            },
            supportingText = { Text(stringResource(R.string.album_hint)) },
        )
    }
}

@Composable
private fun FinishFooter(workout: Workout, onFinish: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val remaining = workout.exercises.size - workout.loggedCount
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 32.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.End),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SupportText(
            text = if (remaining > 0) {
                stringResource(R.string.not_logged_yet, remaining)
            } else {
                stringResource(R.string.all_logged)
            },
            modifier = Modifier.weight(1f),
        )
        Button(
            onClick = onFinish,
            enabled = workout.loggedCount > 0,
            modifier = Modifier.height(56.dp),
            shape = RoundedCornerShape(16.dp),
            contentPadding = ButtonDefaults.ContentPadding,
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.inverseSurface,
                contentColor = colors.inverseOnSurface,
            ),
        ) {
            Icon(AppIcons.CheckBold, contentDescription = null)
            Spacer(Modifier.width(12.dp))
            Text(
                text = stringResource(R.string.finish_workout),
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Preview(widthDp = 412, heightDp = 1640)
@Composable
private fun WorkoutScreenPreview() {
    WorkoutProgramTheme {
        WorkoutScreen(SampleWeek, SampleWeek.workouts[2], {}, {}, {}, {})
    }
}
