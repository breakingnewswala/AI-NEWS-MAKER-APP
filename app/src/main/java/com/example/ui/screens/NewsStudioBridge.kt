package com.example.ui.screens

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.Manifest
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.FileProvider
import com.example.data.AuthManager
import com.example.data.NewsRepository
import com.example.data.TemplateConfigManager
import com.example.model.UserRole
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

/**
 * Native Android JavaScript Interface Bridge for News Graphic Studio.
 * Handles high-resolution 1080x1350 JPEG saving to Android Gallery, MediaStore, native sharing, notifications and scroll detection.
 */
class NewsStudioBridge(
    private val context: Context,
    private val onScrollChange: ((isDown: Boolean, scrollY: Int) -> Unit)? = null,
    private val onStudioModeChanged: ((mode: String) -> Unit)? = null,
    private val getWebView: () -> WebView? = { null }
) {

    @JavascriptInterface
    fun getNotificationPermissionStatus(): String {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val status = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                if (status == PackageManager.PERMISSION_GRANTED) "granted" else "default"
            } else {
                val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
                if (enabled) "granted" else "denied"
            }
        } catch (_: Exception) {
            "default"
        }
    }

    @JavascriptInterface
    fun requestNotificationPermission(): String {
        val activity = context as? Activity ?: return "unsupported"
        activity.runOnUiThread {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val currentStatus = ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                    if (currentStatus != PackageManager.PERMISSION_GRANTED) {
                        ActivityCompat.requestPermissions(
                            activity,
                            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                            1010
                        )
                    } else {
                        getWebView()?.evaluateJavascript(
                            "if (window.onNotificationPermissionResult) { window.onNotificationPermissionResult('granted'); }",
                            null
                        )
                    }
                } else {
                    val enabled = NotificationManagerCompat.from(activity).areNotificationsEnabled()
                    if (!enabled) {
                        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                            putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName)
                        }
                        activity.startActivity(intent)
                    } else {
                        getWebView()?.evaluateJavascript(
                            "if (window.onNotificationPermissionResult) { window.onNotificationPermissionResult('granted'); }",
                            null
                        )
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w("NewsStudioBridge", "Permission request error: ${e.message}")
            }
        }
        return getNotificationPermissionStatus()
    }

    @JavascriptInterface
    fun onStudioReady() {
        (context as? Activity)?.runOnUiThread {
            val pendingJson = NewsRepository.getPendingNewsJson()
            if (pendingJson.isNotBlank() && pendingJson != "{}" && NewsRepository.hasPendingGraphicPost()) {
                val escaped = pendingJson.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")
                getWebView()?.evaluateJavascript(
                    "(function() { " +
                    "if (window.setStudioMode) window.setStudioMode('graphic'); " +
                    "if (window.onAutoFillNewsLink) window.onAutoFillNewsLink(JSON.parse('$escaped')); " +
                    "})();",
                    null
                )
            }
        }
    }

    @JavascriptInterface
    fun onStudioModeChanged(mode: String) {
        (context as? Activity)?.runOnUiThread {
            onStudioModeChanged?.invoke(mode)
        }
    }

    @JavascriptInterface
    fun signInWithGoogle() {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            CoroutineScope(Dispatchers.Main).launch {
                try {
                    val credentialManager = androidx.credentials.CredentialManager.create(context)
                    val googleIdOption = com.google.android.libraries.identity.googleid.GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setServerClientId(AuthManager.DEFAULT_GOOGLE_CLIENT_ID)
                        .setAutoSelectEnabled(true)
                        .build()

                    val request = androidx.credentials.GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()

                    val result = credentialManager.getCredential(activity, request)
                    val credential = result.credential
                    if (credential is androidx.credentials.CustomCredential && credential.type == com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                        val googleIdToken = com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(credential.data)
                        val displayName = googleIdToken.displayName ?: "Google User"
                        val email = googleIdToken.id

                        val assignedRole = if (AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                        AuthManager.login(
                            context = context,
                            name = displayName,
                            email = email,
                            role = assignedRole,
                            district = "डिजिटल डेस्क"
                        )

                        val cleanName = displayName.replace("'", "\\'")
                        val cleanEmail = email.replace("'", "\\'")
                        getWebView()?.evaluateJavascript(
                            "if (window.handleGoogleUserSuccess) { window.handleGoogleUserSuccess('$cleanEmail', '$cleanName', ''); }",
                            null
                        )
                    }
                } catch (e: Exception) {
                    android.util.Log.w("GoogleAuthBridge", "Native Google sign-in failed: ${e.message}", e)
                    Toast.makeText(context, "Google लॉगिन: ${e.localizedMessage ?: "रद्द किया गया"}", Toast.LENGTH_SHORT).show()
                }
            }
        }
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
            val base64Data = if (dataUrl.contains(",")) dataUrl.substringAfter(",") else dataUrl
            val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                ?: throw IllegalStateException("इमेज डेटा डिकोड नहीं हो सका")

            val isPng = fileName.endsWith(".png", ignoreCase = true)
            val cleanName = if (fileName.endsWith(".jpg", ignoreCase = true) || fileName.endsWith(".jpeg", ignoreCase = true) || isPng) {
                fileName
            } else {
                "$fileName.png"
            }

            val mimeType = if (isPng) "image/png" else "image/jpeg"
            val compressFormat = if (isPng) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
            val compressQuality = if (isPng) 100 else 95

            var savedSuccessfully = false

            try {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, cleanName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/BreakingNewsWala")
                        put(MediaStore.MediaColumns.IS_PENDING, 1)
                    }
                }

                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)

                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { stream ->
                        bitmap.compress(compressFormat, compressQuality, stream)
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        contentValues.clear()
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                        resolver.update(uri, contentValues, null, null)
                    }

                    MediaScannerConnection.scanFile(
                        context,
                        arrayOf(uri.toString()),
                        arrayOf(mimeType),
                        null
                    )
                    savedSuccessfully = true
                }
            } catch (mediaStoreErr: Exception) {
                mediaStoreErr.printStackTrace()
            }

            // Fallback to pictures directory if MediaStore insert failed
            if (!savedSuccessfully) {
                val picturesDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: context.filesDir
                val fallbackFile = File(picturesDir, cleanName)
                fallbackFile.outputStream().use { stream ->
                    bitmap.compress(compressFormat, compressQuality, stream)
                }
                MediaScannerConnection.scanFile(
                    context,
                    arrayOf(fallbackFile.absolutePath),
                    arrayOf(mimeType),
                    null
                )
                savedSuccessfully = true
            }

            Handler(Looper.getMainLooper()).post {
                Toast.makeText(
                    context,
                    "✅ 1080×1350 न्यूज़ कार्ड गैलरी में सुरक्षित हो गया!",
                    Toast.LENGTH_LONG
                ).show()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "इमेज सेव करने में त्रुटि: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun shareImage(dataUrl: String, title: String) {
        try {
            val base64Data = if (dataUrl.contains(",")) dataUrl.substringAfter(",") else dataUrl
            val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            val tempFile = File(context.cacheDir, "shared_breaking_card.jpg")
            tempFile.outputStream().use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)
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
