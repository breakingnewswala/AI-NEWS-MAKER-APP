package com.example.util

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import com.example.model.AspectRatioType
import com.example.model.HeadlineLineMode
import com.example.model.TemplateStyle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer

object NewsVideoRenderer {

    private const val TAG = "NewsVideoRenderer"
    private const val DEFAULT_FPS = 24
    private const val BIT_RATE = 2_500_000 // 2.5 Mbps 720p

    data class RenderParams(
        val mediaUri: Uri?,
        val isVideo: Boolean,
        val aspectRatio: AspectRatioType,
        val videoZoomScale: Float = 1.0f,
        val videoOffsetX: Float = 0f,
        val videoOffsetY: Float = 0f,
        val startTrimSec: Float = 0f,
        val endTrimSec: Float = 0f,
        val templateStyle: TemplateStyle = TemplateStyle.REGULAR_NEWS_FRAME,
        val firstTitle: String = "",
        val secondTitle: String = "",
        val line1: String = "",
        val line2: String = "",
        val line3: String = "",
        val lineMode: HeadlineLineMode = HeadlineLineMode.THREE_LINE,
        val cityName: String = "",
        val channelLogoTag: String = "",
        val tickerText: String = "",
        val highlightedWords: Set<String> = emptySet(),
        val isExclusiveWatermark: Boolean = false,
        val customLogoUri: String? = null,
        val customJacketUri: String? = null,
        val textSizeScale: Float = 1.0f
    )

    /**
     * Renders a broadcast news video with all graphics/jackets burned in,
     * saves directly to device Movies/BreakingNews, and returns public Uri.
     */
    suspend fun renderAndExportVideo(
        context: Context,
        params: RenderParams,
        onProgress: (Float) -> Unit
    ): Uri? = withContext(Dispatchers.IO) {
        val (width, height) = when (params.aspectRatio) {
            AspectRatioType.SHORTS_9_16 -> Pair(720, 1280)
            AspectRatioType.FEED_4_5 -> Pair(720, 896) // Multiple of 16 closest to 4:5
            AspectRatioType.YOUTUBE_16_9 -> Pair(1280, 720)
            AspectRatioType.SQUARE_1_1 -> Pair(720, 720)
        }

        val tempFile = File(context.cacheDir, "news_render_${System.currentTimeMillis()}.mp4")
        var success = false

        try {
            encodeNewsVideo(
                context = context,
                params = params,
                width = width,
                height = height,
                outputFile = tempFile,
                onProgress = onProgress
            )
            success = tempFile.exists() && tempFile.length() > 1024
        } catch (e: Exception) {
            Log.e(TAG, "Error rendering news video: ${e.message}", e)
        }

        if (success) {
            // Save to public gallery via MediaStore
            val finalUri = saveToGallery(context, tempFile, params.firstTitle.ifBlank { "Breaking News" })
            tempFile.delete()
            return@withContext finalUri
        } else {
            // Generate single high-resolution news frame poster as fallback
            val posterUri = generateNewsPoster(context, params, width, height)
            return@withContext posterUri
        }
    }

    private fun encodeNewsVideo(
        context: Context,
        params: RenderParams,
        width: Int,
        height: Int,
        outputFile: File,
        onProgress: (Float) -> Unit
    ) {
        var retriever: MediaMetadataRetriever? = null
        var totalDurationSec = 5.0f

        if (params.mediaUri != null && params.isVideo) {
            try {
                retriever = MediaMetadataRetriever()
                retriever.setDataSource(context, params.mediaUri)
                val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                val durMs = durationStr?.toLongOrNull() ?: 5000L
                totalDurationSec = (durMs / 1000f).coerceIn(3.0f, 60.0f)
            } catch (e: Exception) {
                Log.w(TAG, "Could not read video metadata: ${e.message}")
                retriever = null
            }
        }

        val startSec = params.startTrimSec.coerceIn(0f, totalDurationSec)
        val endSec = if (params.endTrimSec > startSec) params.endTrimSec.coerceAtMost(totalDurationSec) else totalDurationSec
        val durationToRenderSec = (endSec - startSec).coerceIn(3.0f, 30.0f)

        val totalFrames = (durationToRenderSec * DEFAULT_FPS).toInt().coerceIn(48, 720)
        val frameDurationUs = (1_000_000L / DEFAULT_FPS)

        // Load static image bitmap if media is a photo
        var staticImageBitmap: Bitmap? = null
        if (params.mediaUri != null && !params.isVideo) {
            try {
                context.contentResolver.openInputStream(params.mediaUri)?.use { input ->
                    staticImageBitmap = BitmapFactory.decodeStream(input)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed loading static image: ${e.message}")
            }
        }

        // Load custom logo / jacket if any
        var customLogoBitmap: Bitmap? = null
        params.customLogoUri?.let { uriStr ->
            try {
                context.contentResolver.openInputStream(Uri.parse(uriStr))?.use { input ->
                    customLogoBitmap = BitmapFactory.decodeStream(input)
                }
            } catch (_: Exception) {}
        }

        var customJacketBitmap: Bitmap? = null
        params.customJacketUri?.let { uriStr ->
            try {
                context.contentResolver.openInputStream(Uri.parse(uriStr))?.use { input ->
                    customJacketBitmap = BitmapFactory.decodeStream(input)
                }
            } catch (_: Exception) {}
        }

        // Configure MediaCodec
        val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
            setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar)
            setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
            setInteger(MediaFormat.KEY_FRAME_RATE, DEFAULT_FPS)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
        }

