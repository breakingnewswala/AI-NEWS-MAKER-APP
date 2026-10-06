package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.NewsRepository
import com.example.model.ProjectStatus
import com.example.model.UserProject
import com.example.ui.theme.*

@Composable
fun NewsroomWorkspaceScreen(
    onOpenStudioWithGraphic: () -> Unit,
    onOpenStudioWithVideo: () -> Unit,
    onOpenControlPanel: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val liveTicker by NewsRepository.liveTickerText.collectAsState()
    val userProjects by NewsRepository.userProjects.collectAsState()
    val rssChannels by NewsRepository.rssChannels.collectAsState()

    var tickerInput by remember(liveTicker) { mutableStateOf(liveTicker) }
    var isEditingTicker by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Slate950),
        contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Newsroom Top Header Banner
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFDC2626)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MenuBook,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            Column {
                                Text(
                                    text = "न्यूज़ रूम (NEWSROOM)",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                                Text(
                                    text = "लाइव एडिटोरियल डेस्क व प्रोजेक्ट्स",
                                    fontSize = 11.sp,
                                    color = Slate400
                                )
                            }
                        }

                        Surface(
                            color = Color(0xFF1E293B),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Amber500.copy(alpha = 0.5f))
                        ) {
                            Text(
                                text = "डेस्क एक्टिव",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber400,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Quick Action Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onOpenStudioWithGraphic,
                            colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .testTag("newsroom_open_studio_btn")
                        ) {
                            Icon(Icons.Default.Palette, contentDescription = null, tint = Slate950, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("ग्राफिक स्टूडियो", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Slate950)
                        }

                        Button(
                            onClick = onOpenStudioWithVideo,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .testTag("newsroom_open_video_btn")
                        ) {
                            Icon(Icons.Default.Videocam, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("वीडियो न्यूज़", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color.White)
                        }
                    }
                }
            }
        }

        // 2. Breaking News Live Ticker Desk
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFB45309))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Campaign, contentDescription = null, tint = Amber400, modifier = Modifier.size(20.dp))
                            Text(
                                text = "लाइव ब्रेकिंग टिकर डेस्क",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber400
                            )
                        }

                        TextButton(
                            onClick = { isEditingTicker = !isEditingTicker },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = if (isEditingTicker) Icons.Default.Close else Icons.Default.Edit,
                                contentDescription = null,
                                tint = Amber400,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isEditingTicker) "बंद करें" else "संपादित करें",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber400
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (isEditingTicker) {
                        OutlinedTextField(
                            value = tickerInput,
                            onValueChange = { tickerInput = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("ब्रेकिंग न्यूज़ टिकर टेक्स्ट लिखें...", fontSize = 12.sp, color = Slate500) },
                            maxLines = 3,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Amber400,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Slate200
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            Button(
                                onClick = {
                                    NewsRepository.setLiveTickerText(tickerInput)
                                    isEditingTicker = false
                                    Toast.makeText(context, "लाइव टिकर टेक्स्ट अपडेट हुआ!", Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("टिकर पब्लिश करें", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate950)
                            }
                        }
                    } else {
                        Surface(
                            color = Slate950,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = liveTicker.ifBlank { "ताज़ा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर..." },
                                fontSize = 12.sp,
                                color = Slate200,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }
            }
        }

        // 3. User Projects & Drafts Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "न्यूज़ प्रोजेक्ट्स एवं ड्राफ्ट्स (${userProjects.size})",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Text(
                    text = "ऑटो-सेव चालू",
                    fontSize = 11.sp,
                    color = Slate400
                )
            }
        }

        items(userProjects) { project ->
            ProjectCardItem(
                project = project,
                onOpenStudio = onOpenStudioWithGraphic
            )
        }

        // 4. RSS Feed Channels Status Section
        item {
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "एक्टिव RSS चैनल्स डेस्क (${rssChannels.size})",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                TextButton(
                    onClick = onOpenControlPanel,
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text("कंट्रोल पैनल", fontSize = 11.sp, color = Amber400, fontWeight = FontWeight.Bold)
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Amber400, modifier = Modifier.size(14.dp))
                }
            }
        }

        items(rssChannels) { channel ->
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF0F766E)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.RssFeed, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        }

                        Column {
                            Text(
                                text = channel.channelName,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "${channel.category.displayName} • सिंक: ${channel.lastSyncTime}",
                                fontSize = 10.5.sp,
                                color = Slate400
                            )
                        }
                    }

                    Surface(
                        color = Color(0xFF064E3B),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "${channel.postsTodayCount} खबरें",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF6EE7B7),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProjectCardItem(
    project: UserProject,
    onOpenStudio: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenStudio() },
        shape = RoundedCornerShape(12.dp),
        color = Slate900,
        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(project.status.colorHex).copy(alpha = 0.2f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(project.status.colorHex))
                ) {
                    Text(
                        text = project.status.label,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(project.status.colorHex),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Text(
                    text = project.timestamp,
                    fontSize = 10.5.sp,
                    color = Slate500
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = project.title,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            if (project.summary.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = project.summary,
                    fontSize = 11.5.sp,
                    color = Slate400,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "थीम: ${project.assignedJacketTheme}",
                    fontSize = 10.5.sp,
                    color = Amber400
                )

                TextButton(
                    onClick = onOpenStudio,
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, tint = Amber400, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("स्टूडियो में खोलें", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Amber400)
                }
            }
        }
    }
}
