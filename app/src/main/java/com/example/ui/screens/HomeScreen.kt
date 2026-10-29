package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.example.data.AuthManager
import com.example.data.NewsRepository
import com.example.model.NewsCategory
import com.example.model.NewsPost
import com.example.model.UserRole
import com.example.ui.theme.Amber400
import com.example.ui.theme.NewsBorder
import com.example.ui.theme.Red600
import com.example.ui.theme.Red800
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900

fun cleanViewerHeadline(rawTitle: String, isAdmin: Boolean): String {
    return rawTitle.replace("🔴 ", "").replace("⚡ ", "").trim()
}

fun cleanViewerChannel(rawChannel: String): String {
    return rawChannel.trim()
}

@Composable
fun HomeScreen(
    onMakeNewsClicked: (NewsPost) -> Unit,
    onAdminAddPostClicked: () -> Unit,
    onOpenAdminConsole: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val posts by NewsRepository.posts.collectAsStateWithLifecycle()
    val tickerText by NewsRepository.liveTickerText.collectAsStateWithLifecycle()
    val currentUser by AuthManager.currentUser.collectAsStateWithLifecycle()
    val isAdmin = currentUser?.role == UserRole.ADMIN

    var selectedCategory by remember { mutableStateOf(NewsCategory.ALL) }
    var searchQuery by remember { mutableStateOf("") }
    var showQuickLinkDialog by remember { mutableStateOf(false) }

    val filteredPosts = remember(posts, selectedCategory, searchQuery) {
        posts.filter { post ->
            val matchCat = selectedCategory == NewsCategory.ALL || post.category == selectedCategory
            val matchQuery = searchQuery.isBlank() ||
                    post.title.contains(searchQuery, ignoreCase = true) ||
                    post.summary.contains(searchQuery, ignoreCase = true) ||
                    post.sourceChannel.contains(searchQuery, ignoreCase = true)
            matchCat && matchQuery
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Slate900)
    ) {
        // 1. Live Breaking News Ticker Strip
        Surface(
            color = Color(0xFF7F1D1D),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Amber400)
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "BREAKING",
                        color = Slate900,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = tickerText,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // 2. Search & Quick Import Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("खबरें या चैनल खोजें...", color = Color.Gray, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Amber400) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "साफ करें", tint = Color.Gray)
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
                shape = RoundedCornerShape(24.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Amber400,
                    unfocusedBorderColor = NewsBorder,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = Slate800,
                    unfocusedContainerColor = Slate800
                )
            )

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(
                onClick = { showQuickLinkDialog = true },
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Red600)
            ) {
                Icon(
                    imageVector = Icons.Default.AddLink,
                    contentDescription = "लिंक से खबर बनाएं",
                    tint = Color.White
                )
            }
        }

        // 3. Category Filter Chips
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(NewsCategory.entries) { category ->
                val isSelected = selectedCategory == category
                FilterChip(
                    selected = isSelected,
                    onClick = { selectedCategory = category },
                    label = {
                        Text(
                            text = category.displayName,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Amber400,
                        selectedLabelColor = Slate900,
                        containerColor = Slate800,
                        labelColor = Color.LightGray
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isSelected,
                        borderColor = if (isSelected) Amber400 else NewsBorder
                    )
                )
            }
        }

        // 4. News Feed List
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 12.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(filteredPosts, key = { it.id }) { post ->
                NewsPostCard(
                    post = post,
                    isAdmin = isAdmin,
                    onMakeNews = { onMakeNewsClicked(post) },
                    onDelete = { NewsRepository.deletePost(post.id) },
                    onShare = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, post.title)
                            putExtra(Intent.EXTRA_TEXT, "${post.title}\n\n${post.summary}\n\nस्रोत: ${post.sourceChannel}\n${post.sourceUrl}")
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "खबर शेयर करें"))
                    }
                )
            }
        }
    }

    // Quick Web/RSS Link Dialog
    if (showQuickLinkDialog) {
        QuickLinkImportDialog(
            onDismiss = { showQuickLinkDialog = false },
            onImport = { url, channel, catName ->
                showQuickLinkDialog = false
                NewsRepository.addWebLinkPost(url, channel, catName)
                Toast.makeText(context, "खबर लोड हो रही है...", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
private fun NewsPostCard(
    post: NewsPost,
    isAdmin: Boolean,
    onMakeNews: () -> Unit,
    onDelete: () -> Unit,
    onShare: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800),
        border = BorderStroke(1.dp, if (post.isExclusive) Amber400 else NewsBorder),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("news_card_${post.id}")
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header Row: Channel & Tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Red600)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = post.sourceChannel,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    if (post.breaking) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(Amber400)
                                .padding(horizontal = 5.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "BREAKING",
                                color = Slate900,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }

                Text(
                    text = post.publishedTime,
                    color = Color.Gray,
                    fontSize = 11.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Headline
            Text(
                text = cleanViewerHeadline(post.title, isAdmin),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                lineHeight = 20.sp
            )

            // Image if present
            if (!post.imageUrl.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                AsyncImage(
                    model = post.imageUrl,
                    contentDescription = post.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(8.dp)),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Summary
            Text(
                text = post.summary,
                fontSize = 12.sp,
                color = Color.LightGray,
                lineHeight = 17.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Action Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = onMakeNews,
                    colors = ButtonDefaults.buttonColors(containerColor = Red600),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                    modifier = Modifier.testTag("btn_make_news_${post.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "🎨 न्यूज़ ग्राफ़िक बनाएं",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onShare) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "शेयर करें",
                            tint = Color.LightGray,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    if (isAdmin) {
                        IconButton(onClick = onDelete) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "हटाएं",
                                tint = Color.Gray,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickLinkImportDialog(
    onDismiss: () -> Unit,
    onImport: (url: String, channel: String, category: String) -> Unit
) {
    var url by remember { mutableStateOf("") }
    var channel by remember { mutableStateOf("आज तक") }
    var category by remember { mutableStateOf("ब्रेकिंग न्यूज़") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("वेब लिंक या RSS से खबर जोड़ें", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("न्यूज़ आर्टिकल लिंक (URL)") },
                    placeholder = { Text("https://...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = channel,
                    onValueChange = { channel = it },
                    label = { Text("चैनल / स्रोत का नाम") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (url.isNotBlank()) {
                        onImport(url, channel, category)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Red600)
            ) {
                Text("इम्पोर्ट करें", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("रद्द करें", color = Color.Gray)
            }
        },
        containerColor = Slate800
    )
}
