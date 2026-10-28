package com.example.ui.components

import android.net.Uri
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.model.*
import com.example.ui.theme.Amber400
import com.example.ui.theme.Red600
import com.example.ui.theme.Red800
import com.example.ui.theme.Slate900

fun buildHighlightedHeadline(
    text: String,
    highlightedWords: Set<String>,
    defaultColor: Color,
    highlightColor: Color
): AnnotatedString {
    if (highlightedWords.isEmpty()) {
        return AnnotatedString(text)
    }
    return buildAnnotatedString {
        val words = text.split(" ")
        words.forEachIndexed { index, word ->
            val cleanWord = word.trim(',', '.', '!', '?', ':', ';')
            if (highlightedWords.contains(cleanWord)) {
                pushStyle(SpanStyle(color = highlightColor, fontWeight = FontWeight.Black))
                append(word)
                pop()
            } else {
                pushStyle(SpanStyle(color = defaultColor))
                append(word)
                pop()
            }
            if (index < words.size - 1) append(" ")
        }
    }
}

@Composable
fun NewsCanvasOverlay(
    firstTitle: String,
    secondTitle: String,
    tickerText: String,
    cityName: String,
    channelLogoTag: String,
    mediaUri: Uri?,
    isVideo: Boolean,
    isMediaPlaying: Boolean,
    currentPlaybackSeconds: Int,
    aspectRatioType: AspectRatioType,
    templateStyle: TemplateStyle,
    textSizeScale: Float,
    isBold: Boolean,
    isExclusiveWatermark: Boolean,
    line1: String,
    line2: String,
    line3: String,
    lineMode: HeadlineLineMode,
    fontOption: HindiFontOption,
    alignment: HeadlineAlignment,
    highlightedWords: Set<String>,
    customJacketUri: String,
    customLogoUri: String,
    videoOffsetY: Float,
    videoOffsetX: Float,
    videoZoomScale: Float,
    showSafeZoneOverlay: Boolean,
    onMediaAreaClick: () -> Unit,
    onTogglePlay: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "news_canvas_anim")
    val tickerOffset by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = -1f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ticker_offset"
    )

    val aspectRatio = aspectRatioType.ratioWidth.toFloat() / aspectRatioType.ratioHeight.toFloat()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(aspectRatio)
            .clip(RoundedCornerShape(8.dp))
            .background(Slate900)
    ) {
        // 1. Media Background Layer
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable { onMediaAreaClick() }
        ) {
            if (mediaUri != null) {
                AsyncImage(
                    model = mediaUri,
                    contentDescription = "News Media",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xFF1E293B), Color(0xFF0F172A))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "📷 फ़ोटो या वीडियो जोड़ने के लिए यहाँ टैप करें",
                        color = Color.LightGray,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Video Play Button overlay
            if (isVideo && !isMediaPlaying) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .align(Alignment.Center)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                        .clickable { onTogglePlay() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Play",
                        tint = Amber400,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }
        }

        // 2. Custom Jacket overlay if exists
        if (customJacketUri.isNotBlank()) {
            AsyncImage(
                model = customJacketUri,
                contentDescription = "Custom Jacket",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.FillBounds
            )
        }

        // 3. Top Header Bar (Channel Logo + Location + LIVE)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                    )
                )
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Channel Logo / Name
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (customLogoUri.isNotBlank()) {
                    AsyncImage(
                        model = customLogoUri,
                        contentDescription = "Logo",
                        modifier = Modifier
                            .height(28.dp)
                            .wrapContentWidth()
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Red600)
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = channelLogoTag.ifBlank { "AI NEWS" },
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                if (cityName.isNotBlank()) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Amber400)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = cityName,
                            color = Slate900,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Top Right Live / Exclusive tag
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isExclusiveWatermark) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Amber400)
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "EXCLUSIVE",
                            color = Slate900,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Red600)
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "LIVE",
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }

        // 4. Bottom News Plate
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
        ) {
            // Main News Plate (Maroon / Red gradient)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Red800.copy(alpha = 0.95f),
                                Color(0xFF450A0A).copy(alpha = 0.98f)
                            )
                        )
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                val align = when (alignment) {
                    HeadlineAlignment.LEFT -> TextAlign.Left
                    HeadlineAlignment.CENTER -> TextAlign.Center
                    HeadlineAlignment.RIGHT -> TextAlign.Right
                }

                // Line 1 Headline
                val primaryLine = if (line1.isNotBlank()) line1 else firstTitle
                if (primaryLine.isNotBlank()) {
                    Text(
                        text = buildHighlightedHeadline(
                            primaryLine,
                            highlightedWords,
                            Amber400,
                            Color.White
                        ),
                        fontSize = (15 * textSizeScale).sp,
                        fontWeight = if (isBold) FontWeight.Black else FontWeight.Bold,
                        textAlign = align,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Line 2
                val secondaryLine = if (line2.isNotBlank()) line2 else secondTitle
                if (lineMode != HeadlineLineMode.ONE_LINE && secondaryLine.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = secondaryLine,
                        fontSize = (13 * textSizeScale).sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        textAlign = align,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Line 3
                if (lineMode == HeadlineLineMode.THREE_LINES && line3.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = line3,
                        fontSize = (11 * textSizeScale).sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFFDE68A),
                        textAlign = align,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Bottom Ticker Strip (Pure Yellow / Gold)
            if (tickerText.isNotBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Amber400)
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(2.dp))
                            .background(Red600)
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = "ताज़ा",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    Text(
                        text = tickerText,
                        color = Slate900,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // 5. Safe Zone Overlay Guidelines (for Reels/Shorts)
        if (showSafeZoneOverlay) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val stroke = 2.dp.toPx()
                val dash = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                // Top margin safe line (15%)
                val topY = size.height * 0.15f
                drawLine(
                    color = Color.Yellow,
                    start = Offset(0f, topY),
                    end = Offset(size.width, topY),
                    strokeWidth = stroke,
                    pathEffect = dash
                )
                // Bottom margin safe line (20%)
                val bottomY = size.height * 0.80f
                drawLine(
                    color = Color.Yellow,
                    start = Offset(0f, bottomY),
                    end = Offset(size.width, bottomY),
                    strokeWidth = stroke,
                    pathEffect = dash
                )
            }
        }
    }
}
