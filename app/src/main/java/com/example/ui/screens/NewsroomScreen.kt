package com.example.ui.screens

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
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.example.model.UserRole
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.NewsRepository
import com.example.model.*
import com.example.ui.components.ExportProgressDialog
import com.example.ui.components.NewsCanvasOverlay
import com.example.ui.theme.*
import com.example.ui.viewmodel.NewsMakerViewModel
import com.example.util.VideoExportDownloader

enum class NewsroomMode(val title: String) {
    GRAPHIC_DESIGN("🎨 ग्राफिक डिज़ाइन स्टूडियो"),
    VIDEO_DESIGN("🎬 वीडियो डिज़ाइन स्टूडियो")
}

@Composable
fun NewsroomScreen(
    refreshTrigger: Int = 0,
    isActive: Boolean = true,
    onScrollChange: ((isDown: Boolean, scrollY: Int) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val jacketData by NewsRepository.activeJacketData.collectAsState()
    var currentMode by remember { mutableStateOf(NewsroomMode.GRAPHIC_DESIGN) }
    var isFullscreenStudio by remember { mutableStateOf(false) }
    var studioReloadTrigger by remember { mutableStateOf(0) }
    var isTopModeBarVisible by remember { mutableStateOf(true) }
    var activeStudioWebView by remember { mutableStateOf<WebView?>(null) }

    val pendingGraphicPost by NewsRepository.pendingGraphicPost.collectAsState()
    val pendingVideoItem by NewsRepository.pendingVideoItem.collectAsState()

    LaunchedEffect(pendingGraphicPost, activeStudioWebView) {
        if (pendingGraphicPost != null && activeStudioWebView != null) {
            currentMode = NewsroomMode.GRAPHIC_DESIGN
            val pendingJson = NewsRepository.getPendingNewsJson()
            if (pendingJson.isNotBlank()) {
                val escaped = pendingJson.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")
                activeStudioWebView?.evaluateJavascript(
                    "(function() { " +
                    "var attempts = 0; " +
                    "function trySend() { " +
                    "  if (window.onAutoFillNewsLink) { " +
                    "    if (window.setStudioMode) window.setStudioMode('graphic'); " +
                    "    window.onAutoFillNewsLink(JSON.parse('$escaped')); " +
                    "  } else if (attempts < 40) { " +
                    "    attempts++; " +
                    "    setTimeout(trySend, 150); " +
                    "  } " +
                    "} " +
                    "trySend(); " +
                    "})();",
                    null
                )
            }
        }
    }

    LaunchedEffect(pendingVideoItem, activeStudioWebView) {
        if (pendingVideoItem != null && activeStudioWebView != null) {
            currentMode = NewsroomMode.VIDEO_DESIGN
            val video = pendingVideoItem!!
            val titleEscaped = video.title.replace("'", "\\'").replace("\n", " ")
            val urlEscaped = video.videoUrl.replace("'", "\\'")
            activeStudioWebView?.evaluateJavascript(
                "(function() { " +
                "if (window.loadVideoInStudio) { window.loadVideoInStudio('$urlEscaped', '$titleEscaped'); } " +
                "else if (window.setStudioMode) { window.setStudioMode('video'); } " +
                "})();",
                null
            )
            NewsRepository.clearPendingVideo()
        }
    }

    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) {
            NewsRepository.resetJacketData()
            activeStudioWebView?.evaluateJavascript(
                "if (window.resetNewsStudioCard) { window.resetNewsStudioCard(); } else { window.location.reload(); }",
                null
            )
            studioReloadTrigger++
            Toast.makeText(context, "प्रोजेक्ट रिफ्रेश हो गया", Toast.LENGTH_SHORT).show()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Slate950)
    ) {
        Column(modifier = Modifier.fillMaxSize().statusBarsPadding()) {
            // Permanent Dual Studio Mode Switcher: 1. ग्राफिक फोटो न्यूज़  2. वीडियो न्यूज़
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Slate950,
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Option 1: ग्राफिक फोटो न्यूज़
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .height(42.dp)
                            .clickable {
                                currentMode = NewsroomMode.GRAPHIC_DESIGN
                                activeStudioWebView?.evaluateJavascript(
                                    "if (window.setStudioMode) { window.setStudioMode('graphic'); }",
                                    null
                                )
                            },
                        shape = RoundedCornerShape(10.dp),
                        color = if (currentMode == NewsroomMode.GRAPHIC_DESIGN) NewsGold else Color(0xFF1E293B),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (currentMode == NewsroomMode.GRAPHIC_DESIGN) Color(0xFFF59E0B) else Color(0xFF334155)
                        )
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Palette,
                                contentDescription = null,
                                tint = if (currentMode == NewsroomMode.GRAPHIC_DESIGN) Color(0xFF0F172A) else Color(0xFF94A3B8),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "ग्राफिक फोटो न्यूज़",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = if (currentMode == NewsroomMode.GRAPHIC_DESIGN) Color(0xFF0F172A) else Color(0xFFE2E8F0)
                            )
                        }
                    }

                    // Option 2: वीडियो न्यूज़
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .height(42.dp)
                            .clickable {
                                currentMode = NewsroomMode.VIDEO_DESIGN
                                activeStudioWebView?.evaluateJavascript(
                                    "if (window.setStudioMode) { window.setStudioMode('video'); }",
                                    null
                                )
                            },
                        shape = RoundedCornerShape(10.dp),
                        color = if (currentMode == NewsroomMode.VIDEO_DESIGN) Color(0xFFDC2626) else Color(0xFF1E293B),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (currentMode == NewsroomMode.VIDEO_DESIGN) Color(0xFFEF4444) else Color(0xFF334155)
                        )
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Videocam,
                                contentDescription = null,
                                tint = if (currentMode == NewsroomMode.VIDEO_DESIGN) Color.White else Color(0xFF94A3B8),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "वीडियो न्यूज़",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = if (currentMode == NewsroomMode.VIDEO_DESIGN) Color.White else Color(0xFFE2E8F0)
                            )
                        }
                    }
                }
            }

            // MAIN CONTENT AREA: Unified Web Studio Engine hosting both Photo News and Video News (exact Web version design)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
                    .background(Slate950)
            ) {
                BreakingNewsStudioWebView(
                    modifier = Modifier.fillMaxSize(),
                    studioMode = currentMode,
                    reloadKey = studioReloadTrigger,
                    onWebViewCreated = { activeStudioWebView = it },
                    onScrollChange = { isDown, scrollY ->
                        if (isDown && scrollY > 20) {
                            isTopModeBarVisible = false
                        } else if (!isDown || scrollY <= 15) {
                            isTopModeBarVisible = true
                        }
                        onScrollChange?.invoke(isDown, scrollY)
                    },
                    onStudioModeChangedInWeb = { mode ->
                        currentMode = if (mode == "video") NewsroomMode.VIDEO_DESIGN else NewsroomMode.GRAPHIC_DESIGN
                    }
                )
            }
        }

        // Floating Exit Fullscreen Button when in Fullscreen Studio
        if (isFullscreenStudio && currentMode == NewsroomMode.GRAPHIC_DESIGN) {
            Surface(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp),
                shape = CircleShape,
                color = Color.Black.copy(alpha = 0.85f),
                shadowElevation = 8.dp,
                border = androidx.compose.foundation.BorderStroke(1.5.dp, NewsGold)
            ) {
                IconButton(
                    onClick = { isFullscreenStudio = false },
                    modifier = Modifier.size(42.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.FullscreenExit,
                        contentDescription = "Exit Fullscreen",
                        tint = NewsGold
                    )
                }
            }
        }
    }
}

