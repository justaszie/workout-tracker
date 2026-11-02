package com.example.workoutprogram.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.workoutprogram.R

@OptIn(ExperimentalTextApi::class)
private fun condensed(weight: FontWeight) = Font(
    resId = R.font.roboto_condensed,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

/** Numerals and screen titles. Body text stays on the system Roboto. */
val RobotoCondensed = FontFamily(condensed(FontWeight.Bold), condensed(FontWeight.ExtraBold))

private val Defaults = Typography()

val Typography = Typography(
    // Screen titles; rendered uppercase by ScreenTitle.
    headlineLarge = TextStyle(
        fontFamily = RobotoCondensed,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = 0.5.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = RobotoCondensed,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 32.sp,
        lineHeight = 38.sp,
        letterSpacing = 0.5.sp,
    ),
    // Prescription numbers.
    displaySmall = TextStyle(
        fontFamily = RobotoCondensed,
        fontWeight = FontWeight.Bold,
        fontSize = 40.sp,
        lineHeight = 44.sp,
    ),
    // Workout numbers and RPE buttons.
    titleLarge = TextStyle(
        fontFamily = RobotoCondensed,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
    ),
    // Eyebrows above screen titles.
    labelSmall = Defaults.labelSmall.copy(
        fontSize = 12.sp,
        lineHeight = 16.sp,
        fontWeight = FontWeight.Medium,
        letterSpacing = 1.sp,
    ),
)
