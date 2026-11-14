package com.example.workoutprogram.ui.signin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.workoutprogram.R
import com.example.workoutprogram.SignInState
import com.example.workoutprogram.ui.components.Eyebrow
import com.example.workoutprogram.ui.components.ScreenTitle
import com.example.workoutprogram.ui.components.SupportText
import com.example.workoutprogram.ui.theme.WorkoutProgramTheme

/** Shown instead of everything else while nobody is signed in. */
@Composable
fun SignInScreen(
    state: SignInState,
    onSignIn: () -> Unit,
    /** Signs in without Google. Null outside debug builds set up for it. */
    onDeveloperSignIn: (() -> Unit)? = null,
) {
    val working = state == SignInState.Working
    Scaffold { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        ) {
            Eyebrow(stringResource(R.string.app_name))
            ScreenTitle(stringResource(R.string.sign_in_title))
            SupportText(stringResource(R.string.sign_in_body))
            if (state is SignInState.Failed) {
                Text(
                    text = state.reason ?: stringResource(R.string.sign_in_failed),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            Button(onClick = onSignIn, enabled = !working) {
                Text(stringResource(if (working) R.string.signing_in else R.string.sign_in_google))
            }
            if (onDeveloperSignIn != null) {
                TextButton(onClick = onDeveloperSignIn, enabled = !working) {
                    Text(stringResource(R.string.sign_in_developer))
                }
            }
        }
    }
}

@Preview(widthDp = 412, heightDp = 900)
@Composable
private fun SignInRefusedPreview() {
    WorkoutProgramTheme {
        SignInScreen(SignInState.Failed("Your coach hasn't added alex@example.com yet."), {}, {})
    }
}
