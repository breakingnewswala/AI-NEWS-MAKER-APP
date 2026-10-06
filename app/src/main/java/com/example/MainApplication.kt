package com.example

import android.app.Application
import android.system.Os
import java.io.File

class MainApplication : Application() {

<<<<<<< HEAD
    init {
        configureGraphicsEnvironment()
    }

    override fun attachBaseContext(base: android.content.Context?) {
        configureGraphicsEnvironment()
        super.attachBaseContext(base)
    }

=======
>>>>>>> 7bc5501 (feat(studio): complete mobile graphic studio specification updates, primary nav sync, 4:5 ratio enforcement, draft auto-save and push)
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
<<<<<<< HEAD
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
=======
            cleanGraphicsEnvironment()
        }

        private fun cleanGraphicsEnvironment() {
            try {
                // Force Mesa to use the software rasterizer (swrast/llvmpipe) instead of
                // attempting to open missing /dev/dri/renderD128 rendernodes in containerized
                // or virtualized environments which causes renderer process crashes.
                Os.setenv("LIBGL_ALWAYS_SOFTWARE", "1", true)
                Os.setenv("GALLIUM_DRIVER", "llvmpipe", true)
                Os.setenv("MESA_LOADER_DRIVER_OVERRIDE", "swrast", true)
                Os.setenv("MESA_SILENT", "1", true)
                Os.setenv("MESA_DEBUG", "0", true)
                Os.setenv("LIBGL_DEBUG", "0", true)
                Os.unsetenv("MESA_VK_DEVICE_SELECT")
>>>>>>> 7bc5501 (feat(studio): complete mobile graphic studio specification updates, primary nav sync, 4:5 ratio enforcement, draft auto-save and push)
            } catch (_: Throwable) {}
        }
    }
}
