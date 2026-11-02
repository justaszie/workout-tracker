package com.example.workoutprogram.ui.log

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.foundation.text.input.setTextAndPlaceCursorAtEnd
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.workoutprogram.R
import com.example.workoutprogram.data.Exercise
import com.example.workoutprogram.data.ExerciseLog
import com.example.workoutprogram.data.Load
import com.example.workoutprogram.data.SampleWeek
import com.example.workoutprogram.data.Workout
import com.example.workoutprogram.data.formatKg
import com.example.workoutprogram.ui.components.AppIcons
import com.example.workoutprogram.ui.components.BackRow
import com.example.workoutprogram.ui.components.Card
import com.example.workoutprogram.ui.components.CoachNote
import com.example.workoutprogram.ui.components.Eyebrow
import com.example.workoutprogram.ui.components.IconTextButton
import com.example.workoutprogram.ui.components.LabeledField
import com.example.workoutprogram.ui.components.LeadInText
import com.example.workoutprogram.ui.components.ResourceChip
import com.example.workoutprogram.ui.components.ScreenTitle
import com.example.workoutprogram.ui.components.SectionLabel
import com.example.workoutprogram.ui.components.SupportText
import com.example.workoutprogram.ui.theme.RobotoCondensed
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme

private const val WEIGHT_STEP_KG = 2.0
private const val DEFAULT_RPE = 7

/** Form state starts from [exerciseId], so callers must key this by exercise. */
@Composable
fun LogExerciseScreen(
    workout: Workout,
    exerciseId: String,
    onBack: () -> Unit,
    onSave: (ExerciseLog) -> Unit,
) {
    val exercise = workout.exercises.first { it.id == exerciseId }
    val log = exercise.log
    val tracksWeight = exercise.load != Load.None
    val targetRpe = (exercise.load as? Load.TargetRpe)?.rpe

    val weight = rememberTextFieldState(initialWeight(exercise)?.let(::formatKg).orEmpty())
    var rpe by rememberSaveable { mutableIntStateOf(log?.rpe ?: targetRpe ?: DEFAULT_RPE) }
    var allReps by rememberSaveable {
        mutableStateOf(log?.repsPerSet?.all { it >= exercise.reps } ?: true)
    }
    val reps = List(exercise.sets) { set ->
        rememberTextFieldState((log?.repsPerSet?.getOrNull(set) ?: exercise.reps).toString())
    }
    val note = rememberTextFieldState(log?.note.orEmpty())
    var showNote by rememberSaveable { mutableStateOf(!log?.note.isNullOrEmpty()) }

    val weightKg = weight.text.toString().toDoubleOrNull()
    val canSave = !tracksWeight || weightKg != null
    val hasNext = workout.nextUnlogged(exerciseId) != null

    Scaffold(
        modifier = Modifier.imePadding(),
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.surfaceContainerLowest) {
                Button(
                    onClick = {
                        onSave(
                            ExerciseLog(
                                weightKg = weightKg.takeIf { tracksWeight },
                                rpe = rpe,
                                repsPerSet = if (allReps) {
                                    List(exercise.sets) { exercise.reps }
                                } else {
                                    reps.map { it.text.toString().toIntOrNull() ?: 0 }
                                },
                                note = note.text.toString().trim(),
                            ),
                        )
                    },
                    enabled = canSave,
                    modifier = Modifier
                        .navigationBarsPadding()
                        .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp)
                        .fillMaxWidth()
                        .height(56.dp),
                ) {
                    Text(
                        text = stringResource(if (hasNext) R.string.save_and_next else R.string.save),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            }
        },
    ) { padding ->
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
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Eyebrow(
                    stringResource(
                        R.string.exercise_eyebrow,
                        workout.name,
                        workout.exercises.indexOf(exercise) + 1,
                        workout.exercises.size,
                    ),
                )
                ScreenTitle(exercise.name, MaterialTheme.typography.headlineMedium)
            }
            Column(Modifier.padding(horizontal = 16.dp)) {
                PrescriptionCard(exercise)
                SectionLabel(
                    text = stringResource(R.string.your_last_set),
                    modifier = Modifier.padding(top = 28.dp, bottom = if (tracksWeight) 20.dp else 12.dp),
                )
                if (tracksWeight) {
                    WeightStepper(
                        state = weight,
                        lastWeek = exercise.lastWeek?.let {
                            stringResource(R.string.last_week_result, formatKg(it.weightKg), it.rpe)
                        },
                    )
                    Spacer(Modifier.height(28.dp))
                }
                RpePicker(rpe, targetRpe, onPick = { rpe = it })
                Spacer(Modifier.height(20.dp))
                RepsSwitch(exercise, allReps, onChange = { allReps = it })
                if (!allReps) {
                    RepsGrid(target = exercise.reps, reps = reps)
                }
                HorizontalDivider(
                    modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                )
                if (showNote) {
                    LabeledField(
                        state = note,
                        label = stringResource(R.string.note_label),
                        placeholder = stringResource(R.string.note_placeholder),
                        singleLine = false,
                        minLines = 3,
                        modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
                    )
                } else {
                    IconTextButton(
                        text = stringResource(R.string.add_note),
                        icon = AppIcons.Plus,
                        onClick = { showNote = true },
                    )
                }
            }
        }
    }
}

