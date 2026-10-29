package com.example

import android.os.Bundle
import android.system.Os
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.ui.screens.BreakingNewsStudioWebView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            Os.setenv("MESA_LOG_FILE", "/dev/null", true)
            Os.unsetenv("LIBGL_ALWAYS_SOFTWARE")
            Os.unsetenv("GALLIUM_DRIVER")
            Os.unsetenv("MESA_LOADER_DRIVER_OVERRIDE")
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
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0F172A))
                        .statusBarsPadding()
                        .navigationBarsPadding(),
                    initialTab = "home",
                    onWebViewCreated = { activeWebView = it }
                )
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1010) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED
            val status = if (granted) "granted" else "denied"
            activeWebView?.evaluateJavascript(
                "if (window.onNotificationPermissionResult) { window.onNotificationPermissionResult('$status'); }",
                null
            )
        }
    }

    companion object {
        var activeWebView: android.webkit.WebView? = null
    }
}
