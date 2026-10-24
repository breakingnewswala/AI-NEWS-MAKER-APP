package com.example.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.NewsCategory
import com.example.model.VideoNewsItem
import com.example.ui.theme.Amber400
import com.example.ui.theme.NewsBorder
import com.example.ui.theme.Red600
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900

@Composable
fun VideosScreen(
    onSendToVideoEditor: (VideoNewsItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val sampleVideos = remember {
        listOf(
            VideoNewsItem(
                id = "v-1",
                title = "🔴 संसद विशेष सत्र: नए कानूनों पर पक्ष और विपक्ष की तीखी बहस",
                channel = "AI NEWS MAKER",
                duration = "02:45",
                views = "45K",
                videoUrl = "sample_parliament",
                category = NewsCategory.POLITICS,
                ratio = "9:16"
            ),
            VideoNewsItem(
                id = "v-2",
                title = "🚀 इसरो गगनयान मिशन: अंतरिक्ष यात्रियों के ट्रेनिंग कैंप का एक्सक्लूसिव फुटेज",
                channel = "दैनिक विज्ञान",
                duration = "01:30",
                views = "89K",
                videoUrl = "sample_isro",
                category = NewsCategory.TECH,
                ratio = "16:9"
            ),
            VideoNewsItem(
                id = "v-3",
                title = "📈 शेयर बाजार में रिकॉर्ड तोड़ उछाल: सेंसेक्स 85,500 के पार",
                channel = "मार्केट प्राइम",
                duration = "01:15",
                views = "32K",
                videoUrl = "sample_market",
                category = NewsCategory.BUSINESS,
                ratio = "4:5"
            ),
            VideoNewsItem(
                id = "v-4",
                title = "🏏 भारत बनाम ऑस्ट्रेलिया फाइनल: मैच से पहले की बड़ी रणनीतियां",
                channel = "स्पोर्ट्स 24",
                duration = "03:10",
                views = "120K",
                videoUrl = "sample_cricket",
                category = NewsCategory.SPORTS,
                ratio = "9:16"
            )
        )
    }

    val videoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            val customVideo = VideoNewsItem(
                id = "custom-${System.currentTimeMillis()}",
                title = "गैलरी से चयनित वीडियो क्लिप",
                channel = "माई वीडियो",
                duration = "01:00",
                views = "1",
                videoUrl = uri.toString(),
                category = NewsCategory.BREAKING,
                ratio = "9:16"
            )
            onSendToVideoEditor(customVideo)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Slate900)
    ) {
        // Top Header
        Surface(
            color = Slate800,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.VideoLibrary,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "वीडियो न्यूज़ बुलेटिन",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Button(
                    onClick = { videoPickerLauncher.launch("video/*") },
                    colors = ButtonDefaults.buttonColors(containerColor = Red600),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.UploadFile,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "वीडियो अपलोड",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(sampleVideos, key = { it.id }) { video ->
                VideoCard(
                    video = video,
                    onSendToEditor = { onSendToVideoEditor(video) }
                )
            }
        }
    }
}

@Composable
private fun VideoCard(
    video: VideoNewsItem,
    onSendToEditor: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800),
        border = BorderStroke(1.dp, NewsBorder),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("video_card_${video.id}")
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Video Thumbnail Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF1E293B)),
                contentAlignment = Alignment.Center
            ) {
                // Play Icon Button
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(Red600.copy(alpha = 0.9f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "चलाएं",
                        tint = Color.White,
                        modifier = Modifier.size(34.dp)
                    )
                }

                // Top Tags
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.Black.copy(alpha = 0.7f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = video.ratio,
                            color = Amber400,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.Black.copy(alpha = 0.7f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = video.duration,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = video.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                lineHeight = 19.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${video.channel} • ${video.views} व्यूज",
                    fontSize = 11.sp,
                    color = Color.Gray
                )

                Button(
                    onClick = onSendToEditor,
                    colors = ButtonDefaults.buttonColors(containerColor = Red600),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "🎬 वीडियो स्टूडियो",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}
