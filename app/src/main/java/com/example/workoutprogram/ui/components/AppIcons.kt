package com.example.workoutprogram.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/** The design's outlined icons, drawn from its 24×24 stroke paths. */
object AppIcons {
    val Back = strokeIcon("M20 12H4M10 6l-6 6 6 6")
    val Chevron = strokeIcon("M9 18l6-6-6-6")
    val ChevronLeft = strokeIcon("M15 18l-6-6 6-6")
    val Check = strokeIcon("M20 6L9 17l-5-5", width = 2.5f)
    val CheckBold = strokeIcon("M20 6L9 17l-5-5", width = 2.25f)
    val Flag = strokeIcon("M5 21V4", "M5 4h11l-2 4 2 4H5")
    val Hourglass = strokeIcon("M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4")
    val Reopen = strokeIcon("M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5")
    val SignOut = strokeIcon("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9")
    val History = strokeIcon("M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2")
    val Comment = strokeIcon("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z")
    val Play = strokeIcon("M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0z", "M10 8.5l5 3.5-5 3.5z")
    val Document = strokeIcon("M14 3H6v18h12V7z", "M14 3v4h4", "M9 13h6M9 17h4")
    val Album = strokeIcon(
        "M9 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
        "M3 7v12a2 2 0 0 0 2 2h12",
        "M7 14l4-4 3 3 2-2 5 5",
    )
    val Clipboard = strokeIcon(
        "M9 3h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
        "M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2",
    )
    val Minus = strokeIcon("M5 12h14", width = 2.25f)
    val Plus = strokeIcon("M12 5v14M5 12h14", width = 2.25f)
}

private fun strokeIcon(vararg paths: String, width: Float = 2f): ImageVector =
    ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        paths.forEach { path ->
            addPath(
                pathData = addPathNodes(path),
                stroke = SolidColor(Color.Black),
                strokeLineWidth = width,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            )
        }
    }.build()
