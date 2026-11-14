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
import com.example.workoutprogram.data.SessionStore
import com.example.workoutprogram.data.SignInResult
import com.example.workoutprogram.data.SignedOutException
import com.example.workoutprogram.data.WeekApi
import com.example.workoutprogram.data.WeekStore
import com.example.workoutprogram.data.WeekUploadWorker
import com.example.workoutprogram.data.parseWeek
import com.example.workoutprogram.data.parseWeeks
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
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.time.LocalDate

sealed interface Route {
    data object Week : Route
    data class Workout(val workoutId: String) : Route
    data class Log(val workoutId: String, val exerciseId: String) : Route
    data object History : Route
    data class PastWeek(val weekId: String) : Route
    data class PastWorkout(val weekId: String, val workoutId: String) : Route
}

/** Why there is no week to show. Once one is cached, failed refreshes go unnoticed. */
enum class LoadState { Loading, NoWeek, Failed }

/** Where signing in stands. */
sealed interface SignInState {
    data object Idle : SignInState
    data object Working : SignInState

    /** [reason] is the server's own explanation, or null if it couldn't be reached. */
    data class Failed(val reason: String?) : SignInState
}

/** Past weeks newest first, or null until they have been loaded once. */
data class PastWeeks(val weeks: List<ProgramWeek>?, val loading: Boolean, val failed: Boolean)

class WeekViewModel(application: Application) : AndroidViewModel(application) {
    private val session = SessionStore.of(application)
    private val api = WeekApi(BuildConfig.API_URL) { session.token.value }
    private val store = WeekStore.of(application)

    /** False while the sign-in screen should show. It turns false by itself when a session expires. */
    val signedIn: StateFlow<Boolean> = session.token.map { it != null }
        .stateIn(viewModelScope, SharingStarted.Eagerly, session.token.value != null)

    var signInState by mutableStateOf<SignInState>(SignInState.Idle)
        private set

    private val _week = MutableStateFlow(store.load())
    val week: StateFlow<ProgramWeek?> = _week.asStateFlow()

    /** Whether the coach is still missing some of what the client entered. */
    val uploading: StateFlow<Boolean> = WeekUploadWorker.pending(application)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    var loadState by mutableStateOf(LoadState.Loading)
        private set
    private var refreshing = false

    private val _history = MutableStateFlow(PastWeeks(weeks = null, loading = false, failed = false))
    val history: StateFlow<PastWeeks> = _history.asStateFlow()

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

    /** [idToken] shows Google's account picker and returns its ID token, or null if the client backed out. */
    fun signInWithGoogle(idToken: suspend (serverClientId: String) -> String?) {
        val serverClientId = BuildConfig.GOOGLE_CLIENT_ID
        if (serverClientId.isEmpty()) {
            signInState = SignInState.Failed("coach.googleClientId is not set in local.properties.")
            return
        }
        signIn {
            val token = idToken(serverClientId) ?: return@signIn null
            withContext(Dispatchers.IO) { api.signInWithGoogle(token) }
        }
    }

    fun signInForDevelopment() = signIn {
        withContext(Dispatchers.IO) { api.signInForDevelopment(BuildConfig.DEV_CLIENT_ID) }
    }

    /** [attempt] returns null if the client gave up, which is not a failure. */
    private fun signIn(attempt: suspend () -> SignInResult?) {
        if (signInState == SignInState.Working) return
        signInState = SignInState.Working
        viewModelScope.launch {
            signInState = try {
                when (val result = attempt()) {
                    null -> SignInState.Idle
                    is SignInResult.Refused -> SignInState.Failed(result.reason)
                    is SignInResult.SignedIn -> {
                        start(result)
                        SignInState.Idle
                    }
                }
            } catch (_: IOException) {
                SignInState.Failed(null)
            }
        }
    }

    private suspend fun start(signedIn: SignInResult.SignedIn) {
        // What is saved on the device belongs to whoever signed in last.
        if (session.clientId != null && session.clientId != signedIn.clientId) {
            withContext(Dispatchers.IO) { store.clear() }
            _week.value = null
            _history.value = PastWeeks(weeks = null, loading = false, failed = false)
        }
        backStack.removeRange(1, backStack.size)
        withContext(Dispatchers.IO) { session.start(signedIn.token, signedIn.clientId) }
        // Sends anything logged before the last session ended.
        WeekUploadWorker.enqueue(getApplication())
        refresh()
    }

    /** What was logged stays on the device, for when the same client signs in again. */
    fun signOut() {
        val token = session.token.value ?: return
        viewModelScope.launch(Dispatchers.IO) {
            session.end()
            try {
                api.signOut(token)
            } catch (_: IOException) {
                // The device is signed out; the server's copy of the session expires unused.
            }
        }
    }

    fun refresh() {
        if (refreshing || session.token.value == null) return
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
            } catch (_: SignedOutException) {
                session.end()
            } catch (_: IOException) {
                loadState = LoadState.Failed
            } catch (_: JSONException) {
                loadState = LoadState.Failed
            } finally {
                refreshing = false
            }
        }
    }

    /** Shows the cached past weeks at once, then replaces them with the server's. */
    fun refreshHistory() {
        if (_history.value.loading) return
        _history.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            if (_history.value.weeks == null) {
                val cached = withContext(Dispatchers.IO) { store.loadPastWeeks() }
                _history.update { it.copy(weeks = it.weeks ?: cached) }
            }
            try {
                val body = withContext(Dispatchers.IO) { api.pastWeeks() }
                val weeks = parseWeeks(JSONArray(body))
                withContext(Dispatchers.IO) { store.savePastWeeks(body) }
                _history.update { it.copy(weeks = weeks, loading = false) }
            } catch (_: SignedOutException) {
                _history.update { it.copy(loading = false) }
                session.end()
            } catch (_: IOException) {
                _history.update { it.copy(loading = false, failed = true) }
            } catch (_: JSONException) {
                _history.update { it.copy(loading = false, failed = true) }
            }
        }
    }

    fun open(route: Route) {
        backStack.add(route)
    }

    /** Swaps the screen on top for [route], so back still leads where it did. */
    fun replace(route: Route) {
        backStack[backStack.lastIndex] = route
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
