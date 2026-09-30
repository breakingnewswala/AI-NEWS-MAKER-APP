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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.model.AspectRatioType
import com.example.model.HeadlineAlignment
import com.example.model.HeadlineLineMode
import com.example.model.HindiFontOption
import com.example.model.TemplateStyle
import com.example.ui.theme.NewsBlack
import com.example.ui.theme.NewsDarkRed
import com.example.ui.theme.NewsRed
import com.example.ui.theme.NewsWhite
import com.example.ui.theme.NewsYellow

/**
 * Builds annotated text where words matching [highlightedWords] are rendered in bright yellow,
 * and all other words are rendered in pure white.
 */
fun buildHighlightedHeadline(
    text: String,
    highlightedWords: Set<String>,
    defaultColor: Color = Color.White,
    highlightColor: Color = Color(0xFFFFED00)
): AnnotatedString {
    return buildAnnotatedString {
        val tokens = text.split(" ")
        tokens.forEachIndexed { index, token ->
            val clean = token.trim()
                .removeSurrounding("\"", "\"")
                .removeSurrounding("'", "'")
                .removeSuffix(";")
                .removeSuffix(",")
                .removeSuffix(".")
            val isHighlighted = highlightedWords.any { hw ->
                hw.isNotBlank() && (clean.equals(hw, ignoreCase = true) || clean.contains(hw, ignoreCase = true))
            }
            withStyle(
                style = SpanStyle(
                    color = if (isHighlighted) highlightColor else defaultColor,
                    fontWeight = FontWeight.Black
                )
            ) {
                append(token)
            }
            if (index < tokens.size - 1) {
                append(" ")
            }
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
    textSizeScale: Float = 1.0f,
    isBold: Boolean = true,
    isExclusiveWatermark: Boolean = false,
    line1: String = "रात 1 बजे कार में मिले मिठाई",
    line2: String = "के डिब्बे, अंदर निकले ₹500",
    line3: String = "₹500 के नोट; वीडियो वायरल",
    lineMode: HeadlineLineMode = HeadlineLineMode.THREE_LINE,
    fontOption: HindiFontOption = HindiFontOption.HIND_BOLD,
    alignment: HeadlineAlignment = HeadlineAlignment.CENTER,
    highlightedWords: Set<String> = emptySet(),
    customJacketUri: String? = null,
    customLogoUri: String? = null,
    videoOffsetY: Float = 0f,
    videoOffsetX: Float = 0f,
    videoZoomScale: Float = 1.0f,
    showSafeZoneOverlay: Boolean = false,
    onMediaAreaClick: () -> Unit,
    onTogglePlay: () -> Unit,
    modifier: Modifier = Modifier
) {
    val ratio = when (aspectRatioType) {
        AspectRatioType.SHORTS_9_16 -> 9f / 16f
        AspectRatioType.FEED_4_5 -> 4f / 5f
        AspectRatioType.YOUTUBE_16_9 -> 16f / 9f
        AspectRatioType.SQUARE_1_1 -> 1f
    }

    val infiniteTransition = rememberInfiniteTransition(label = "broadcast_ticker_and_loops")
    val tickerOffset by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = -1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 14000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ticker_offset"
    )

    // Animated continuous 10-15s broadcast logo pulse / shimmer loop
    val logoShineSweep by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "logo_shine_loop"
    )

    val liveDotAlpha by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 0.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "live_dot"
    )

    Box(
        modifier = modifier
            .aspectRatio(ratio)
            .shadow(12.dp, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .background(NewsBlack)
            .border(2.dp, NewsYellow.copy(alpha = 0.7f), RoundedCornerShape(12.dp))
            .testTag("news_canvas_overlay"),
        contentAlignment = Alignment.Center
    ) {
        // Media Layer (User-picked Video or Image)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable { onMediaAreaClick() },
            contentAlignment = Alignment.Center
        ) {
            if (mediaUri != null) {
                AsyncImage(
                    model = mediaUri,
                    contentDescription = "Selected broadcast media",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = videoZoomScale
                            scaleY = videoZoomScale
                            translationX = videoOffsetX
                            translationY = videoOffsetY
                        }
                )

                // Playback status indicator
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 110.dp, end = 12.dp)
                        .background(Color.Black.copy(alpha = 0.65f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "00:${String.format("%02d", currentPlaybackSeconds)}",
                        color = NewsWhite,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Play / Pause center touch overlay
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        .clickable { onTogglePlay() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isMediaPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isMediaPlaying) "Pause" else "Play",
                        tint = NewsYellow,
                        modifier = Modifier.size(28.dp)
                    )
                }
            } else {
                // Media Placeholder ("Upload Media" box)
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xFF222222), Color(0xFF141414))
                            )
                        )
                        .padding(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .background(NewsRed.copy(alpha = 0.15f), CircleShape)
                            .border(1.5.dp, NewsYellow, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Videocam,
                            contentDescription = "Add Media",
                            tint = NewsYellow,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Upload Video / Photo",
                        color = NewsWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "Tap here to select news footage",
                        color = NewsWhite.copy(alpha = 0.7f),
                        fontSize = 11.sp
                    )
                }
            }

            // Custom Admin-Uploaded Jacket Graphic Overlay (if uploaded by Admin)
            if (customJacketUri != null) {
                AsyncImage(
                    model = customJacketUri,
                    contentDescription = "Admin Custom Frame Jacket",
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Lower-Middle Exclusive Watermark (positioned below the middle with low opacity)
            if (isExclusiveWatermark) {
                Box(
                    modifier = Modifier
                        .align(androidx.compose.ui.BiasAlignment(0f, 0.40f)) // Lower middle (~70% down)
                        .fillMaxWidth(0.90f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.48f))
                        .border(
                            width = 1.dp,
                            color = Color(0x66FFED00),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        // Channel Logo in Watermark
                        if (customLogoUri != null) {
                            AsyncImage(
                                model = customLogoUri,
                                contentDescription = "Watermark Logo",
                                modifier = Modifier
                                    .size(26.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                contentScale = ContentScale.Fit
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .background(NewsYellow, RoundedCornerShape(4.dp))
                                    .border(1.dp, NewsRed, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = channelLogoTag.ifBlank { "BREAKING" },
                                    color = NewsBlack,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }

                        // Partition Line
                        Text(
                            text = "  |  ",
                            color = NewsWhite.copy(alpha = 0.75f),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Light
                        )

                        // English bold EXCLUSIVE in lower opacity
                        Text(
                            text = "EXCLUSIVE",
                            color = NewsYellow.copy(alpha = 0.85f),
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.5.sp
                        )
                    }
                }
            }
        }

        // --- OVERLAY GRAPHICS ACCORDING TO TEMPLATE STYLE ---
        if (templateStyle == TemplateStyle.REGULAR_NEWS_FRAME) {
            // === FLAGSHIP REGULAR NEWS FRAME (as in user's REEL FRAME.png) ===
            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
            ) {
                // 1. Top Yellow Strip (Watch Now + Social Icons + Website)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(24.dp)
                        .background(Color(0xFFFFED00))
                        .padding(horizontal = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Watch Now capsule
                    Row(
                        modifier = Modifier
                            .background(Color.Black, RoundedCornerShape(12.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "WATCH NOW ▶",
                            color = Color(0xFFFFED00),
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Social media circle badges
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SocialDot(bg = Color(0xFF1877F2), letter = "f")
                        SocialDot(bg = Color(0xFFE4405F), letter = "ig")
                        SocialDot(bg = Color(0xFFFF0000), letter = "yt")
                        SocialDot(bg = Color(0xFF000000), letter = "𝕏")
                        SocialDot(bg = Color(0xFF0A66C2), letter = "in")
                        SocialDot(bg = Color(0xFFFF5722), letter = "p")
                    }

                    // Website URL
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Language,
                            contentDescription = "Web",
                            tint = Color.Black,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "BREAKINGNEWSWALA.COM",
                            color = Color.Black,
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    }
                }

                // 2. Maroon 3-Line Headline Banner
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF580B07))
                        .padding(horizontal = 8.dp, vertical = 5.dp),
                    contentAlignment = Alignment.Center
                ) {
                    val baseFontSize = (14.5f * textSizeScale).sp
                    val weight = if (isBold) FontWeight.ExtraBold else FontWeight.Bold
                    val textAlign = alignment.textAlign
                    val tightLineHeight = (baseFontSize.value * 1.15f).sp
                    val tightLetterSpacing = (-0.4).sp

                    if (lineMode == HeadlineLineMode.THREE_LINE) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = when (alignment) {
                                HeadlineAlignment.JUSTIFY -> Alignment.CenterHorizontally
                                HeadlineAlignment.CENTER -> Alignment.CenterHorizontally
                            },
                            verticalArrangement = Arrangement.spacedBy(0.dp)
                        ) {
                            if (line1.isNotBlank()) {
                                Text(
                                    text = buildHighlightedHeadline(line1, highlightedWords),
                                    fontSize = baseFontSize,
                                    lineHeight = tightLineHeight,
                                    letterSpacing = tightLetterSpacing,
                                    fontFamily = fontOption.fontFamily,
                                    fontWeight = weight,
                                    textAlign = textAlign,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            if (line2.isNotBlank()) {
                                Text(
                                    text = buildHighlightedHeadline(line2, highlightedWords),
                                    fontSize = baseFontSize,
                                    lineHeight = tightLineHeight,
                                    letterSpacing = tightLetterSpacing,
                                    fontFamily = fontOption.fontFamily,
                                    fontWeight = weight,
                                    textAlign = textAlign,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            if (line3.isNotBlank()) {
                                Text(
                                    text = buildHighlightedHeadline(line3, highlightedWords),
                                    fontSize = baseFontSize,
                                    lineHeight = tightLineHeight,
                                    letterSpacing = tightLetterSpacing,
                                    fontFamily = fontOption.fontFamily,
                                    fontWeight = weight,
                                    textAlign = textAlign,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    } else {
                        Text(
                            text = buildHighlightedHeadline(firstTitle, highlightedWords),
                            fontSize = baseFontSize,
                            lineHeight = tightLineHeight,
                            letterSpacing = tightLetterSpacing,
                            fontFamily = fontOption.fontFamily,
                            fontWeight = weight,
                            textAlign = textAlign,
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 3
                        )
                    }
                }

                // 3. Sub-bar: Location Box (Left) & Animated Logo (Right)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Location Box (White card with Blue outline and Map Pin)
                    Row(
                        modifier = Modifier
                            .background(Color.White, RoundedCornerShape(4.dp))
                            .border(1.5.dp, Color(0xFF1565C0), RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Location",
                            tint = Color(0xFF1565C0),
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = cityName.ifBlank { "भोपाल, मप्र" },
                            color = Color.Black,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Logo on the Right (Animated Loop / Custom Logo URI)
                    if (customLogoUri != null) {
                        AsyncImage(
                            model = customLogoUri,
                            contentDescription = "Channel Logo",
                            modifier = Modifier
                                .height(32.dp)
                                .clip(RoundedCornerShape(6.dp)),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        // Official Breaking News Wala looping badge
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFFED00), RoundedCornerShape(6.dp))
                                .border(1.dp, Color(0xFFD32F2F), RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Animated rotating/pulsing globe
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .background(Color(0xFF1976D2), CircleShape)
                                        .border(1.dp, Color(0xFFFFD54F), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Language,
                                        contentDescription = "Globe",
                                        tint = Color(0xFFFFD54F),
                                        modifier = Modifier.size(13.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(5.dp))
                                Column {
                                    Text(
                                        text = "ब्रेकिंग न्यूज़वाला",
                                        color = Color(0xFFC62828),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                    Text(
                                        text = "भारत के जिलों से, आपके दिलों तक",
                                        color = Color.Black,
                                        fontSize = 6.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // === STANDARD TEMPLATE HEADER (Breaking Bar, Ticker, etc.) ===
            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
            ) {
                // Header Bar: Breaking News Alert + Logo + City
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.Black.copy(alpha = 0.85f),
                                    Color.Transparent
                                )
                            )
                        )
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    if (cityName.isNotBlank()) {
                        Row(
                            modifier = Modifier
                                .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(4.dp))
                                .border(1.dp, NewsYellow, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = "Location",
                                tint = NewsRed,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = cityName,
                                color = NewsWhite,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.width(8.dp))
                    }

                    // Channel Logo
                    if (customLogoUri != null) {
                        AsyncImage(
                            model = customLogoUri,
                            contentDescription = "Channel Logo",
                            modifier = Modifier
                                .height(26.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .background(NewsYellow, RoundedCornerShape(4.dp))
                                .border(1.dp, NewsRed, RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = channelLogoTag.ifBlank { "NEWS 24" },
                                color = NewsBlack,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                }

                // Big Breaking Header Bar (Yellow & Red)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(
                                listOf(NewsDarkRed, NewsRed, NewsDarkRed)
                            )
                        )
                        .border(1.dp, NewsYellow.copy(alpha = 0.5f))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Warning",
                        tint = NewsYellow,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "BIG BREAKING",
                        color = NewsYellow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                }

                // First Title Banner
                if (firstTitle.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.Black.copy(alpha = 0.85f))
                            .border(width = 0.5.dp, color = NewsYellow.copy(alpha = 0.3f))
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = buildHighlightedHeadline(firstTitle, highlightedWords),
                            fontSize = (15f * textSizeScale).sp,
                            fontFamily = fontOption.fontFamily,
                            fontWeight = if (isBold) FontWeight.ExtraBold else FontWeight.Normal,
                            textAlign = alignment.textAlign,
                            maxLines = 3,
                            overflow = TextOverflow.Clip
                        )
                    }
                }

                // Second Title Banner
                if (secondTitle.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(NewsYellow)
                            .padding(horizontal = 10.dp, vertical = 3.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = secondTitle,
                            color = NewsBlack,
                            fontSize = (14f * textSizeScale).sp,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center,
                            maxLines = 3,
                            letterSpacing = 0.5.sp,
                            overflow = TextOverflow.Clip
                        )
                    }
                }
            }

            // Bottom Animated News Ticker for Standard templates
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(34.dp)
                        .background(NewsBlack)
                        .border(width = 1.dp, color = NewsRed),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Pulsing Red LIVE tag
                    Row(
                        modifier = Modifier
                            .background(NewsRed)
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.FiberManualRecord,
                            contentDescription = "Live",
                            tint = NewsWhite.copy(alpha = liveDotAlpha),
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "LIVE",
                            color = NewsWhite,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Scrolling Ticker Text Container
                    BoxWithConstraints(
                        modifier = Modifier
                            .weight(1f)
                            .background(Color(0xFF1E1E1E))
                            .padding(horizontal = 6.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        val containerWidth = maxWidth.value
                        Text(
                            text = tickerText.ifBlank { "BREAKING NEWS: ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर..." },
                            color = NewsYellow,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            modifier = Modifier
                                .fillMaxWidth()
                                .offset(x = (containerWidth * tickerOffset).dp)
                        )
                    }
                }
            }
        }

        // 4. Broadcast Safe-Zone Overlay (Title Safe 80% and Action Safe 90% Guides)
        if (showSafeZoneOverlay) {
            SafeZoneCanvasOverlay(
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

@Composable
private fun SafeZoneCanvasOverlay(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .testTag("safe_zone_canvas_overlay")
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            // Broadcast Standard: Action Safe (90%) - 5% margin from each edge
            val actionMarginX = w * 0.05f
            val actionMarginY = h * 0.05f
            val actionW = w - 2 * actionMarginX
            val actionH = h - 2 * actionMarginY

            // Broadcast Standard: Title / Text Safe (80%) - 10% margin from each edge
            val titleMarginX = w * 0.10f
            val titleMarginY = h * 0.10f
            val titleW = w - 2 * titleMarginX
            val titleH = h - 2 * titleMarginY

            val dashPath = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(12f, 8f), 0f)

            // Outside Dimming (Highlighting margins prone to cropping on TVs and social feeds)
            val dimColor = Color(0x55000000)
            drawRect(dimColor, androidx.compose.ui.geometry.Offset.Zero, androidx.compose.ui.geometry.Size(w, actionMarginY))
            drawRect(dimColor, androidx.compose.ui.geometry.Offset(0f, h - actionMarginY), androidx.compose.ui.geometry.Size(w, actionMarginY))
            drawRect(dimColor, androidx.compose.ui.geometry.Offset(0f, actionMarginY), androidx.compose.ui.geometry.Size(actionMarginX, actionH))
            drawRect(dimColor, androidx.compose.ui.geometry.Offset(w - actionMarginX, actionMarginY), androidx.compose.ui.geometry.Size(actionMarginX, actionH))

            // Action Safe Boundary (Amber / Gold #F59E0B)
            drawRect(
                color = Color(0xFFF59E0B),
                topLeft = androidx.compose.ui.geometry.Offset(actionMarginX, actionMarginY),
                size = androidx.compose.ui.geometry.Size(actionW, actionH),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.5f, pathEffect = dashPath)
            )

            // Title Safe Boundary (Cyan / Sky Blue #00E5FF)
            drawRect(
                color = Color(0xFF00E5FF),
                topLeft = androidx.compose.ui.geometry.Offset(titleMarginX, titleMarginY),
                size = androidx.compose.ui.geometry.Size(titleW, titleH),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.5f, pathEffect = dashPath)
            )

            // Corner Brackets on Action Safe Boundary
            val bracketLen = 20f
            val bracketColor = Color(0xFFF59E0B)
            val strokeW = 4f
            // Top-left
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(actionMarginX, actionMarginY), androidx.compose.ui.geometry.Offset(actionMarginX + bracketLen, actionMarginY), strokeW)
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(actionMarginX, actionMarginY), androidx.compose.ui.geometry.Offset(actionMarginX, actionMarginY + bracketLen), strokeW)
            // Top-right
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(w - actionMarginX, actionMarginY), androidx.compose.ui.geometry.Offset(w - actionMarginX - bracketLen, actionMarginY), strokeW)
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(w - actionMarginX, actionMarginY), androidx.compose.ui.geometry.Offset(w - actionMarginX, actionMarginY + bracketLen), strokeW)
            // Bottom-left
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(actionMarginX, h - actionMarginY), androidx.compose.ui.geometry.Offset(actionMarginX + bracketLen, h - actionMarginY), strokeW)
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(actionMarginX, h - actionMarginY), androidx.compose.ui.geometry.Offset(actionMarginX, h - actionMarginY - bracketLen), strokeW)
            // Bottom-right
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(w - actionMarginX, h - actionMarginY), androidx.compose.ui.geometry.Offset(w - actionMarginX - bracketLen, h - actionMarginY), strokeW)
            drawLine(bracketColor, androidx.compose.ui.geometry.Offset(w - actionMarginX, h - actionMarginY), androidx.compose.ui.geometry.Offset(w - actionMarginX, h - actionMarginY - bracketLen), strokeW)

            // Center Crosshair Guide (+)
            val cx = w / 2f
            val cy = h / 2f
            val crosshairLen = 14f
            drawLine(Color(0xCCFFFFFF), androidx.compose.ui.geometry.Offset(cx - crosshairLen, cy), androidx.compose.ui.geometry.Offset(cx + crosshairLen, cy), 1.5f)
            drawLine(Color(0xCCFFFFFF), androidx.compose.ui.geometry.Offset(cx, cy - crosshairLen), androidx.compose.ui.geometry.Offset(cx, cy + crosshairLen), 1.5f)
            drawCircle(Color(0x8800E5FF), radius = 4f, center = androidx.compose.ui.geometry.Offset(cx, cy), style = androidx.compose.ui.graphics.drawscope.Stroke(1.5f))
        }

        // Live Safe Zone Status Indicator Badge (Top Center)
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xDD0F172A),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00E5FF).copy(alpha = 0.8f)),
            shadowElevation = 4.dp,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 28.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(Color(0xFF00E5FF), CircleShape)
                )
                Text(
                    text = "SAFE-ZONE: 80% TITLE / 90% ACTION SAFE",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    letterSpacing = 0.5.sp
                )
            }
        }

        // Guide Legend Box (Bottom Center just above ticker)
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Color(0xEE0B1329),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.6f)),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 38.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Box(modifier = Modifier.size(8.dp).background(Color(0xFF00E5FF), RoundedCornerShape(2.dp)))
                    Text(text = "हेडलाइंस (80%)", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFBAE6FD))
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Box(modifier = Modifier.size(8.dp).background(Color(0xFFF59E0B), RoundedCornerShape(2.dp)))
                    Text(text = "लोगो व विजुअल (90%)", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFDE68A))
                }
            }
        }
    }
}

@Composable
private fun SocialDot(bg: Color, letter: String) {
    Box(
        modifier = Modifier
            .size(12.dp)
            .background(bg, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = letter,
            color = Color.White,
            fontSize = 7.sp,
            fontWeight = FontWeight.Black
        )
    }
}
