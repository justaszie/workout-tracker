package com.example.workoutprogram

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.workoutprogram.ui.log.LogExerciseScreen
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme
import com.example.workoutprogram.ui.week.WeekScreen
import com.example.workoutprogram.ui.workout.WorkoutScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The app is always light, so bar icons must stay dark even in system dark mode.
        val lightBars = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        enableEdgeToEdge(statusBarStyle = lightBars, navigationBarStyle = lightBars)
        setContent {
            WorkoutProgramTheme {
                WorkoutApp()
            }
        }
    }
}

@Composable
private fun WorkoutApp(viewModel: WeekViewModel = viewModel()) {
    val week by viewModel.week.collectAsStateWithLifecycle()
    // Keeps scroll positions when coming back from a deeper screen.
    val saved = rememberSaveableStateHolder()

    BackHandler(enabled = viewModel.canGoBack, onBack = viewModel::back)

    when (val route = viewModel.route) {
        Route.Week -> saved.SaveableStateProvider("week") {
            WeekScreen(
                week = week,
                onOpenWorkout = { viewModel.open(Route.Workout(it)) },
                onFinishWeek = viewModel::finishWeek,
                onReopenWeek = viewModel::reopenWeek,
            )
        }

        is Route.Workout -> {
            val workout = week.workout(route.workoutId) ?: return
            saved.SaveableStateProvider(route.workoutId) {
                WorkoutScreen(
                    week = week,
                    workout = workout,
                    onBack = viewModel::back,
                    onLog = { viewModel.open(Route.Log(workout.id, it)) },
                    onAlbumLinkChange = { viewModel.setAlbumLink(workout.id, it) },
                    onFinish = { viewModel.finishWorkout(workout.id) },
                )
            }
        }

        is Route.Log -> {
            val workout = week.workout(route.workoutId) ?: return
            key(route.exerciseId) {
                LogExerciseScreen(
                    workout = workout,
                    exerciseId = route.exerciseId,
                    onBack = viewModel::back,
                    onSave = { viewModel.saveLog(route, it) },
                )
            }
        }
    }
}
