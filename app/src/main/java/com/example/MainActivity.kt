package com.example

import android.os.Bundle
import android.system.Os
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import com.example.ui.screens.BreakingNewsStudioWebView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            Os.setenv("MESA_LOG_FILE", "/dev/null", true)
            Os.setenv("LIBGL_ALWAYS_SOFTWARE", "1", true)
            Os.setenv("GALLIUM_DRIVER", "llvmpipe", true)
            Os.setenv("MESA_LOADER_DRIVER_OVERRIDE", "swrast", true)
        } catch (_: Throwable) {
        }
        try {
            MainApplication.configureGraphicsEnvironment()
        } catch (_: Throwable) {
        }

        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                BreakingNewsStudioWebView(
                    modifier = Modifier.fillMaxSize(),
                    initialTab = "home"
                )
            }
        }
    }
}
