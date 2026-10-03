package com.example

import android.app.Application
import android.system.Os
import android.system.OsConstants
import java.io.File

class MainApplication : Application() {

    init {
        configureGraphicsEnvironment()
    }

    override fun attachBaseContext(base: android.content.Context?) {
        configureGraphicsEnvironment()
        super.attachBaseContext(base)
    }

    override fun onCreate() {
        configureGraphicsEnvironment()
        super.onCreate()
        try {
            // Clean up any improperly nested Code Cache inside HTTP Cache
            // that causes Chromium Simple File Enumerator and Simple Index File reconstruction errors
            val badNestedCodeCache = File(cacheDir, "WebView/Default/HTTP Cache/Code Cache")
            if (badNestedCodeCache.exists()) {
                badNestedCodeCache.deleteRecursively()
            }
        } catch (_: Throwable) {}
    }

    companion object {
        init {
            configureGraphicsEnvironment()
        }

        fun configureGraphicsEnvironment() {
            try {
                // Redirect standard error (fd 2) to /dev/null to silence native MESA driver warnings in virtualized emulators
                val devNull = Os.open("/dev/null", OsConstants.O_WRONLY, 0)
                Os.dup2(devNull, 2)
                Os.close(devNull)
            } catch (_: Throwable) {}

            try {
                Os.setenv("LIBGL_ALWAYS_SOFTWARE", "1", true)
                Os.setenv("MESA_LOADER_DRIVER_OVERRIDE", "swrast", true)
                Os.setenv("GALLIUM_DRIVER", "softpipe", true)
                Os.setenv("MESA_VK_DEVICE_SELECT", "0", true)
                Os.setenv("MESA_LOG_FILE", "/dev/null", true)
                Os.setenv("MESA_DEBUG", "0", true)
                Os.setenv("MESA_SILENT", "1", true)
                Os.setenv("MESA_NO_ERROR", "1", true)
                Os.setenv("LIBGL_DEBUG", "quiet", true)
                Os.setenv("EGL_LOG_LEVEL", "fatal", true)
            } catch (_: Throwable) {}
        }
    }
}
