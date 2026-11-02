package com.example.workoutprogram.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldLabelPosition
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.input.InputTransformation
import androidx.compose.foundation.text.input.TextFieldLineLimits
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import com.example.workoutprogram.R
import com.example.workoutprogram.data.Resource

@Composable
fun BackRow(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(AppIcons.Back, contentDescription = stringResource(R.string.back))
        }
    }
}

@Composable
fun Eyebrow(text: String, color: Color = MaterialTheme.colorScheme.primary) {
    Text(text.uppercase(), style = MaterialTheme.typography.labelSmall, color = color)
}

@Composable
fun ScreenTitle(text: String, style: TextStyle = MaterialTheme.typography.headlineLarge) {
    Text(text.uppercase(), style = style)
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
    )
}

/** Fraction bar with the Material 3 gap and stop dot. */
@Composable
fun StepProgress(done: Int, total: Int, modifier: Modifier = Modifier) {
    LinearProgressIndicator(
        progress = { if (total == 0) 0f else done.toFloat() / total },
        modifier = modifier.fillMaxWidth(),
        trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
    )
}

/** A small read-only label, such as a prescription or a status. */
@Composable
fun Tag(
    text: String,
    modifier: Modifier = Modifier,
    container: Color = MaterialTheme.colorScheme.surfaceContainerHigh,
    content: Color = MaterialTheme.colorScheme.onSurface,
    style: TextStyle = MaterialTheme.typography.labelLarge,
    border: BorderStroke? = null,
    leading: (@Composable RowScope.() -> Unit)? = null,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = container,
        contentColor = content,
        border = border,
    ) {
        Row(
            modifier = Modifier
                .height(28.dp)
                .padding(start = if (leading != null) 6.dp else 10.dp, end = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            leading?.invoke(this)
            Text(text, style = style, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** Text with a medium-weight lead-in, as in "Coach: …". */
@Composable
fun LeadInText(
    lead: String,
    text: String,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    leadColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Text(
        text = buildAnnotatedString {
            withStyle(SpanStyle(fontWeight = FontWeight.Medium, color = leadColor)) { append(lead) }
            append(" ")
            append(text)
        },
        modifier = modifier,
        style = MaterialTheme.typography.bodyMedium,
        color = color,
    )
}

@Composable
fun CoachNote(note: String, modifier: Modifier = Modifier) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(
            imageVector = AppIcons.Comment,
            contentDescription = null,
            modifier = Modifier.padding(top = 1.dp).size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        LeadInText(stringResource(R.string.coach_prefix), note)
    }
}

@Composable
fun CoachNoteBox(note: String) {
    CoachNote(
        note = note,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(12.dp))
            .padding(12.dp),
    )
}

@Composable
fun ResourceChip(resource: Resource) {
    val uriHandler = LocalUriHandler.current
    val (label, icon) = when (resource.kind) {
        Resource.Kind.DemoVideo -> R.string.demo_video to AppIcons.Play
        Resource.Kind.SetupGuide -> R.string.setup_guide to AppIcons.Document
    }
    AssistChip(
        onClick = { uriHandler.openUri(resource.url) },
        label = { Text(stringResource(label)) },
        leadingIcon = {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        },
        colors = AssistChipDefaults.assistChipColors(
            leadingIconContentColor = MaterialTheme.colorScheme.primary,
        ),
    )
}

/**
 * Outlined field whose label stays on the border, as in the design. Only the [TextFieldState]
 * overload offers that label position. [transform] cleans each edit; returning null rejects it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabeledField(
    state: TextFieldState,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    minLines: Int = 1,
    isError: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    transform: (String) -> String? = { it },
    suffix: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    supportingText: (@Composable () -> Unit)? = null,
) {
    val currentTransform by rememberUpdatedState(transform)
    OutlinedTextField(
        state = state,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        labelPosition = TextFieldLabelPosition.Attached(alwaysMinimize = true),
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        lineLimits = if (singleLine) {
            TextFieldLineLimits.SingleLine
        } else {
            TextFieldLineLimits.MultiLine(minHeightInLines = minLines)
        },
        isError = isError,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        inputTransformation = InputTransformation {
            val input = toString()
            val output = currentTransform(input)
            when {
                output == null -> revertAllChanges()
                output != input -> replace(0, length, output)
            }
        },
        textStyle = textStyle,
        suffix = suffix,
        trailingIcon = trailingIcon,
        supportingText = supportingText,
    )
}

/** Label-sized text button with a leading icon. */
@Composable
fun IconTextButton(
    text: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    TextButton(
        onClick = onClick,
        modifier = modifier.offset(x = (-12).dp).height(48.dp),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
        Box(Modifier.size(8.dp))
        Text(text)
    }
}

@Composable
fun SupportText(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

/** White card used across the workout and log screens. */
@Composable
fun Card(
    modifier: Modifier = Modifier,
    verticalSpacing: Arrangement.Vertical = Arrangement.spacedBy(12.dp),
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceContainerLowest, RoundedCornerShape(12.dp))
            .padding(16.dp),
        verticalArrangement = verticalSpacing,
    ) {
        content()
    }
}