        val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
        codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        codec.start()

        val muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        var videoTrackIndex = -1
        var muxerStarted = false

        val frameBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(frameBitmap)
        val yuvBuffer = ByteArray(width * height * 3 / 2)
        val bufferInfo = MediaCodec.BufferInfo()

        try {
            for (frameIndex in 0 until totalFrames) {
                val currentSec = startSec + (frameIndex.toFloat() / DEFAULT_FPS)
                val timestampUs = (currentSec * 1_000_000L).toLong()

                // 1. Draw media layer
                if (retriever != null) {
                    val frame = retriever.getFrameAtTime(timestampUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                        ?: retriever.frameAtTime
                    if (frame != null) {
                        drawMediaFrame(canvas, frame, width, height, params.videoZoomScale, params.videoOffsetX, params.videoOffsetY)
                    } else {
                        drawDefaultStudioBackground(canvas, width, height)
                    }
                } else if (staticImageBitmap != null) {
                    drawMediaFrame(canvas, staticImageBitmap!!, width, height, params.videoZoomScale, params.videoOffsetX, params.videoOffsetY)
                } else {
                    drawDefaultStudioBackground(canvas, width, height)
                }

                // 2. Burn-in News Jacket Overlays (Jackets, Headlines, Badges, Tickers)
                drawJacketOverlay(
                    canvas = canvas,
                    width = width,
                    height = height,
                    params = params,
                    frameIndex = frameIndex,
                    customLogoBitmap = customLogoBitmap,
                    customJacketBitmap = customJacketBitmap
                )

                // 3. Convert ARGB to NV12 YUV
                convertBitmapToNv12(frameBitmap, width, height, yuvBuffer)

                // 4. Feed input buffer to MediaCodec
                val inputBufferIndex = codec.dequeueInputBuffer(10_000)
                if (inputBufferIndex >= 0) {
                    val inputBuffer = codec.getInputBuffer(inputBufferIndex)
                    inputBuffer?.clear()
                    inputBuffer?.put(yuvBuffer)
                    val ptsUs = (frameIndex * frameDurationUs)
                    codec.queueInputBuffer(inputBufferIndex, 0, yuvBuffer.size, ptsUs, 0)
                }

                // 5. Drain output buffers
                var outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, 10_000)
                while (outputBufferIndex >= 0 || outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    if (outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                        if (!muxerStarted) {
                            videoTrackIndex = muxer.addTrack(codec.outputFormat)
                            muxer.start()
                            muxerStarted = true
                        }
                    } else if (outputBufferIndex >= 0) {
                        val outBuf = codec.getOutputBuffer(outputBufferIndex)
                        if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) {
                            bufferInfo.size = 0
                        }
                        if (bufferInfo.size != 0 && outBuf != null) {
                            if (!muxerStarted) {
                                videoTrackIndex = muxer.addTrack(codec.outputFormat)
                                muxer.start()
                                muxerStarted = true
                            }
                            outBuf.position(bufferInfo.offset)
                            outBuf.limit(bufferInfo.offset + bufferInfo.size)
                            muxer.writeSampleData(videoTrackIndex, outBuf, bufferInfo)
                        }
                        codec.releaseOutputBuffer(outputBufferIndex, false)
                    }
                    outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
                }

                onProgress((frameIndex + 1).toFloat() / totalFrames * 0.95f)
            }

