package com.example.workoutprogram.data

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.example.workoutprogram.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Uploads the saved progress. It runs through WorkManager so a week logged without a connection
 * still reaches the coach once there is one, even if the app is closed by then.
 */
class WeekUploadWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val progress = WeekStore.of(applicationContext).progress() ?: return Result.success()
        val api = WeekApi(BuildConfig.API_URL, BuildConfig.CLIENT_ID, BuildConfig.API_PASSWORD)
        return try {
            api.saveProgress(progress.getString("weekId"), progress.toString())
            Result.success()
        } catch (_: IOException) {
            Result.retry()
        }
    }

    companion object {
        private const val NAME = "week-upload"

        // The album field saves on every keystroke, and each change replaces the waiting upload.
        private const val DELAY_SECONDS = 2L
        private const val RETRY_SECONDS = 30L

        /** Uploads whatever is saved by the time it runs, so one upload covers earlier changes. */
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<WeekUploadWorker>()
                .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .setInitialDelay(DELAY_SECONDS, TimeUnit.SECONDS)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, RETRY_SECONDS, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(NAME, ExistingWorkPolicy.REPLACE, request)
        }

        fun pending(context: Context): Flow<Boolean> =
            WorkManager.getInstance(context).getWorkInfosForUniqueWorkFlow(NAME)
                .map { uploads -> uploads.any { !it.state.isFinished } }
    }
}
