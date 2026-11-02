package com.example.workoutprogram.ui.week

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.workoutprogram.LoadState
import com.example.workoutprogram.R
import com.example.workoutprogram.ui.components.ScreenTitle
import com.example.workoutprogram.ui.components.SupportText
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme

/** Shown instead of the week screen until the first week has been loaded. */
@Composable
fun WeekUnavailable(state: LoadState, onRetry: () -> Unit) {
    Scaffold { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            when (state) {
                LoadState.Loading -> CircularProgressIndicator()

                LoadState.NoWeek -> Message(
                    title = stringResource(R.string.no_week_title),
                    body = stringResource(R.string.no_week_body),
                    onRetry = onRetry,
                )

                LoadState.Failed -> Message(
                    title = stringResource(R.string.load_failed_title),
                    body = stringResource(R.string.load_failed_body),
                    onRetry = onRetry,
                )
            }
        }
    }
}

@Composable
private fun Message(title: String, body: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
    ) {
        ScreenTitle(title)
        SupportText(body)
        Button(onClick = onRetry) {
            Text(stringResource(R.string.try_again))
        }
    }
}

@Preview(widthDp = 412, heightDp = 900)
@Composable
private fun NoWeekPreview() {
    WorkoutProgramTheme {
        WeekUnavailable(LoadState.NoWeek) {}
    }
}
