package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.data.NewsRepository
import com.example.model.ManagedCategory
import com.example.model.NewsCategory
import com.example.model.NewsPost
import com.example.model.UserRole
import androidx.compose.ui.graphics.graphicsLayer
import coil.request.ImageRequest
import coil.request.CachePolicy
import com.example.ui.theme.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Strips technical source prefixes (e.g. "RSS | ", "Web | ", "[RSS]", "[Web]", "RSS Feed | ")
 * for normal users/viewers while preserving original data for the Admin panel.
 */
fun cleanViewerHeadline(rawTitle: String, isAdmin: Boolean): String {
    if (isAdmin || rawTitle.isBlank()) return rawTitle
    return rawTitle
        .replace(Regex("^(RSS\\s*\\|\\s*|Web\\s*\\|\\s*|RSS\\s*:\\s*|Web\\s*:\\s*|\\[RSS\\]\\s*|\\[Web\\]\\s*|RSS Feed\\s*\\|\\s*|Web Source\\s*\\|\\s*)", RegexOption.IGNORE_CASE), "")
        .trim()
}

fun cleanViewerChannel(rawChannel: String, isAdmin: Boolean): String {
    if (isAdmin || rawChannel.isBlank()) return rawChannel
    return rawChannel
        .replace(Regex("^(RSS\\s*\\|\\s*|Web\\s*\\|\\s*|RSS\\s*:\\s*|Web\\s*:\\s*|\\[RSS\\]\\s*|\\[Web\\]\\s*|RSS Feed\\s*\\|\\s*|Web Source\\s*\\|\\s*)", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\b(RSS Feed|Web Source|RSS|Web)\\b", RegexOption.IGNORE_CASE), "")
        .trim()
        .ifEmpty { "न्यूज़ डेस्क" }
}

@Composable
fun HomeScreen(
    onMakeNewsClicked: (NewsPost) -> Unit,
    onAdminAddPostClicked: () -> Unit,
    onOpenAdminConsole: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val posts by NewsRepository.posts.collectAsState()
    val userRole by NewsRepository.userRole.collectAsState()
    val categories by NewsRepository.categories.collectAsState()
    val googleClientId by com.example.data.AuthManager.googleClientId.collectAsState()
    val adminViewAsMode by com.example.data.AuthManager.adminViewAsMode.collectAsState()
    val isEffectiveAdmin = (userRole == UserRole.ADMIN && adminViewAsMode == "admin")

    var selectedCategoryId by remember { mutableStateOf("all") }
    var viewingPost by remember { mutableStateOf<NewsPost?>(null) }
    var isSelectionMode by remember { mutableStateOf(false) }
    var selectedPostIds by remember { mutableStateOf(setOf<String>()) }
    var editingPost by remember { mutableStateOf<NewsPost?>(null) }

    // Filter posts according to dynamic category selection
    val filteredPosts = remember(posts, selectedCategoryId, categories) {
        if (selectedCategoryId == "all") {
            posts
        } else if (selectedCategoryId == "breaking") {
            posts.filter { it.breaking }
        } else {
            val catObj = categories.find { it.id == selectedCategoryId }
            val catName = catObj?.displayName ?: ""
            posts.filter { post ->
                post.categoryName.contains(catName, ignoreCase = true) ||
                        catName.contains(post.categoryName, ignoreCase = true) ||
                        post.category.displayName.contains(catName, ignoreCase = true)
            }
        }
    }

    // Identify highlights / exclusive / breaking posts for the Notification Board Carousel
    val highlightPosts = remember(posts) {
        val filtered = posts.filter { it.isExclusive || it.breaking }
        if (filtered.isNotEmpty()) {
            filtered.take(6)
        } else {
            posts.take(5)
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(NewsBgLight),
            contentPadding = PaddingValues(bottom = 90.dp)
        ) {
            // 1. Live Breaking News Ticker with Multi-item Scroller & Blinking Live Dot
            item {
                MultiItemBreakingTicker(
                    posts = posts,
                    isAdmin = isEffectiveAdmin,
                    onItemClick = { viewingPost = it }
                )
            }

            // 2. Highlights Notification Board (Auto-slides Left to Right with Interactive Dots)
            if (highlightPosts.isNotEmpty()) {
                item {
                    HighlightsNotificationBoard(
                        posts = highlightPosts,
                        isAdmin = isEffectiveAdmin,
                        onReadPost = { post -> viewingPost = post },
                        onMakeGraphic = { post ->
                            try {
                                val clipMgr = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                                val clip = android.content.ClipData.newPlainText("News Link", post.sourceUrl.ifBlank { "https://breakingnewswala.com" })
                                clipMgr?.setPrimaryClip(clip)
                            } catch (e: Exception) {
                                // Ignored
                            }
                            NewsRepository.setPendingGraphicNews(post)
                            onMakeNewsClicked(post)
                        }
                    )
                }
            }


            // 3. Dynamic Categories Row (Synchronized with Admin Console)
            item {
                DynamicCategorySelectorRow(
                    categories = categories,
                    selectedCategoryId = selectedCategoryId,
                    onCategorySelect = { selectedCategoryId = it }
                )
            }

            // 3.5. Admin Moderation Toolbar (Only shown when admin in admin view mode)
            if (isEffectiveAdmin) {
                item {
                    AdminModerationBar(
                        isSelectionMode = isSelectionMode,
                        selectedCount = selectedPostIds.size,
                        totalCount = filteredPosts.size,
                        onToggleSelectionMode = {
                            isSelectionMode = !isSelectionMode
                            if (!isSelectionMode) selectedPostIds = emptySet()
                        },
                        onSelectAll = {
                            selectedPostIds = if (selectedPostIds.size == filteredPosts.size) emptySet() else filteredPosts.map { it.id }.toSet()
                        },
                        onDeleteSelected = {
                            selectedPostIds.forEach { id -> NewsRepository.deletePost(id) }
                            selectedPostIds = emptySet()
                            isSelectionMode = false
                        },
                        onHighlightSelected = {
                            selectedPostIds.forEach { id -> NewsRepository.toggleHighlight(id) }
                        }
                    )
                }
            }

            // 4. News Post Cards (Clean list with "खबर पढ़ें" and "खबर से ग्राफिक बनाएं")
            items(
                items = filteredPosts,
                key = { it.id },
                contentType = { "news_post" }
            ) { post ->
                NewsPostCard(
                    post = post,
                    isAdmin = isEffectiveAdmin,
                    isSelectionMode = isSelectionMode,
                    isSelected = selectedPostIds.contains(post.id),
                    onSelectChange = { checked ->
                        selectedPostIds = if (checked) selectedPostIds + post.id else selectedPostIds - post.id
                    },
                    onToggleHighlight = {
                        NewsRepository.toggleHighlight(post.id)
                    },
                    onEdit = { editingPost = post },
                    onDelete = { NewsRepository.deletePost(post.id) },
                    onReadNews = { viewingPost = post },
                    onMakeGraphic = {
                        try {
                            val clipMgr = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                            val clip = android.content.ClipData.newPlainText("News Link", post.sourceUrl.ifBlank { "https://breakingnewswala.com" })
                            clipMgr?.setPrimaryClip(clip)
                        } catch (e: Exception) {
                            // Ignored if clipboard access restricted
                        }
                        NewsRepository.setPendingGraphicNews(post)
                        onMakeNewsClicked(post)
                    }
                )
            }

            if (filteredPosts.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "इस श्रेणी में फिलहाल कोई न्यूज़ लिंक उपलब्ध नहीं है।",
                            color = NewsMuted,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }

        // In-App Article Reader Dialog
        viewingPost?.let { post ->
            InAppNewsReaderDialog(
                post = post,
                isAdmin = isEffectiveAdmin,
                onDismiss = { viewingPost = null },
                onNextPost = {
                    val current = viewingPost ?: post
                    val idx = filteredPosts.indexOfFirst { it.id == current.id }
                    viewingPost = if (idx != -1 && idx < filteredPosts.size - 1) {
                        filteredPosts[idx + 1]
                    } else {
                        filteredPosts.firstOrNull() ?: current
                    }
                },
                onMakeGraphic = {
                    val p = viewingPost ?: post
                    viewingPost = null
                    try {
                        val clipMgr = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                        val clip = android.content.ClipData.newPlainText("News Link", p.sourceUrl.ifBlank { "https://breakingnewswala.com" })
                        clipMgr?.setPrimaryClip(clip)
                    } catch (e: Exception) {
                        // Ignored
                    }
                    NewsRepository.setPendingGraphicNews(p)
                    onMakeNewsClicked(p)
                }
            )
        }

        // Admin Edit News Dialog
        editingPost?.let { post ->
            EditNewsDialog(
                post = post,
                categories = categories,
                onDismiss = { editingPost = null },
                onSave = { newTitle, newSummary, newChannel, newCatName, isBrk, isEx ->
                    NewsRepository.updatePost(
                        postId = post.id,
                        newTitle = newTitle,
                        newSummary = newSummary,
                        newChannel = newChannel,
                        newCategoryName = newCatName,
                        isBreaking = isBrk,
                        isExclusive = isEx
                    )
                    editingPost = null
                }
            )
        }
    }
}

/**
 * Live Breaking Ticker with Animated Multi-Item Scroller and Blinking Live Indicator Dot
 */
@Composable
private fun MultiItemBreakingTicker(
    posts: List<NewsPost>,
    isAdmin: Boolean = false,
    onItemClick: (NewsPost) -> Unit
) {
    val fallbackTicker by NewsRepository.liveTickerText.collectAsState()

    // Build ticker items from breaking posts + custom ticker
    val tickerPosts = remember(posts) {
        posts.filter { it.breaking }.take(8)
    }

    var currentIndex by remember { mutableIntStateOf(0) }

    // Blinking Live Dot Animation
    val infiniteTransition = rememberInfiniteTransition(label = "live_blink")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 650, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot_alpha"
    )

    // Multi-Item Scroller timer: changes news every 4 seconds
    LaunchedEffect(tickerPosts.size) {
        if (tickerPosts.isNotEmpty()) {
            while (isActive) {
                delay(4000)
                currentIndex = (currentIndex + 1) % tickerPosts.size
            }
        }
    }

    val currentPost = tickerPosts.getOrNull(currentIndex)
    val displayText = currentPost?.let { cleanViewerHeadline(it.title, isAdmin) } ?: fallbackTicker

    Surface(
        color = Color(0xFF0F172A),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 7.dp)
                .clickable {
                    currentPost?.let { onItemClick(it) }
                },
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Active Live Badge with Blinking Dot
            Surface(
                color = NewsRedPrimary,
                shape = RoundedCornerShape(4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .graphicsLayer { alpha = dotAlpha }
                            .clip(CircleShape)
                            .background(Color.White)
                    )
                    Text(
                        text = "लेटेस्ट न्यूज़",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Multi-Item Scroller Text with Animated Transition
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(20.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                AnimatedContent(
                    targetState = displayText,
                    transitionSpec = {
                        slideInVertically { height -> height } + fadeIn() togetherWith
                                slideOutVertically { height -> -height } + fadeOut()
                    },
                    label = "ticker_text_anim"
                ) { text ->
                    Text(
                        text = text,
                        color = Color(0xFFFDE047),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Indicator of ticker progress
            if (tickerPosts.size > 1) {
                Text(
                    text = "${currentIndex + 1}/${tickerPosts.size}",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 10.sp,
                    modifier = Modifier.padding(start = 4.dp)
                )
            }
        }
    }
}

/**
 * Top Notification Board for Highlights / Exclusive & Breaking News
 * Features smooth auto-sliding left-to-right carousel with animated pagination dots.
 */
@Composable
private fun HighlightsNotificationBoard(
    posts: List<NewsPost>,
    isAdmin: Boolean = false,
    onReadPost: (NewsPost) -> Unit,
    onMakeGraphic: (NewsPost) -> Unit
) {
    if (posts.isEmpty()) return

    val pagerState = rememberPagerState(pageCount = { posts.size })
    val coroutineScope = rememberCoroutineScope()

    // Auto-advance left to right every 5 seconds
    LaunchedEffect(pagerState, posts.size) {
        if (posts.size > 1) {
            while (isActive) {
                delay(5000)
                val nextPage = (pagerState.currentPage + 1) % posts.size
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        shape = RoundedCornerShape(14.dp),
        color = Slate900,
        border = androidx.compose.foundation.BorderStroke(1.5.dp, Amber500),
        shadowElevation = 4.dp
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Top Header: Notification Board Title + Tag + Counter
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Campaign,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "विशेष नोटिफिकेशन बोर्ड (HIGHLIGHTS)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Amber400,
                        letterSpacing = 0.5.sp
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val currentItem = posts.getOrNull(pagerState.currentPage)
                    val badgeLabel = when {
                        currentItem?.isExclusive == true -> "एक्सक्लूसिव"
                        currentItem?.breaking == true -> "सुपर ब्रेकिंग"
                        else -> "खास खबर"
                    }
                    Surface(
                        color = Color(0xFFDC2626),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = badgeLabel,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    if (posts.size > 1) {
                        Text(
                            text = "${pagerState.currentPage + 1}/${posts.size}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Amber400
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Carousel Pager: Left-to-Right Scrolling
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxWidth()
            ) { page ->
                val post = posts[page]
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = cleanViewerHeadline(post.title, isAdmin),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 3,
                        overflow = TextOverflow.Clip,
                        lineHeight = 19.sp
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = post.summary,
                        fontSize = 11.5.sp,
                        color = Slate400,
                        maxLines = 3,
                        overflow = TextOverflow.Clip,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = { onReadPost(post) },
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate700),
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            Icon(Icons.Default.MenuBook, contentDescription = null, tint = Slate200, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("पूरी खबर पढ़ें", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Slate200)
                        }

                        Button(
                            onClick = { onMakeGraphic(post) },
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFFFDE047), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("ग्राफिक बनाएं", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // Pagination Dots Indicator (Left-to-Right Indicator)
            if (posts.size > 1) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    posts.indices.forEach { index ->
                        val isSelected = pagerState.currentPage == index
                        val dotWidth by animateDpAsState(
                            targetValue = if (isSelected) 22.dp else 6.dp,
                            label = "dot_width"
                        )
                        val dotColor = if (isSelected) Color(0xFFDC2626) else Color(0xFFD1D5DB)

                        Box(
                            modifier = Modifier
                                .padding(horizontal = 3.dp)
                                .height(6.dp)
                                .width(dotWidth)
                                .clip(CircleShape)
                                .background(dotColor)
                                .clickable {
                                    coroutineScope.launch {
                                        pagerState.animateScrollToPage(index)
                                    }
                                }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Dynamic Categories Row (populated directly from NewsRepository.categories)
 */
@Composable
private fun DynamicCategorySelectorRow(
    categories: List<ManagedCategory>,
    selectedCategoryId: String,
    onCategorySelect: (String) -> Unit
) {
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(categories, key = { it.id }) { cat ->
            val isSelected = cat.id == selectedCategoryId
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) Amber400 else Slate900,
                border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                shadowElevation = if (isSelected) 2.dp else 0.dp,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .clickable { onCategorySelect(cat.id) }
                    .testTag("category_${cat.id}")
            ) {
                Text(
                    text = cat.displayName,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) Slate950 else Slate400,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                )
            }
        }
    }
}

/**
 * Clean News Post Card with:
 * - Headline and short script
 * - "खबर पढ़ें" (Read News in-app)
 * - "खबर से ग्राफिक बनाएं" (Make Graphic via AI Studio)
 */
@Composable
fun NewsPostCard(
    post: NewsPost,
    isAdmin: Boolean = false,
    isSelectionMode: Boolean = false,
    isSelected: Boolean = false,
    onSelectChange: (Boolean) -> Unit = {},
    onToggleHighlight: () -> Unit = {},
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {},
    onReadNews: () -> Unit,
    onMakeGraphic: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 7.dp)
            .clickable { onReadNews() },
        shape = RoundedCornerShape(14.dp),
        color = Slate900,
        shadowElevation = 2.dp,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) Amber400 else Slate800
        )
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            val displayChannel = cleanViewerChannel(post.sourceChannel, isAdmin)
            val displayTitle = cleanViewerHeadline(post.title, isAdmin)

            // Post Card Header: Channel name, Admin Highlight Tick & RSS/Web badge
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (isSelectionMode) {
                        Checkbox(
                            checked = isSelected,
                            onCheckedChange = onSelectChange,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(CircleShape)
                            .background(NewsRedPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = displayChannel.take(1),
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Column {
                        Text(
                            text = displayChannel,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = post.publishedTime,
                            fontSize = 11.sp,
                            color = Slate400
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Admin Highlight Tickmark (Ticking pushes post to Exclusive notification box)
                    if (isAdmin) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (post.isExclusive) Color(0xFF451A03) else Slate800,
                            border = androidx.compose.foundation.BorderStroke(
                                1.2.dp,
                                if (post.isExclusive) Amber400 else Slate700
                            ),
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .clickable { onToggleHighlight() }
                                .testTag("admin_highlight_tick_${post.id}")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = if (post.isExclusive) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                    contentDescription = "एक्सक्लूसिव हाईलाइट टिक",
                                    tint = if (post.isExclusive) Amber400 else Slate400,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(
                                    text = if (post.isExclusive) "हाईलाइटेड" else "टिक",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (post.isExclusive) Amber400 else Slate400
                                )
                            }
                        }

                        // Admin Edit Button
                        IconButton(
                            onClick = onEdit,
                            modifier = Modifier.size(28.dp).testTag("admin_edit_${post.id}")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "संपादित करें",
                                tint = Amber400,
                                modifier = Modifier.size(15.dp)
                            )
                        }

                        // Admin Delete Button
                        IconButton(
                            onClick = onDelete,
                            modifier = Modifier.size(28.dp).testTag("admin_delete_${post.id}")
                        ) {
                            Icon(
                                imageVector = Icons.Default.DeleteOutline,
                                contentDescription = "हटाएं",
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    } else if (post.isExclusive) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFF451A03),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Amber400)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, tint = Amber400, modifier = Modifier.size(11.dp))
                                Text("एक्सक्लूसिव", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Amber400)
                            }
                        }
                    }

                    // Technical RSS/Web badges removed from Home Feed as instructed
                }
            }

            // Visual Image
            if (!post.imageUrl.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .background(Slate800)
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(post.imageUrl)
                            .crossfade(true)
                            .memoryCachePolicy(CachePolicy.ENABLED)
                            .diskCachePolicy(CachePolicy.ENABLED)
                            .build(),
                        contentDescription = post.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )

                    Surface(
                        color = Slate950.copy(alpha = 0.85f),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(8.dp)
                    ) {
                        Text(
                            text = post.categoryName.ifBlank { post.category.displayName },
                            color = Amber400,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Headline & Short Script (Summary)
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = displayTitle,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    lineHeight = 21.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = post.summary,
                    fontSize = 12.sp,
                    color = Slate400,
                    lineHeight = 17.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Slate800, thickness = 1.dp)
                Spacer(modifier = Modifier.height(10.dp))

                // Action Buttons: "खबर पढ़ें" (Read) and "खबर से ग्राफिक बनाएं" (Make Graphic)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onReadNews,
                        modifier = Modifier
                            .weight(1f)
                            .height(42.dp)
                            .testTag("read_news_${post.id}"),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.2.dp, Slate700)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MenuBook,
                            contentDescription = null,
                            tint = Slate200,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "खबर पढ़ें",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate200
                        )
                    }

                    Button(
                        onClick = onMakeGraphic,
                        modifier = Modifier
                            .weight(1.3f)
                            .height(42.dp)
                            .testTag("make_graphic_${post.id}"),
                        colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                        shape = RoundedCornerShape(8.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = NewsGold,
                            modifier = Modifier.size(17.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "खबर से ग्राफिक बनाएं",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

/**
 * In-App Full News Reader Screen/Dialog
 * Provides:
 * - Back button (वापस)
 * - Home button (होम)
 * - Header button "अगली खबर" (Next News story)
 * - Complete full article content inside the box
 * - "खबर से ग्राफिक बनाएं" (Make Graphic) action
 */
@Composable
fun InAppNewsReaderDialog(
    post: NewsPost,
    isAdmin: Boolean = false,
    onDismiss: () -> Unit,
    onNextPost: () -> Unit,
    onMakeGraphic: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Slate950
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // In-App Reader Header
                Surface(
                    color = Slate900,
                    shadowElevation = 4.dp,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(onClick = onDismiss) {
                                Icon(
                                    imageVector = Icons.Default.ArrowBack,
                                    contentDescription = "वापस",
                                    tint = Color.White
                                )
                            }
                            IconButton(onClick = onDismiss) {
                                Icon(
                                    imageVector = Icons.Default.Home,
                                    contentDescription = "होम",
                                    tint = Amber400
                                )
                            }
                            Text(
                                text = "खबर विवरण",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        // Header Button: "अगली खबर" (As requested by user)
                        Button(
                            onClick = onNextPost,
                            colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            modifier = Modifier.testTag("reader_header_next_button")
                        ) {
                            Text(
                                text = "अगली खबर",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = "अगली खबर",
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                // Article Content: Complete full-length reading inside the box
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Category & Channel Row
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = NewsRedPrimary
                            ) {
                                Text(
                                    text = post.categoryName.ifBlank { post.category.displayName },
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }

                            Text(
                                text = "${cleanViewerChannel(post.sourceChannel, isAdmin)} • ${post.publishedTime}",
                                fontSize = 11.sp,
                                color = Slate400,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Headline
                    item {
                        Text(
                            text = cleanViewerHeadline(post.title, isAdmin),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            lineHeight = 28.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Image
                    if (!post.imageUrl.isNullOrBlank()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(210.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Slate800)
                            ) {
                                AsyncImage(
                                    model = post.imageUrl,
                                    contentDescription = post.title,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))
                        }
                    }

                    // Full Article Content (पूरी विस्तृत खबर)
                    item {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Slate900,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Article,
                                        contentDescription = null,
                                        tint = Amber400,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "सम्पूर्ण विस्तृत रिपोर्ट (Full News):",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Amber400
                                    )
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                val rawText = post.fullContent.ifBlank { post.summary }
                                val paragraphs = rawText.split("\n\n")
                                paragraphs.forEach { para ->
                                    if (para.isNotBlank()) {
                                        Text(
                                            text = para.trim(),
                                            fontSize = 15.sp,
                                            color = Slate200,
                                            lineHeight = 24.sp
                                        )
                                        Spacer(modifier = Modifier.height(10.dp))
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Source Reference
                    item {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Slate900,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "मूल स्रोत एवं प्रकाशन विवरण:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate400
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "चैनल / पब्लिशर: ${cleanViewerChannel(post.sourceChannel, isAdmin)}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color.White
                                )
                                if (isAdmin && post.sourceUrl.isNotBlank()) {
                                    Text(
                                        text = "वेब / RSS लिंक: ${post.sourceUrl}",
                                        fontSize = 11.sp,
                                        color = Color(0xFF60A5FA),
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }

                // Sticky Bottom Bar with "बंद करें", "अगली खबर" and "खबर से ग्राफिक बनाएं"
                Surface(
                    color = Slate950,
                    shadowElevation = 8.dp,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate700)
                        ) {
                            Text("बंद करें", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Slate200)
                        }

                        OutlinedButton(
                            onClick = onNextPost,
                            modifier = Modifier
                                .weight(1.1f)
                                .height(46.dp),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.2.dp, Amber400)
                        ) {
                            Icon(Icons.Default.SkipNext, contentDescription = null, tint = Amber400, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("अगली खबर", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Amber400)
                        }

                        Button(
                            onClick = onMakeGraphic,
                            modifier = Modifier
                                .weight(1.4f)
                                .height(46.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = NewsGold, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("ग्राफिक बनाएं", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

/**
 * Admin Moderation Toolbar for Live Feed
 * Supports Bulk Selection, Bulk Highlight, and Bulk Deletion
 */
@Composable
private fun AdminModerationBar(
    isSelectionMode: Boolean,
    selectedCount: Int,
    totalCount: Int,
    onToggleSelectionMode: () -> Unit,
    onSelectAll: () -> Unit,
    onDeleteSelected: () -> Unit,
    onHighlightSelected: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Slate900,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelectionMode) Amber400 else Slate800),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        Icons.Default.AdminPanelSettings,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "एडमिन लाइव मॉडरेशन बार",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    if (isSelectionMode) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFF451A03)
                        ) {
                            Text(
                                text = "$selectedCount / $totalCount चयनित",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber400,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                TextButton(
                    onClick = onToggleSelectionMode,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                ) {
                    Text(
                        text = if (isSelectionMode) "चयन बंद करें" else "मल्टी-सेलेक्ट मोड",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelectionMode) Color(0xFFEF4444) else Amber400
                    )
                }
            }

            if (isSelectionMode) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onSelectAll,
                        modifier = Modifier.weight(1f).height(34.dp),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp)
                    ) {
                        Text("सब चुनें / हटाएं", fontSize = 11.sp, color = Slate200)
                    }

                    Button(
                        onClick = onHighlightSelected,
                        enabled = selectedCount > 0,
                        modifier = Modifier.weight(1f).height(34.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF451A03)),
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp)
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Amber400, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("हाईलाइट करें", fontSize = 11.sp, color = Amber400, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = onDeleteSelected,
                        enabled = selectedCount > 0,
                        modifier = Modifier.weight(1f).height(34.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp)
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("हटाएं ($selectedCount)", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/**
 * Edit News Post Dialog
 */
@Composable
private fun EditNewsDialog(
    post: NewsPost,
    categories: List<ManagedCategory>,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, Boolean, Boolean) -> Unit
) {
    var title by remember { mutableStateOf(post.title) }
    var summary by remember { mutableStateOf(post.summary) }
    var channel by remember { mutableStateOf(post.sourceChannel) }
    var selectedCatName by remember { mutableStateOf(post.categoryName.ifBlank { post.category.displayName }) }
    var isBreaking by remember { mutableStateOf(post.breaking) }
    var isExclusive by remember { mutableStateOf(post.isExclusive) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("खबर संपादित करें (Edit News Post)", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("शीर्षक (Headline)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                OutlinedTextField(
                    value = summary,
                    onValueChange = { summary = it },
                    label = { Text("संक्षिप्त विवरण (Summary)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4,
                    shape = RoundedCornerShape(8.dp)
                )

                OutlinedTextField(
                    value = channel,
                    onValueChange = { channel = it },
                    label = { Text("स्रोत / चैनल का नाम") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Text("कैटेगरी:", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(categories) { c ->
                        FilterChip(
                            selected = selectedCatName == c.displayName,
                            onClick = { selectedCatName = c.displayName },
                            label = { Text(c.displayName, fontSize = 11.sp) }
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { isBreaking = !isBreaking }
                    ) {
                        Checkbox(checked = isBreaking, onCheckedChange = { isBreaking = it })
                        Text("ब्रेकिंग न्यूज़", fontSize = 12.sp, color = NewsRedPrimary, fontWeight = FontWeight.Bold)
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { isExclusive = !isExclusive }
                    ) {
                        Checkbox(checked = isExclusive, onCheckedChange = { isExclusive = it })
                        Text("एक्सक्लूसिव", fontSize = 12.sp, color = Amber400, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onSave(title, summary, channel, selectedCatName, isBreaking, isExclusive)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("सेव करें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}
