package com.example

import android.app.Application
import android.system.Os
import java.io.File

class MainApplication : Application() {

    companion object {
        init {
            try {
                Os.setenv("MESA_LOG_FILE", "/dev/null", true)
                Os.setenv("LIBGL_ALWAYS_SOFTWARE", "1", true)
                Os.setenv("LIBGL_DRI3_DISABLE", "1", true)
                Os.setenv("LIBGL_KVM_DISABLE", "1", true)
                Os.setenv("GALLIUM_DRIVER", "llvmpipe", true)
                Os.setenv("MESA_LOADER_DRIVER_OVERRIDE", "swrast", true)
                Os.setenv("MESA_DEBUG", "0", true)
                Os.setenv("MESA_SILENT", "1", true)
                Os.setenv("MESA_NO_ERROR", "1", true)
                Os.setenv("EGL_LOG_LEVEL", "fatal", true)
            } catch (_: Throwable) {}
        }
    }

    override fun attachBaseContext(base: android.content.Context?) {
        super.attachBaseContext(base)
        try {
            Os.setenv("MESA_LOG_FILE", "/dev/null", true)
            Os.setenv("LIBGL_ALWAYS_SOFTWARE", "1", true)
            Os.setenv("LIBGL_DRI3_DISABLE", "1", true)
            Os.setenv("LIBGL_KVM_DISABLE", "1", true)
            Os.setenv("GALLIUM_DRIVER", "llvmpipe", true)
            Os.setenv("MESA_LOADER_DRIVER_OVERRIDE", "swrast", true)
            Os.setenv("MESA_DEBUG", "0", true)
            Os.setenv("MESA_SILENT", "1", true)
            Os.setenv("MESA_NO_ERROR", "1", true)
            Os.setenv("EGL_LOG_LEVEL", "fatal", true)
        } catch (_: Throwable) {}
    }

    override fun onCreate() {
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
}
