package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.NewsRepository
import com.example.model.NewsCategory
import com.example.model.ProjectStatus
import com.example.model.UserProject
import com.example.ui.theme.Amber400
import com.example.ui.theme.NewsBorder
import com.example.ui.theme.Red600
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900

@Composable
fun AdminConsoleScreen(
    onNavigateBack: () -> Unit,
    onOpenNewsroomWithProject: (UserProject) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(AdminTab.OVERVIEW) }

    val userProjects by NewsRepository.userProjects.collectAsStateWithLifecycle()
    val rssChannels by NewsRepository.rssChannels.collectAsStateWithLifecycle()
    val users by NewsRepository.users.collectAsStateWithLifecycle()
    val adminCommands by NewsRepository.adminCommands.collectAsStateWithLifecycle()

    var masterChannel by remember { mutableStateOf("AI NEWS MAKER") }
    var masterLogo by remember { mutableStateOf("AI NEWS 24") }
    var masterReporter by remember { mutableStateOf("एडमिन डेस्क") }
    var masterLocation by remember { mutableStateOf("नई दिल्ली") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Slate900)
    ) {
        // Top App Bar
        Surface(color = Slate800, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "पीछे जाएं",
                        tint = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "🛠️ मास्टर एडमिनिस्ट्रेशन कंसोल",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        // Admin Tab Row
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .background(Slate900)
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(AdminTab.entries) { tab ->
                val isSelected = selectedTab == tab
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSelected) Amber400 else Slate800)
                        .clickable { selectedTab = tab }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = null,
                            tint = if (isSelected) Slate900 else Color.LightGray,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = tab.title,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Slate900 else Color.LightGray
                        )
                    }
                }
            }
        }

        Divider(color = NewsBorder)

        // Tab Contents
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(bottom = 60.dp)
        ) {
            when (selectedTab) {
                AdminTab.OVERVIEW -> {
                    // Stats Row
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            AdminStatBox("कुल रिपोर्टर्स", "${users.size}", Amber400, Modifier.weight(1f))
                            AdminStatBox("रिव्यू में प्रोजेक्ट्स", "${userProjects.count { it.status == ProjectStatus.IN_REVIEW }}", Red600, Modifier.weight(1f))
                            AdminStatBox("सक्रिय RSS", "${rssChannels.count { it.isActive }}", Color(0xFF22C55E), Modifier.weight(1f))
                        }
                    }

                    // Recent Commands
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("जारी किए गए आदेश व निर्देश", color = Amber400, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(10.dp))
                                adminCommands.forEach { cmd ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(cmd.targetUserName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                            Text(cmd.commandText, color = Color.LightGray, fontSize = 11.sp)
                                        }
                                        Text(if (cmd.isCompleted) "✓ पूर्ण" else "प्रतीक्षारत", color = if (cmd.isCompleted) Color(0xFF22C55E) else Amber400, fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }

                AdminTab.PROJECTS -> {
                    items(userProjects, key = { it.id }) { proj ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            border = BorderStroke(1.dp, NewsBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${proj.userName} (${proj.userRoleLabel})",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = proj.status.label,
                                        color = Color(proj.status.colorHex),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(proj.title, color = Amber400, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(proj.summary, color = Color.LightGray, fontSize = 12.sp, maxLines = 2)

                                Spacer(modifier = Modifier.height(10.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Button(
                                        onClick = { onOpenNewsroomWithProject(proj) },
                                        colors = ButtonDefaults.buttonColors(containerColor = Red600),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("स्टूडियो में खोलें", color = Color.White, fontSize = 11.sp)
                                    }

                                    OutlinedButton(
                                        onClick = {
                                            NewsRepository.updateProjectStatus(proj.id, ProjectStatus.APPROVED, "स्वीकृत")
                                            Toast.makeText(context, "प्रोजेक्ट स्वीकृत!", Toast.LENGTH_SHORT).show()
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("स्वीकृत करें", color = Color(0xFF22C55E), fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }

                AdminTab.FEEDS -> {
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("नया RSS चैनल जोड़ें", color = Amber400, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                var feedName by remember { mutableStateOf("") }
                                var feedUrl by remember { mutableStateOf("") }

                                OutlinedTextField(
                                    value = feedName,
                                    onValueChange = { feedName = it },
                                    label = { Text("चैनल का नाम") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                OutlinedTextField(
                                    value = feedUrl,
                                    onValueChange = { feedUrl = it },
                                    label = { Text("RSS URL (xml)") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = {
                                        if (feedName.isNotBlank() && feedUrl.isNotBlank()) {
                                            NewsRepository.addRssChannel(feedName, feedUrl, NewsCategory.BREAKING)
                                            feedName = ""
                                            feedUrl = ""
                                            Toast.makeText(context, "RSS चैनल जोड़ा गया", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Red600),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("चैनल सेव करें", color = Color.White)
                                }
                            }
                        }
                    }
                }

                AdminTab.BRANDING -> {
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("मास्टर जैकेट व ग्लोबल हेडर सेटिंग्स", color = Amber400, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(10.dp))

                                OutlinedTextField(
                                    value = masterChannel,
                                    onValueChange = { masterChannel = it },
                                    label = { Text("मास्टर चैनल नाम") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = masterLogo,
                                    onValueChange = { masterLogo = it },
                                    label = { Text("मास्टर लोगो टेक्स्ट") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = masterReporter,
                                    onValueChange = { masterReporter = it },
                                    label = { Text("डिफ़ॉल्ट रिपोर्टर नाम") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = masterLocation,
                                    onValueChange = { masterLocation = it },
                                    label = { Text("डिफ़ॉल्ट लोकेशन") },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Button(
                                    onClick = {
                                        NewsRepository.updateMasterBranding(masterChannel, masterLogo, masterReporter, masterLocation)
                                        Toast.makeText(context, "मास्टर ब्रांडिंग अपडेट हुई!", Toast.LENGTH_SHORT).show()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Red600),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("ग्लोबल ब्रांडिंग लागू करें", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                AdminTab.WEB_PORTAL -> {
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("🌐 वेब पोर्टल एवं क्लाउड सिंक", color = Amber400, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "वेब पोर्टल एड्रेस: https://ainewsmaker.online\n" +
                                            "वेब एडमिन कंसोल से आप डेस्कटॉप ब्राउज़र पर भी पूरा स्टूडियो और न्यूज़ डेस्क प्रबंधित कर सकते हैं।",
                                    color = Color.LightGray,
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminStatBox(
    title: String,
    value: String,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.5f)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = accentColor)
            Spacer(modifier = Modifier.height(4.dp))
            Text(title, fontSize = 10.sp, color = Color.LightGray, fontWeight = FontWeight.Medium)
        }
    }
}
