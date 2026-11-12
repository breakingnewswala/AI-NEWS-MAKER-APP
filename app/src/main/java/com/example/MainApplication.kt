package com.example

import android.app.Application
import java.io.File

class MainApplication : Application() {

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

