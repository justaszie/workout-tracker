package com.example.workoutprogram

import android.app.Application
import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.workoutprogram.data.ExerciseLog
import com.example.workoutprogram.data.ProgramWeek
import com.example.workoutprogram.data.WeekStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import java.io.File
import java.time.LocalDate

sealed interface Route {
    data object Week : Route
    data class Workout(val workoutId: String) : Route
    data class Log(val workoutId: String, val exerciseId: String) : Route
}

class WeekViewModel(application: Application) : AndroidViewModel(application) {
    private val store = WeekStore(File(application.filesDir, "week.json"))
    private val _week = MutableStateFlow(store.load())
    val week: StateFlow<ProgramWeek> = _week.asStateFlow()

    private val backStack = mutableStateListOf<Route>(Route.Week)
    val route: Route get() = backStack.last()
    val canGoBack: Boolean get() = backStack.size > 1

    init {
        _week.drop(1).onEach(store::save).flowOn(Dispatchers.IO).launchIn(viewModelScope)
    }

    fun open(route: Route) {
        backStack.add(route)
    }

    fun back() {
        if (canGoBack) backStack.removeAt(backStack.lastIndex)
    }

    fun saveLog(route: Route.Log, log: ExerciseLog) {
        _week.update { it.logExercise(route.workoutId, route.exerciseId, log) }
        val next = _week.value.workout(route.workoutId)?.nextUnlogged(route.exerciseId)
        back()
        if (next != null) open(Route.Log(route.workoutId, next.id))
    }

    fun setAlbumLink(workoutId: String, link: String) {
        _week.update { it.setAlbumLink(workoutId, link) }
    }

    fun finishWorkout(workoutId: String) {
        _week.update { it.finishWorkout(workoutId, LocalDate.now()) }
        back()
    }

    fun finishWeek(note: String) {
        _week.update { it.finish(LocalDate.now(), note) }
    }

    fun reopenWeek() {
        _week.update { it.reopen() }
    }
}
