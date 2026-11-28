package com.example.ui.screens

import android.app.Activity
import android.app.DownloadManager
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
import android.util.Log
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
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.example.R
import com.example.data.AuthManager
import com.example.data.FirestoreSyncRepository
import com.example.data.NewsRepository
import com.example.data.TemplateConfigManager
import com.example.model.UserRole
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.Firebase
import com.google.firebase.FirebaseApp
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.Schema
import com.google.firebase.ai.type.generationConfig
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.auth
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

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

    private data class PendingVideoTransfer(
        val file: File,
        val fileName: String,
        val mimeType: String,
        var outputStream: BufferedOutputStream?
    )

    private val pendingVideoTransfers = ConcurrentHashMap<String, PendingVideoTransfer>()
    @Volatile
    private var lastSavedVideoUri: Uri? = null
    @Volatile
    private var lastSavedVideoFile: File? = null
    @Volatile
    private var lastSavedVideoMime: String = "video/mp4"

    private val newsCardSchema by lazy {
        Schema.obj(
            properties = mapOf(
                "headline" to Schema.string(description = "Crisp breaking news headline matching input language"),
                "subHeadline" to Schema.string(description = "Supporting sub-headline with concise context"),
                "summary" to Schema.string(description = "2-3 sentence news summary for a graphic card"),
                "socialCaption" to Schema.string(description = "Share-ready social media caption"),
                "hashtags" to Schema.array(
                    items = Schema.string(),
                    description = "3 to 5 relevant hashtags"
                )
            ),
            optionalProperties = listOf("subHeadline", "hashtags")
        )
    }

    private val generativeModel by lazy {
        Firebase.ai.generativeModel("gemini-3.8-flash")
    }

    private val structuredNewsModel by lazy {
        Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash",
            generationConfig = generationConfig {
                responseMimeType = "application/json"
                responseSchema = newsCardSchema
            }
        )
    }

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
        val clientId = AuthManager.resolveDefaultWebClientId(context)
        if (clientId.isBlank()) {
            Log.e("GoogleAuthBridge", "Google Sign-In configuration missing: default_web_client_id not found")
            activity.runOnUiThread {
                Toast.makeText(context, "Google Sign-In कॉन्फ़िगरेशन उपलब्ध नहीं है", Toast.LENGTH_SHORT).show()
            }
            return
        }

        activity.runOnUiThread {
            CoroutineScope(Dispatchers.Main).launch {
                try {
                    val credentialManager = CredentialManager.create(context)
                    val signInOption = GetSignInWithGoogleOption.Builder(serverClientId = clientId).build()
                    val request = GetCredentialRequest.Builder()
                        .addCredentialOption(signInOption)
                        .build()

                    val result = credentialManager.getCredential(activity, request)
                    val credential = result.credential
                    if (credential is CustomCredential &&
                        credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                    ) {
                        val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                        val authCredential = GoogleAuthProvider.getCredential(googleIdToken.idToken, null)
                        val authResult = Firebase.auth.signInWithCredential(authCredential).await()
                        val firebaseUser = authResult.user

                        val displayName = firebaseUser?.displayName
                            ?: googleIdToken.displayName
                            ?: "Google User"
                        val email = firebaseUser?.email ?: googleIdToken.id
                        val photoUrl = firebaseUser?.photoUrl?.toString()
                            ?: googleIdToken.profilePictureUri?.toString().orEmpty()

                        if (firebaseUser != null) {
                            try {
                                withContext(Dispatchers.IO) {
                                    FirestoreSyncRepository(context).syncSignedInUserProfile(
                                        user = firebaseUser,
                                        channelName = AuthManager.channelNameHi.value
                                    )
                                }
                            } catch (syncErr: Exception) {
                                Log.w("GoogleAuthBridge", "Firestore profile sync skipped: ${syncErr.message}")
                            }
                        }

                        val assignedRole = if (AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                        AuthManager.login(
                            context = context,
                            name = displayName,
                            email = email,
                            role = assignedRole,
                            district = "डिजिटल डेस्क"
                        )

                        val cleanName = displayName.replace("\\", "\\\\").replace("'", "\\'")
                        val cleanEmail = email.replace("\\", "\\\\").replace("'", "\\'")
                        val cleanPhoto = photoUrl.replace("\\", "\\\\").replace("'", "\\'")
                        getWebView()?.evaluateJavascript(
                            "if (window.handleGoogleUserSuccess) { window.handleGoogleUserSuccess('$cleanEmail', '$cleanName', '$cleanPhoto'); }",
                            null
                        )
                    } else {
                        Log.w("GoogleAuthBridge", "Unexpected credential type returned")
                    }
                } catch (e: GetCredentialCancellationException) {
                    Log.w("GoogleAuthBridge", "Google Sign-In flow cancelled or dismissed: ${e.message}", e)
                    Toast.makeText(context, "Google लॉगिन रद्द किया गया", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e("GoogleAuthBridge", "Native Google sign-in failed: ${e.message}", e)
                    Toast.makeText(context, "Google लॉगिन: ${e.localizedMessage ?: "विफल"}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    @JavascriptInterface
    fun signOutFirebase() {
        CoroutineScope(Dispatchers.Main).launch {
            withContext(NonCancellable) {
                try {
                    CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
                } catch (e: Exception) {
                    Log.w("GoogleAuthBridge", "Failed to clear credential state: ${e.message}")
                } finally {
                    Firebase.auth.signOut()
                }
            }
        }
    }

    @JavascriptInterface
    fun getFirebaseAuthStatus(): String {
        val user = Firebase.auth.currentUser
        return JSONObject().apply {
            put("isSignedIn", user != null)
            put("uid", user?.uid ?: "")
            put("email", user?.email ?: "")
            put("displayName", user?.displayName ?: "")
        }.toString()
    }

    @JavascriptInterface
    fun getFirebaseProjectInfo(): String {
        return JSONObject().apply {
            put("projectId", try { context.getString(R.string.project_id) } catch (_: Exception) { "" })
            put("googleAppId", try { context.getString(R.string.google_app_id) } catch (_: Exception) { "" })
            put("firestoreDatabaseId", try { context.getString(R.string.firestore_database_id) } catch (_: Exception) { "" })
        }.toString()
    }

    @JavascriptInterface
    fun isGeminiAiAvailable(): Boolean {
        return try {
            FirebaseApp.getApps(context).isNotEmpty()
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun generateNewsWithGemini(inputJsonOrPrompt: String, callbackName: String) {
        if (!isValidJsCallbackName(callbackName)) {
            Log.e("NewsStudioBridge", "Invalid JS callback name for generateNewsWithGemini")
            return
        }
        val prompt = extractPromptFromBridgeInput(inputJsonOrPrompt)
        if (prompt.isBlank()) {
            dispatchBridgeJson(
                callbackName,
                JSONObject().apply {
                    put("success", false)
                    put("error", "Prompt or news content cannot be empty.")
                }
            )
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val structuredPrompt = buildString {
                    appendLine("You are a senior digital newsroom editor.")
                    appendLine("Generate a structured breaking news graphic card JSON from the input below.")
                    appendLine("Keep the same language (Hindi or English) as the user input.")
                    appendLine()
                    appendLine(prompt)
                }
                val response = withTimeout(60_000L) {
                    structuredNewsModel.generateContent(structuredPrompt)
                }
                val rawJson = response.text
                if (rawJson.isNullOrBlank()) {
                    dispatchBridgeJson(
                        callbackName,
                        JSONObject().apply {
                            put("success", false)
                            put("error", "Model returned an empty response.")
                        }
                    )
                    return@launch
                }

                val parsed = JSONObject(rawJson)
                val normalizedData = JSONObject().apply {
                    put("headline", parsed.optString("headline", ""))
                    put("subHeadline", parsed.optString("subHeadline", ""))
                    put("summary", parsed.optString("summary", ""))
                    put("socialCaption", parsed.optString("socialCaption", ""))
                    put("hashtags", parsed.optJSONArray("hashtags") ?: JSONArray())
                }
                dispatchBridgeJson(
                    callbackName,
                    JSONObject().apply {
                        put("success", true)
                        put("data", normalizedData)
                    }
                )
            } catch (e: TimeoutCancellationException) {
                Log.e("NewsStudioBridge", "Gemini structured news generation timed out", e)
                dispatchBridgeJson(
                    callbackName,
                    JSONObject().apply {
                        put("success", false)
                        put("error", "Generation timed out after 60 seconds. Please try again.")
                    }
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e("NewsStudioBridge", "Gemini structured news generation failed", e)
                dispatchBridgeJson(
                    callbackName,
                    JSONObject().apply {
                        put("success", false)
                        put("error", e.localizedMessage ?: "Gemini AI generation failed.")
                    }
                )
            }
        }
    }

    @JavascriptInterface
    fun streamTextWithGemini(prompt: String, callbackName: String) {
        if (!isValidJsCallbackName(callbackName)) {
            Log.e("NewsStudioBridge", "Invalid JS callback name for streamTextWithGemini")
            return
        }
        val cleanedPrompt = extractPromptFromBridgeInput(prompt)
        if (cleanedPrompt.isBlank()) {
            dispatchBridgeJson(
                callbackName,
                JSONObject().apply {
                    put("done", true)
                    put("error", "Prompt cannot be empty.")
                }
            )
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            val accumulatedText = StringBuilder()
            try {
                withTimeout(60_000L) {
                    generativeModel.generateContentStream(cleanedPrompt).collect { chunk ->
                        val chunkText = chunk.text.orEmpty()
                        if (chunkText.isNotEmpty()) {
                            accumulatedText.append(chunkText)
                            dispatchBridgeJson(
                                callbackName,
                                JSONObject().apply {
                                    put("done", false)
                                    put("chunk", chunkText)
                                    put("text", accumulatedText.toString())
                                }
                            )
                        }
                    }
                }
                val finalText = accumulatedText.toString()
                if (finalText.isNotBlank()) {
                    dispatchBridgeJson(
                        callbackName,
                        JSONObject().apply {
                            put("done", true)
                            put("text", finalText)
                        }
                    )
                } else {
                    dispatchBridgeJson(
                        callbackName,
                        JSONObject().apply {
                            put("done", true)
                            put("error", "Model returned an empty response.")
                        }
                    )
                }
            } catch (e: TimeoutCancellationException) {
                Log.e("NewsStudioBridge", "Gemini streaming timed out", e)
                dispatchBridgeJson(
                    callbackName,
                    JSONObject().apply {
                        put("done", true)
                        put("error", "Streaming timed out after 60 seconds.")
                    }
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e("NewsStudioBridge", "Gemini streaming failed", e)
                dispatchBridgeJson(
                    callbackName,
                    JSONObject().apply {
                        put("done", true)
                        put("error", e.localizedMessage ?: "Gemini streaming failed.")
                    }
                )
            }
        }
    }

    private fun isValidJsCallbackName(callbackName: String): Boolean {
        if (callbackName.isBlank()) return false
        val segmentRegex = Regex("[A-Za-z_][A-Za-z0-9_]*")
        return callbackName.split(".").all { it.matches(segmentRegex) }
    }

    private fun extractPromptFromBridgeInput(rawInput: String): String {
        val trimmed = rawInput.trim()
        if (!trimmed.startsWith("{")) return trimmed
        return try {
            val obj = JSONObject(trimmed)
            listOf("prompt", "topic", "article", "text", "headline")
                .firstNotNullOfOrNull { key ->
                    obj.optString(key).takeIf { it.isNotBlank() }
                } ?: trimmed
        } catch (_: Exception) {
            trimmed
        }
    }

    private fun dispatchBridgeJson(callbackName: String, payload: JSONObject) {
        val jsonLiteral = JSONObject.quote(payload.toString())
        val targetExpr = callbackName.split(".").joinToString(prefix = "window", separator = "") { "['$it']" }
        val js = "(function() { var fn = $targetExpr; if (typeof fn === 'function') { fn(JSON.parse($jsonLiteral)); } })();"
        Handler(Looper.getMainLooper()).post {
            getWebView()?.evaluateJavascript(js, null)
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

    private fun saveVideoFileToGallery(sourceFile: File, cleanName: String, mime: String): Uri? {
        var savedUri: Uri? = null
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Video.Media.DISPLAY_NAME, cleanName)
                    put(MediaStore.Video.Media.MIME_TYPE, mime)
                    put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/AINewsMaker")
                    put(MediaStore.Video.Media.IS_PENDING, 1)
                }
                val uri = context.contentResolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                        sourceFile.inputStream().use { inputStream ->
                            inputStream.copyTo(outputStream, bufferSize = 65536)
                        }
                    }
                    contentValues.clear()
                    contentValues.put(MediaStore.Video.Media.IS_PENDING, 0)
                    context.contentResolver.update(uri, contentValues, null, null)
                    savedUri = uri
                }
            } else {
                val moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
                val appDir = File(moviesDir, "AINewsMaker").apply { mkdirs() }
                val destFile = File(appDir, cleanName)
                sourceFile.inputStream().use { input ->
                    destFile.outputStream().use { output ->
                        input.copyTo(output, bufferSize = 65536)
                    }
                }
                MediaScannerConnection.scanFile(
                    context,
                    arrayOf(destFile.absolutePath),
                    arrayOf(mime),
                    null
                )
                savedUri = Uri.fromFile(destFile)
            }
        } catch (mediaErr: Exception) {
            Log.w("NewsStudioBridge", "MediaStore video save failed, falling back to app Movies dir: ${mediaErr.message}")
        }

        // Keep an internal shareable copy in cacheDir/shared_videos and fallback storage if MediaStore failed
        val shareDir = File(context.cacheDir, "shared_videos").apply { mkdirs() }
        val shareCopy = File(shareDir, cleanName)
        try {
            sourceFile.copyTo(shareCopy, overwrite = true)
            lastSavedVideoFile = shareCopy
            lastSavedVideoMime = mime
        } catch (_: Exception) {}

        if (savedUri == null) {
            val fallbackMoviesDir = context.getExternalFilesDir(Environment.DIRECTORY_MOVIES) ?: context.filesDir
            val fallbackFile = File(fallbackMoviesDir, cleanName)
            sourceFile.copyTo(fallbackFile, overwrite = true)
            MediaScannerConnection.scanFile(
                context,
                arrayOf(fallbackFile.absolutePath),
                arrayOf(mime),
                null
            )
            lastSavedVideoFile = fallbackFile
            savedUri = Uri.fromFile(fallbackFile)
        }

        lastSavedVideoUri = savedUri
        return savedUri
    }

    private fun notifyJsVideoDownloadResult(success: Boolean, message: String, fileName: String = "") {
        val safeMsg = JSONObject.quote(message)
        val safeFile = JSONObject.quote(fileName)
        val js = "(function(){ try { if (window.onAndroidVideoDownloadResult) { window.onAndroidVideoDownloadResult($success, $safeMsg, $safeFile); } } catch(e){} })();"
        Handler(Looper.getMainLooper()).post {
            getWebView()?.evaluateJavascript(js, null)
        }
    }

    @JavascriptInterface
    fun beginVideoDownload(fileName: String, mimeType: String): String {
        return try {
            val safeBase = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_").ifBlank {
                "news_video_${System.currentTimeMillis()}.mp4"
            }
            val cleanName = if (safeBase.endsWith(".mp4", ignoreCase = true) || safeBase.endsWith(".webm", ignoreCase = true)) {
                safeBase
            } else if (mimeType.contains("webm", ignoreCase = true)) {
                "$safeBase.webm"
            } else {
                "$safeBase.mp4"
            }
            val resolvedMime = when {
                mimeType.contains("webm", ignoreCase = true) || cleanName.endsWith(".webm", ignoreCase = true) -> "video/webm"
                else -> "video/mp4"
            }

            val transferId = UUID.randomUUID().toString()
            val tempDir = File(context.cacheDir, "video_exports").apply { mkdirs() }
            val tempFile = File(tempDir, "$transferId.tmp")
            val stream = BufferedOutputStream(FileOutputStream(tempFile), 65536)

            pendingVideoTransfers[transferId] = PendingVideoTransfer(
                file = tempFile,
                fileName = cleanName,
                mimeType = resolvedMime,
                outputStream = stream
            )
            transferId
        } catch (e: Exception) {
            Log.e("NewsStudioBridge", "beginVideoDownload failed: ${e.message}", e)
            ""
        }
    }

    @JavascriptInterface
    fun appendVideoChunk(transferId: String, base64Chunk: String): Boolean {
        val transfer = pendingVideoTransfers[transferId] ?: return false
        return try {
            val cleanBase64 = if (base64Chunk.contains(",")) base64Chunk.substringAfter(",") else base64Chunk
            val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            synchronized(transfer) {
                transfer.outputStream?.write(bytes)
            }
            true
        } catch (e: Exception) {
            Log.e("NewsStudioBridge", "appendVideoChunk failed: ${e.message}", e)
            false
        }
    }

    @JavascriptInterface
    fun finishVideoDownload(transferId: String): Boolean {
        val transfer = pendingVideoTransfers.remove(transferId) ?: return false
        return try {
            synchronized(transfer) {
                transfer.outputStream?.flush()
                transfer.outputStream?.close()
                transfer.outputStream = null
            }

            if (!transfer.file.exists() || transfer.file.length() < 100L) {
                transfer.file.delete()
                notifyJsVideoDownloadResult(false, "वीडियो फ़ाइल खाली या अधूरी थी", transfer.fileName)
                return false
            }

            saveVideoFileToGallery(transfer.file, transfer.fileName, transfer.mimeType)
            try { transfer.file.delete() } catch (_: Exception) {}

            Handler(Looper.getMainLooper()).post {
                Toast.makeText(
                    context,
                    "✅ वीडियो गैलरी (Movies/AINewsMaker) में सुरक्षित हो गया!",
                    Toast.LENGTH_LONG
                ).show()
            }
            notifyJsVideoDownloadResult(true, "वीडियो सफलतापूर्वक गैलरी में सेव हो गया!", transfer.fileName)
            true
        } catch (e: Exception) {
            Log.e("NewsStudioBridge", "finishVideoDownload failed: ${e.message}", e)
            try { transfer.outputStream?.close() } catch (_: Exception) {}
            try { transfer.file.delete() } catch (_: Exception) {}
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "वीडियो सेव करने में त्रुटि: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
            notifyJsVideoDownloadResult(false, e.localizedMessage ?: "वीडियो सेव विफल", transfer.fileName)
            false
        }
    }

    @JavascriptInterface
    fun cancelVideoDownload(transferId: String) {
        val transfer = pendingVideoTransfers.remove(transferId) ?: return
        try { transfer.outputStream?.close() } catch (_: Exception) {}
        try { transfer.file.delete() } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun saveVideoToGallery(base64Data: String, fileName: String) {
        downloadVideo(base64Data, fileName)
    }

    @JavascriptInterface
    fun shareLastSavedVideo(title: String) {
        try {
            val file = lastSavedVideoFile
            val contentUri = when {
                file != null && file.exists() -> {
                    val authority = "${context.packageName}.fileprovider"
                    FileProvider.getUriForFile(context, authority, file)
                }
                lastSavedVideoUri != null -> lastSavedVideoUri
                else -> null
            }
            if (contentUri == null) {
                showToast("पहले वीडियो डाउनलोड करें")
                return
            }

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = lastSavedVideoMime
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, title.ifBlank { "AI News Maker Video Report" })
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val chooser = Intent.createChooser(shareIntent, "वीडियो शेयर करें").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
        } catch (e: Exception) {
            Log.e("NewsStudioBridge", "shareLastSavedVideo failed: ${e.message}", e)
            showToast("वीडियो शेयर नहीं हो सका: ${e.localizedMessage}")
        }
    }

    @JavascriptInterface
    fun downloadVideo(base64DataOrUrl: String, fileName: String) {
        try {
            val cleanName = if (fileName.endsWith(".mp4", ignoreCase = true) || fileName.endsWith(".webm", ignoreCase = true)) {
                fileName
            } else {
                "$fileName.mp4"
            }

            if (base64DataOrUrl.startsWith("data:") || !base64DataOrUrl.startsWith("http")) {
                val base64Data = if (base64DataOrUrl.contains(",")) base64DataOrUrl.substringAfter(",") else base64DataOrUrl
                val videoBytes = Base64.decode(base64Data, Base64.DEFAULT)
                val mime = if (cleanName.endsWith(".webm", ignoreCase = true)) "video/webm" else "video/mp4"

                val tempDir = File(context.cacheDir, "video_exports").apply { mkdirs() }
                val tempFile = File(tempDir, "direct_${System.currentTimeMillis()}.tmp")
                tempFile.outputStream().use { it.write(videoBytes) }

                saveVideoFileToGallery(tempFile, cleanName, mime)
                try { tempFile.delete() } catch (_: Exception) {}

                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(
                        context,
                        "✅ वीडियो सफलतापूर्वक गैलरी (Movies/AINewsMaker) में सुरक्षित हो गया!",
                        Toast.LENGTH_LONG
                    ).show()
                }
                notifyJsVideoDownloadResult(true, "वीडियो सफलतापूर्वक गैलरी में सेव हो गया!", cleanName)
            } else {
                val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                val uri = Uri.parse(base64DataOrUrl)
                val request = DownloadManager.Request(uri).apply {
                    setTitle(cleanName)
                    setDescription("AI News Maker वीडियो डाउनलोड")
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_MOVIES, "AINewsMaker/$cleanName")
                }
                downloadManager?.enqueue(request)
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "⬇️ वीडियो डाउनलोड प्रारंभ हुआ...", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "वीडियो सेव करने में त्रुटि: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
            notifyJsVideoDownloadResult(false, e.localizedMessage ?: "वीडियो सेव त्रुटि", fileName)
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