private fun initialWeight(exercise: Exercise): Double? =
    exercise.log?.weightKg
        ?: (exercise.load as? Load.Fixed)?.kg
        ?: exercise.lastWeek?.weightKg

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PrescriptionCard(exercise: Exercise) {
    val colors = MaterialTheme.colorScheme
    Card(verticalSpacing = Arrangement.spacedBy(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val cell = Modifier.weight(1f)
            Stat(stringResource(R.string.sets), exercise.sets.toString(), cell)
            Stat(stringResource(R.string.reps), exercise.reps.toString(), cell)
            when (val load = exercise.load) {
                Load.None -> Stat(
                    label = stringResource(R.string.load),
                    value = stringResource(R.string.load_none),
                    modifier = cell,
                    valueColor = colors.outline,
                )
                is Load.Fixed -> Stat(stringResource(R.string.load_kg), formatKg(load.kg), cell)
                is Load.TargetRpe -> Stat(
                    label = stringResource(R.string.target_rpe_label),
                    value = load.rpe.toString(),
                    modifier = cell,
                    labelColor = colors.primary,
                    valueColor = colors.primary,
                )
            }
        }
        when (val load = exercise.load) {
            Load.None -> SupportText(stringResource(R.string.no_load_explainer))
            is Load.TargetRpe -> SupportText(stringResource(R.string.target_explainer, load.rpe))
            is Load.Fixed -> Unit
        }
        if (exercise.coachNote != null || exercise.resources.isNotEmpty()) {
            HorizontalDivider(color = colors.surfaceContainerHighest)
        }
        exercise.coachNote?.let { CoachNote(it) }
        if (exercise.resources.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                exercise.resources.forEach { ResourceChip(it) }
            }
        }
    }
}

@Composable
private fun Stat(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    labelColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = labelColor)
        Text(value, style = MaterialTheme.typography.displaySmall, color = valueColor)
    }
}

@Composable
private fun WeightStepper(state: TextFieldState, lastWeek: String?) {
    val step = { delta: Double ->
        val next = ((state.text.toString().toDoubleOrNull() ?: 0.0) + delta).coerceAtLeast(0.0)
        state.setTextAndPlaceCursorAtEnd(formatKg(Math.round(next * 10) / 10.0))
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        StepButton(AppIcons.Minus, stringResource(R.string.decrease_weight)) { step(-WEIGHT_STEP_KG) }
        LabeledField(
            state = state,
            transform = { input ->
                input.replace(',', '.').takeIf { it.isEmpty() || it.toDoubleOrNull() != null }
            },
            label = stringResource(R.string.weight_used),
            keyboardType = KeyboardType.Decimal,
            textStyle = MaterialTheme.typography.bodyLarge.copy(
                fontFamily = RobotoCondensed,
                fontWeight = FontWeight.Bold,
                fontSize = 26.sp,
                letterSpacing = 0.sp,
            ),
            suffix = {
                Text(stringResource(R.string.kg_unit), style = MaterialTheme.typography.bodyLarge)
            },
            supportingText = lastWeek?.let { { Text(it) } },
            modifier = Modifier.weight(1f),
        )
        StepButton(AppIcons.Plus, stringResource(R.string.increase_weight)) { step(WEIGHT_STEP_KG) }
    }
}

