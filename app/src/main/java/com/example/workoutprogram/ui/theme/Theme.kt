package com.example.workoutprogram.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// The design defines a single light palette, and the brand red rules out dynamic color.
private val AppColorScheme = lightColorScheme(
    primary = Red,
    onPrimary = White,
    primaryContainer = RedContainer,
    onPrimaryContainer = OnRedContainer,
    secondary = InkMuted,
    onSecondary = White,
    secondaryContainer = Grey90,
    onSecondaryContainer = Ink,
    tertiary = Green,
    onTertiary = White,
    tertiaryContainer = GreenContainer,
    onTertiaryContainer = OnGreenContainer,
    error = Red,
    onError = White,
    background = Paper,
    onBackground = Ink,
    surface = Paper,
    onSurface = Ink,
    surfaceVariant = Grey90,
    onSurfaceVariant = InkMuted,
    surfaceContainerLowest = White,
    surfaceContainerLow = Grey95,
    surfaceContainer = Grey95,
    surfaceContainerHigh = Grey90,
    surfaceContainerHighest = Track,
    outline = Outline,
    outlineVariant = OutlineMuted,
    inverseSurface = Ink,
    inverseOnSurface = Paper,
)

@Composable
fun WorkoutProgramTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AppColorScheme,
        typography = Typography,
        content = content,
    )
}
