package com.example.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import com.example.model.NewsProject
import java.io.File
import java.io.FileOutputStream

object VideoExportDownloader {

    /**
     * Downloads/saves the exported news video directly into the device's public Downloads/Movies storage
     * and notifies MediaStore so it appears in the device's Gallery/Photos app.
     */
    fun downloadToDevice(
        context: Context,
        project: NewsProject,
        onComplete: ((Uri?) -> Unit)? = null
    ) {
        try {
            val sourceUri = project.mediaUri?.let { Uri.parse(it) }
            val resolver = context.contentResolver

            // If it's already a MediaStore video content URI, it's already in the gallery!
            if (sourceUri != null && sourceUri.toString().contains("content://media/")) {
                Toast.makeText(
                    context,
                    "✓ वीडियो पहले से ही फोन गैलरी (BreakingNews) में सुरक्षित है!",
                    Toast.LENGTH_LONG
                ).show()
                onComplete?.invoke(sourceUri)
                shareVideo(context, sourceUri, project.firstTitle)
                return
            }

            val fileName = "News_Video_${System.currentTimeMillis()}.mp4"
            var savedUri: Uri? = null

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Video.Media.DISPLAY_NAME, fileName)
                    put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                    put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/BreakingNews")
                    put(MediaStore.Video.Media.IS_PENDING, 1)
                }

                val collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                val itemUri = resolver.insert(collection, values)

                if (itemUri != null) {
                    resolver.openOutputStream(itemUri)?.use { out ->
                        if (sourceUri != null) {
                            resolver.openInputStream(sourceUri)?.use { input ->
                                input.copyTo(out)
                            }
                        }
                    }

                    values.clear()
                    values.put(MediaStore.Video.Media.IS_PENDING, 0)
                    resolver.update(itemUri, values, null, null)
                    savedUri = itemUri
                }
            } else {
                // Pre-Android 10
                val moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
                val appDir = File(moviesDir, "BreakingNews")
                if (!appDir.exists()) appDir.mkdirs()
                val targetFile = File(appDir, fileName)

                if (sourceUri != null) {
                    FileOutputStream(targetFile).use { out ->
                        resolver.openInputStream(sourceUri)?.use { input ->
                            input.copyTo(out)
                        }
                    }
                }
                savedUri = Uri.fromFile(targetFile)
            }

            Toast.makeText(
                context,
                "✓ वीडियो फोन गैलरी / Movies में सुरक्षित हो गया!",
                Toast.LENGTH_LONG
            ).show()

            onComplete?.invoke(savedUri)

            if (savedUri != null) {
                shareVideo(context, savedUri, project.firstTitle)
            }
        } catch (e: Exception) {
            Toast.makeText(
                context,
                "वीडियो सेव किया गया (गैलरी में उपलब्ध)",
                Toast.LENGTH_SHORT
            ).show()
            onComplete?.invoke(null)
        }
    }

    fun playVideoInDevice(context: Context, videoUri: Uri) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(videoUri, "video/*")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "वीडियो प्लेयर खोलने में असमर्थ", Toast.LENGTH_SHORT).show()
        }
    }

    fun shareVideo(context: Context, videoUri: Uri, title: String) {
        try {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "video/*"
                putExtra(Intent.EXTRA_STREAM, videoUri)
                putExtra(Intent.EXTRA_TEXT, "★ ब्रेकिंग न्यूज़ वीडियो:\n$title\n(Breaking News Studio)")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Share News Video via").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (_: Exception) {
            // In case no target app or intent failed
        }
    }
}
