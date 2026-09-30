package com.example.data

import android.content.Context
import android.net.Uri
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageMetadata
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Firebase Cloud Storage Manager for AI News Maker
 * Connected to Bucket: ainewsmakerapp.firebasestorage.app
 * Handles 3-4 days auto-deleting cloud video storage & local cache cleanup
 */
object FirebaseCloudStorageManager {

    private const val TAG = "FirebaseStorage"
    const val BUCKET_NAME = "ainewsmakerapp.firebasestorage.app"
    const val DEFAULT_RETENTION_DAYS = 4

    private fun getStorage(context: Context): FirebaseStorage {
        if (FirebaseApp.getApps(context).isEmpty()) {
            FirebaseApp.initializeApp(context)
        }
        return try {
            FirebaseStorage.getInstance("gs://$BUCKET_NAME")
        } catch (e: Exception) {
            Log.w(TAG, "Falling back to default instance: ${e.message}")
            FirebaseStorage.getInstance()
        }
    }

    /**
     * Upload news video to Firebase Cloud Storage
     * Video will reside under /news_videos/{year_month}/{timestamp}_{cleanTitle}.mp4
     */
    fun uploadVideo(
        context: Context,
        videoUri: Uri,
        title: String,
        onProgress: (Float) -> Unit,
        onSuccess: (downloadUrl: String, fileName: String) -> Unit,
        onError: (errorMessage: String) -> Unit
    ) {
        try {
            val storage = getStorage(context)
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val cleanTitle = title.replace(Regex("[^a-zA-Z0-9_]"), "_").take(25)
            val fileName = "NEWS_${timeStamp}_${cleanTitle}.mp4"
            val folder = SimpleDateFormat("yyyy_MM", Locale.getDefault()).format(Date())
            val videoRef = storage.reference.child("news_videos/$folder/$fileName")

            val metadata = StorageMetadata.Builder()
                .setContentType("video/mp4")
                .setCustomMetadata("autoDeleteDays", DEFAULT_RETENTION_DAYS.toString())
                .setCustomMetadata("uploadedAt", System.currentTimeMillis().toString())
                .setCustomMetadata("app", "AI_NEWS_MAKER")
                .build()

            val uploadTask = videoRef.putFile(videoUri, metadata)

            uploadTask.addOnProgressListener { taskSnapshot ->
                val totalBytes = taskSnapshot.totalByteCount
                if (totalBytes > 0) {
                    val progress = taskSnapshot.bytesTransferred.toFloat() / totalBytes.toFloat()
                    onProgress(progress)
                }
            }.addOnSuccessListener {
                videoRef.downloadUrl.addOnSuccessListener { uri ->
                    Log.i(TAG, "Video uploaded successfully: $uri")
                    onSuccess(uri.toString(), fileName)
                }.addOnFailureListener { e ->
                    Log.e(TAG, "Failed to get download url: ${e.message}", e)
                    onError("लिंक प्राप्त करने में त्रुटि: ${e.localizedMessage ?: "Unknown"}")
                }
            }.addOnFailureListener { e ->
                Log.e(TAG, "Upload failed: ${e.message}", e)
                onError("क्लाउड अपलोड विफल: ${e.localizedMessage ?: "कृपया इंटरनेट कनेक्शन जांचें"}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Upload exception: ${e.message}", e)
            onError("अपलोड शुरू करने में त्रुटि: ${e.localizedMessage ?: "Unknown error"}")
        }
    }

    /**
     * Automatically cleans up local temporary video cache files older than 4 days
     * to prevent device memory from filling up.
     */
    suspend fun cleanupLocalVideosOlderThan(context: Context, days: Int = DEFAULT_RETENTION_DAYS): Int = withContext(Dispatchers.IO) {
        var deletedCount = 0
        try {
            val cutoffTime = System.currentTimeMillis() - (days.toLong() * 24 * 60 * 60 * 1000)
            val cacheDir = context.cacheDir
            val files = cacheDir.listFiles { file ->
                file.name.endsWith(".mp4", ignoreCase = true) || file.name.contains("video", ignoreCase = true)
            }
            files?.forEach { file ->
                if (file.lastModified() < cutoffTime) {
                    if (file.delete()) {
                        deletedCount++
                    }
                }
            }

            // Also check internal app files directory
            val filesDir = context.filesDir
            val internalFiles = filesDir.listFiles { file ->
                file.name.endsWith(".mp4", ignoreCase = true)
            }
            internalFiles?.forEach { file ->
                if (file.lastModified() < cutoffTime) {
                    if (file.delete()) {
                        deletedCount++
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Local cleanup error: ${e.message}")
        }
        deletedCount
    }
}