private fun isEmulatorEnvironment(): Boolean {
    // If no hardware DRI render node exists on Linux (/dev/dri/renderD*), we are in a container/software GPU environment
    try {
        val dri = java.io.File("/dev/dri")
        val hasRenderNode = dri.exists() && (dri.listFiles()?.any { it.name.startsWith("renderD") && it.canWrite() } == true)
        if (!hasRenderNode) {
            return true
        }
    } catch (_: Throwable) {
        return true
    }

    val fp = Build.FINGERPRINT.lowercase()
    val model = Build.MODEL.lowercase()
    val mfg = Build.MANUFACTURER.lowercase()
    val brand = Build.BRAND.lowercase()
    val dev = Build.DEVICE.lowercase()
    val hw = Build.HARDWARE.lowercase()
    val prod = Build.PRODUCT.lowercase()
    val board = Build.BOARD.lowercase()

    return fp.startsWith("generic")
            || fp.startsWith("unknown")
            || fp.contains("emulator")
            || fp.contains("vbox")
            || fp.contains("cuttlefish")
            || fp.contains("cf_")
            || model.contains("google_sdk")
            || model.contains("emulator")
            || model.contains("android sdk")
            || model.contains("sdk")
            || model.contains("cuttlefish")
            || mfg.contains("genymotion")
            || (mfg.contains("google") && (model.contains("sdk") || prod.contains("sdk") || prod.contains("cf_") || model.contains("cuttlefish")))
            || (brand.startsWith("generic") && dev.startsWith("generic"))
            || hw.contains("goldfish")
            || hw.contains("ranchu")
            || hw.contains("cuttlefish")
            || hw.contains("cutf")
            || prod.contains("sdk")
            || prod.contains("emulator")
            || prod.contains("cuttlefish")
            || prod.contains("cf_")
            || board.contains("goldfish")
            || board.contains("cutf")
}

/**
 * 100% Full-Featured Interactive WebView loading the exact GitHub Vite+React+Tailwind studio.
 * Now equipped with Photo Picker callback for Android, HTML5 Canvas support, and DOM storage.
 */