@Composable
private fun StepButton(
    icon: ImageVector,
    description: String,
    onClick: () -> Unit,
) {
    FilledTonalIconButton(
        onClick = onClick,
        // The outlined field reserves 8.dp above its border for the floating label.
        modifier = Modifier.padding(top = 8.dp).size(56.dp),
        shape = RoundedCornerShape(16.dp),
        colors = IconButtonDefaults.filledTonalIconButtonColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        ),
    ) {
        Icon(icon, contentDescription = description)
    }
}

@Composable
private fun RpePicker(rpe: Int, target: Int?, onPick: (Int) -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(stringResource(R.string.rpe_on_last_set), style = MaterialTheme.typography.titleMedium)
        target?.let {
            Text(
                text = stringResource(R.string.target_short, it),
                style = MaterialTheme.typography.labelLarge,
                color = colors.primary,
            )
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        (1..10).chunked(5).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { n ->
                    RpeButton(
                        value = n,
                        selected = n == rpe,
                        isTarget = n == target,
                        onClick = { onPick(n) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
    LeadInText(
        lead = stringResource(R.string.rpe_n, rpe),
        text = "— " + stringArrayResource(R.array.rpe_descriptions)[rpe - 1],
        modifier = Modifier.padding(top = 12.dp),
    )
}

@Composable
private fun RpeButton(
    value: Int,
    selected: Boolean,
    isTarget: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = MaterialTheme.colorScheme
    val corner by animateDpAsState(if (selected) 12.dp else 28.dp, label = "rpeCorner")
    val description = stringResource(R.string.rpe_n, value)
    Surface(
        selected = selected,
        onClick = onClick,
        modifier = modifier.height(56.dp).semantics { contentDescription = description },
        shape = RoundedCornerShape(corner),
        color = if (selected) colors.primary else colors.surfaceContainer,
        contentColor = if (selected) colors.onPrimary else colors.onSurface,
        border = if (isTarget && !selected) BorderStroke(2.dp, colors.primary) else null,
    ) {
        Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text(value.toString(), style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun RepsSwitch(exercise: Exercise, checked: Boolean, onChange: (Boolean) -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 72.dp)
            .toggleable(value = checked, role = Role.Switch, onValueChange = onChange),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(stringResource(R.string.completed_all_reps), style = MaterialTheme.typography.bodyLarge)
            val summary =
                if (exercise.perSide) R.string.sets_by_reps_per_side else R.string.sets_by_reps
            SupportText(stringResource(summary, exercise.sets, exercise.reps))
        }
        Switch(
            checked = checked,
            onCheckedChange = null,
            colors = SwitchDefaults.colors(uncheckedTrackColor = colors.surfaceContainerHigh),
        )
    }
}

@Composable
private fun RepsGrid(target: Int, reps: List<TextFieldState>) {
    Column(
        modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SupportText(stringResource(R.string.enter_actual_reps))
        reps.chunked(3).forEachIndexed { rowIndex, row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEachIndexed { columnIndex, state ->
                    RepsField(rowIndex * 3 + columnIndex, state, target, Modifier.weight(1f))
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun RepsField(
    index: Int,
    state: TextFieldState,
    target: Int,
    modifier: Modifier = Modifier,
) {
    val done = state.text.toString().toIntOrNull() ?: 0
    val short = target - done
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        LabeledField(
            state = state,
            transform = { input -> input.takeIf { it.length <= 3 && it.all(Char::isDigit) } },
            label = stringResource(R.string.set_n, index + 1),
            keyboardType = KeyboardType.Number,
            isError = short > 0,
        )
        Text(
            text = if (short > 0) stringResource(R.string.reps_short, short) else "",
            modifier = Modifier.padding(horizontal = 4.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error,
        )
    }
}

@Preview(widthDp = 412, heightDp = 1360)
@Composable
private fun LogTargetRpePreview() {
    WorkoutProgramTheme {
        LogExerciseScreen(SampleWeek.workouts[2], "shoulder-press", {}, {})
    }
}

@Preview(widthDp = 412, heightDp = 1360)
@Composable
private fun LogNoLoadPreview() {
    WorkoutProgramTheme {
        LogExerciseScreen(SampleWeek.workouts[2], "band-pull-apart", {}, {})
    }
}
