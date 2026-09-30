package com.example.ui.screens

import android.widget.Toast
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.AuthManager
import com.example.data.NewsRepository
import com.example.model.NewsCategory
import com.example.model.UserRole
import com.example.model.VideoNewsItem
import com.example.ui.theme.*

@Composable
fun VideosScreen(
    onSendToVideoEditor: (VideoNewsItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val currentRole by NewsRepository.userRole.collectAsState()
    val adminViewAsMode by AuthManager.adminViewAsMode.collectAsState()
    val isEffectiveAdmin = currentRole == UserRole.ADMIN && adminViewAsMode == "admin"

    var showUploadPanel by remember { mutableStateOf(false) }
    var uploadTitle by remember { mutableStateOf("") }
    var uploadChannel by remember { mutableStateOf("AI NEWS 24") }
    var uploadDuration by remember { mutableStateOf("01:30") }
    var uploadUrl by remember { mutableStateOf("") }
    var selectedRatio by remember { mutableStateOf("4:5") }
    var selectedCategory by remember { mutableStateOf(NewsCategory.POLITICS) }

    val videoList = remember {
        mutableStateListOf(
            VideoNewsItem(
                id = "vid-0",
                title = "स्पेशल रिपोर्ट: डिजिटल मीडिया व AI न्यूज़ पॉलिसी (4:5 सोशल फ़ीड स्पेशल)",
                duration = "01:15",
                channel = "AI NEWS 24",
                views = "32K देखा गया",
                videoUrl = "https://example.com/videos/special-4-5",
                category = NewsCategory.BREAKING,
                ratio = "4:5"
            ),
            VideoNewsItem(
                id = "vid-1",
                title = "संसद लाइव: नए डिजिटल मीडिया व AI न्यूज़ पॉलिसी पर विशेष चर्चा",
                duration = "02:15",
                channel = "संसद टीवी (Sansad TV)",
                views = "24K देखा गया",
                videoUrl = "https://example.com/videos/sansad-live",
                category = NewsCategory.POLITICS,
                ratio = "16:9"
            ),
            VideoNewsItem(
                id = "vid-2",
                title = "इसरो का नया मिशन: अंतरिक्ष में भारत की ऐतिहासिक छलांग का वीडियो",
                duration = "01:30",
                channel = "साइंस डेस्क (ISRO Tech)",
                views = "89K देखा गया",
                videoUrl = "https://example.com/videos/isro-mission",
                category = NewsCategory.TECH,
                ratio = "9:16"
            ),
            VideoNewsItem(
                id = "vid-3",
                title = "मैच हाइलाइट्स: अंतिम ओवर में थ्रिलर जीत, दर्शकों का उत्साह चरम पर",
                duration = "03:10",
                channel = "स्पोर्ट्स 24",
                views = "150K देखा गया",
                videoUrl = "https://example.com/videos/cricket-highlights",
                category = NewsCategory.SPORTS,
                ratio = "1:1"
            ),
            VideoNewsItem(
                id = "vid-4",
                title = "बाजार बुलेटिन: सेंसेक्स और निफ्टी की ऐतिहासिक तेजी का पूरा विश्लेषण",
                duration = "01:45",
                channel = "मार्केट प्राइम",
                views = "18K देखा गया",
                videoUrl = "https://example.com/videos/market-analysis",
                category = NewsCategory.BUSINESS,
                ratio = "16:9"
            )
        )
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Slate950),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
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
                        imageVector = Icons.Default.PlayCircle,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = "न्यूज़ वीडियोज़ एवं रील्स",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (isEffectiveAdmin) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (showUploadPanel) Amber400 else Slate800,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { showUploadPanel = !showUploadPanel }
                                .testTag("admin_upload_video_toggle")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = if (showUploadPanel) Icons.Default.Close else Icons.Default.CloudUpload,
                                    contentDescription = null,
                                    tint = if (showUploadPanel) Slate950 else Amber400,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = if (showUploadPanel) "बंद करें" else "+ वीडियो अपलोड",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (showUploadPanel) Slate950 else Amber400
                                )
                            }
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Slate800,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate700)
                    ) {
                        Text(
                            text = "HD 4:5 • 9:16 • 16:9",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Amber400,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // Admin Video Upload Panel with 4:5 Ratio Support
        if (isEffectiveAdmin && showUploadPanel) {
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Amber400.copy(alpha = 0.8f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.VideoCall, contentDescription = null, tint = Amber400, modifier = Modifier.size(18.dp))
                            Text(
                                text = "एडमिन: वीडियो अपलोड सिस्टम",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        OutlinedTextField(
                            value = uploadTitle,
                            onValueChange = { uploadTitle = it },
                            placeholder = { Text("वीडियो हेडलाइन / शीर्षक", color = Slate400, fontSize = 12.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Amber400,
                                unfocusedBorderColor = Slate700
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth().testTag("input_video_title")
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = uploadChannel,
                                onValueChange = { uploadChannel = it },
                                placeholder = { Text("चैनल नाम", color = Slate400, fontSize = 12.sp) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Amber400,
                                    unfocusedBorderColor = Slate700
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f).testTag("input_video_channel")
                            )

                            OutlinedTextField(
                                value = uploadDuration,
                                onValueChange = { uploadDuration = it },
                                placeholder = { Text("अवधि (उदा. 01:30)", color = Slate400, fontSize = 12.sp) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Amber400,
                                    unfocusedBorderColor = Slate700
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f).testTag("input_video_duration")
                            )
                        }

                        // Aspect Ratio Selection: 9:16, 16:9, 1:1, 4:5
                        Column {
                            Text(
                                text = "पहलू अनुपात चुनें (Aspect Ratio):",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Amber400
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                val ratios = listOf("9:16", "16:9", "1:1", "4:5")
                                ratios.forEach { r ->
                                    val isSelected = selectedRatio == r
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = if (isSelected) Amber400 else Slate800,
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) Amber400 else Slate700
                                        ),
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(6.dp))
                                            .clickable { selectedRatio = r }
                                            .testTag("ratio_button_$r")
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(vertical = 6.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text(
                                                text = r,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isSelected) Slate950 else Color.White
                                            )
                                            if (r == "4:5") {
                                                Text(
                                                    text = "फ़ीड स्पेशल",
                                                    fontSize = 8.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isSelected) Slate950 else Amber400
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Button(
                            onClick = {
                                val title = if (uploadTitle.isNotBlank()) uploadTitle else "ताज़ा वीडियो बुलेटिन ($selectedRatio)"
                                val newVid = VideoNewsItem(
                                    id = "vid-${System.currentTimeMillis()}",
                                    title = title,
                                    duration = if (uploadDuration.isNotBlank()) uploadDuration else "01:20",
                                    channel = if (uploadChannel.isNotBlank()) uploadChannel else "AI NEWS 24",
                                    views = "अभी-अभी अपलोड",
                                    videoUrl = if (uploadUrl.isNotBlank()) uploadUrl else "https://example.com/videos/custom",
                                    category = selectedCategory,
                                    ratio = selectedRatio
                                )
                                videoList.add(0, newVid)
                                uploadTitle = ""
                                showUploadPanel = false
                                Toast.makeText(context, "वीडियो ($selectedRatio) फ़ीड में सफलतापूर्वक जोड़ा गया!", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Amber400),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth().height(40.dp).testTag("upload_video_submit_button")
                        ) {
                            Text(
                                text = "वीडियो अपलोड करें ($selectedRatio)",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Slate950
                            )
                        }
                    }
                }
            }
        }

        items(videoList, key = { it.id }) { video ->
            VideoCard(
                video = video,
                onPlay = {
                    Toast.makeText(context, "वीडियो चल रहा है (${video.ratio}): ${video.title}", Toast.LENGTH_SHORT).show()
                },
                onMakeVideoNews = {
                    val currentJacket = NewsRepository.activeJacketData.value
                    NewsRepository.updateJacketData(
                        currentJacket.copy(
                            headline = video.title,
                            channelName = video.channel,
                            tagText = "VIDEO NEWS",
                            sourceLink = video.videoUrl
                        )
                    )
                    onSendToVideoEditor(video)
                }
            )
        }
    }
}

@Composable
private fun VideoCard(
    video: VideoNewsItem,
    onPlay: () -> Unit,
    onMakeVideoNews: () -> Unit
) {
    val previewHeight = when (video.ratio) {
        "9:16" -> 260.dp
        "4:5" -> 220.dp
        "1:1" -> 200.dp
        else -> 180.dp
    }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Slate900,
        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Video Thumbnail with responsive Aspect Ratio
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(previewHeight)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color(0xFF0F172A), Color(0xFF1E293B))
                        )
                    )
                    .clickable { onPlay() }
            ) {
                // Play Icon
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(NewsRedPrimary.copy(alpha = 0.9f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Play Video",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }

                // Ratio Badge
                Surface(
                    color = Color.Black.copy(alpha = 0.8f),
                    shape = RoundedCornerShape(4.dp),
                    border = androidx.compose.foundation.BorderStroke(0.6.dp, Amber400),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                ) {
                    Text(
                        text = video.ratio,
                        color = Amber400,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                // Duration badge
                Surface(
                    color = Color.Black.copy(alpha = 0.8f),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp)
                ) {
                    Text(
                        text = video.duration,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                // Category Tag
                Surface(
                    color = NewsRedPrimary,
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                ) {
                    Text(
                        text = video.category.displayName,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            // Info and Make Video News Button
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = video.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    lineHeight = 20.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = video.channel,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Slate400
                        )
                        Text(text = "•", color = Slate400)
                        Text(
                            text = video.views,
                            fontSize = 11.sp,
                            color = Slate400
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = onMakeVideoNews,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(42.dp)
                        .testTag("make_video_news_${video.id}"),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.VideoCall,
                            contentDescription = null,
                            tint = Color(0xFFFDE047),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "वीडियो न्यूज़ बनाएं (स्टूडियो में एडिट करें)",
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
