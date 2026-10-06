package com.example.ui.screens

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.FileProvider
import com.example.data.AuthManager
import com.example.data.NewsRepository
import com.example.data.TemplateConfigManager
import java.io.File
import java.io.FileOutputStream

class NewsStudioBridge(
    private val context: Context,
    private val onScrollChange: ((isDown: Boolean, scrollY: Int) -> Unit)? = null,
    private val onStudioModeChanged: ((mode: String) -> Unit)? = null,
    private val getWebView: () -> WebView? = { null }
) {

    @JavascriptInterface
    fun onStudioReady() {
        // Studio page mounted and ready
    }

    @JavascriptInterface
    fun onStudioModeChanged(mode: String) {
        onStudioModeChanged?.invoke(mode)
    }

    @JavascriptInterface
    fun getProfileHeaderFooterJson(): String {
        return TemplateConfigManager.getFullExportJson(context)
    }

    @JavascriptInterface
    fun getUserSession(): String {
        return AuthManager.getUserSessionJson()
    }

    @JavascriptInterface
    fun getChannelProfile(): String {
        return AuthManager.getChannelProfileJson()
    }

    @JavascriptInterface
    fun getPendingNewsData(): String {
        return NewsRepository.getPendingNewsJson()
    }

    @JavascriptInterface
    fun clearPendingNewsData() {
        NewsRepository.clearPendingNews()
    }

    @JavascriptInterface
    fun getClipboardText(): String {
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val item = clipboard?.primaryClip?.getItemAt(0)
            item?.text?.toString() ?: ""
        } catch (_: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun reportScroll(scrollY: Int, isDown: Boolean) {
        (context as? Activity)?.runOnUiThread {
            onScrollChange?.invoke(isDown, scrollY)
        }
    }

    @JavascriptInterface
    fun downloadImage(dataUrl: String, fileName: String) {
        try {
            val base64Data = if (dataUrl.contains(",")) {
                dataUrl.substringAfter(",")
            } else {
                dataUrl
            }
            val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
            val appDir = File(picturesDir, "AINewsMaker")
            if (!appDir.exists()) appDir.mkdirs()

            val cleanFileName = if (fileName.endsWith(".jpg") || fileName.endsWith(".png")) {
                fileName
            } else {
                "${fileName}_${System.currentTimeMillis()}.jpg"
            }
            val outFile = File(appDir, cleanFileName)
            FileOutputStream(outFile).use { fos ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, fos)
            }

            showToast("फोटो सेव हो गई: ${outFile.name}")
        } catch (e: Exception) {
            e.printStackTrace()
            showToast("डाउनलोड असफल रहा: ${e.message}")
        }
    }

    @JavascriptInterface
    fun shareImage(dataUrl: String, title: String) {
        try {
            val base64Data = if (dataUrl.contains(",")) {
                dataUrl.substringAfter(",")
            } else {
                dataUrl
            }
            val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            val tempFile = File(context.cacheDir, "shared_breaking_card.jpg")
            FileOutputStream(tempFile).use { fos ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, fos)
            }

            val authority = "${context.packageName}.fileprovider"
            val contentUri = FileProvider.getUriForFile(context, authority, tempFile)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/jpeg"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(shareIntent, "कार्ड शेयर करें").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
            showToast("शेयर नहीं हो सका: ${e.message}")
        }
    }

    @JavascriptInterface
    fun showToast(message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}