            // Signal end of stream
            val eosInputIndex = codec.dequeueInputBuffer(10_000)
            if (eosInputIndex >= 0) {
                codec.queueInputBuffer(eosInputIndex, 0, 0, totalFrames * frameDurationUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            }

            // Drain remaining EOS
            while (true) {
                val outIndex = codec.dequeueOutputBuffer(bufferInfo, 20_000)
                if (outIndex >= 0) {
                    val outBuf = codec.getOutputBuffer(outIndex)
                    if (bufferInfo.size != 0 && outBuf != null && muxerStarted) {
                        outBuf.position(bufferInfo.offset)
                        outBuf.limit(bufferInfo.offset + bufferInfo.size)
                        muxer.writeSampleData(videoTrackIndex, outBuf, bufferInfo)
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                    if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        break
                    }
                } else if (outIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                    break
                }
            }

            onProgress(1.0f)
        } finally {
            try { codec.stop() } catch (_: Exception) {}
            try { codec.release() } catch (_: Exception) {}
            try {
                if (muxerStarted) muxer.stop()
                muxer.release()
            } catch (_: Exception) {}
            try { retriever?.release() } catch (_: Exception) {}
            frameBitmap.recycle()
        }
    }

    private fun drawMediaFrame(
        canvas: Canvas,
        srcBitmap: Bitmap,
        destWidth: Int,
        destHeight: Int,
        zoom: Float,
        offsetX: Float,
        offsetY: Float
    ) {
        val srcWidth = srcBitmap.width.toFloat()
        val srcHeight = srcBitmap.height.toFloat()

        val scale = maxOf(destWidth / srcWidth, destHeight / srcHeight) * zoom
        val scaledW = srcWidth * scale
        val scaledH = srcHeight * scale

        val left = (destWidth - scaledW) / 2f + offsetX
        val top = (destHeight - scaledH) / 2f + offsetY

        val matrix = Matrix().apply {
            postScale(scale, scale)
            postTranslate(left, top)
        }

        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        canvas.drawBitmap(srcBitmap, matrix, paint)
    }

    private fun drawDefaultStudioBackground(canvas: Canvas, width: Int, height: Int) {
        val bgPaint = Paint().apply { color = Color.parseColor("#121212") }
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)

        // Subtle studio grid lines
        val linePaint = Paint().apply {
            color = Color.parseColor("#252525")
            strokeWidth = 2f
        }
        for (x in 0..width step 80) {
            canvas.drawLine(x.toFloat(), 0f, x.toFloat(), height.toFloat(), linePaint)
        }
        for (y in 0..height step 80) {
            canvas.drawLine(0f, y.toFloat(), width.toFloat(), y.toFloat(), linePaint)
        }
    }

    /**
     * Draws the complete broadcast jacket (Top Strip, Headline Banner with highlighted yellow words,
     * Sub-bar with location, Watermark, and Bottom Animated Breaking Ticker)
     */
    private fun drawJacketOverlay(
        canvas: Canvas,
        width: Int,
        height: Int,
        params: RenderParams,
        frameIndex: Int,
        customLogoBitmap: Bitmap?,
        customJacketBitmap: Bitmap?
    ) {
        // 1. Custom Jacket Graphic (if provided by admin/user)
        if (customJacketBitmap != null) {
            val destRect = Rect(0, 0, width, height)
            val paint = Paint(Paint.FILTER_BITMAP_FLAG)
            canvas.drawBitmap(customJacketBitmap, null, destRect, paint)
        }

        val densityScale = width / 720f

        // 2. Top Yellow Strip: "WATCH NOW ▶", Social Dots, "BREAKINGNEWSWALA.COM"
        val topStripHeight = 38f * densityScale
        val yellowPaint = Paint().apply { color = Color.parseColor("#FFFFED00") }
        canvas.drawRect(0f, 0f, width.toFloat(), topStripHeight, yellowPaint)

        // "WATCH NOW ▶" black capsule
        val watchNowBg = Paint().apply {
            color = Color.BLACK
            isAntiAlias = true
        }
        val watchRect = RectF(12f * densityScale, 6f * densityScale, 120f * densityScale, topStripHeight - 6f * densityScale)
        canvas.drawRoundRect(watchRect, 12f * densityScale, 12f * densityScale, watchNowBg)

        val watchTextPaint = Paint().apply {
            color = Color.parseColor("#FFFFED00")
            textSize = 14f * densityScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        canvas.drawText("WATCH NOW ▶", 18f * densityScale, topStripHeight - 13f * densityScale, watchTextPaint)

        // Website Text on right
        val webTextPaint = Paint().apply {
            color = Color.BLACK
            textSize = 14f * densityScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        val webUrl = "🌐 BREAKINGNEWSWALA.COM"
        val webWidth = webTextPaint.measureText(webUrl)
        canvas.drawText(webUrl, width - webWidth - 14f * densityScale, topStripHeight - 13f * densityScale, webTextPaint)

        // 3. Maroon 3-Line Headline Plate
        val headlineTop = topStripHeight
        val headlineHeight = 135f * densityScale
        val maroonPaint = Paint().apply { color = Color.parseColor("#580B07") }
        canvas.drawRect(0f, headlineTop, width.toFloat(), headlineTop + headlineHeight, maroonPaint)

        // Headline Text (Line 1, Line 2, Line 3 with highlighted keywords)
        val textPaintNormal = Paint().apply {
            color = Color.WHITE
            textSize = 26f * densityScale * params.textSizeScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        val textPaintHighlight = Paint().apply {
            color = Color.parseColor("#FFFFED00") // Bright News Yellow
            textSize = 26f * densityScale * params.textSizeScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }

        val lines = if (params.lineMode == HeadlineLineMode.THREE_LINE) {
            listOf(
                params.line1.ifBlank { params.firstTitle },
                params.line2,
                params.line3
            ).filter { it.isNotBlank() }
        } else {
            listOf(params.firstTitle)
        }

        val lineSpacing = 38f * densityScale
        var currentY = headlineTop + 36f * densityScale
        for (line in lines.take(3)) {
            drawHighlightedTextLine(
                canvas = canvas,
                text = line,
                centerX = width / 2f,
                y = currentY,
                normalPaint = textPaintNormal,
                highlightPaint = textPaintHighlight,
                highlightedWords = params.highlightedWords
            )
            currentY += lineSpacing
        }

        // 4. Sub-bar: Location Badge (Left) & Channel Logo (Right)
        val subBarTop = headlineTop + headlineHeight
        val subBarHeight = 50f * densityScale

        // Location Box
        val locText = "📍 " + params.cityName.ifBlank { "भोपाल, मप्र" }
        val locPaint = Paint().apply {
            color = Color.parseColor("#1565C0")
            textSize = 18f * densityScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        val locTextWidth = locPaint.measureText(locText)
        val locBoxRect = RectF(
            12f * densityScale,
            subBarTop + 6f * densityScale,
            locTextWidth + 36f * densityScale,
            subBarTop + subBarHeight - 6f * densityScale
        )
        val locBgPaint = Paint().apply {
            color = Color.WHITE
            isAntiAlias = true
        }
        val locStrokePaint = Paint().apply {
            color = Color.parseColor("#1565C0")
            style = Paint.Style.STROKE
            strokeWidth = 3f * densityScale
            isAntiAlias = true
        }
        canvas.drawRoundRect(locBoxRect, 8f * densityScale, 8f * densityScale, locBgPaint)
        canvas.drawRoundRect(locBoxRect, 8f * densityScale, 8f * densityScale, locStrokePaint)
        canvas.drawText(locText, 20f * densityScale, subBarTop + subBarHeight - 17f * densityScale, locPaint)

        // Channel Logo on the Right
        if (customLogoBitmap != null) {
            val logoH = (subBarHeight - 10f * densityScale).toInt()
            val logoW = (customLogoBitmap.width.toFloat() / customLogoBitmap.height * logoH).toInt()
            val logoRect = Rect(
                width - logoW - (12 * densityScale).toInt(),
                (subBarTop + 5f * densityScale).toInt(),
                width - (12 * densityScale).toInt(),
                (subBarTop + 5f * densityScale + logoH).toInt()
            )
            canvas.drawBitmap(customLogoBitmap, null, logoRect, Paint(Paint.FILTER_BITMAP_FLAG))
        } else {
            // Official Breaking News Wala logo badge
            val logoBgRect = RectF(
                width - 190f * densityScale,
                subBarTop + 6f * densityScale,
                width - 12f * densityScale,
                subBarTop + subBarHeight - 6f * densityScale
            )
            val logoBgPaint = Paint().apply {
                color = Color.parseColor("#FFFFED00")
                isAntiAlias = true
            }
            val logoStroke = Paint().apply {
                color = Color.parseColor("#D32F2F")
                style = Paint.Style.STROKE
                strokeWidth = 2f * densityScale
                isAntiAlias = true
            }
            canvas.drawRoundRect(logoBgRect, 8f * densityScale, 8f * densityScale, logoBgPaint)
            canvas.drawRoundRect(logoBgRect, 8f * densityScale, 8f * densityScale, logoStroke)

            val logoTextPaint = Paint().apply {
                color = Color.parseColor("#C62828")
                textSize = 17f * densityScale
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                isAntiAlias = true
            }
            canvas.drawText("ब्रेकिंग न्यूज़वाला", width - 175f * densityScale, subBarTop + subBarHeight - 17f * densityScale, logoTextPaint)
        }

        // 5. Exclusive Watermark (if enabled)
        if (params.isExclusiveWatermark) {
            val watermarkY = height * 0.70f
            val wmRect = RectF(width * 0.15f, watermarkY, width * 0.85f, watermarkY + 44f * densityScale)
            val wmBg = Paint().apply {
                color = Color.parseColor("#80000000") // 50% translucent black
                isAntiAlias = true
            }
            val wmStroke = Paint().apply {
                color = Color.parseColor("#66FFED00")
                style = Paint.Style.STROKE
                strokeWidth = 2f * densityScale
                isAntiAlias = true
            }
            canvas.drawRoundRect(wmRect, 10f * densityScale, 10f * densityScale, wmBg)
            canvas.drawRoundRect(wmRect, 10f * densityScale, 10f * densityScale, wmStroke)

            val wmTextPaint = Paint().apply {
                color = Color.parseColor("#FFFFED00")
                textSize = 20f * densityScale
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                isAntiAlias = true
                letterSpacing = 0.2f
            }
            val wmText = "EXCLUSIVE | ब्रेकिंग न्यूज़"
            val textW = wmTextPaint.measureText(wmText)
            canvas.drawText(wmText, (width - textW) / 2f, watermarkY + 30f * densityScale, wmTextPaint)
        }

        // 6. Bottom Ticker Bar: Red LIVE badge + Animated Scrolling Ticker
        val tickerHeight = 52f * densityScale
        val tickerTop = height - tickerHeight

        val tickerBgPaint = Paint().apply { color = Color.parseColor("#141414") }
        canvas.drawRect(0f, tickerTop, width.toFloat(), height.toFloat(), tickerBgPaint)

        val redBorderPaint = Paint().apply {
            color = Color.parseColor("#D32F2F")
            strokeWidth = 3f * densityScale
        }
        canvas.drawLine(0f, tickerTop, width.toFloat(), tickerTop, redBorderPaint)

        // Pulsing Red LIVE tag
        val liveWidth = 90f * densityScale
        val liveBg = Paint().apply { color = Color.parseColor("#D32F2F") }
        canvas.drawRect(0f, tickerTop, liveWidth, height.toFloat(), liveBg)

        // Pulsing white circle
        val pulseAlpha = (180 + (Math.sin(frameIndex * 0.3) * 75)).toInt().coerceIn(0, 255)
        val liveCirclePaint = Paint().apply {
            color = Color.WHITE
            alpha = pulseAlpha
            isAntiAlias = true
        }
        canvas.drawCircle(18f * densityScale, tickerTop + tickerHeight / 2f, 6f * densityScale, liveCirclePaint)

        val liveTextPaint = Paint().apply {
            color = Color.WHITE
            textSize = 17f * densityScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }
        canvas.drawText("LIVE", 32f * densityScale, tickerTop + tickerHeight - 16f * densityScale, liveTextPaint)

        // Animated scrolling ticker text
        val tickerContent = params.tickerText.ifBlank {
            "ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल 'ब्रेकिंग न्यूज़वाला' पर... पल-पल की निष्पक्ष खबरें..."
        }
        val tickerTextPaint = Paint().apply {
            color = Color.parseColor("#FFFFED00")
            textSize = 19f * densityScale
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = true
        }

        val textWidth = tickerTextPaint.measureText(tickerContent)
        val scrollSpeed = 4f * densityScale // pixels per frame
        val totalScrollWidth = textWidth + width
        val scrollOffset = (frameIndex * scrollSpeed) % totalScrollWidth
        val tickerX = width - scrollOffset

        // Clip ticker text to right of LIVE badge
        canvas.save()
        canvas.clipRect(liveWidth + 8f * densityScale, tickerTop, width.toFloat(), height.toFloat())
        canvas.drawText(tickerContent, tickerX, tickerTop + tickerHeight - 17f * densityScale, tickerTextPaint)
        canvas.restore()
    }

    private fun drawHighlightedTextLine(
        canvas: Canvas,
        text: String,
        centerX: Float,
        y: Float,
        normalPaint: Paint,
        highlightPaint: Paint,
        highlightedWords: Set<String>
    ) {
        val words = text.split(" ")
        var totalLineWidth = 0f
        val wordWidths = FloatArray(words.size)
        val spaceWidth = normalPaint.measureText(" ")

        for (i in words.indices) {
            val isHighlight = isWordHighlighted(words[i], highlightedWords)
            val paint = if (isHighlight) highlightPaint else normalPaint
            wordWidths[i] = paint.measureText(words[i])
            totalLineWidth += wordWidths[i]
            if (i < words.size - 1) totalLineWidth += spaceWidth
        }

        var startX = centerX - (totalLineWidth / 2f)
        for (i in words.indices) {
            val isHighlight = isWordHighlighted(words[i], highlightedWords)
            val paint = if (isHighlight) highlightPaint else normalPaint
            canvas.drawText(words[i], startX, y, paint)
            startX += wordWidths[i] + spaceWidth
        }
    }

    private fun isWordHighlighted(word: String, highlightedWords: Set<String>): Boolean {
        val clean = word.trim().removeSurrounding("\"", "\"").removeSurrounding("'", "'").removeSuffix(",").removeSuffix(".")
        return highlightedWords.any { hw -> hw.isNotBlank() && (clean.equals(hw, ignoreCase = true) || clean.contains(hw, ignoreCase = true)) }
    }

    /**
     * Converts an ARGB Bitmap into NV12 (YUV420SemiPlanar) byte array for standard H.264 encoder.
     */
    private fun convertBitmapToNv12(bitmap: Bitmap, width: Int, height: Int, yuv: ByteArray) {
        val argb = IntArray(width * height)
        bitmap.getPixels(argb, 0, width, 0, 0, width, height)

        val ySize = width * height
        var yIndex = 0
        var uvIndex = ySize

        for (j in 0 until height) {
            for (i in 0 until width) {
                val c = argb[j * width + i]
                val r = (c shr 16) and 0xff
                val g = (c shr 8) and 0xff
                val b = c and 0xff

                // Standard RGB to YUV formula
                val y = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
                val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
                val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128

                yuv[yIndex++] = y.coerceIn(0, 255).toByte()

                if (j % 2 == 0 && i % 2 == 0) {
                    yuv[uvIndex++] = u.coerceIn(0, 255).toByte()
                    yuv[uvIndex++] = v.coerceIn(0, 255).toByte()
                }
            }
        }
    }

    /**
     * Fallback high-resolution news poster export (JPEG) if video encoder is not ready.
     */
    private fun generateNewsPoster(
        context: Context,
        params: RenderParams,
        width: Int,
        height: Int
    ): Uri? {
        try {
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            if (params.mediaUri != null) {
                try {
                    context.contentResolver.openInputStream(params.mediaUri)?.use { input ->
                        val src = BitmapFactory.decodeStream(input)
                        if (src != null) {
                            drawMediaFrame(canvas, src, width, height, params.videoZoomScale, params.videoOffsetX, params.videoOffsetY)
                        } else {
                            drawDefaultStudioBackground(canvas, width, height)
                        }
                    }
                } catch (_: Exception) {
                    drawDefaultStudioBackground(canvas, width, height)
                }
            } else {
                drawDefaultStudioBackground(canvas, width, height)
            }

            drawJacketOverlay(canvas, width, height, params, 0, null, null)

            val fileName = "News_Poster_${System.currentTimeMillis()}.jpg"
            val resolver = context.contentResolver

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                    put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/BreakingNews")
                }
                val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { out ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)
                    }
                    return uri
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed generating news poster: ${e.message}")
        }
        return null
    }

    private fun saveToGallery(context: Context, videoFile: File, title: String): Uri? {
        val resolver = context.contentResolver
        val fileName = "News_Video_${System.currentTimeMillis()}.mp4"

        return try {
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
                        videoFile.inputStream().use { input -> input.copyTo(out) }
                    }
                    values.clear()
                    values.put(MediaStore.Video.Media.IS_PENDING, 0)
                    resolver.update(itemUri, values, null, null)
                    itemUri
                } else null
            } else {
                val moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
                val appDir = File(moviesDir, "BreakingNews")
                if (!appDir.exists()) appDir.mkdirs()
                val targetFile = File(appDir, fileName)
                videoFile.copyTo(targetFile, overwrite = true)
                Uri.fromFile(targetFile)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save into MediaStore: ${e.message}")
            null
        }
    }
}