@Composable
fun BreakingNewsStudioWebView(
    modifier: Modifier = Modifier,
    initialTab: String = "studio",
    studioMode: NewsroomMode = NewsroomMode.GRAPHIC_DESIGN,
    reloadKey: Int = 0,
    onWebViewCreated: ((WebView) -> Unit)? = null,
    onScrollChange: ((isDown: Boolean, scrollY: Int) -> Unit)? = null,
    onStudioModeChangedInWeb: ((String) -> Unit)? = null
) {
    val context = LocalContext.current
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var fileChooserCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var webViewCrashId by remember { mutableIntStateOf(0) }
    // Software rendering in emulator/container environments lacking hardware render nodes, or upon crash
    var useSoftwareRendering by remember { mutableStateOf(isEmulatorEnvironment()) }
    var isRendererCrashed by remember { mutableStateOf(false) }

    LaunchedEffect(initialTab, webViewInstance) {
        if (webViewInstance != null) {
            webViewInstance?.evaluateJavascript(
                "(function() { if (window.setAppTab) window.setAppTab('$initialTab'); else window.location.hash = '$initialTab'; })();",
                null
            )
        }
    }

    androidx.activity.compose.BackHandler(enabled = webViewInstance?.canGoBack() == true) {
        webViewInstance?.goBack()
    }

    // Native Android Media Picker launcher triggered when user taps upload in Graphic / Video Studio
    val mediaPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            fileChooserCallback?.onReceiveValue(arrayOf(uri))
        } else {
            fileChooserCallback?.onReceiveValue(null)
        }
        fileChooserCallback = null
    }

    LaunchedEffect(studioMode, webViewInstance) {
        val modeStr = if (studioMode == NewsroomMode.VIDEO_DESIGN) "video" else "graphic"
        webViewInstance?.evaluateJavascript(
            "if (window.setStudioMode) { window.setStudioMode('$modeStr'); }",
            null
        )
    }

    LaunchedEffect(reloadKey) {
        if (reloadKey > 0) {
            webViewInstance?.reload()
        }
    }

    if (isRendererCrashed) {
        Box(
            modifier = modifier.fillMaxSize().background(Slate950),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = null,
                    tint = Amber400,
                    modifier = Modifier.size(48.dp)
                )
                Text(
                    text = "स्टूडियो तैयार किया जा रहा है",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )
                Text(
                    text = "सिस्टम मेमोरी को रीस्टोर करने और स्टूडियो को पुनः लोड करने के लिए नीचे टैप करें।",
                    color = Slate400,
                    fontSize = 13.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Button(
                    onClick = {
                        isRendererCrashed = false
                        useSoftwareRendering = true
                        webViewCrashId++
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Amber400, contentColor = Slate950)
                ) {
                    Text("स्टूडियो पुनः प्रारंभ करें", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
            }
        }
    } else {
        androidx.compose.runtime.key(webViewCrashId) {
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )

                        setBackgroundColor(0xFF0F172A.toInt())

                        if (useSoftwareRendering) {
                            try {
                                setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)
                            } catch (_: Throwable) {}
                        } else {
                            try {
                                setLayerType(android.view.View.LAYER_TYPE_NONE, null)
                            } catch (_: Throwable) {}
                        }

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        allowFileAccessFromFileURLs = true
                        allowUniversalAccessFromFileURLs = true
                        databaseEnabled = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        loadWithOverviewMode = true
                        useWideViewPort = true
                        setSupportZoom(false)
                        builtInZoomControls = false
                        displayZoomControls = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        mediaPlaybackRequiresUserGesture = false
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            android.util.Log.d(
                                "BreakingNewsStudio",
                                "${consoleMessage?.messageLevel()}: ${consoleMessage?.message()} (${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()})"
                            )
                            return true
                        }

                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            fileChooserCallback?.onReceiveValue(null)
                            fileChooserCallback = filePathCallback
                            try {
                                val acceptTypes = fileChooserParams?.acceptTypes
                                val mimeType = if (!acceptTypes.isNullOrEmpty() && acceptTypes[0].isNotBlank()) {
                                    val first = acceptTypes[0]
                                    if (first.contains("video")) "video/*"
                                    else if (first.contains("image")) "image/*"
                                    else "*/*"
                                } else {
                                    "*/*"
                                }
                                mediaPickerLauncher.launch(mimeType)
                            } catch (e: Exception) {
                                Toast.makeText(context, "गैलरी खोलने में त्रुटि", Toast.LENGTH_SHORT).show()
                                fileChooserCallback?.onReceiveValue(null)
                                fileChooserCallback = null
                            }
                            return true
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): WebResourceResponse? {
                            val uri = request?.url ?: return null
                            val scheme = uri.scheme ?: ""
                            val host = uri.host ?: ""
                            val path = uri.path ?: ""

                            if (host == "appassets.androidplatform.net" || (scheme == "file" && path.contains("android_asset"))) {
                                val cleanPath = when {
                                    path.startsWith("/assets/news_studio/") -> path.removePrefix("/assets/")
                                    path.startsWith("/assets/") -> "news_studio" + path
                                    path.startsWith("/android_asset/news_studio/") -> path.removePrefix("/android_asset/")
                                    path.startsWith("/android_asset/") -> "news_studio" + path.removePrefix("/android_asset/")
                                    path.startsWith("/news_studio/") -> path.removePrefix("/")
                                    else -> "news_studio" + if (path.startsWith("/")) path else "/$path"
                                }.trimStart('/')

                                try {
                                    val inputStream = context.assets.open(cleanPath)
                                    val mimeType = when {
                                        cleanPath.endsWith(".html") -> "text/html"
                                        cleanPath.endsWith(".js") || cleanPath.endsWith(".mjs") -> "application/javascript"
                                        cleanPath.endsWith(".css") -> "text/css"
                                        cleanPath.endsWith(".svg") -> "image/svg+xml"
                                        cleanPath.endsWith(".png") -> "image/png"
                                        cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg") -> "image/jpeg"
                                        cleanPath.endsWith(".webp") -> "image/webp"
                                        cleanPath.endsWith(".json") -> "application/json"
                                        cleanPath.endsWith(".woff2") -> "font/woff2"
                                        cleanPath.endsWith(".ttf") -> "font/ttf"
                                        else -> "application/octet-stream"
                                    }
                                    val headers = mapOf(
                                        "Access-Control-Allow-Origin" to "*",
                                        "Access-Control-Allow-Methods" to "GET, OPTIONS",
                                        "Access-Control-Allow-Headers" to "*"
                                    )
                                    return WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, inputStream)
                                } catch (e: Exception) {
                                    // Let default handling proceed
                                }
                            }
                            return super.shouldInterceptRequest(view, request)
                        }

                        override fun onRenderProcessGone(
                            view: WebView?,
                            detail: android.webkit.RenderProcessGoneDetail?
                        ): Boolean {
                            try {
                                view?.let {
                                    val parent = it.parent as? ViewGroup
                                    parent?.removeView(it)
                                    it.destroy()
                                }
                            } catch (_: Throwable) {}
                            webViewInstance = null
                            useSoftwareRendering = true
                            isRendererCrashed = false
                            webViewCrashId++
                            return true
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            // Synchronize authenticated session & channel profile into studio localStorage
                            val sessionJson = com.example.data.AuthManager.getUserSessionJson()
                            val sessionEscaped = sessionJson.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")
                            val profileJson = com.example.data.AuthManager.getChannelProfileJson()
                            val profileEscaped = profileJson.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")

                            val initialModeStr = if (studioMode == NewsroomMode.VIDEO_DESIGN) "video" else "graphic"
                            view?.evaluateJavascript(
                                "(function() { try { " +
                                "localStorage.setItem('reporter_auth_session', JSON.stringify(JSON.parse('$sessionEscaped'))); " +
                                "localStorage.setItem('user_channel_profile', JSON.stringify(JSON.parse('$profileEscaped'))); " +
                                "localStorage.setItem('is_onboarding_completed', 'true'); " +
                                "if (window.setAppTab) { window.setAppTab('$initialTab'); } else if (window.setTab) { window.setTab('$initialTab'); } else { window.location.hash = '$initialTab'; } " +
                                "if (window.setStudioMode) { window.setStudioMode('$initialModeStr'); } " +
                                "if (window.applyAndroidChannelProfile) { window.applyAndroidChannelProfile(JSON.parse('$profileEscaped')); } " +
                                "} catch(e) {} })();",
                                null
                            )
                            val pendingJson = NewsRepository.getPendingNewsJson()
                            if (pendingJson.isNotBlank()) {
                                val escaped = pendingJson.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")
                                view?.evaluateJavascript(
                                    "(function() { " +
                                    "var attempts = 0; " +
                                    "function trySend() { " +
                                    "  if (window.onAutoFillNewsLink) { " +
                                    "    if (window.setStudioMode) window.setStudioMode('graphic'); " +
                                    "    window.onAutoFillNewsLink(JSON.parse('$escaped')); " +
                                    "  } else if (attempts < 40) { " +
                                    "    attempts++; " +
                                    "    setTimeout(trySend, 150); " +
                                    "  } " +
                                    "} " +
                                    "trySend(); " +
                                    "})();",
                                    null
                                )
                            }
                        }
                    }

                    // Attach JavaScript Bridge for high-resolution 1080x1350 card download, instant gallery save & scroll callbacks
                    val studioBridge = NewsStudioBridge(
                        context = context,
                        onScrollChange = onScrollChange,
                        onStudioModeChanged = onStudioModeChangedInWeb,
                        getWebView = { webViewInstance }
                    )
                    addJavascriptInterface(studioBridge, "AndroidBridge")

                    // Native Download Listener so web downloads also route to gallery
                    setDownloadListener { url, _, _, mimetype, _ ->
                        try {
                            if (url.startsWith("data:")) {
                                studioBridge.downloadImage(url, "news_card_${System.currentTimeMillis()}.jpg")
                            } else if (url.startsWith("blob:")) {
                                val js = """
                                    (function() {
                                        fetch('$url')
                                            .then(function(r) { return r.blob(); })
                                            .then(function(b) {
                                                var reader = new FileReader();
                                                reader.onloadend = function() {
                                                    if (window.AndroidBridge && window.AndroidBridge.downloadImage) {
                                                        window.AndroidBridge.downloadImage(reader.result, 'news_card_${System.currentTimeMillis()}.jpg');
                                                    }
                                                };
                                                reader.readAsDataURL(b);
                                            })
                                            .catch(function(e) { console.error('Blob conversion failed', e); });
                                    })();
                                """.trimIndent()
                                evaluateJavascript(js, null)
                            } else {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                            }
                        } catch (e: Exception) {
                            Toast.makeText(context, "डाउनलोड शुरू हुआ: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                        }
                    }

                    // Native scroll change listener to toggle header visibility
                    setOnScrollChangeListener { _, _, scrollY, _, oldScrollY ->
                        val diff = scrollY - oldScrollY
                        if (diff > 10 && scrollY > 25) {
                            onScrollChange?.invoke(true, scrollY)
                        } else if (diff < -10 || scrollY <= 15) {
                            onScrollChange?.invoke(false, scrollY)
                        }
                    }

                    loadUrl("https://appassets.androidplatform.net/assets/news_studio/index.html?tab=$initialTab#$initialTab")
                    webViewInstance = this
                    onWebViewCreated?.invoke(this)
                }
            },
            modifier = modifier
        )
    }
    }
}

