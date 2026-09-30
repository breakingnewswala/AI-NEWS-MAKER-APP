package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.NewsRepository
import com.example.model.*
import com.example.ui.theme.*

enum class AdminTab(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    OVERVIEW("डैशबोर्ड", Icons.Default.Dashboard),
    PROJECTS("यूज़र प्रोजेक्ट्स", Icons.Default.Assignment),
    FEEDS("RSS चैनल्स", Icons.Default.RssFeed),
    BRANDING("मास्टर जैकेट", Icons.Default.Brush),
    WEB_PORTAL("वेब पोर्टल", Icons.Default.Language)
}

@Composable
fun AdminConsoleScreen(
    onNavigateBack: () -> Unit,
    onOpenNewsroomWithProject: (UserProject) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    var selectedAdminTab by remember { mutableStateOf(AdminTab.OVERVIEW) }

    val liveTicker by NewsRepository.liveTickerText.collectAsState()
    val users by NewsRepository.users.collectAsState()
    val userProjects by NewsRepository.userProjects.collectAsState()
    val adminCommands by NewsRepository.adminCommands.collectAsState()
    val rssChannels by NewsRepository.rssChannels.collectAsState()

    val masterChannel by NewsRepository.masterChannelName.collectAsState()
    val masterLogo by NewsRepository.masterLogoText.collectAsState()
    val masterReporter by NewsRepository.masterDefaultReporter.collectAsState()
    val masterLocation by NewsRepository.masterLocation.collectAsState()

    // Dialog states
    var showEditTickerDialog by remember { mutableStateOf(false) }
    var showSendCommandDialog by remember { mutableStateOf(false) }
    var showAddChannelDialog by remember { mutableStateOf(false) }
    var showStatusDialogForProject by remember { mutableStateOf<UserProject?>(null) }
    var projectViewMode by remember { mutableStateOf("active") } // "active" or "archive"
    var archiveSearchQuery by remember { mutableStateOf("") }
    var projectToDeletePermanently by remember { mutableStateOf<UserProject?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(NewsBgLight)
    ) {
        // Admin Top Bar
        Surface(
            color = NewsBlack,
            shadowElevation = 4.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        IconButton(
                            onClick = onNavigateBack,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                        }
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "चीफ एडमिन कंसोल",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Surface(
                                    color = NewsRedPrimary,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "LIVE CONTROL",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                    )
                                }
                            }
                            Text(
                                text = "मोबाइल एवं वेब एडमिनिस्ट्रेशन हब",
                                fontSize = 11.sp,
                                color = NewsGold
                            )
                        }
                    }

                    // Role Badge
                    Surface(
                        color = NewsGoldDark,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.Security, contentDescription = null, tint = NewsBlack, modifier = Modifier.size(13.dp))
                            Text(
                                text = "सुपर एडमिन",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsBlack
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Admin Sub-tabs
                ScrollableTabRow(
                    selectedTabIndex = selectedAdminTab.ordinal,
                    containerColor = NewsBlack,
                    contentColor = NewsGold,
                    edgePadding = 0.dp,
                    divider = {}
                ) {
                    AdminTab.values().forEach { tab ->
                        Tab(
                            selected = selectedAdminTab == tab,
                            onClick = { selectedAdminTab = tab },
                            text = {
                                Text(
                                    text = tab.title,
                                    fontSize = 12.sp,
                                    fontWeight = if (selectedAdminTab == tab) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            icon = {
                                Icon(tab.icon, contentDescription = null, modifier = Modifier.size(18.dp))
                            },
                            selectedContentColor = NewsGold,
                            unselectedContentColor = Color(0xFFA1A1AA)
                        )
                    }
                }
            }
        }

        // Tab Content
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 12.dp, bottom = 90.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            when (selectedAdminTab) {
                AdminTab.OVERVIEW -> {
                    // Quick Stats Row
                    item {
                        AdminStatsGrid(
                            usersCount = users.size,
                            projectsCount = userProjects.size,
                            feedsCount = rssChannels.filter { it.isActive }.size,
                            pendingReviewCount = userProjects.count { it.status == ProjectStatus.IN_REVIEW }
                        )
                    }

                    // Live Ticker Controller Box
                    item {
                        LiveTickerControlCard(
                            tickerText = liveTicker,
                            onEditClick = { showEditTickerDialog = true }
                        )
                    }

                    // Quick Command Box
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                            modifier = Modifier.fillMaxWidth()
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
                                        Icon(Icons.Default.Send, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(18.dp))
                                        Text("यूज़र्स को त्वरित निर्देश / कमांड", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                                    }
                                    IconButton(onClick = { showSendCommandDialog = true }, modifier = Modifier.size(28.dp)) {
                                        Icon(Icons.Default.AddCircle, contentDescription = "Add Command", tint = NewsRedPrimary)
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                adminCommands.take(3).forEach { cmd ->
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (cmd.isCompleted) Color(0xFFF1F5F9) else Color(0xFFFFFBEB),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, if (cmd.isCompleted) NewsBorder else NewsGoldLight),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    Text(cmd.targetUserName, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                                                    Text("• ${cmd.issuedTime}", fontSize = 10.sp, color = NewsMuted)
                                                }
                                                Text(cmd.commandText, fontSize = 11.sp, color = NewsSlate, maxLines = 2)
                                            }

                                            if (!cmd.isCompleted) {
                                                OutlinedButton(
                                                    onClick = {
                                                        NewsRepository.markCommandDone(cmd.id)
                                                        Toast.makeText(context, "कमांड पूर्ण मार्क किया गया!", Toast.LENGTH_SHORT).show()
                                                    },
                                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                                    modifier = Modifier.height(28.dp)
                                                ) {
                                                    Text("पूर्ण करें", fontSize = 10.sp)
                                                }
                                            } else {
                                                Icon(Icons.Default.CheckCircle, contentDescription = "Done", tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Web Admin Direct Launcher Card
                    item {
                        WebPortalPromoCard(
                            onOpenWebTab = { selectedAdminTab = AdminTab.WEB_PORTAL }
                        )
                    }
                }

                AdminTab.PROJECTS -> {
                    val activeProjects = userProjects.filter { !it.isArchived }
                    val archivedProjects = userProjects.filter { it.isArchived && (
                        archiveSearchQuery.isBlank() ||
                        it.title.contains(archiveSearchQuery, ignoreCase = true) ||
                        it.summary.contains(archiveSearchQuery, ignoreCase = true) ||
                        it.userName.contains(archiveSearchQuery, ignoreCase = true)
                    )}
                    val totalArchivedCount = userProjects.count { it.isArchived }

                    // 1. Sub-Tab Segmented Selector (Active Workspace vs News Archive)
                    item {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color.White,
                            border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(4.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                // Active Projects Sub-Tab
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (projectViewMode == "active") NewsBlack else Color.Transparent,
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { projectViewMode = "active" }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(vertical = 8.dp, horizontal = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Icon(
                                            Icons.Default.Layers,
                                            contentDescription = null,
                                            tint = if (projectViewMode == "active") NewsYellow else NewsSlate,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "सक्रिय वर्कस्पेस (${activeProjects.size})",
                                            fontSize = 12.sp,
                                            fontWeight = if (projectViewMode == "active") FontWeight.Bold else FontWeight.Medium,
                                            color = if (projectViewMode == "active") Color.White else NewsSlate
                                        )
                                    }
                                }

                                // News Archive Sub-Tab
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (projectViewMode == "archive") Color(0xFF1E293B) else Color.Transparent,
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { projectViewMode = "archive" }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(vertical = 8.dp, horizontal = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Icon(
                                            Icons.Default.Archive,
                                            contentDescription = null,
                                            tint = if (projectViewMode == "archive") Color(0xFF38BDF8) else NewsSlate,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "न्यूज़ आर्काइव (${totalArchivedCount})",
                                            fontSize = 12.sp,
                                            fontWeight = if (projectViewMode == "archive") FontWeight.Bold else FontWeight.Medium,
                                            color = if (projectViewMode == "archive") Color.White else NewsSlate
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (projectViewMode == "active") {
                        // Action Bar for Active Workspace
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(
                                        text = "सक्रिय प्रोजेक्ट्स (${activeProjects.size})",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = NewsBlack
                                    )
                                    Text(
                                        text = "चालू समाचार एवं जैकेट ड्राफ्ट्स",
                                        fontSize = 11.sp,
                                        color = NewsMuted
                                    )
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    // Button to quickly move completed/published items to long-term storage
                                    OutlinedButton(
                                        onClick = {
                                            val count = NewsRepository.archiveCompletedProjects()
                                            if (count > 0) {
                                                Toast.makeText(context, "$count पूर्ण प्रोजेक्ट्स न्यूज़ आर्काइव में स्थानांतरित किए गए!", Toast.LENGTH_SHORT).show()
                                            } else {
                                                Toast.makeText(context, "कोई पूर्ण (Published/Approved) प्रोजेक्ट आर्काइव करने योग्य नहीं है", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF0F172A)),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF94A3B8)),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.height(32.dp)
                                    ) {
                                        Icon(Icons.Default.Archive, contentDescription = null, modifier = Modifier.size(13.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("पूर्ण आर्काइव करें", fontSize = 11.sp)
                                    }

                                    Button(
                                        onClick = { showSendCommandDialog = true },
                                        colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.height(32.dp)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("कमांड भेजें", fontSize = 11.sp)
                                    }
                                }
                            }
                        }

                        if (activeProjects.isEmpty()) {
                            item {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(24.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(40.dp))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("वर्कस्पेस एकदम स्वच्छ है!", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = NewsBlack)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("सभी पुराने प्रोजेक्ट्स को न्यूज़ आर्काइव में स्थानांतरित कर दिया गया है।", fontSize = 12.sp, color = NewsSlate, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                    }
                                }
                            }
                        } else {
                            items(activeProjects, key = { it.id }) { project ->
                                ProjectAdminCard(
                                    project = project,
                                    onChangeStatus = { showStatusDialogForProject = project },
                                    onEditInNewsroom = {
                                        val currentJacket = NewsRepository.activeJacketData.value
                                        NewsRepository.updateJacketData(
                                            currentJacket.copy(
                                                headline = project.title,
                                                subHeadline = project.summary,
                                                reporterName = project.userName
                                            )
                                        )
                                        onOpenNewsroomWithProject(project)
                                    },
                                    onArchive = {
                                        NewsRepository.archiveProject(project.id)
                                        Toast.makeText(context, "प्रोजेक्ट न्यूज़ आर्काइव (लॉन्ग-टर्म स्टोरेज) में सुरक्षित चला गया", Toast.LENGTH_SHORT).show()
                                    }
                                )
                            }
                        }
                    } else {
                        // NEWS ARCHIVE LONG-TERM STORAGE SECTION
                        item {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF0F172A),
                                shadowElevation = 3.dp,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = Color(0xFF0284C7).copy(alpha = 0.2f),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8))
                                        ) {
                                            Icon(
                                                Icons.Default.Inventory2,
                                                contentDescription = null,
                                                tint = Color(0xFF38BDF8),
                                                modifier = Modifier.padding(6.dp).size(20.dp)
                                            )
                                        }
                                        Column {
                                            Text(
                                                text = "दीर्घकालिक न्यूज़ आर्काइव (Long-term Storage)",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Text(
                                                text = "पुराने व प्रकाशित प्रोजेक्ट्स यहाँ सुरक्षित हैं। इससे आपका दैनिक वर्कस्पेस स्पष्ट रहता है।",
                                                fontSize = 11.sp,
                                                color = Color(0xFF94A3B8),
                                                lineHeight = 15.sp
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Search Bar for Archive
                                    OutlinedTextField(
                                        value = archiveSearchQuery,
                                        onValueChange = { archiveSearchQuery = it },
                                        placeholder = { Text("आर्काइव में खबर, रिपोर्टर या थीम खोजें...", fontSize = 12.sp, color = Color(0xFF64748B)) },
                                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp)) },
                                        trailingIcon = {
                                            if (archiveSearchQuery.isNotBlank()) {
                                                IconButton(onClick = { archiveSearchQuery = "" }) {
                                                    Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
                                                }
                                            }
                                        },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().height(48.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedContainerColor = Color(0xFF1E293B),
                                            unfocusedContainerColor = Color(0xFF1E293B),
                                            focusedBorderColor = Color(0xFF38BDF8),
                                            unfocusedBorderColor = Color(0xFF334155),
                                            focusedTextColor = Color.White,
                                            unfocusedTextColor = Color.White
                                        )
                                    )
                                }
                            }
                        }

                        if (archivedProjects.isEmpty()) {
                            item {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(28.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Icon(Icons.Default.Archive, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(44.dp))
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Text(
                                            text = if (archiveSearchQuery.isBlank()) "कोई आर्काइव्ड प्रोजेक्ट नहीं है" else "कोई प्रोजेक्ट नहीं मिला",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = NewsBlack
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = if (archiveSearchQuery.isBlank())
                                                "सक्रिय वर्कस्पेस से पूर्ण हो चुके प्रोजेक्ट्स को 'आर्काइव' करें ताकि कार्यक्षेत्र साफ़ और व्यवस्थित रहे।"
                                            else
                                                "सर्च कीवर्ड बदलकर पुनः प्रयास करें।",
                                            fontSize = 12.sp,
                                            color = NewsSlate,
                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                        )
                                    }
                                }
                            }
                        } else {
                            items(archivedProjects, key = { it.id }) { project ->
                                ArchivedProjectCard(
                                    project = project,
                                    onRestore = {
                                        NewsRepository.unarchiveProject(project.id)
                                        Toast.makeText(context, "प्रोजेक्ट सक्रिय वर्कस्पेस में रीस्टोर हो गया!", Toast.LENGTH_SHORT).show()
                                    },
                                    onEditInNewsroom = {
                                        val currentJacket = NewsRepository.activeJacketData.value
                                        NewsRepository.updateJacketData(
                                            currentJacket.copy(
                                                headline = project.title,
                                                subHeadline = project.summary,
                                                reporterName = project.userName
                                            )
                                        )
                                        onOpenNewsroomWithProject(project)
                                    },
                                    onDeletePermanently = {
                                        projectToDeletePermanently = project
                                    }
                                )
                            }
                        }
                    }
                }

                AdminTab.FEEDS -> {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "न्यूज़ चैनल्स RSS एवं वेब लिंक्स (${rssChannels.size})",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsBlack
                            )
                            Button(
                                onClick = { showAddChannelDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("नया चैनल जोड़ें", fontSize = 11.sp)
                            }
                        }
                    }

                    items(rssChannels, key = { it.id }) { channel ->
                        RssChannelAdminCard(
                            channel = channel,
                            onToggle = { NewsRepository.toggleRssChannel(channel.id) },
                            onDelete = {
                                NewsRepository.deleteRssChannel(channel.id)
                                Toast.makeText(context, "${channel.channelName} हटा दिया गया", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }

                AdminTab.BRANDING -> {
                    item {
                        MasterBrandingEditorCard(
                            initialChannel = masterChannel,
                            initialLogo = masterLogo,
                            initialReporter = masterReporter,
                            initialLocation = masterLocation,
                            onSave = { ch, lg, rep, loc ->
                                NewsRepository.updateMasterBranding(ch, lg, rep, loc)
                                Toast.makeText(context, "मास्टर ब्रैंडिंग सेटिंग्स अपडेट हो गईं!", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }

                AdminTab.WEB_PORTAL -> {
                    item {
                        val webPortalUrl = "https://ais-dev-ymjokrnulobq2aemilipe6-496088405107.asia-southeast1.run.app/admin/index.html"
                        val webStudioUrl = "https://ais-dev-ymjokrnulobq2aemilipe6-496088405107.asia-southeast1.run.app/"
                        WebPortalEmbedCard(
                            adminUrl = webPortalUrl,
                            studioUrl = webStudioUrl,
                            onCopyLink = { url ->
                                clipboardManager.setText(AnnotatedString(url))
                                Toast.makeText(context, "वेब लिंक क्लिपबोर्ड पर कॉपी हो गया!", Toast.LENGTH_SHORT).show()
                            },
                            onOpenInBrowser = { url ->
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "ब्राउज़र खोलने में त्रुटि: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Dialogs
    if (showEditTickerDialog) {
        EditTickerDialog(
            currentText = liveTicker,
            onDismiss = { showEditTickerDialog = false },
            onSave = { newText ->
                NewsRepository.setLiveTickerText(newText)
                showEditTickerDialog = false
                Toast.makeText(context, "लाइव टिकर पूरे ऐप और वेब पर अपडेट हो गया!", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (showSendCommandDialog) {
        SendCommandDialog(
            users = users,
            onDismiss = { showSendCommandDialog = false },
            onSend = { targetUser, commandText ->
                NewsRepository.sendAdminCommand(targetUser, commandText)
                showSendCommandDialog = false
                Toast.makeText(context, "$targetUser को निर्देश भेज दिया गया!", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (showAddChannelDialog) {
        AddChannelDialog(
            onDismiss = { showAddChannelDialog = false },
            onAdd = { name, url, category ->
                NewsRepository.addRssChannel(name, url, category)
                showAddChannelDialog = false
                Toast.makeText(context, "$name RSS फीड जुड़ गया!", Toast.LENGTH_SHORT).show()
            }
        )
    }

    showStatusDialogForProject?.let { proj ->
        ProjectStatusDialog(
            project = proj,
            onDismiss = { showStatusDialogForProject = null },
            onUpdate = { newStatus, note ->
                NewsRepository.updateProjectStatus(proj.id, newStatus, note)
                showStatusDialogForProject = null
                Toast.makeText(context, "प्रोजेक्ट स्टेटस '${newStatus.label}' अपडेट हुआ!", Toast.LENGTH_SHORT).show()
            }
        )
    }

    projectToDeletePermanently?.let { proj ->
        AlertDialog(
            onDismissRequest = { projectToDeletePermanently = null },
            icon = { Icon(Icons.Default.DeleteForever, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(32.dp)) },
            title = { Text("आर्काइव से स्थायी हटाएं?", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Text(
                    text = "क्या आप प्रोजेक्ट '${proj.title}' को दीर्घकालिक न्यूज़ आर्काइव से स्थायी रूप से हटाना चाहते हैं? यह क्रिया पूर्ववत (undo) नहीं की जा सकती।",
                    fontSize = 13.sp,
                    color = NewsSlate
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        NewsRepository.deleteProjectPermanently(proj.id)
                        projectToDeletePermanently = null
                        Toast.makeText(context, "प्रोजेक्ट स्थायी रूप से हटा दिया गया", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary)
                ) {
                    Text("स्थायी हटाएं", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { projectToDeletePermanently = null }) {
                    Text("रद्द करें", color = NewsSlate)
                }
            }
        )
    }
}

@Composable
private fun AdminStatsGrid(
    usersCount: Int,
    projectsCount: Int,
    feedsCount: Int,
    pendingReviewCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        AdminStatCard(title = "कुल यूज़र्स", value = "$usersCount", icon = Icons.Default.Group, modifier = Modifier.weight(1f))
        AdminStatCard(title = "सक्रिय प्रोजेक्ट्स", value = "$projectsCount", icon = Icons.Default.Layers, modifier = Modifier.weight(1f))
        AdminStatCard(title = "लाइव RSS", value = "$feedsCount", icon = Icons.Default.RssFeed, modifier = Modifier.weight(1f))
        AdminStatCard(title = "रिव्यू बाकी", value = "$pendingReviewCount", icon = Icons.Default.PendingActions, isAlert = pendingReviewCount > 0, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun AdminStatCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    isAlert: Boolean = false
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = if (isAlert) Color(0xFFFEF2F2) else Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (isAlert) NewsRedPrimary else NewsBorder),
        shadowElevation = 1.dp,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (isAlert) NewsRedPrimary else NewsBlack,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                fontSize = 17.sp,
                fontWeight = FontWeight.Black,
                color = if (isAlert) NewsRedPrimary else NewsBlack
            )
            Text(
                text = title,
                fontSize = 10.sp,
                color = NewsMuted,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun LiveTickerControlCard(
    tickerText: String,
    onEditClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF18181B),
        border = androidx.compose.foundation.BorderStroke(1.dp, NewsGold),
        modifier = Modifier.fillMaxWidth()
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
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEF4444))
                    )
                    Text(
                        text = "लाइव ब्रेकिंग टिकर कंट्रोलर (Top Ticker)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                TextButton(onClick = onEditClick, contentPadding = PaddingValues(0.dp)) {
                    Text("बदलें (Edit)", color = NewsGold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Surface(
                color = Color.Black.copy(alpha = 0.6f),
                shape = RoundedCornerShape(6.dp),
                border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF3F3F46)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = tickerText,
                    fontSize = 12.sp,
                    color = Color(0xFFF4F4F5),
                    modifier = Modifier.padding(8.dp),
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
private fun WebPortalPromoCard(
    onOpenWebTab: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF0F172A),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.LaptopChromebook, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                    Text("वेब एडमिन डैशबोर्ड एक्टिव", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text("कंप्यूटर या लैपटॉप ब्राउज़र से सभी यूज़र्स, प्रोजेक्ट्स और जैकेट्स को नियंत्रित करें।", fontSize = 11.sp, color = Color(0xFFCBD5E1))
            }

            Button(
                onClick = onOpenWebTab,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text("देखें", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ProjectAdminCard(
    project: UserProject,
    onChangeStatus: () -> Unit,
    onEditInNewsroom: () -> Unit,
    onArchive: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(project.status.colorHex)
                    ) {
                        Text(
                            text = project.status.label,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = NewsGoldLight
                    ) {
                        Text(
                            text = project.type.label,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsGoldDark,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = project.timestamp,
                    fontSize = 10.sp,
                    color = NewsMuted
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = project.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = NewsBlack
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = project.summary,
                fontSize = 11.sp,
                color = NewsSlate,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "यूज़र: ${project.userName} (${project.userRoleLabel})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = NewsBlack
                )

                Text(
                    text = "थीम: ${project.assignedJacketTheme}",
                    fontSize = 11.sp,
                    color = NewsMuted
                )
            }

            if (project.adminNotes.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    color = Color(0xFFFEF3C7),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "एडमिन नोट: ${project.adminNotes}",
                        fontSize = 10.sp,
                        color = Color(0xFF92400E),
                        modifier = Modifier.padding(6.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Button(
                    onClick = onChangeStatus,
                    colors = ButtonDefaults.buttonColors(containerColor = NewsBlack),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Text("स्टेटस / नोट", fontSize = 11.sp)
                }

                OutlinedButton(
                    onClick = onEditInNewsroom,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Text("स्टूडियो में खोलें", fontSize = 11.sp)
                }

                OutlinedButton(
                    onClick = onArchive,
                    shape = RoundedCornerShape(6.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF64748B)),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Icon(
                        Icons.Default.Archive,
                        contentDescription = "आर्काइव करें",
                        tint = Color(0xFF475569),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("आर्काइव", fontSize = 11.sp, color = Color(0xFF334155))
                }
            }
        }
    }
}

@Composable
private fun ArchivedProjectCard(
    project: UserProject,
    onRestore: () -> Unit,
    onEditInNewsroom: () -> Unit,
    onDeletePermanently: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFF8FAFC),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1)),
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFF0284C7).copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF0284C7))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Icon(Icons.Default.Archive, contentDescription = null, tint = Color(0xFF0284C7), modifier = Modifier.size(11.dp))
                            Text(
                                text = "आर्काइव्ड (सुरक्षित)",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0284C7)
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(project.status.colorHex)
                    ) {
                        Text(
                            text = project.status.label,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = NewsGoldLight
                    ) {
                        Text(
                            text = project.type.label,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsGoldDark,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = "संग्रह: ${project.archivedAt ?: project.timestamp}",
                    fontSize = 10.sp,
                    color = NewsSlate
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = project.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = NewsBlack
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = project.summary,
                fontSize = 11.sp,
                color = NewsSlate,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "मूल निर्माता: ${project.userName} (${project.userRoleLabel})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = NewsBlack
                )

                Text(
                    text = "थीम: ${project.assignedJacketTheme}",
                    fontSize = 11.sp,
                    color = NewsMuted
                )
            }

            if (project.adminNotes.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    color = Color(0xFFF1F5F9),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "नोट: ${project.adminNotes}",
                        fontSize = 10.sp,
                        color = Color(0xFF475569),
                        modifier = Modifier.padding(6.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Restore to Active Workspace button
                Button(
                    onClick = onRestore,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier
                        .weight(1.3f)
                        .height(34.dp)
                ) {
                    Icon(Icons.Default.Unarchive, contentDescription = null, tint = NewsYellow, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("सक्रिय में रीस्टोर", fontSize = 11.sp, color = Color.White)
                }

                // Open in Newsroom
                OutlinedButton(
                    onClick = onEditInNewsroom,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("स्टूडियो", fontSize = 11.sp)
                }

                // Permanent Delete button
                IconButton(
                    onClick = onDeletePermanently,
                    modifier = Modifier
                        .size(34.dp)
                        .background(Color(0xFFFEE2E2), RoundedCornerShape(6.dp))
                ) {
                    Icon(
                        Icons.Default.DeleteForever,
                        contentDescription = "स्थायी हटाएं",
                        tint = NewsRedPrimary,
                        modifier = Modifier.size(17.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun RssChannelAdminCard(
    channel: RssChannelSource,
    onToggle: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = channel.channelName,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = NewsBlack
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (channel.isActive) Color(0xFFDCFCE7) else Color(0xFFF1F5F9)
                    ) {
                        Text(
                            text = if (channel.isActive) "सक्रिय" else "निष्क्रिय",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (channel.isActive) Color(0xFF166534) else NewsMuted,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = channel.feedUrl,
                    fontSize = 10.sp,
                    color = NewsMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = "कैटेगरी: ${channel.category.displayName} • सिंक: ${channel.lastSyncTime}",
                    fontSize = 10.sp,
                    color = NewsSlate
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Switch(
                    checked = channel.isActive,
                    onCheckedChange = { onToggle() },
                    colors = SwitchDefaults.colors(checkedThumbColor = NewsRedPrimary, checkedTrackColor = Color(0xFFFEE2E2))
                )
                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = NewsMuted)
                }
            }
        }
    }
}

@Composable
private fun MasterBrandingEditorCard(
    initialChannel: String,
    initialLogo: String,
    initialReporter: String,
    initialLocation: String,
    onSave: (String, String, String, String) -> Unit
) {
    var channelName by remember { mutableStateOf(initialChannel) }
    var logoText by remember { mutableStateOf(initialLogo) }
    var reporterName by remember { mutableStateOf(initialReporter) }
    var location by remember { mutableStateOf(initialLocation) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = "मास्टर जैकेट एवं चैनल ब्रैंडिंग डिफ़ॉल्ट्स",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = NewsBlack
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "यहाँ सेट की गई वैल्यूज़ सभी यूज़र्स के लिए डिफ़ॉल्ट जैकेट में अपने आप लग जाएंगी।",
                fontSize = 11.sp,
                color = NewsSlate
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = channelName,
                onValueChange = { channelName = it },
                label = { Text("डिफ़ॉल्ट न्यूज़ चैनल नाम") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = logoText,
                onValueChange = { logoText = it },
                label = { Text("हेडर लोगो टेक्स्ट (Top Header)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = reporterName,
                onValueChange = { reporterName = it },
                label = { Text("डिफ़ॉल्ट रिपोर्टर क्रेडिट (Footer)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = location,
                onValueChange = { location = it },
                label = { Text("डिफ़ॉल्ट लोकेशन (City)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            Button(
                onClick = { onSave(channelName, logoText, reporterName, location) },
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
            ) {
                Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("मास्टर ब्रैंडिंग सुरक्षित करें", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun WebPortalEmbedCard(
    adminUrl: String,
    studioUrl: String,
    onCopyLink: (String) -> Unit,
    onOpenInBrowser: (String) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, NewsGold),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Language, contentDescription = null, tint = NewsGold, modifier = Modifier.size(24.dp))
                    Column {
                        Text("वेब पोर्टल एवं स्टूडियो (Web Version)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("सर्वर स्थिति: ऑनलाइन एवं सक्रिय (Active 200 OK)", fontSize = 11.sp, color = Color(0xFF38BDF8))
                    }
                }
                Surface(
                    color = Color(0xFF10B981),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text("ONLINE", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "वेब वर्जन को आप किसी भी कंप्यूटर, लैपटॉप, टैबलेट अथवा मोबाइल ब्राउज़र (Chrome/Safari) पर तुरंत खोल सकते हैं।\n\n• लाइव न्यूज़ स्टूडियो और 1080x1350 कार्ड लाइव कैनवास\n• मल्टी-यूज़र मॉनिटरिंग और प्रोजेक्ट अप्रूवल\n• बल्क RSS और वेब लिंक्स डिस्पैच\n• क्लाउड डेटा सिंक और JSON एक्सपोर्ट",
                fontSize = 12.sp,
                color = Color(0xFFE2E8F0),
                lineHeight = 18.sp
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Primary Option 1: Web Studio (Main App)
            Surface(
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF475569)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text("1. मुख्य वेब स्टूडियो (Main Web Studio):", fontSize = 11.sp, color = NewsGold, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(studioUrl, fontSize = 11.sp, color = Color.White)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onOpenInBrowser(studioUrl) },
                            colors = ButtonDefaults.buttonColors(containerColor = NewsGold),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = NewsBlack, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("ब्राउज़र में खोलें", color = NewsBlack, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(
                            onClick = { onCopyLink(studioUrl) },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = NewsGold),
                            border = androidx.compose.foundation.BorderStroke(1.dp, NewsGold.copy(alpha = 0.6f)),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("लिंक कॉपी करें", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Option 2: Admin Dashboard
            Surface(
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF475569)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text("2. वेब एडमिन कंट्रोल पैनल (Admin Portal):", fontSize = 11.sp, color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(adminUrl, fontSize = 11.sp, color = Color.White)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onOpenInBrowser(adminUrl) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("एडमिन खोलें", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(
                            onClick = { onCopyLink(adminUrl) },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.6f)),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("लिंक कॉपी करें", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// Dialogs
@Composable
private fun EditTickerDialog(
    currentText: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var text by remember { mutableStateOf(currentText) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("लाइव ब्रेकिंग टिकर संपादित करें", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("यह टिकर ऐप और वेब के शीर्ष पर तुरंत लाइव दिखाई देगा:", fontSize = 12.sp, color = NewsSlate)
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(text) },
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("पब्लिश करें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}

@Composable
private fun SendCommandDialog(
    users: List<UserAccount>,
    onDismiss: () -> Unit,
    onSend: (String, String) -> Unit
) {
    var selectedUser by remember { mutableStateOf(users.firstOrNull()?.name ?: "सभी यूज़र्स") }
    var commandText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("यूज़र को निर्देश / कमांड भेजें", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("यूज़र चुनें:", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(users) { u ->
                        val isSel = u.name == selectedUser
                        FilterChip(
                            selected = isSel,
                            onClick = { selectedUser = u.name },
                            label = { Text(u.name, fontSize = 11.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = commandText,
                    onValueChange = { commandText = it },
                    label = { Text("कमांड या निर्देश लिखें...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    placeholder = { Text("जैसे: हेडलाइन को छोटा करें और तुरंत री-सबमिट करें") }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (commandText.isNotBlank()) onSend(selectedUser, commandText)
                },
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("कमांड भेजें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}

@Composable
private fun AddChannelDialog(
    onDismiss: () -> Unit,
    onAdd: (String, String, NewsCategory) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(NewsCategory.BREAKING) }

    val allCategories = listOf(
        NewsCategory.BREAKING,
        NewsCategory.POLITICS,
        NewsCategory.TECH,
        NewsCategory.SPORTS,
        NewsCategory.BUSINESS,
        NewsCategory.STATE,
        NewsCategory.ENTERTAINMENT,
        NewsCategory.CRIME
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("नया RSS / वेब चैनल जोड़ें (Channel → Category → URL)", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("1. चैनल का नाम (उदा. ज़ी न्यूज़ / दैनिक जागरण)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Text("2. कैटेगरी चुनें (Category):", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(allCategories) { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat.displayName, fontSize = 11.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("3. RSS या वेब लिंक URL") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    placeholder = { Text("https://.../feed.xml") }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank() && url.isNotBlank()) onAdd(name, url, category)
                },
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("चैनल जोड़ें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}

@Composable
private fun ProjectStatusDialog(
    project: UserProject,
    onDismiss: () -> Unit,
    onUpdate: (ProjectStatus, String) -> Unit
) {
    var selectedStatus by remember { mutableStateOf(project.status) }
    var note by remember { mutableStateOf(project.adminNotes) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("प्रोजेक्ट स्टेटस व एडमिन नोट", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("प्रोजेक्ट: ${project.title}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                Text("स्टेटस चुनें:", fontSize = 11.sp, color = NewsSlate)

                ProjectStatus.values().forEach { st ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedStatus = st }
                            .padding(vertical = 4.dp)
                    ) {
                        RadioButton(selected = selectedStatus == st, onClick = { selectedStatus = st })
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(st.label, fontSize = 12.sp, fontWeight = if (selectedStatus == st) FontWeight.Bold else FontWeight.Normal)
                    }
                }

                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("यूज़र के लिए एडमिन नोट / फीडबैक") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onUpdate(selectedStatus, note) },
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("अपडेट करें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}
