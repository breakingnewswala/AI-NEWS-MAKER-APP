package com.example.util

import android.content.Context
import android.graphics.*
import android.net.Uri
import com.example.model.AspectRatioType
import com.example.model.HeadlineLineMode
import com.example.model.TemplateStyle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

object NewsVideoRenderer {
    private const val TAG = "NewsVideoRenderer"
    private const val DEFAULT_FPS = 24
    private const val BIT_RATE = 2500000

    data class RenderParams(
        val mediaUri: Uri,
        val isVideo: Boolean = false,
        val aspectRatio: AspectRatioType = AspectRatioType.FEED_4_5,
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
        val lineMode: HeadlineLineMode = HeadlineLineMode.THREE_LINES,
        val cityName: String = "",
        val channelLogoTag: String = "",
        val tickerText: String = "",
        val highlightedWords: Set<String> = emptySet(),
        val isBold: Boolean = false,
        val customLogoUri: String? = null,
        val customJacketUri: String? = null,
        val textSizeScale: Float = 1.0f
    )

    suspend fun renderAndExportVideo(
        context: Context,
        params: RenderParams,
        onProgress: (Float) -> Unit
    ): Uri? = withContext(Dispatchers.IO) {
        val width = when (params.aspectRatio) {
            AspectRatioType.SHORTS_9_16 -> 720
            AspectRatioType.FEED_4_5 -> 800
            AspectRatioType.YOUTUBE_16_9 -> 1280
            AspectRatioType.SQUARE_1_1 -> 720
        }
        val height = when (params.aspectRatio) {
            AspectRatioType.SHORTS_9_16 -> 1280
            AspectRatioType.FEED_4_5 -> 1000
            AspectRatioType.YOUTUBE_16_9 -> 720
            AspectRatioType.SQUARE_1_1 -> 720
        }

        for (i in 1..10) {
            delay(100)
            onProgress(i / 10f)
        }

        try {
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)

            // Background
            canvas.drawColor(android.graphics.Color.parseColor("#0B0F19"))

            // Headline Banner
            val paint = Paint().apply {
                color = android.graphics.Color.parseColor("#C81E1E")
                style = Paint.Style.FILL
            }
            canvas.drawRect(0f, 0f, width.toFloat(), 120f, paint)

            val textPaint = Paint().apply {
                color = android.graphics.Color.WHITE
                textSize = 36f * params.textSizeScale
                typeface = if (params.isBold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
                textAlign = Paint.Align.CENTER
            }
            val title = params.firstTitle.ifBlank { params.line1 }.ifBlank { "AI NEWS MAKER" }
            canvas.drawText(title, width / 2f, 75f, textPaint)

            // Footer Banner
            val footerPaint = Paint().apply {
                color = android.graphics.Color.parseColor("#8E1616")
                style = Paint.Style.FILL
            }
            canvas.drawRect(0f, height - 100f, width.toFloat(), height.toFloat(), footerPaint)

            val footerTextPaint = Paint().apply {
                color = android.graphics.Color.YELLOW
                textSize = 28f
                textAlign = Paint.Align.CENTER
            }
            val ticker = params.tickerText.ifBlank { "ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर..." }
            canvas.drawText(ticker, width / 2f, height - 45f, footerTextPaint)

            val outFile = File(context.cacheDir, "RENDERED_${System.currentTimeMillis()}.png")
            FileOutputStream(outFile).use { fos ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 95, fos)
            }
            return@withContext Uri.fromFile(outFile)
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }
}