/**
 * Native Android JavaScript Interface Bridge for News Graphic Studio.
 * Handles high-resolution 1080x1350 JPEG saving to Android Gallery, MediaStore, native sharing and scroll detection.
 */
class NewsStudioBridge(
    private val context: Context,
    private val onScrollChange: ((isDown: Boolean, scrollY: Int) -> Unit)? = null,
    private val onStudioModeChanged: ((mode: String) -> Unit)? = null,
    private val getWebView: () -> WebView? = { null }
) {
    @JavascriptInterface
    fun onStudioReady() {
        (context as? android.app.Activity)?.runOnUiThread {
            val pendingJson = NewsRepository.getPendingNewsJson()
            if (pendingJson.isNotBlank()) {
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
        (context as? android.app.Activity)?.runOnUiThread {
            onStudioModeChanged?.invoke(mode)
        }
    }

    @JavascriptInterface
    fun signInWithGoogle() {
        val activity = context as? android.app.Activity ?: return
        activity.runOnUiThread {
            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                try {
                    val credentialManager = androidx.credentials.CredentialManager.create(context)
                    val googleIdOption = com.google.android.libraries.identity.googleid.GetGoogleIdOption.Builder()
                        .setFilterByAuthorizedAccounts(false)
                        .setServerClientId(com.example.data.AuthManager.DEFAULT_GOOGLE_CLIENT_ID)
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

                        val assignedRole = if (com.example.data.AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                        com.example.data.AuthManager.login(
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
        return com.example.data.TemplateConfigManager.getFullExportJson(context)
    }

    @JavascriptInterface
    fun getUserSession(): String {
        return com.example.data.AuthManager.getUserSessionJson()
    }

    @JavascriptInterface
    fun getChannelProfile(): String {
        return com.example.data.AuthManager.getChannelProfileJson()
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
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
            val item = clipboard?.primaryClip?.getItemAt(0)
            item?.text?.toString() ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun reportScroll(scrollY: Int, isDown: Boolean) {
        (context as? android.app.Activity)?.runOnUiThread {
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
                val fallbackFile = java.io.File(picturesDir, cleanName)
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

            val tempFile = java.io.File(context.cacheDir, "shared_breaking_card.jpg")
            tempFile.outputStream().use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)
            }

            val authority = "${context.packageName}.fileprovider"
            val contentUri = androidx.core.content.FileProvider.getUriForFile(context, authority, tempFile)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/jpeg"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                putExtra(Intent.EXTRA_TEXT, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(shareIntent, "कार्ड शेयर करें").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun showToast(message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
fun VideoDesignPanel(
    modifier: Modifier = Modifier,
    jacketData: NewsJacketData,
    onScrollChange: ((Boolean) -> Unit)? = null
) {
    val context = LocalContext.current
    val viewModel: NewsMakerViewModel = viewModel()
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()

    var prevIndex by remember { mutableIntStateOf(0) }
    var prevOffset by remember { mutableIntStateOf(0) }
    var isSafeZoneOverlayActive by remember { mutableStateOf(false) }

    LaunchedEffect(listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset) {
        val currentIndex = listState.firstVisibleItemIndex
        val currentOffset = listState.firstVisibleItemScrollOffset
        if (currentIndex > prevIndex || (currentIndex == prevIndex && currentOffset > prevOffset + 12)) {
            onScrollChange?.invoke(true)
        } else if (currentIndex < prevIndex || (currentIndex == prevIndex && currentOffset < prevOffset - 12) || (currentIndex == 0 && currentOffset <= 10)) {
            onScrollChange?.invoke(false)
        }
        prevIndex = currentIndex
        prevOffset = currentOffset
    }

    // ActivityResult launcher for picking news video or image
    val mediaPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            val type = context.contentResolver.getType(uri) ?: ""
            val isVid = type.startsWith("video") || uri.toString().contains("video")
            viewModel.setMediaUri(uri, isVid)
            Toast.makeText(
                context,
                if (isVid) "वीडियो लोड हुआ! ट्रिम व क्रॉप सेट करें।" else "फोटो लोड हुई! जैकेट सेट करें।",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    LazyColumn(
        state = listState,
        modifier = modifier
            .fillMaxSize()
            .background(Slate950),
        contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 10.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Studio Header Banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, NewsGold),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = NewsRedPrimary,
                                shape = CircleShape,
                                modifier = Modifier.size(32.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.Videocam,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "🎬 वीडियो डिज़ाइन स्टूडियो",
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                                Text(
                                    text = "4:5 / 9:16 वीडियो ट्रिम, क्रॉप, 3-लाइन जैकेट & फोन गैलरी एक्सपोर्ट",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Notice explaining direct phone gallery saving
                    Surface(
                        color = Color(0xFF1E293B),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                tint = NewsGold,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "वीडियो ऐप डेटाबेस में नहीं, सीधा आपके फ़ोन की गैलरी (Movies) में MP4 सेव होगी।",
                                color = Color(0xFFE2E8F0),
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }

        // 2. Interactive Live Broadcast Canvas
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Safe-Zone Overlay Toggle Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF10B981)
                        ) {
                            Box(modifier = Modifier.size(8.dp))
                        }
                        Text(
                            text = "लाइव कैनवास प्रीव्यू",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsWhite
                        )
                    }

                    // Safe-Zone Toggle Chip
                    FilterChip(
                        selected = isSafeZoneOverlayActive,
                        onClick = {
                            isSafeZoneOverlayActive = !isSafeZoneOverlayActive
                            if (isSafeZoneOverlayActive) {
                                Toast.makeText(context, "सेफ-ज़ोन गाइड सक्रिय: 80% टाइटल व 90% एक्शन सीमा चालू", Toast.LENGTH_SHORT).show()
                            }
                        },
                        label = {
                            Text(
                                text = if (isSafeZoneOverlayActive) "सेफ-ज़ोन: ऑन" else "सेफ-ज़ोन गाइड",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = if (isSafeZoneOverlayActive) Icons.Default.GridOn else Icons.Default.GridOff,
                                contentDescription = null,
                                modifier = Modifier.size(13.dp)
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF0284C7),
                            selectedLabelColor = Color.White,
                            selectedLeadingIconColor = Color(0xFF38BDF8),
                            containerColor = Color(0xFF1E293B),
                            labelColor = Color(0xFF94A3B8)
                        ),
                        modifier = Modifier.height(30.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                NewsCanvasOverlay(
                    firstTitle = uiState.firstTitle,
                    secondTitle = uiState.secondTitle,
                    tickerText = uiState.tickerText,
                    cityName = uiState.cityName,
                    channelLogoTag = uiState.channelLogoTag,
                    mediaUri = uiState.mediaUri,
                    isVideo = uiState.isVideo,
                    isMediaPlaying = uiState.isMediaPlaying,
                    currentPlaybackSeconds = uiState.currentPlaybackSeconds,
                    aspectRatioType = uiState.currentAspectCrop,
                    templateStyle = uiState.selectedTemplate.style,
                    textSizeScale = uiState.textSizeScale,
                    isBold = uiState.isBold,
                    isExclusiveWatermark = uiState.isExclusiveWatermark,
                    line1 = uiState.line1,
                    line2 = uiState.line2,
                    line3 = uiState.line3,
                    lineMode = uiState.headlineLineMode,
                    fontOption = uiState.hindiFontOption,
                    alignment = uiState.headlineAlignment,
                    highlightedWords = uiState.highlightedWords,
                    customJacketUri = uiState.customJacketUri,
                    customLogoUri = uiState.customLogoUri,
                    videoOffsetY = uiState.videoOffsetY,
                    videoOffsetX = uiState.videoOffsetX,
                    videoZoomScale = uiState.videoZoomScale,
                    showSafeZoneOverlay = isSafeZoneOverlayActive,
                    onMediaAreaClick = { mediaPickerLauncher.launch("video/*") },
                    onTogglePlay = { viewModel.toggleMediaPlayback() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "टैप करके वीडियो बदलें / प्ले-पॉज़ करें",
                        color = NewsMuted,
                        fontSize = 11.sp
                    )

                    Text(
                        text = "आस्पेक्ट: ${uiState.currentAspectCrop.label}",
                        color = NewsRedPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // 3. Aspect Ratio Selector (4:5 & 9:16 prominence)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "📐 आस्पेक्ट रेशियो क्रॉप (Aspect Ratio)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = NewsBlack
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        AspectRatioType.values().forEach { ratioType ->
                            val isSelected = uiState.currentAspectCrop == ratioType
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { viewModel.setAspectCrop(ratioType) },
                                color = if (isSelected) NewsRedPrimary else Color(0xFFF1F5F9),
                                shape = RoundedCornerShape(8.dp),
                                border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, NewsBorder)
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = when (ratioType) {
                                            AspectRatioType.FEED_4_5 -> "4:5"
                                            AspectRatioType.SHORTS_9_16 -> "9:16"
                                            AspectRatioType.YOUTUBE_16_9 -> "16:9"
                                            AspectRatioType.SQUARE_1_1 -> "1:1"
                                        },
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (isSelected) Color.White else NewsBlack
                                    )
                                    Text(
                                        text = when (ratioType) {
                                            AspectRatioType.FEED_4_5 -> "इंस्टा/FB"
                                            AspectRatioType.SHORTS_9_16 -> "रील्स/शॉर्ट्स"
                                            AspectRatioType.YOUTUBE_16_9 -> "यूट्यूब"
                                            AspectRatioType.SQUARE_1_1 -> "स्क्वायर"
                                        },
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isSelected) Color(0xFFFFD54F) else NewsMuted
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Video Selection, Trimming & Crop Positioning Controls
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "✂️ वीडियो ट्रिम व फ़िटिंग (Trim & Zoom)",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsBlack
                        )

                        TextButton(
                            onClick = { mediaPickerLauncher.launch("video/*") }
                        ) {
                            Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(16.dp), tint = NewsRedPrimary)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("वीडियो चुनें", color = NewsRedPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Start Trim Slider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("शुरुआती समय (Start Trim):", fontSize = 12.sp, color = NewsSlate)
                        Text("${uiState.videoStartTrimSec.toInt()}s", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsRedPrimary)
                    }
                    Slider(
                        value = uiState.videoStartTrimSec,
                        onValueChange = {
                            viewModel.applyVideoEdit(
                                cropPreset = uiState.currentAspectCrop.name,
                                zoomScale = uiState.videoZoomScale,
                                offsetX = uiState.videoOffsetX,
                                offsetY = uiState.videoOffsetY,
                                startTrimSec = it,
                                endTrimSec = maxOf(it + 3f, uiState.videoEndTrimSec),
                                videoVolume = uiState.originalVideoVolume,
                                musicVolume = uiState.backgroundMusicVolume,
                                chosenMusic = uiState.selectedAudioTrack
                            )
                        },
                        valueRange = 0f..60f,
                        colors = SliderDefaults.colors(
                            thumbColor = NewsRedPrimary,
                            activeTrackColor = NewsRedPrimary
                        )
                    )

                    // End Trim Slider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("समाप्ति समय (End Trim):", fontSize = 12.sp, color = NewsSlate)
                        Text("${uiState.videoEndTrimSec.toInt()}s", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsRedPrimary)
                    }
                    Slider(
                        value = uiState.videoEndTrimSec.coerceIn(uiState.videoStartTrimSec + 1f, 60f),
                        onValueChange = {
                            viewModel.applyVideoEdit(
                                cropPreset = uiState.currentAspectCrop.name,
                                zoomScale = uiState.videoZoomScale,
                                offsetX = uiState.videoOffsetX,
                                offsetY = uiState.videoOffsetY,
                                startTrimSec = uiState.videoStartTrimSec,
                                endTrimSec = it,
                                videoVolume = uiState.originalVideoVolume,
                                musicVolume = uiState.backgroundMusicVolume,
                                chosenMusic = uiState.selectedAudioTrack
                            )
                        },
                        valueRange = 0f..60f,
                        colors = SliderDefaults.colors(
                            thumbColor = NewsRedPrimary,
                            activeTrackColor = NewsRedPrimary
                        )
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Video Zoom scale slider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("वीडियो ज़ूम (Zoom Scale):", fontSize = 12.sp, color = NewsSlate)
                        Text(String.format("%.1fx", uiState.videoZoomScale), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                    }
                    Slider(
                        value = uiState.videoZoomScale,
                        onValueChange = { viewModel.setVideoZoomScale(it) },
                        valueRange = 0.8f..2.5f,
                        colors = SliderDefaults.colors(
                            thumbColor = NewsGold,
                            activeTrackColor = NewsGold
                        )
                    )

                    // Video Offset Y slider (Pan vertical)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("ऊपर / नीचे खिसकाएं (Pan Y):", fontSize = 12.sp, color = NewsSlate)
                        TextButton(
                            onClick = { viewModel.resetVideoPanZoom() },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("रीसेट", fontSize = 11.sp, color = NewsRedPrimary)
                        }
                    }
                    Slider(
                        value = uiState.videoOffsetY,
                        onValueChange = { viewModel.setVideoOffsetY(it) },
                        valueRange = -200f..200f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF1E293B),
                            activeTrackColor = Color(0xFF1E293B)
                        )
                    )
                }
            }
        }

        // 5. 3-Line News Headline & Lower-Third Editor
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "📰 3-लाइन ब्रेकिंग हेडलाइंस",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsBlack
                        )

                        TextButton(
                            onClick = { viewModel.autoBalanceInto3Lines() }
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(14.dp), tint = NewsRedPrimary)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("ऑटो-बैलेंस 3 लाइन", fontSize = 11.sp, color = NewsRedPrimary, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = uiState.line1,
                        onValueChange = { viewModel.updateLine1(it) },
                        label = { Text("लाइन 1 (मुख्य टेक्स्ट)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = uiState.line2,
                        onValueChange = { viewModel.updateLine2(it) },
                        label = { Text("लाइन 2 (मध्यम टेक्स्ट)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = uiState.line3,
                        onValueChange = { viewModel.updateLine3(it) },
                        label = { Text("लाइन 3 (अंतिम पंच)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Word highlighter chips (Yellow broadcast text)
                    Text(
                        text = "⭐ शब्द हाइलाइटर (पीले रंग में चमकाने के लिए टैप करें):",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = NewsSlate
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    val allWords = "${uiState.line1} ${uiState.line2} ${uiState.line3}"
                        .split("\\s+".toRegex())
                        .filter { it.isNotBlank() }
                        .distinct()

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        allWords.take(12).forEach { word ->
                            val isHighlighted = uiState.highlightedWords.contains(word)
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (isHighlighted) NewsYellow else Color(0xFFF1F5F9),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isHighlighted) Color(0xFFD97706) else NewsBorder
                                ),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .clickable { viewModel.toggleWordHighlight(word) }
                            ) {
                                Text(
                                    text = word,
                                    fontSize = 11.sp,
                                    fontWeight = if (isHighlighted) FontWeight.ExtraBold else FontWeight.Medium,
                                    color = if (isHighlighted) Color.Black else NewsSlate,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = uiState.cityName,
                            onValueChange = { viewModel.updateCityName(it) },
                            label = { Text("📍 शहर / लोकेशन") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = uiState.channelLogoTag,
                            onValueChange = { viewModel.updateChannelLogoTag(it) },
                            label = { Text("🏷️ चैनल टैग") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = uiState.tickerText,
                        onValueChange = { viewModel.updateTickerText(it) },
                        label = { Text("⚡ नीचे चलने वाला स्क्रोलिंग टिकर (Ticker)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        maxLines = 2
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Exclusive Watermark toggle
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "एक्सक्लूसिव वॉटरमार्क (Exclusive Badge)",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsBlack
                            )
                            Text(
                                text = "वीडियो के निचले भाग पर 'EXCLUSIVE' वाटरमार्क जोड़ें",
                                fontSize = 10.sp,
                                color = NewsMuted
                            )
                        }
                        Switch(
                            checked = uiState.isExclusiveWatermark,
                            onCheckedChange = { viewModel.toggleExclusiveWatermark() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = NewsRedPrimary,
                                checkedTrackColor = NewsRedPrimary.copy(alpha = 0.5f)
                            )
                        )
                    }
                }
            }
        }

        // 6. Direct Gallery Export & Download Action Buttons
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, NewsRedPrimary),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "💾 एक्सपोर्ट व सीधा फोन गैलरी डाउनलोड",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = NewsBlack
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "वीडियो रेंडर होने के तुरंत बाद सीधे आपके फोन के 'Movies/BreakingNews' फोल्डर में सेव हो जाएगी।",
                        fontSize = 11.sp,
                        color = NewsMuted
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Primary Export Button (Starts MediaCodec video rendering)
                    Button(
                        onClick = { viewModel.startExport() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NewsRedPrimary,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("render_and_export_video_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.MovieCreation,
                            contentDescription = null,
                            tint = NewsYellow,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "🎬 वीडियो रेंडर करें व गैलरी में सेव करें (Export MP4)",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Quick Download / Play if video was already rendered
                    if (uiState.exportedProject != null && uiState.exportedVideoUri != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    VideoExportDownloader.playVideoInDevice(context, uiState.exportedVideoUri!!)
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, NewsRedPrimary)
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("प्ले करें", color = NewsRedPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }

                            Button(
                                onClick = {
                                    VideoExportDownloader.downloadToDevice(context, uiState.exportedProject!!)
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF16A34A),
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
                            ) {
                                Icon(Icons.Default.Download, contentDescription = null, tint = NewsYellow, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("गैलरी डाउनलोड", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    // Export Progress Dialog with real-time MediaCodec progress & single-tap playback/share/download
    ExportProgressDialog(
        isExporting = uiState.isExporting,
        progress = uiState.exportProgress,
        isSuccess = uiState.showExportSuccessDialog,
        project = uiState.exportedProject,
        onDismiss = { viewModel.dismissExportDialog() },
        onViewSaved = { viewModel.dismissExportDialog() },
        onDownloadToPhone = { project ->
            VideoExportDownloader.downloadToDevice(context, project)
        }
    )
}

@Composable
fun QuickMobileJacketsPanel(
    modifier: Modifier = Modifier,
    jacketData: NewsJacketData
) {
    val context = LocalContext.current
    var headlineText by remember(jacketData) { mutableStateOf(jacketData.headline) }
    var subHeadlineText by remember(jacketData) { mutableStateOf(jacketData.subHeadline) }
    var tagText by remember(jacketData) { mutableStateOf(jacketData.tagText) }
    var channelName by remember(jacketData) { mutableStateOf(jacketData.channelName) }
    var reporterName by remember(jacketData) { mutableStateOf(jacketData.reporterName) }
    var selectedStyle by remember(jacketData) { mutableStateOf(jacketData.style) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(NewsBgLight),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            LiveNewsJacket(
                data = NewsJacketData(
                    headline = headlineText,
                    subHeadline = subHeadlineText,
                    headerTitle = "BREAKING NEWS WALA",
                    tagText = tagText,
                    channelName = channelName,
                    reporterName = reporterName,
                    location = "लाइव डेस्क",
                    dateText = jacketData.dateText,
                    sourceLink = jacketData.sourceLink,
                    style = selectedStyle
                ),
                isVideoMode = false
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        Toast.makeText(context, "क्विक जैकेट डाउनलोड किया गया", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("कार्ड डाउनलोड करें", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = {
                        Toast.makeText(context, "शेयर लिंक कॉपी किया गया", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, NewsRedPrimary)
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("शेयर करें", color = NewsRedPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Style Selector
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "क्विक स्टाइल चुनें",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = NewsBlack
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        JacketStyle.values().forEach { style ->
                            val isSelected = selectedStyle == style
                            Surface(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { selectedStyle = style }
                                    .border(
                                        width = if (isSelected) 2.dp else 1.dp,
                                        color = if (isSelected) NewsRedPrimary else NewsBorder,
                                        shape = RoundedCornerShape(8.dp)
                                    ),
                                color = if (isSelected) Color(0xFFFFF1F2) else Color(0xFFF9FAFB)
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 10.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .clip(CircleShape)
                                            .background(Color(style.headerBgHex))
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = style.label,
                                        fontSize = 11.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) NewsRedPrimary else NewsBlack
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LiveNewsJacket(
    data: NewsJacketData,
    isVideoMode: Boolean,
    modifier: Modifier = Modifier
) {
    val headerColor = Color(data.style.headerBgHex)
    val accentColor = Color(data.style.accentHex)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(2.dp, accentColor)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // TOP JACKET HEADER
            Surface(
                color = headerColor,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            color = NewsGold,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "BNW",
                                color = NewsBlack,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                            )
                        }
                        Text(
                            text = data.headerTitle,
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    }

                    Surface(
                        color = when (data.style) {
                            JacketStyle.RED_BREAKING -> Color.White
                            JacketStyle.INVESTIGATION -> Color(0xFFEF4444)
                            JacketStyle.QUOTE -> Color(0xFF38BDF8)
                            JacketStyle.MORNING -> Color(0xFFF59E0B)
                            else -> NewsRedPrimary
                        },
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = when (data.style) {
                                JacketStyle.RED_BREAKING -> "⚡ सुपर ब्रेकिंग"
                                JacketStyle.INVESTIGATION -> "🔍 विशेष पड़ताल"
                                JacketStyle.QUOTE -> "💬 बड़ा बयान"
                                JacketStyle.MORNING -> "🌅 आज का विचार"
                                JacketStyle.EPAPER -> "📰 ई-संस्करण"
                                else -> data.tagText
                            },
                            color = if (data.style == JacketStyle.RED_BREAKING) NewsRedPrimary else Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(accentColor)
            )

            // MEDIA AREA
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (isVideoMode) 220.dp else 200.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color(0xFF1E293B), Color(0xFF0F172A))
                        )
                    )
            ) {
                if (isVideoMode) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(NewsRedPrimary.copy(alpha = 0.85f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Play",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Surface(
                        color = Color.Black.copy(alpha = 0.6f),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                    ) {
                        Text(
                            text = "00:45 HD",
                            color = Color.White,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter),
                    color = Color.Black.copy(alpha = 0.88f)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(NewsRedPrimary)
                            )
                            Text(
                                text = data.channelName,
                                color = NewsGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "• ${data.location}",
                                color = Color(0xFFA1A1AA),
                                fontSize = 10.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = data.headline,
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            lineHeight = 20.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp)
                    .background(accentColor)
            )

            // FOOTER
            Surface(
                color = headerColor,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Verified,
                            contentDescription = null,
                            tint = NewsGold,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "${data.reporterName} • ${data.location}",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = data.dateText,
                            color = Color(0xFFCBD5E1),
                            fontSize = 10.sp
                        )

                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCode2,
                                contentDescription = "QR",
                                tint = NewsBlack,
                                modifier = Modifier
                                    .size(16.dp)
                                    .padding(1.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
