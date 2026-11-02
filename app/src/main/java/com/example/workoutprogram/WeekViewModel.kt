package com.example.workoutprogram

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.workoutprogram.data.ExerciseLog
import com.example.workoutprogram.data.ProgramWeek
import com.example.workoutprogram.data.WeekApi
import com.example.workoutprogram.data.WeekStore
import com.example.workoutprogram.data.WeekUploadWorker
import com.example.workoutprogram.data.parseWeek
import com.example.workoutprogram.data.withProgress
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.time.LocalDate

sealed interface Route {
    data object Week : Route
    data class Workout(val workoutId: String) : Route
    data class Log(val workoutId: String, val exerciseId: String) : Route
}

/** Why there is no week to show. Once one is cached, failed refreshes go unnoticed. */
enum class LoadState { Loading, NoWeek, Failed }

class WeekViewModel(application: Application) : AndroidViewModel(application) {
    private val api = WeekApi(BuildConfig.API_URL, BuildConfig.CLIENT_ID, BuildConfig.API_PASSWORD)
    private val store = WeekStore.of(application)
    private val _week = MutableStateFlow(store.load())
    val week: StateFlow<ProgramWeek?> = _week.asStateFlow()

    /** Whether the coach is still missing some of what the client entered. */
    val uploading: StateFlow<Boolean> = WeekUploadWorker.pending(application)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    var loadState by mutableStateOf(LoadState.Loading)
        private set
    private var refreshing = false

    private val backStack = mutableStateListOf<Route>(Route.Week)
    val route: Route get() = backStack.last()
    val canGoBack: Boolean get() = backStack.size > 1

    init {
        _week.drop(1).filterNotNull()
            .onEach {
                store.save(it)
                WeekUploadWorker.enqueue(application)
            }
            .flowOn(Dispatchers.IO)
            .launchIn(viewModelScope)
    }

    fun refresh() {
        if (refreshing) return
        refreshing = true
        loadState = LoadState.Loading
        viewModelScope.launch {
            try {
                val body = withContext(Dispatchers.IO) { api.currentWeek() }
                if (body == null) {
                    loadState = LoadState.NoWeek
                } else {
                    val plan = parseWeek(JSONObject(body))
                    withContext(Dispatchers.IO) { store.savePlan(body) }
                    // A new week has none of the workouts the back stack may point at.
                    if (_week.value?.id != plan.id) backStack.removeRange(1, backStack.size)
                    // Merged here, not from disk, to keep anything logged during the request.
                    _week.update { withProgress(plan, it) }
                }
            } catch (_: IOException) {
                loadState = LoadState.Failed
            } catch (_: JSONException) {
                loadState = LoadState.Failed
            } finally {
                refreshing = false
            }
        }
    }

    fun open(route: Route) {
        backStack.add(route)
    }

    fun back() {
        if (canGoBack) backStack.removeAt(backStack.lastIndex)
    }

    fun saveLog(route: Route.Log, log: ExerciseLog) {
        _week.update { it?.logExercise(route.workoutId, route.exerciseId, log) }
        val next = _week.value?.workout(route.workoutId)?.nextUnlogged(route.exerciseId)
        back()
        if (next != null) open(Route.Log(route.workoutId, next.id))
    }

    fun setAlbumLink(workoutId: String, link: String) {
        _week.update { it?.setAlbumLink(workoutId, link) }
    }

    fun finishWorkout(workoutId: String) {
        _week.update { it?.finishWorkout(workoutId, LocalDate.now()) }
        back()
    }

    fun finishWeek(note: String) {
        _week.update { it?.finish(LocalDate.now(), note) }
    }

    fun reopenWeek() {
        _week.update { it?.reopen() }
    }
}
