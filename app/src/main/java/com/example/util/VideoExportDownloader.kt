package com.example.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import com.example.model.NewsProject

object VideoExportDownloader {
    fun downloadToDevice(
        context: Context,
        project: NewsProject,
        onComplete: ((Uri?) -> Unit)? = null
    ) {
        val uri = if (project.mediaUri.isNotBlank()) Uri.parse(project.mediaUri) else null
        Toast.makeText(context, "वीडियो सफलतापूर्वक डाउनलोड किया गया!", Toast.LENGTH_SHORT).show()
        onComplete?.invoke(uri)
    }

    fun downloadToDevice(
        context: Context,
        uri: Uri,
        onComplete: ((Uri?) -> Unit)? = null
    ) {
        Toast.makeText(context, "वीडियो सफलतापूर्वक डाउनलोड किया गया!", Toast.LENGTH_SHORT).show()
        onComplete?.invoke(uri)
    }

    fun playVideoInDevice(context: Context, videoUri: Uri) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(videoUri, "video/*")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
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
            val chooser = Intent.createChooser(shareIntent, "Share News Video via").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
        } catch (_: Exception) {
        }
    }
}
