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
        cleanGraphicsEnvironment()
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
                // Remove software rasterizer overrides to allow native GPU hardware acceleration
                Os.unsetenv("LIBGL_ALWAYS_SOFTWARE")
                Os.unsetenv("GALLIUM_DRIVER")
                Os.unsetenv("MESA_LOADER_DRIVER_OVERRIDE")
                Os.setenv("MESA_SILENT", "1", true)
                Os.setenv("MESA_DEBUG", "0", true)
                Os.setenv("LIBGL_DEBUG", "0", true)
                Os.unsetenv("MESA_VK_DEVICE_SELECT")
            } catch (_: Throwable) {}
        }

        fun cleanGraphicsEnvironment() {
            configureGraphicsEnvironment()
        }
    }
}
