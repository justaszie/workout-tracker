import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

val localProperties = Properties().apply {
    val file = providers.fileContents(layout.settingsDirectory.file("local.properties"))
    file.asText.orNull?.let { load(it.reader()) }
}

fun quoted(text: String) = "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "com.example.workoutprogram"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.workoutprogram"
        minSdk = 33
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Per machine, from local.properties.
        buildConfigField(
            "String", "API_URL",
            quoted(localProperties.getProperty("coach.apiUrl", "http://localhost:3000")),
        )
        // The server's "Web application" OAuth client ID, which Google issues the sign-in token for.
        buildConfigField(
            "String", "GOOGLE_CLIENT_ID",
            quoted(localProperties.getProperty("coach.googleClientId", "")),
        )
    }

    buildTypes {
        debug {
            // Optional: a client to sign in as without Google, on a server that has no password.
            buildConfigField("String", "DEV_CLIENT_ID", quoted(localProperties.getProperty("coach.clientId", "")))
        }
        release {
            buildConfigField("String", "DEV_CLIENT_ID", quoted(""))
            optimization {
                enable = true
                packageScope = setOf("androidx.**", "kotlin.**", "kotlinx.**")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        buildConfig = true
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.work.runtime)
    testImplementation(libs.json)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}