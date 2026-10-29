package com.example.data

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

object FirebaseCloudStorageManager {
    private const val TAG = "FirebaseStorage"

    fun isConfigured(context: Context): Boolean {
        return false
    }

    fun uploadVideo(
        context: Context,
        videoUri: Uri,
        title: String,
        onSuccess: (String, String) -> Unit,
        onError: (String) -> Unit,
        onProgress: (Float) -> Unit = {}
    ) {
        // Return local URI if remote storage is not active
        onProgress(1.0f)
        onSuccess(videoUri.toString(), "NEWS_${System.currentTimeMillis()}.mp4")
    }

    suspend fun cleanupLocalVideosOlderThan(
        context: Context,
        days: Int = 4
    ): Int = withContext(Dispatchers.IO) {
        var deletedCount = 0
        try {
            val cutoff = System.currentTimeMillis() - (days * 24 * 60 * 60 * 1000L)
            val filesDir = context.filesDir
            filesDir?.listFiles()?.forEach { file ->
                if (file.name.endsWith(".mp4") && file.lastModified() < cutoff) {
                    if (file.delete()) deletedCount++
                }
            }
            val cacheDir = context.cacheDir
            cacheDir?.listFiles()?.forEach { file ->
                if (file.name.endsWith(".mp4") && file.lastModified() < cutoff) {
                    if (file.delete()) deletedCount++
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        deletedCount
    }
}
