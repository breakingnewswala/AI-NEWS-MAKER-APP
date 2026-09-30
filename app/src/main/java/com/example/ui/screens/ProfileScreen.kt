package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import android.content.Context
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
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
import com.example.data.AuthManager
import com.example.data.AuthUser
import com.example.data.TemplateConfigManager
import com.example.data.TemplateHeaderFooter
import com.example.model.*
import com.example.ui.theme.*

enum class ControlPanelTab(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val testTag: String) {
    PROFILE("1. प्रोफाइल व प्लान अपग्रेड", Icons.Default.Person, "tab_control_profile"),
    DASHBOARD("2. डैशबोर्ड (RSS व कैटेगरी)", Icons.Default.Dashboard, "tab_control_dashboard")
}

@Composable
fun ProfileScreen(
    onNavigateToHome: () -> Unit,
    onOpenAdminConsole: () -> Unit = {},
    onNavigateToNewsroom: () -> Unit = {},
    onLogout: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val currentRole by NewsRepository.userRole.collectAsState()
    val categoriesList by NewsRepository.categories.collectAsState()
    val authUser by AuthManager.currentUser.collectAsState()
    val userPlanTier by AuthManager.userPlanTier.collectAsState()
    val adminViewAsMode by AuthManager.adminViewAsMode.collectAsState()

    var activeControlTab by remember { mutableStateOf(ControlPanelTab.PROFILE) }
    var dashboardSubTab by remember { mutableStateOf(0) } // 0: RSS/वेब लिंक, 1: कैटेगरी प्रबंधन
    var showEditChannelProfileDialog by remember { mutableStateOf(false) }

    // Dialog state for adding RSS / Web link by Admin
    var showAddPostDialog by remember { mutableStateOf(false) }

    // Dialog states for dynamic category management
    var showAddCategoryDialog by remember { mutableStateOf(false) }
    var categoryToEdit by remember { mutableStateOf<ManagedCategory?>(null) }
    var planSuccessMsg by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Slate950)
    ) {
        // Top Header - Exact match with Web Studio Control Panel Header
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Slate900,
            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Brush.linearGradient(listOf(Amber500, NewsRedPrimary))),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Tune,
                            contentDescription = null,
                            tint = Slate950,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = if (AuthManager.isEffectiveAdmin()) "कंट्रोल पैनल (Control Panel)" else "यूज़र प्रोफ़ाइल (User Profile)",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                            if (adminViewAsMode == "user" && authUser?.role == UserRole.ADMIN) {
                                Surface(
                                    color = Color(0xFF581C87),
                                    shape = RoundedCornerShape(10.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA855F7))
                                ) {
                                    Text(
                                        text = "टेस्ट मोड (AS USER)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFFE9D5FF),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                        Text(
                            text = if (AuthManager.isEffectiveAdmin()) "प्रोफाइल, 4-टियर सब्सक्रिप्शन, चैनल सेटिंग्स व डैशबोर्ड" else "प्रोफाइल, चैनल ब्रांडिंग व एक्टिव प्लान विवरण",
                            fontSize = 11.sp,
                            color = Slate400
                        )
                    }
                }

                OutlinedButton(
                    onClick = onLogout,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color(0xFF450A0A).copy(alpha = 0.6f),
                        contentColor = Color(0xFFFCA5A5)
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF991B1B)),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("लॉगआउट", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Test Mode Prominent Banner with Return to Admin Option
        if (adminViewAsMode == "user" && authUser?.role == UserRole.ADMIN) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                color = Color(0xFF3B0764),
                shape = RoundedCornerShape(10.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA855F7))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("🧪 टेस्ट मोड सक्रिय (User View)", color = Color(0xFFE9D5FF), fontSize = 12.sp, fontWeight = FontWeight.Black)
                        Text("आप सामान्य यूज़र इंटरफ़ेस देख रहे हैं।", color = Color(0xFFD8B4FE), fontSize = 10.sp)
                    }
                    Button(
                        onClick = { AuthManager.setAdminViewAsMode(context, "admin") },
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500, contentColor = Slate950),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text("एडमिन मोड पर वापस जाएं", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Tabs: Only visible in ADMIN MODE for effective admin! Hidden in USER MODE and TEST MODE
        if (AuthManager.isEffectiveAdmin()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                TabRow(
                    selectedTabIndex = activeControlTab.ordinal,
                    containerColor = Slate900,
                    contentColor = Amber400,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[activeControlTab.ordinal]),
                            color = Amber400,
                            height = 3.dp
                        )
                    },
                    divider = {}
                ) {
                    ControlPanelTab.values().forEach { tab ->
                        val isSelected = activeControlTab == tab
                        Tab(
                            selected = isSelected,
                            onClick = { activeControlTab = tab },
                            text = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(vertical = 8.dp)
                                ) {
                                    Icon(
                                        imageVector = tab.icon,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = if (isSelected) Amber400 else Slate400
                                    )
                                    Text(
                                        text = tab.title,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) Amber400 else Slate400
                                    )
                                }
                            },
                            modifier = Modifier.testTag(tab.testTag)
                        )
                    }
                }
            }
        }

        // Active Tab Content
        val effectiveTab = if (AuthManager.isEffectiveAdmin()) activeControlTab else ControlPanelTab.PROFILE
        when (effectiveTab) {
            ControlPanelTab.PROFILE -> {
                ProfileAndPlanTabContent(
                    currentUser = authUser,
                    userPlanTier = userPlanTier,
                    adminViewAsMode = adminViewAsMode,
                    planSuccessMsg = planSuccessMsg,
                    onOpenStudio = onNavigateToNewsroom,
                    onOpenBrandingDialog = { showEditChannelProfileDialog = true },
                    onActivatePlan = { tier ->
                        AuthManager.setUserPlanTier(context, tier)
                        val planName = when (tier) {
                            "basic", "trial" -> "7-डे बेसिक ट्रायल"
                            "advanced" -> "एडवांस्ड प्लान"
                            "pro", "professional" -> "प्रोफेशनल प्लान"
                            else -> "एंटरप्राइज प्लान"
                        }
                        planSuccessMsg = "🎉 बधाई! आपका $planName सफलतापूर्वक सक्रिय हो गया है।"
                    },
                    onToggleTestMode = { mode ->
                        AuthManager.setAdminViewAsMode(context, mode)
                        val newRole = if (mode == "user") UserRole.USER else UserRole.ADMIN
                        NewsRepository.setUserRole(newRole)
                        Toast.makeText(
                            context,
                            if (mode == "user") "यूज़र टेस्ट मोड सक्रिय" else "चीफ एडमिन मोड सक्रिय",
                            Toast.LENGTH_SHORT
                        ).show()
                    },
                    onDeleteAccount = onLogout
                )
            }
            ControlPanelTab.DASHBOARD -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Sub-tab switcher for Dashboard
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Slate950,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = dashboardSubTab == 0,
                                onClick = { dashboardSubTab = 0 },
                                label = { Text("RSS / वेब लिंक फीड जोड़ें", fontSize = 12.sp) },
                                leadingIcon = {
                                    Icon(Icons.Default.AddLink, contentDescription = null, modifier = Modifier.size(14.dp))
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Amber400.copy(alpha = 0.2f),
                                    selectedLabelColor = Amber400,
                                    selectedLeadingIconColor = Amber400
                                )
                            )
                            FilterChip(
                                selected = dashboardSubTab == 1,
                                onClick = { dashboardSubTab = 1 },
                                label = { Text("कैटेगरी प्रबंधन", fontSize = 12.sp) },
                                leadingIcon = {
                                    Icon(Icons.Default.Category, contentDescription = null, modifier = Modifier.size(14.dp))
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Amber400.copy(alpha = 0.2f),
                                    selectedLabelColor = Amber400,
                                    selectedLeadingIconColor = Amber400
                                )
                            )
                        }
                    }

                    if (dashboardSubTab == 0) {
                        AddFeedSettingsTabContent(
                            currentRole = currentRole,
                            categories = categoriesList,
                            onNavigateToHome = onNavigateToHome,
                            onMakeNewsClicked = { post ->
                                NewsRepository.setPendingGraphicNews(post)
                                onNavigateToNewsroom()
                            },
                            onActivateAdminRole = {
                                NewsRepository.setUserRole(UserRole.ADMIN)
                                Toast.makeText(context, "एडमिन रोल सक्रिय!", Toast.LENGTH_SHORT).show()
                            }
                        )
                    } else {
                        CategoriesSettingsTabContent(
                            categoriesList = categoriesList,
                            onAddCategoryClick = { showAddCategoryDialog = true },
                            onEditCategory = { categoryToEdit = it },
                            context = context
                        )
                    }
                }
            }
        }
    }

    if (showEditChannelProfileDialog) {
        EditChannelProfileDialog(
            context = context,
            onDismiss = { showEditChannelProfileDialog = false }
        )
    }

    // Add Post Dialog for Admin
    if (showAddPostDialog) {
        AddPostDialog(
            onDismiss = { showAddPostDialog = false },
            onPostAdded = {
                showAddPostDialog = false
                onNavigateToHome()
                Toast.makeText(context, "नया न्यूज़ लिंक होम फीड में जुड़ गया!", Toast.LENGTH_LONG).show()
            }
        )
    }

    // Dynamic Category Dialogs
    if (showAddCategoryDialog) {
        AddCategoryDialog(
            onDismiss = { showAddCategoryDialog = false },
            onCategoryAdded = { name ->
                NewsRepository.addCategory(name)
                showAddCategoryDialog = false
                Toast.makeText(context, "नई श्रेणी '$name' जोड़ी गई", Toast.LENGTH_SHORT).show()
            }
        )
    }

    categoryToEdit?.let { cat ->
        EditCategoryDialog(
            category = cat,
            onDismiss = { categoryToEdit = null },
            onSave = { newName ->
                NewsRepository.editCategory(cat.id, newName)
                categoryToEdit = null
                Toast.makeText(context, "श्रेणी नाम अपडेट किया गया", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

/**
 * Tab 1 Content: प्रोफाइल व प्लान अपग्रेड (Profile & Subscription Plans)
 * Identical parity with Web Studio's ProfileScreenWeb.tsx
 */
@Composable
fun ProfileAndPlanTabContent(
    currentUser: AuthUser?,
    userPlanTier: String,
    adminViewAsMode: String,
    planSuccessMsg: String?,
    onOpenStudio: () -> Unit,
    onOpenBrandingDialog: () -> Unit,
    onActivatePlan: (String) -> Unit,
    onToggleTestMode: (String) -> Unit,
    onDeleteAccount: () -> Unit = {}
) {
    val context = LocalContext.current
    var mobileInput by remember { mutableStateOf("") }
    var mobileError by remember { mutableStateOf<String?>(null) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var confirmDeleteChecked by remember { mutableStateOf(false) }
    val clipboardManager = LocalClipboardManager.current
    val accountDeletionUrl = AuthManager.getPlayStoreAccountDeletionUrl()

    val isMobileLocked = !currentUser?.mobileNumber.isNullOrBlank()

    val currentChannelHi by AuthManager.channelNameHi.collectAsState()
    val currentChannelEn by AuthManager.channelNameEn.collectAsState()
    val currentLogoUrl by AuthManager.channelLogoUrl.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. User Identity & Active Plan Header Card
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(Brush.linearGradient(listOf(Amber500, NewsRedPrimary))),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("👑", fontSize = 26.sp)
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = currentUser?.name ?: "मुख्य संपादक",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                                if (currentUser?.role == UserRole.ADMIN) {
                                    Surface(
                                        color = Amber500.copy(alpha = 0.2f),
                                        shape = RoundedCornerShape(4.dp),
                                        border = androidx.compose.foundation.BorderStroke(0.5.dp, Amber500.copy(alpha = 0.6f))
                                    ) {
                                        Text(
                                            text = "चीफ एडमिन",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Amber400,
                                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(3.dp))

                            // Active Plan Badge
                            Surface(
                                color = when (userPlanTier) {
                                    "pro", "professional" -> Color(0xFF581C87).copy(alpha = 0.8f)
                                    "enterprise", "vip" -> Color(0xFF064E3B).copy(alpha = 0.8f)
                                    "advanced", "advance" -> Color(0xFF1E3A8A).copy(alpha = 0.8f)
                                    else -> Color(0xFF78350F).copy(alpha = 0.8f)
                                },
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(0.5.dp, Amber400)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = Amber400, modifier = Modifier.size(12.dp))
                                    Text(
                                        text = when (userPlanTier) {
                                            "advanced", "advance" -> "ADVANCE • एडवांस्ड प्लान (Active)"
                                            "pro", "professional" -> "PRO • प्रोफेशनल प्लान (Active)"
                                            "enterprise", "vip" -> "VIP DESK • वीआईपी डेस्क (Active)"
                                            else -> "BASIC • बेसिक प्लान (Active)"
                                        },
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            // Gmail Tracking ID (Clean without unwanted badges or extra text)
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text("Gmail:", fontSize = 11.sp, color = Amber400, fontWeight = FontWeight.Bold)
                                Text(
                                    text = currentUser?.email ?: "user@ainewsmaker.online",
                                    fontSize = 11.sp,
                                    color = Slate300
                                )
                            }

                            // Primary Mobile Status
                            Spacer(modifier = Modifier.height(2.dp))
                            if (isMobileLocked) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(11.dp))
                                    Text("प्राइमरी नंबर: ${currentUser?.mobileNumber}", fontSize = 11.sp, color = Color(0xFF34D399), fontWeight = FontWeight.Medium)
                                }
                            } else {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = Amber400, modifier = Modifier.size(11.dp))
                                    Text("प्राइमरी मोबाइल नंबर अभी दर्ज नहीं है", fontSize = 11.sp, color = Amber400)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onOpenBrandingDialog,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = Slate800,
                                contentColor = Amber400
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate700),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Tune, contentDescription = null, modifier = Modifier.size(14.dp), tint = Amber400)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("चैनल व लोगो विवरण", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = onOpenStudio,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = NewsRedPrimary
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(14.dp), tint = Amber400)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("ग्राफिक स्टूडियो खोलें", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }

        // Global Plan Success Notice
        if (planSuccessMsg != null) {
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF064E3B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(20.dp))
                        Text(planSuccessMsg, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD1FAE5))
                    }
                }
            }
        }

        // 7-Day Free Trial Basic Status Banner
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Amber500.copy(alpha = 0.6f))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("🎁", fontSize = 22.sp)
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "7-Day Free Trial Basic",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f, fill = false)
                                )
                                Surface(
                                    color = Color(0xFF064E3B),
                                    shape = RoundedCornerShape(6.dp),
                                    border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF10B981))
                                ) {
                                    Text(
                                        text = "7 दिन फ्री",
                                        fontSize = 8.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF34D399),
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "सभी 50+ रेडी फ्रेम्स, AI हेडलाइन्स और न्यूज़ ग्राफिक्स का निःशुल्क लाभ उठाएं।",
                                fontSize = 10.5.sp,
                                color = Slate300,
                                lineHeight = 14.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Button(
                        onClick = { onActivatePlan("trial") },
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Slate950, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("7-Day Free Trial Basic के साथ Activate करें", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Slate950)
                    }
                }
            }
        }

        // SECTION 1: PRIMARY MOBILE NUMBER (Permanent & Unchangeable)
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = Amber400, modifier = Modifier.size(18.dp))
                        Column {
                            Text("प्राइमरी मोबाइल नंबर (Permanent Mobile Number)", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color.White)
                            Text("सुरक्षा व अकाउंट वेरिफिकेशन हेतु एक बार ही लिया जाएगा (परिवर्तन की अनुमति नहीं है)", fontSize = 10.sp, color = Slate400)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    if (isMobileLocked) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF064E3B).copy(alpha = 0.5f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF059669))
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(18.dp))
                                Column {
                                    Text("सुरक्षित प्राइमरी नंबर: ${currentUser?.mobileNumber}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD1FAE5))
                                    Text("यह नंबर आपके अकाउंट से स्थायी रूप से लिंक है।", fontSize = 10.sp, color = Color(0xFFA7F3D0))
                                }
                            }
                        }
                    } else {
                        OutlinedTextField(
                            value = mobileInput,
                            onValueChange = {
                                if (it.length <= 10 && it.all { char -> char.isDigit() }) {
                                    mobileInput = it
                                    mobileError = null
                                }
                            },
                            placeholder = { Text("10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9876543210)") },
                            singleLine = true,
                            leadingIcon = {
                                Text("+91", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Amber400, modifier = Modifier.padding(start = 12.dp, end = 4.dp))
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            isError = mobileError != null
                        )

                        if (mobileError != null) {
                            Text(mobileError!!, color = Color(0xFFF87171), fontSize = 10.sp, modifier = Modifier.padding(top = 4.dp))
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                if (mobileInput.length != 10) {
                                    mobileError = "कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें"
                                } else {
                                    AuthManager.saveChannelProfile(
                                        context = context,
                                        fullName = currentUser?.name ?: "मुख्य संपादक",
                                        channelNameHi = currentChannelHi,
                                        channelNameEn = currentChannelEn,
                                        channelLogoUrl = currentLogoUrl,
                                        mobileNumber = mobileInput
                                    )
                                    Toast.makeText(context, "✅ प्राइमरी मोबाइल नंबर स्थायी रूप से सुरक्षित कर लिया गया है।", Toast.LENGTH_LONG).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = Slate950, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("प्राइमरी नंबर लॉक करें (Lock Permanently)", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Slate950)
                        }
                    }
                }
            }
        }

        // SECTION 2: 4-TIER SUBSCRIPTION PLANS
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.CardMembership, contentDescription = null, tint = Amber400, modifier = Modifier.size(20.dp))
                    Column {
                        Text("4-टियर सब्सक्रिप्शन प्लान (Subscription Plans)", fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Text("चैनल आवश्यकता अनुसार वार्षिक प्लान चुनें अथवा अपग्रेड करें", fontSize = 10.sp, color = Slate400)
                    }
                }

                val plans = listOf(
                    Triple("basic", "बेसिक प्लान (7-Day Trial)", "₹199 / वर्ष") to listOf(
                        "1-यूज़र डेस्क लाइसेंस",
                        "50+ रेडी फ्रेम्स (1:1 & 16:9)",
                        "AI हेडलाइन्स व न्यूज़ जनरेशन",
                        "HD इमेज एक्सपोर्ट"
                    ),
                    Triple("advanced", "एडवांस्ड प्लान (Advanced)", "₹499 / वर्ष") to listOf(
                        "वॉटरमार्क रहित (No Watermark) एक्सपोर्ट",
                        "सभी प्रीमियम फ्रेम्स अनलॉक",
                        "3-यूज़र टीम एक्सेस",
                        "AI न्यूज़ समराइज़र व फ़ीड्स"
                    ),
                    Triple("pro", "प्रोफेशनल प्लान (Pro)", "₹999 / वर्ष") to listOf(
                        "असीमित ग्राफिक्स व वीडियो जनरेशन",
                        "VIP एक्सक्लूसिव ब्रेकिंग फ्रेम्स",
                        "10-यूज़र कोलैबोरेशन",
                        "प्राथमिकता 24/7 सपोर्ट"
                    ),
                    Triple("enterprise", "एंटरप्राइज प्लान (VIP Desk)", "₹1999 / वर्ष") to listOf(
                        "पूर्ण व्हाइट-लेबल ब्रांडिंग",
                        "कस्टम डोमेन इंटीग्रेशन",
                        "मल्टी-डेस्क रिपोर्टर नेटवर्क",
                        "समर्पित अकाउंट मैनेजर"
                    )
                )

                plans.forEach { (planInfo, features) ->
                    val (tierKey, name, price) = planInfo
                    val isActive = userPlanTier == tierKey || (tierKey == "basic" && userPlanTier == "trial")

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Slate900,
                        border = androidx.compose.foundation.BorderStroke(
                            1.5.dp,
                            if (isActive) Amber400 else Slate800
                        )
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(name, fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color.White)
                                    Text(price, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Amber400)
                                }

                                if (isActive) {
                                    Surface(
                                        color = Color(0xFF064E3B),
                                        shape = RoundedCornerShape(12.dp),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981))
                                    ) {
                                        Text("सक्रिय प्लान (Active)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF34D399), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            features.forEach { feat ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(vertical = 2.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Amber400, modifier = Modifier.size(12.dp))
                                    Text(feat, fontSize = 11.sp, color = Slate300)
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            if (!isActive) {
                                OutlinedButton(
                                    onClick = { onActivatePlan(tierKey) },
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        containerColor = Slate800,
                                        contentColor = Amber400
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Amber500.copy(alpha = 0.5f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("यह प्लान चुनें / अपग्रेड करें", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }

        // SECTION 3: CHANNEL BRANDING & FOOTER SETTINGS
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Palette, contentDescription = null, tint = Amber400, modifier = Modifier.size(18.dp))
                            Column {
                                Text("चैनल ब्रांडिंग व फुटर सेटिंग्स", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color.White)
                                Text("ग्राफिक स्टूडियो के फुटर और हेडर्स पर प्रदर्शित विवरण", fontSize = 10.sp, color = Slate400)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Slate950,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("चैनल नाम (हिन्दी): $currentChannelHi", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("Channel Name (English): $currentChannelEn", fontSize = 11.sp, color = Slate300)
                            if (currentLogoUrl.isNotBlank()) {
                                Text("लोगो स्थिति: कस्टम लोगो सक्रिय", fontSize = 11.sp, color = Color(0xFF34D399))
                            } else {
                                Text("लोगो स्थिति: डिफ़ॉल्ट टेम्पलेट लोगो", fontSize = 11.sp, color = Slate400)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Button(
                        onClick = onOpenBrandingDialog,
                        colors = ButtonDefaults.buttonColors(containerColor = Slate800),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, tint = Amber400, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("चैनल व लोगो विवरण एडिट करें", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Amber400)
                    }
                }
            }
        }

        // SECTION 4: ADMIN TEST MODE / SANDBOX
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Science, contentDescription = null, tint = Color(0xFFA855F7), modifier = Modifier.size(18.dp))
                        Column {
                            Text("एडमिन टेस्ट मोड (Admin Sandbox Mode)", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color.White)
                            Text("सामान्य यूजर के रूप में ऐप इंटरफेस का परीक्षण करें", fontSize = 10.sp, color = Slate400)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val isAdminMode = adminViewAsMode == "admin"
                        OutlinedButton(
                            onClick = { onToggleTestMode("admin") },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (isAdminMode) Color(0xFF78350F) else Slate800,
                                contentColor = if (isAdminMode) Amber400 else Slate400
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isAdminMode) Amber400 else Slate700),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("👑 एडमिन मोड", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = { onToggleTestMode("user") },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (!isAdminMode) Color(0xFF581C87) else Slate800,
                                contentColor = if (!isAdminMode) Color(0xFFE9D5FF) else Slate400
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (!isAdminMode) Color(0xFFA855F7) else Slate700),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("🧪 यूज़र टेस्ट मोड", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 6B. Web Version & Desktop Studio Access Card
        item {
            val devWebStudioUrl = "https://ais-dev-ymjokrnulobq2aemilipe6-496088405107.asia-southeast1.run.app/"
            val devWebAdminUrl = "https://ais-dev-ymjokrnulobq2aemilipe6-496088405107.asia-southeast1.run.app/admin/index.html"
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Amber400.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Amber400.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("🌐", fontSize = 20.sp)
                            }

                            Column {
                                Text(
                                    text = "वेब वर्जन एवं स्टूडियो (Web Version)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "डेस्कटॉप, लैपटॉप और ब्राउज़र सपोर्ट",
                                    fontSize = 11.sp,
                                    color = Slate400
                                )
                            }
                        }

                        Surface(
                            color = Color(0xFF064E3B),
                            shape = RoundedCornerShape(4.dp),
                            border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF10B981))
                        ) {
                            Text(
                                text = "ONLINE",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF34D399),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "कंप्यूटर या लैपटॉप ब्राउज़र में फुल-स्क्रीन 1080x1350 न्यूज़ मेकर, वीडियो स्टूडियो और लाइव एडमिन पोर्टल चलाने के लिए नीचे दिए गए बटन पर टैप करें:",
                        fontSize = 12.sp,
                        color = Slate300,
                        lineHeight = 17.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = {
                                try {
                                    val intent = android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        android.net.Uri.parse(devWebStudioUrl)
                                    )
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "ब्राउज़र खोलने में असमर्थ: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Amber400),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(42.dp)
                        ) {
                            Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = Slate950, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("वेब वर्जन खोलें", color = Slate950, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                clipboardManager.setText(AnnotatedString(devWebStudioUrl))
                                Toast.makeText(context, "वेब स्टूडियो लिंक कॉपी हो गया!", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Amber400),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Amber400.copy(alpha = 0.6f)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(42.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("लिंक कॉपी करें", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 7. Google Play Store Compliance: Account & Associated Data Deletion Card
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF7F1D1D).copy(alpha = 0.8f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF7F1D1D).copy(alpha = 0.4f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("🗑️", fontSize = 20.sp)
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "खाता एवं डेटा प्रबंधन",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFCA5A5)
                                )
                                Surface(
                                    color = Color(0xFF991B1B).copy(alpha = 0.3f),
                                    shape = RoundedCornerShape(4.dp),
                                    border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFEF4444).copy(alpha = 0.5f))
                                ) {
                                    Text(
                                        text = "Google Play Policy",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFFFCA5A5),
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                    )
                                }
                            }
                            Text(
                                text = "Delete Account & Associated Data (डेटा सुरक्षा अनुपालन)",
                                fontSize = 11.sp,
                                color = Slate400
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "गूगल प्ले स्टोर की डेटा सुरक्षा नीति के अनुसार, आप किसी भी समय अपना खाता, प्रोफाइल, निर्मित समाचार, कस्टम ग्राफिक्स, ई-पेपर, ड्राफ्ट्स और क्लाउड सर्वर पर मौजूद समस्त डेटा स्थायी रूप से मिटा सकते हैं।",
                        fontSize = 12.sp,
                        color = Slate300,
                        lineHeight = 17.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Public Web Link Section for Google Play Console
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Slate950,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "🌐 गूगल प्ले कंसोल के लिए आधिकारिक खाता विलोपन लिंक (Public URL):",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber400
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = accountDeletionUrl,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        clipboardManager.setText(AnnotatedString(accountDeletionUrl))
                                        Toast.makeText(context, "खाता विलोपन लिंक कॉपी हो गया!", Toast.LENGTH_SHORT).show()
                                    },
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        contentColor = Amber400
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Amber400.copy(alpha = 0.6f)),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("लिंक कॉपी करें", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                OutlinedButton(
                                    onClick = {
                                        try {
                                            val intent = android.content.Intent(
                                                android.content.Intent.ACTION_VIEW,
                                                android.net.Uri.parse(accountDeletionUrl)
                                            )
                                            context.startActivity(intent)
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "ब्राउज़र खोलने में त्रुटि: ${e.message}", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        contentColor = Color(0xFF93C5FD)
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF3B82F6).copy(alpha = 0.6f)),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.OpenInBrowser, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("वेब पर खोलें", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // In-app Delete Account Button
                    Button(
                        onClick = {
                            confirmDeleteChecked = false
                            showDeleteAccountDialog = true
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFDC2626),
                            contentColor = Color.White
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .testTag("btn_delete_account_and_data")
                    ) {
                        Icon(Icons.Default.DeleteForever, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "खाता और समस्त डेटा हमेशा के लिए हटाएं (Delete Account & Data)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }

    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountDialog = false },
            containerColor = Slate900,
            titleContentColor = Color.White,
            textContentColor = Slate300,
            icon = {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(36.dp)
                )
            },
            title = {
                Text(
                    text = "क्या आप वाकई अपना खाता और डेटा हटाना चाहते हैं?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.White
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "खाता हटाने पर निम्नलिखित सभी डेटा तत्काल हमेशा के लिए नष्ट कर दिया जाएगा:",
                        fontSize = 12.sp,
                        color = Slate300
                    )
                    Text(
                        text = "• आपकी उपयोगकर्ता प्रोफाइल, नाम, ईमेल और मोबाइल नंबर\n• चैनल ब्रांडिंग, लोगो और सोशल मीडिया सेटिंग्स\n• आपके द्वारा निर्मित सभी न्यूज़ पोस्ट्स, ग्राफिक्स व वीडियो\n• कस्टम टेम्पलेट हेडर/फूटर एवं ड्राफ्ट्स\n• क्लाउड डेटाबेस से संबद्ध सभी अभिलेख",
                        fontSize = 11.sp,
                        color = Color(0xFFFCA5A5),
                        lineHeight = 16.sp
                    )
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFF450A0A).copy(alpha = 0.5f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF7F1D1D)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "⚠️ यह क्रिया पूर्ववत नहीं की जा सकती (This action cannot be undone)।",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFCA5A5),
                            modifier = Modifier.padding(8.dp)
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { confirmDeleteChecked = !confirmDeleteChecked }
                            .padding(vertical = 4.dp)
                    ) {
                        Checkbox(
                            checked = confirmDeleteChecked,
                            onCheckedChange = { confirmDeleteChecked = it },
                            colors = CheckboxDefaults.colors(
                                checkedColor = Color(0xFFDC2626),
                                uncheckedColor = Slate400
                            )
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "मैं पुष्टि करता हूँ कि मैं खाता व सभी डेटा स्थायी रूप से हटाना चाहता हूँ।",
                            fontSize = 11.sp,
                            color = Slate200
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteAccountDialog = false
                        AuthManager.deleteAccountAndAllData(context) {
                            Toast.makeText(
                                context,
                                "आपका खाता और सारा डेटा सफलतापूर्वक हटा दिया गया है।",
                                Toast.LENGTH_LONG
                            ).show()
                            onDeleteAccount()
                        }
                    },
                    enabled = confirmDeleteChecked,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFDC2626),
                        disabledContainerColor = Color(0xFF450A0A).copy(alpha = 0.5f),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("हाँ, स्थायी रूप से हटाएं", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showDeleteAccountDialog = false },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate300),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate700)
                ) {
                    Text("रद्द करें", fontSize = 12.sp)
                }
            }
        )
    }
}

/**
 * Dedicated Tab Content for: 'RSS/वेब लिंक जोड़ें'
 * Where Admin can:
 * 1. Choose RSS Feed or Web URL
 * 2. Select or enter Channel Name
 * 3. Enter RSS or Web Link URL
 * 4. Select relevant News Category
 * 5. Publish to Home Feed & manage existing feeds
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFeedSettingsTabContent(
    currentRole: UserRole,
    categories: List<ManagedCategory>,
    onNavigateToHome: () -> Unit,
    onMakeNewsClicked: (NewsPost) -> Unit,
    onActivateAdminRole: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val savedChannels by NewsRepository.savedChannels.collectAsState()
    val posts by NewsRepository.posts.collectAsState()

    var isRss by remember { mutableStateOf(true) }
    var selectedChannel by remember { mutableStateOf(savedChannels.firstOrNull() ?: "आज तक (Aaj Tak)") }
    var showNewChannelField by remember { mutableStateOf(false) }
    var newChannelInput by remember { mutableStateOf("") }
    var channelDropdownExpanded by remember { mutableStateOf(false) }

    var urlInput by remember { mutableStateOf("https://aajtak.in/rss.xml") }

    val usableCategories = remember(categories) {
        categories.filterNot { it.id == "all" }
    }
    var selectedCategoryName by remember {
        mutableStateOf(usableCategories.firstOrNull()?.displayName ?: "राजनीति")
    }

    var customHeadline by remember { mutableStateOf("") }
    var lastAddedMessage by remember { mutableStateOf<String?>(null) }

    val popularTopChannels = listOf(
        "आज तक (Aaj Tak)",
        "दैनिक भास्कर",
        "NDTV इंडिया",
        "ज़ी न्यूज़ (Zee News)",
        "अमर उजाला",
        "बीबीसी हिंदी"
    )

    val quickPresets = listOf(
        Triple("आज तक RSS", "https://aajtak.in/rss.xml", true),
        Triple("भास्कर RSS", "https://www.bhaskar.com/rss-v1--all.xml", true),
        Triple("NDTV वेब लिंक", "https://ndtv.in/india-news", false)
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Role Status Banner
        item {
            if (currentRole == UserRole.ADMIN) {
                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, NewsGold)
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = NewsGold, modifier = Modifier.size(20.dp))
                            Column {
                                Text("चीफ एडमिन एक्सेस सक्रिय", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("होम स्क्रीन के लिए RSS/वेब लिंक्स पब्लिश करें • 3 दिन की ऑटो-एक्सपायरी लागू", fontSize = 11.sp, color = Color(0xFFCBD5E1))
                            }
                        }
                        Surface(
                            color = NewsRedPrimary,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text("ADMIN", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            } else {
                Surface(
                    color = Color(0xFFFFFBEB),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCD34D))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(20.dp))
                            Text("आप वर्तमान में 'यूज़र मोड' में हैं", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF92400E))
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("होम फीड में RSS या वेब लिंक जोड़ने के लिए एडमिन रोल आवश्यक है। परीक्षण के लिए नीचे दिए गए बटन से तुरंत एडमिन रोल सक्रिय करें:", fontSize = 11.sp, color = Color(0xFFB45309))
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = onActivateAdminRole,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(36.dp)
                        ) {
                            Icon(Icons.Default.AdminPanelSettings, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("एडमिन रोल चालू करें (Switch to Admin)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Main In-Page Form Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Header
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(NewsRedPrimary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.AddLink, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(20.dp))
                        }
                        Column {
                            Text("नया RSS फीड या वेब लिंक जोड़ें", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = NewsBlack)
                            Text("होम स्क्रीन पर सीधे पोस्ट कार्ड के रूप में दिखेगा", fontSize = 11.sp, color = NewsSlate)
                        }
                    }

                    HorizontalDivider(color = NewsBorder, thickness = 0.5.dp)

                    // 1. प्रकार (Type) - RSS Feed vs Web Link
                    Column {
                        Text("1. प्रकार चुनें (Type):", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            FilterChip(
                                selected = isRss,
                                onClick = {
                                    isRss = true
                                    if (urlInput.contains("india-news")) {
                                        urlInput = "https://aajtak.in/rss.xml"
                                    }
                                },
                                label = { Text("RSS Feed (फीड)") },
                                leadingIcon = {
                                    Icon(Icons.Default.RssFeed, contentDescription = null, modifier = Modifier.size(16.dp))
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("chip_rss_feed"),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = NewsRedPrimary.copy(alpha = 0.12f),
                                    selectedLabelColor = NewsRedPrimary,
                                    selectedLeadingIconColor = NewsRedPrimary
                                )
                            )

                            FilterChip(
                                selected = !isRss,
                                onClick = {
                                    isRss = false
                                    if (urlInput.contains(".xml")) {
                                        urlInput = "https://aajtak.in/latest-news"
                                    }
                                },
                                label = { Text("Web Link (वेब लिंक)") },
                                leadingIcon = {
                                    Icon(Icons.Default.Link, contentDescription = null, modifier = Modifier.size(16.dp))
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("chip_web_link"),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFF0284C7).copy(alpha = 0.12f),
                                    selectedLabelColor = Color(0xFF0284C7),
                                    selectedLeadingIconColor = Color(0xFF0284C7)
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (isRss) "ℹ️ RSS फीड से चैनल की लाइव सुर्खियां सीधे होम फीड में सिंक होती हैं।"
                                   else "ℹ️ वेब लिंक से किसी भी ऑनलाइन न्यूज़ आर्टिकल का कार्ड और 1-क्लिक ग्राफिक बटन तैयार होगा।",
                            fontSize = 11.sp,
                            color = NewsSlate
                        )
                    }

                    // 2. चैनल का नाम (Channel Name)
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("2. न्यूज़ चैनल का नाम:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                            TextButton(
                                onClick = { showNewChannelField = !showNewChannelField },
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                            ) {
                                Icon(
                                    if (showNewChannelField) Icons.Default.List else Icons.Default.Add,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = NewsRedPrimary
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    if (showNewChannelField) "लिस्ट से चुनें" else "+ नया चैनल जोड़ें",
                                    fontSize = 11.sp,
                                    color = NewsRedPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        if (showNewChannelField) {
                            OutlinedTextField(
                                value = newChannelInput,
                                onValueChange = { newChannelInput = it },
                                label = { Text("नया चैनल का नाम लिखें") },
                                placeholder = { Text("जैसे: पंजाब केसरी, द वायर, पत्रिका") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("input_new_channel"),
                                shape = RoundedCornerShape(8.dp)
                            )
                        } else {
                            // Quick chips of popular channels
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                popularTopChannels.forEach { ch ->
                                    val isSelected = ch == selectedChannel
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = if (isSelected) NewsRedPrimary.copy(alpha = 0.12f) else Color(0xFFF1F5F9),
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) NewsRedPrimary else Color(0xFFE2E8F0)
                                        ),
                                        modifier = Modifier.clickable { selectedChannel = ch }
                                    ) {
                                        Text(
                                            text = ch,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSelected) NewsRedPrimary else NewsBlack,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Exposed Dropdown with all 25+ channels
                            ExposedDropdownMenuBox(
                                expanded = channelDropdownExpanded,
                                onExpandedChange = { channelDropdownExpanded = !channelDropdownExpanded }
                            ) {
                                OutlinedTextField(
                                    value = selectedChannel,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("या सभी 25+ चैनलों की ड्रॉपडाउन सूची") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = channelDropdownExpanded) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .menuAnchor()
                                        .testTag("dropdown_channel_select"),
                                    shape = RoundedCornerShape(8.dp)
                                )
                                ExposedDropdownMenu(
                                    expanded = channelDropdownExpanded,
                                    onDismissRequest = { channelDropdownExpanded = false }
                                ) {
                                    savedChannels.forEach { ch ->
                                        DropdownMenuItem(
                                            text = { Text(ch, fontSize = 13.sp) },
                                            onClick = {
                                                selectedChannel = ch
                                                channelDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 3. RSS फीड या वेब लिंक URL
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("3. RSS फीड / वेब लिंक URL:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                            TextButton(
                                onClick = {
                                    val clipText = clipboardManager.getText()?.text
                                    if (!clipText.isNullOrBlank()) {
                                        urlInput = clipText.trim()
                                        Toast.makeText(context, "क्लिपबोर्ड से लिंक पेस्ट किया गया", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "क्लिपबोर्ड खाली है", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                            ) {
                                Icon(Icons.Default.ContentPaste, contentDescription = null, modifier = Modifier.size(14.dp), tint = NewsRedPrimary)
                                Spacer(modifier = Modifier.width(2.dp))
                                Text("पेस्ट करें (Paste)", fontSize = 11.sp, color = NewsRedPrimary, fontWeight = FontWeight.Bold)
                            }
                        }

                        OutlinedTextField(
                            value = urlInput,
                            onValueChange = { urlInput = it },
                            placeholder = { Text(if (isRss) "https://example.com/rss.xml" else "https://example.com/news/article-slug") },
                            leadingIcon = {
                                Icon(Icons.Default.Link, contentDescription = null, tint = NewsSlate, modifier = Modifier.size(18.dp))
                            },
                            trailingIcon = {
                                if (urlInput.isNotEmpty()) {
                                    IconButton(onClick = { urlInput = "" }, modifier = Modifier.size(24.dp)) {
                                        Icon(Icons.Default.Close, contentDescription = "Clear", tint = NewsMuted, modifier = Modifier.size(16.dp))
                                    }
                                }
                            },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_rss_web_url"),
                            shape = RoundedCornerShape(8.dp)
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        // Quick sample presets
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("सैंपल:", fontSize = 11.sp, color = NewsMuted, modifier = Modifier.padding(top = 4.dp))
                            quickPresets.forEach { (label, presetUrl, presetIsRss) ->
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = Color(0xFFF1F5F9),
                                    border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFCBD5E1)),
                                    modifier = Modifier.clickable {
                                        urlInput = presetUrl
                                        isRss = presetIsRss
                                        if (presetUrl.contains("aajtak")) selectedChannel = "आज तक (Aaj Tak)"
                                        else if (presetUrl.contains("bhaskar")) selectedChannel = "दैनिक भास्कर"
                                        else if (presetUrl.contains("ndtv")) selectedChannel = "NDTV इंडिया"
                                    }
                                ) {
                                    Text(
                                        text = "+ $label",
                                        fontSize = 10.sp,
                                        color = NewsBlack,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }

                    // 4. संबंधित न्यूज़ कैटेगरी का चयन (Category Selection)
                    Column {
                        Text(
                            text = "4. संबंधित न्यूज़ कैटेगरी चुनें:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsBlack
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "यह खबर होम स्क्रीन पर इसी कैटेगरी टैब में दिखेगी:",
                            fontSize = 11.sp,
                            color = NewsSlate
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            usableCategories.forEach { cat ->
                                val isSelected = cat.displayName == selectedCategoryName
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategoryName = cat.displayName },
                                    label = {
                                        Text(
                                            text = cat.displayName,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    leadingIcon = if (isSelected) {
                                        { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp)) }
                                    } else null,
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = NewsRedPrimary.copy(alpha = 0.12f),
                                        selectedLabelColor = NewsRedPrimary,
                                        selectedLeadingIconColor = NewsRedPrimary
                                    )
                                )
                            }
                        }
                    }

                    // 5. कस्टम शीर्षक / हेडलाइन (वैकल्पिक)
                    Column {
                        Text("5. कस्टम शीर्षक / हेडलाइन (वैकल्पिक):", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = customHeadline,
                            onValueChange = { customHeadline = it },
                            placeholder = { Text("खाली छोड़ने पर चैनल का ऑटो शीर्षक उपयोग होगा") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }

                    // 6. पब्लिश बटन
                    Button(
                        onClick = {
                            val finalChannel = if (showNewChannelField && newChannelInput.isNotBlank()) {
                                newChannelInput.trim()
                            } else {
                                selectedChannel
                            }

                            if (urlInput.isBlank()) {
                                Toast.makeText(context, "कृपया URL लिंक दर्ज करें!", Toast.LENGTH_SHORT).show()
                                return@Button
                            }

                            if (isRss) {
                                NewsRepository.addRssFeedPost(
                                    channel = finalChannel,
                                    url = urlInput.trim(),
                                    categoryName = selectedCategoryName,
                                    customTitle = customHeadline.takeIf { it.isNotBlank() }
                                )
                            } else {
                                NewsRepository.addWebLinkPost(
                                    channel = finalChannel,
                                    url = urlInput.trim(),
                                    categoryName = selectedCategoryName,
                                    customTitle = customHeadline.takeIf { it.isNotBlank() }
                                )
                            }

                            lastAddedMessage = "‘$finalChannel’ का लिंक ($selectedCategoryName) सफलतापूर्वक होम फीड में जुड़ गया!"
                            Toast.makeText(context, "होम फीड में पब्लिश हुआ!", Toast.LENGTH_SHORT).show()
                            urlInput = ""
                            customHeadline = ""
                        },
                        enabled = urlInput.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("admin_publish_rss_web_button")
                    ) {
                        Icon(Icons.Default.Publish, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "होम फीड में पब्लिश करें (+ Publish to Home)",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // In-page success banner
                    lastAddedMessage?.let { msg ->
                        Surface(
                            color = Color(0xFFF0FDF4),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                    Text(msg, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF15803D))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedButton(
                                    onClick = onNavigateToHome,
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.height(34.dp)
                                ) {
                                    Icon(Icons.Default.Home, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color(0xFF15803D))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("होम स्क्रीन पर देखें (View on Home)", fontSize = 11.sp, color = Color(0xFF15803D), fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Active / Published Feeds on Home Feed
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
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
                            Icon(Icons.Default.DynamicFeed, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(20.dp))
                            Text("होम फीड में सक्रिय लिंक्स", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = NewsRedPrimary.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = "${posts.size} पोस्ट्स लाइव",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsRedPrimary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text("ये RSS फीड्स और वेब लिंक्स होम स्क्रीन पर लाइव दिखाई दे रहे हैं:", fontSize = 11.sp, color = NewsSlate)

                    Spacer(modifier = Modifier.height(10.dp))

                    if (posts.isEmpty()) {
                        Text("कोई एक्टिव लिंक नहीं है। ऊपर दिए फॉर्म से जोड़ें।", fontSize = 12.sp, color = NewsMuted)
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            posts.take(8).forEach { post ->
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFF8FAFC),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
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
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = if (post.isRssFeed) NewsRedPrimary else Color(0xFF0284C7)
                                                ) {
                                                    Text(
                                                        text = if (post.isRssFeed) "RSS FEED" else "WEB LINK",
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color.White,
                                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                    )
                                                }
                                                Text(post.sourceChannel, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = Color(0xFFE0E7FF)
                                                ) {
                                                    Text(post.categoryName, fontSize = 9.sp, color = Color(0xFF3730A3), modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                                }
                                            }

                                            Text(post.publishedTime, fontSize = 10.sp, color = NewsMuted)
                                        }

                                        Spacer(modifier = Modifier.height(6.dp))

                                        Text(
                                            text = post.title,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = NewsBlack,
                                            maxLines = 2
                                        )

                                        Spacer(modifier = Modifier.height(8.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            OutlinedButton(
                                                onClick = { onMakeNewsClicked(post) },
                                                shape = RoundedCornerShape(6.dp),
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                                modifier = Modifier.height(30.dp)
                                            ) {
                                                Icon(Icons.Default.Palette, contentDescription = null, modifier = Modifier.size(13.dp), tint = NewsRedPrimary)
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("खबर से ग्राफिक बनाएं", fontSize = 11.sp, color = NewsRedPrimary, fontWeight = FontWeight.Bold)
                                            }

                                            IconButton(
                                                onClick = {
                                                    NewsRepository.deletePost(post.id)
                                                    Toast.makeText(context, "लिंक हटाया गया", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(28.dp)
                                            ) {
                                                Icon(Icons.Default.DeleteOutline, contentDescription = "हटाएं", tint = Color.Gray, modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Tab Content for General Settings (Role Switcher, Header-Footer Customizer, Hub, System Info)
 */
@Composable
fun GeneralSettingsTabContent(
    currentRole: UserRole,
    context: Context,
    onOpenAdminConsole: () -> Unit,
    onSwitchToAddFeedTab: () -> Unit,
    onAddRssClick: () -> Unit
) {
    var showEditChannelDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Profile Header Card
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                shadowElevation = 2.dp,
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    colors = if (currentRole == UserRole.ADMIN) {
                                        listOf(NewsRedPrimary, NewsRedDark)
                                    } else {
                                        listOf(NewsSlate, NewsBlack)
                                    }
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (currentRole == UserRole.ADMIN) Icons.Default.AdminPanelSettings else Icons.Default.Person,
                            contentDescription = null,
                            tint = NewsGold,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = if (currentRole == UserRole.ADMIN) "चीफ एडमिन (Admin Desk)" else "न्यूज़ रीडर (News Reader)",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsBlack
                            )
                        }

                        Spacer(modifier = Modifier.height(3.dp))

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (currentRole == UserRole.ADMIN) NewsRedPrimary else NewsSlate
                        ) {
                            Text(
                                text = if (currentRole == UserRole.ADMIN) "सक्रिय रोल: एडमिन" else "सक्रिय रोल: यूज़र",
                                fontSize = 11.sp,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "AI NEWS MAKER v1.0 • नेटिव एंड्रॉइड",
                            fontSize = 11.sp,
                            color = NewsMuted
                        )
                    }
                }
            }
        }

        // Test Mode / View As: User Mode vs Admin Mode
        item {
            val adminViewAsMode by AuthManager.adminViewAsMode.collectAsState()
            val isUserModeActive = adminViewAsMode == "user" || currentRole == UserRole.USER

            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (isUserModeActive) Amber400 else NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Tune, contentDescription = null, tint = NewsRedPrimary)
                        Text(
                            text = "Test Mode / View As (टेस्ट मोड)",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsBlack
                        )
                        if (isUserModeActive) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(0xFFFEF3C7)
                            ) {
                                Text(
                                    text = "USER VIEW ACTIVE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFB45309),
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "एडमिन के रूप में आप ऐप को सामान्य यूजर के दृष्टिकोण से टेस्ट कर सकते हैं। एडमिन की वास्तविक अनुमतियाँ सुरक्षित रहेंगी।",
                        fontSize = 12.sp,
                        color = NewsSlate,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Option 1: Continue as Admin
                        val isAdminActive = !isUserModeActive
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    AuthManager.setAdminViewAsMode(context, "admin")
                                    NewsRepository.setUserRole(UserRole.ADMIN)
                                    Toast.makeText(context, "एडमिन मोड सक्रिय! सभी एडमिन कंट्रोल्स उपलब्ध हैं।", Toast.LENGTH_SHORT).show()
                                }
                                .border(
                                    1.5.dp,
                                    if (isAdminActive) NewsGoldDark else NewsBorder,
                                    RoundedCornerShape(8.dp)
                                )
                                .testTag("role_admin_button"),
                            color = if (isAdminActive) NewsGoldLight else Color(0xFFF8F9FA)
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 12.dp, horizontal = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.AdminPanelSettings,
                                    contentDescription = null,
                                    tint = if (isAdminActive) NewsGoldDark else NewsMuted
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Option 1: Continue as Admin",
                                    fontSize = 11.sp,
                                    fontWeight = if (isAdminActive) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isAdminActive) NewsGoldDark else NewsBlack
                                )
                                Text(
                                    text = "(एडमिन मोड जारी रखें)",
                                    fontSize = 10.sp,
                                    color = NewsSlate
                                )
                            }
                        }

                        // Option 2: Test as User
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    AuthManager.setAdminViewAsMode(context, "user")
                                    NewsRepository.setUserRole(UserRole.USER)
                                    Toast.makeText(context, "टेस्ट मोड सक्रिय: अब आप सामान्य यूजर की तरह ऐप देख रहे हैं।", Toast.LENGTH_SHORT).show()
                                }
                                .border(
                                    1.5.dp,
                                    if (isUserModeActive) NewsRedPrimary else NewsBorder,
                                    RoundedCornerShape(8.dp)
                                )
                                .testTag("role_user_button"),
                            color = if (isUserModeActive) Color(0xFFFFEBEE) else Color(0xFFF8F9FA)
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 12.dp, horizontal = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = if (isUserModeActive) NewsRedPrimary else NewsMuted
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Option 2: Test as User",
                                    fontSize = 11.sp,
                                    fontWeight = if (isUserModeActive) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isUserModeActive) NewsRedPrimary else NewsBlack
                                )
                                Text(
                                    text = "(सामान्य यूजर टेस्ट)",
                                    fontSize = 10.sp,
                                    color = NewsSlate
                                )
                            }
                        }
                    }
                }
            }
        }

        // Shortcut to RSS/Web Link Tab
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF1F2)),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsRedPrimary.copy(alpha = 0.3f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSwitchToAddFeedTab() }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Default.AddLink, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(24.dp))
                        Column {
                            Text("RSS/वेब लिंक पब्लिशर टैब", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                            Text("चैनल नाम व कैटेगरी चुनकर नई खबर पोस्ट करें", fontSize = 11.sp, color = NewsSlate)
                        }
                    }
                    Icon(Icons.Default.ArrowForward, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(18.dp))
                }
            }
        }

        // Header & Footer Setup in Profile
        item {
            ProfileHeaderFooterSection(context = context)
        }

        // Admin Console Hub (Visible in Admin Mode)
        if (currentRole == UserRole.ADMIN) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, NewsGold),
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
                                Icon(Icons.Default.Security, contentDescription = null, tint = NewsGold, modifier = Modifier.size(22.dp))
                                Text(
                                    text = "चीफ एडमिन कंसोल हब",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                            Surface(
                                color = NewsRedPrimary,
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = "SUPER ADMIN",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "मोबाइल से ही सभी यूज़र्स के प्रोजेक्ट्स, डायरेक्टिव कमांड्स, लाइव ब्रेकिंग टिकर और वेब एडमिन पोर्टल को नियंत्रित करें।",
                            fontSize = 12.sp,
                            color = Color(0xFFCBD5E1),
                            lineHeight = 16.sp
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = onOpenAdminConsole,
                            colors = ButtonDefaults.buttonColors(containerColor = NewsGold),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                        ) {
                            Icon(Icons.Default.Dashboard, contentDescription = null, tint = NewsBlack, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "मोबाइल एडमिन कंसोल खोलें",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsBlack
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Channel Branding & Profile Edit Button
                        OutlinedButton(
                            onClick = { showEditChannelDialog = true },
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                                .testTag("settings_channel_branding_button")
                        ) {
                            Icon(Icons.Default.Palette, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "🎨 चैनल ब्रांडिंग व प्रोफ़ाइल संपादित करें",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFB45309)
                            )
                        }
                    }
                }
            }
        }

        // App Architecture & Settings
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "सिस्टम एवं ऐप जानकारी",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = NewsBlack
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    ProfileOptionItem(
                        icon = Icons.Default.PhoneAndroid,
                        title = "प्लेटफ़ॉर्म आर्किटेक्चर",
                        subtitle = "वर्तमान: 100% नेटिव एंड्रॉइड (Kotlin) • भविष्य: iOS रेडी"
                    )

                    ProfileOptionItem(
                        icon = Icons.Default.Palette,
                        title = "न्यूज़ इंडस्ट्री थीम",
                        subtitle = "रेड, ब्लैक और गोल्डन एक्सेंट्स (सक्रिय)"
                    )

                    ProfileOptionItem(
                        icon = Icons.Default.Code,
                        title = "सोर्स कोड स्लॉट्स",
                        subtitle = "ग्राफिक, वीडियो और ई-पेपर इंजन मॉड्यूल्स पृथक रखे गए हैं"
                    )
                }
            }
        }
    }

    if (showEditChannelDialog) {
        EditChannelProfileDialog(
            context = context,
            onDismiss = { showEditChannelDialog = false }
        )
    }
}

/**
 * Tab Content for Dynamic Categories Management
 */
@Composable
fun CategoriesSettingsTabContent(
    categoriesList: List<ManagedCategory>,
    onAddCategoryClick: () -> Unit,
    onEditCategory: (ManagedCategory) -> Unit,
    context: Context
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, NewsGold),
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
                            Icon(Icons.Default.Category, contentDescription = null, tint = NewsRedPrimary)
                            Text(
                                text = "न्यूज़ श्रेणी / कैटेगरी प्रबंधन",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsBlack
                            )
                        }

                        IconButton(
                            onClick = onAddCategoryClick,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.AddCircle, contentDescription = "कैटेगरी जोड़ें", tint = NewsRedPrimary)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "होम स्क्रीन पर दिखने वाली श्रेणियों को जोड़ें या एडिट करें। यहां किए गए बदलाव तुरंत होम स्क्रीन पर लाइव अपडेट हो जाते हैं:",
                        fontSize = 12.sp,
                        color = NewsSlate
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categoriesList.forEach { cat ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (cat.id == "all") Color(0xFFF1F5F9) else Color(0xFFFFEBEE),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (cat.id == "all") Color(0xFFCBD5E1) else NewsRedPrimary.copy(alpha = 0.4f)
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = cat.displayName,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (cat.id == "all") NewsSlate else NewsRedPrimary
                                    )
                                    if (cat.id != "all") {
                                        Icon(
                                            imageVector = Icons.Default.Edit,
                                            contentDescription = "एडिट करें",
                                            modifier = Modifier
                                                .size(15.dp)
                                                .clickable { onEditCategory(cat) },
                                            tint = NewsSlate
                                        )
                                    }
                                    if (cat.isDeletable) {
                                        Icon(
                                            imageVector = Icons.Default.Close,
                                            contentDescription = "हटाएं",
                                            modifier = Modifier
                                                .size(15.dp)
                                                .clickable {
                                                    NewsRepository.deleteCategory(cat.id)
                                                    Toast.makeText(context, "${cat.displayName} श्रेणी हटाई गई", Toast.LENGTH_SHORT).show()
                                                },
                                            tint = Color.Gray
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedButton(
                        onClick = onAddCategoryClick,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("नई कैटेगरी जोड़ें (+ Add Category)", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun AddCategoryDialog(
    onDismiss: () -> Unit,
    onCategoryAdded: (String) -> Unit
) {
    var categoryName by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Category, contentDescription = null, tint = NewsRedPrimary)
                Text("नई न्यूज़ कैटेगरी जोड़ें", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("कैटेगरी का नाम दर्ज करें (जैसे: शिक्षा, ऑटो, पर्यावरण, सेहत)", fontSize = 12.sp, color = NewsSlate)
                OutlinedTextField(
                    value = categoryName,
                    onValueChange = { categoryName = it },
                    label = { Text("श्रेणी का नाम") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (categoryName.isNotBlank()) {
                        onCategoryAdded(categoryName.trim())
                    }
                },
                enabled = categoryName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("जोड़ें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("रद्द करें")
            }
        }
    )
}

@Composable
fun EditCategoryDialog(
    category: ManagedCategory,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedName by remember { mutableStateOf(category.displayName) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Edit, contentDescription = null, tint = NewsRedPrimary)
                Text("कैटेगरी का नाम बदलें", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("नया नाम दर्ज करें:", fontSize = 12.sp, color = NewsSlate)
                OutlinedTextField(
                    value = editedName,
                    onValueChange = { editedName = it },
                    label = { Text("श्रेणी का नाम") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (editedName.isNotBlank()) {
                        onSave(editedName.trim())
                    }
                },
                enabled = editedName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("सेव करें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("रद्द करें")
            }
        }
    )
}

@Composable
private fun ProfileOptionItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(icon, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(22.dp))
        Column {
            Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
            Text(text = subtitle, fontSize = 11.sp, color = NewsMuted)
        }
    }
}

/**
 * Redesigned AddPostDialog:
 * 1. प्रकार (Type) at top: RSS Feed or Web Link
 * 2. चैनल का नाम: List of 25+ saved channels + Add new channel option
 * 3. URL: RSS or Web Link URL
 * 4. कैटेगरी का चयन: ONLY visible if Web Link
 * 5. फीड में जोड़ें Button
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPostDialog(
    onDismiss: () -> Unit,
    onPostAdded: () -> Unit
) {
    val savedChannels by NewsRepository.savedChannels.collectAsState()
    val categories by NewsRepository.categories.collectAsState()

    var isRss by remember { mutableStateOf(true) }
    var selectedChannel by remember { mutableStateOf(savedChannels.firstOrNull() ?: "आज तक (Aaj Tak)") }
    var showNewChannelField by remember { mutableStateOf(false) }
    var newChannelInput by remember { mutableStateOf("") }
    var channelDropdownExpanded by remember { mutableStateOf(false) }

    var url by remember { mutableStateOf("https://aajtak.in/latest-news") }

    // Categories list excluding 'all'
    val usableCategories = remember(categories) {
        categories.filterNot { it.id == "all" }
    }
    var selectedCategoryName by remember {
        mutableStateOf(usableCategories.firstOrNull()?.displayName ?: "राजनीति")
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.AddLink, contentDescription = null, tint = NewsRedPrimary)
                Text("नया RSS फीड / वेब लिंक जोड़ें", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 1. प्रकार (Type) - सबसे ऊपर
                Column {
                    Text("1. प्रकार चुनें (Type):", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        FilterChip(
                            selected = isRss,
                            onClick = { isRss = true },
                            label = { Text("RSS Feed (फीड)") },
                            leadingIcon = {
                                Icon(Icons.Default.RssFeed, contentDescription = null, modifier = Modifier.size(16.dp))
                            },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = !isRss,
                            onClick = { isRss = false },
                            label = { Text("Web Link (वेब लिंक)") },
                            leadingIcon = {
                                Icon(Icons.Default.Link, contentDescription = null, modifier = Modifier.size(16.dp))
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // 2. चैनल का नाम (Channel Name) - Dropdown/List + Add new option
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("2. न्यूज़ चैनल का नाम:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                        TextButton(
                            onClick = { showNewChannelField = !showNewChannelField },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                        ) {
                            Icon(
                                if (showNewChannelField) Icons.Default.List else Icons.Default.Add,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = NewsRedPrimary
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                if (showNewChannelField) "लिस्ट से चुनें" else "+ नया चैनल जोड़ें",
                                fontSize = 11.sp,
                                color = NewsRedPrimary
                            )
                        }
                    }

                    if (showNewChannelField) {
                        OutlinedTextField(
                            value = newChannelInput,
                            onValueChange = { newChannelInput = it },
                            label = { Text("नया चैनल नाम टाइप करें") },
                            placeholder = { Text("जैसे: दैनिक भास्कर, अमर उजाला") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp)
                        )
                    } else {
                        ExposedDropdownMenuBox(
                            expanded = channelDropdownExpanded,
                            onExpandedChange = { channelDropdownExpanded = !channelDropdownExpanded }
                        ) {
                            OutlinedTextField(
                                value = selectedChannel,
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = channelDropdownExpanded) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                shape = RoundedCornerShape(8.dp)
                            )
                            ExposedDropdownMenu(
                                expanded = channelDropdownExpanded,
                                onDismissRequest = { channelDropdownExpanded = false }
                            ) {
                                savedChannels.forEach { ch ->
                                    DropdownMenuItem(
                                        text = { Text(ch, fontSize = 13.sp) },
                                        onClick = {
                                            selectedChannel = ch
                                            channelDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                // 3. URL (RSS या वेब लिंक URL)
                Column {
                    Text("3. लिंक URL दर्ज करें:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = url,
                        onValueChange = { url = it },
                        placeholder = { Text(if (isRss) "https://example.com/rss.xml" else "https://example.com/news/article") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    )
                }

                // 4. कैटेगरी का चयन - केवल वेब लिंक के लिए (Conditional Category selection)
                if (!isRss) {
                    Column {
                        Text("4. न्यूज़ कैटेगरी चुनें (Category):", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NewsBlack)
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            usableCategories.forEach { cat ->
                                val isSelected = cat.displayName == selectedCategoryName
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategoryName = cat.displayName },
                                    label = { Text(cat.displayName, fontSize = 11.sp) }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalChannel = if (showNewChannelField && newChannelInput.isNotBlank()) {
                        newChannelInput.trim()
                    } else {
                        selectedChannel
                    }

                    if (isRss) {
                        NewsRepository.addRssFeedPost(
                            channel = finalChannel,
                            url = url
                        )
                    } else {
                        NewsRepository.addWebLinkPost(
                            channel = finalChannel,
                            url = url,
                            categoryName = selectedCategoryName
                        )
                    }
                    onPostAdded()
                },
                enabled = url.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("फीड में जोड़ें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("रद्द करें")
            }
        }
    )
}

@Composable
fun ProfileHeaderFooterSection(context: Context) {
    var selectedTemplateId by remember { mutableStateOf("graphic_001") }
    var applyToAll by remember { mutableStateOf(TemplateConfigManager.isApplyToAll(context)) }

    val currentPlanTier by AuthManager.userPlanTier.collectAsState()
    val currentUser by AuthManager.currentUser.collectAsState()
    val isProOrVip = currentPlanTier.lowercase() in listOf("professional", "ultra", "pro", "vip", "vip desk") || currentUser?.role == UserRole.ADMIN
    
    // Loaded values for current template
    var brandName by remember { mutableStateOf("") }
    var brandTagline by remember { mutableStateOf("") }
    var customLogoUrl by remember { mutableStateOf(AuthManager.channelLogoUrl.value) }
    var customHeaderPng by remember { mutableStateOf("") }
    var whatsappNumber by remember { mutableStateOf("") }
    var socialHandle by remember { mutableStateOf("") }
    var newsUpdateBadge by remember { mutableStateOf("") }
    var customFooterPng by remember { mutableStateOf("") }
    var isConfigured by remember { mutableStateOf(false) }

    // Load config whenever selectedTemplate changes
    fun loadConfig(tId: String) {
        val conf = TemplateConfigManager.getTemplateConfig(context, tId)
        brandName = conf.brandName
        brandTagline = conf.brandTagline
        customLogoUrl = conf.customLogoUrl.ifBlank { AuthManager.channelLogoUrl.value }
        customHeaderPng = conf.customHeaderPng
        whatsappNumber = conf.whatsappNumber
        socialHandle = conf.socialHandle
        newsUpdateBadge = conf.newsUpdateBadge
        customFooterPng = conf.customFooterPng
        isConfigured = conf.isConfigured
    }

    LaunchedEffect(selectedTemplateId) {
        loadConfig(selectedTemplateId)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(NewsGold.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Palette,
                        contentDescription = null,
                        tint = NewsRedPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Column {
                    Text(
                        text = "ग्राफिक हेडर एवं फुटर सेटिंग्स",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = NewsBlack
                    )
                    Text(
                        text = "यहाँ अपना चैनल लोगो, नाम व सोशल फुटर सेट करें",
                        fontSize = 11.sp,
                        color = NewsSlate
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 1. Template Selection Dropdown
            Text(
                text = "1. न्यूज़ टेम्पलेट चुनें (Select News Template):",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = NewsBlack
            )
            Spacer(modifier = Modifier.height(6.dp))

            var isDropdownExpanded by remember { mutableStateOf(false) }
            val currentTemplateLabel = TemplateConfigManager.AVAILABLE_TEMPLATES.find { it.first == selectedTemplateId }?.second
                ?: "1. ओरिजिनल रेड-येलो (Standard Breaking)"

            Box(modifier = Modifier.fillMaxWidth()) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFF8FAFC),
                    border = androidx.compose.foundation.BorderStroke(
                        1.5.dp,
                        if (isDropdownExpanded) NewsRedPrimary else NewsBorder
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { isDropdownExpanded = !isDropdownExpanded }
                        .testTag("template_selection_dropdown")
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
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(NewsRedPrimary.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Layers,
                                    contentDescription = null,
                                    tint = NewsRedPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Column {
                                Text(
                                    text = currentTemplateLabel,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = NewsBlack
                                )
                                Text(
                                    text = if (isConfigured) "विशेष हेडर-फुटर सहेजा हुआ है" else "डिफ़ॉल्ट हेडर-फुटर ('योर लोगो' व 'योर फुटर')",
                                    fontSize = 11.sp,
                                    color = if (isConfigured) Color(0xFF166534) else NewsMuted
                                )
                            }
                        }
                        Icon(
                            imageVector = if (isDropdownExpanded) Icons.Default.ArrowDropUp else Icons.Default.ArrowDropDown,
                            contentDescription = "ड्रॉपडाउन टॉगल करें",
                            tint = NewsRedPrimary,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }

                DropdownMenu(
                    expanded = isDropdownExpanded,
                    onDismissRequest = { isDropdownExpanded = false },
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .background(Color.White)
                ) {
                    TemplateConfigManager.AVAILABLE_TEMPLATES.forEach { (id, label) ->
                        val isSelected = selectedTemplateId == id
                        val templateConf = TemplateConfigManager.getTemplateConfig(context, id)
                        val isTempConfigured = templateConf.isConfigured

                        DropdownMenuItem(
                            text = {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = label,
                                            fontSize = 12.5.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) NewsRedPrimary else NewsBlack
                                        )
                                        Text(
                                            text = if (isTempConfigured) "कस्टम हेडर-फुटर सहेजा हुआ" else "डिफ़ॉल्ट प्लेसहोल्डर",
                                            fontSize = 10.5.sp,
                                            color = if (isTempConfigured) Color(0xFF166534) else NewsMuted
                                        )
                                    }
                                    if (isSelected) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "चयनित",
                                            tint = NewsRedPrimary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            },
                            onClick = {
                                selectedTemplateId = id
                                isDropdownExpanded = false
                            },
                            modifier = Modifier
                                .background(if (isSelected) Color(0xFFFEF2F2) else Color.Transparent)
                                .testTag("template_dropdown_item_$id")
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Quick Scrollable Chips for fast 1-tap switching
            if (TemplateConfigManager.AVAILABLE_TEMPLATES.isEmpty()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFF8FAFC),
                    border = androidx.compose.foundation.BorderStroke(1.dp, NewsBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "📋 अभी कोई टेम्पलेट नहीं है। सैंपल इमेज (Graphic 1, Graphic 2...) प्राप्त होने पर यहाँ टेम्पलेट्स प्रदर्शित होंगे।",
                        fontSize = 11.sp,
                        color = NewsSlate,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    TemplateConfigManager.AVAILABLE_TEMPLATES.forEach { (id, label) ->
                        val isSelected = selectedTemplateId == id
                        val shortName = label.substringBefore(" (")
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (isSelected) NewsRedPrimary else Color(0xFFF1F5F9),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSelected) NewsGold else NewsBorder
                            ),
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .clickable {
                                    selectedTemplateId = id
                                }
                        ) {
                            Text(
                                text = shortName,
                                fontSize = 10.5.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Color.White else NewsBlack,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 2. "सेम हेडर-फुटर सारे टेम्प्लेट में रहेंगे" Checkbox / Switch
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (applyToAll) Color(0xFFFFFBEB) else Color(0xFFF8FAFC),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (applyToAll) NewsGold else NewsBorder
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "सभी टेम्पलेट्स में समान हेडर-फुटर लागू करें",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (applyToAll) NewsBlack else NewsSlate
                        )
                        Text(
                            text = if (applyToAll) "सक्रिय: यह हेडर-फुटर सभी 9 टेम्पलेट्स में दिखेगा" else "प्रत्येक टेम्पलेट के लिए अलग-अलग सेट करें",
                            fontSize = 10.5.sp,
                            color = NewsMuted
                        )
                    }
                    Switch(
                        checked = applyToAll,
                        onCheckedChange = {
                            applyToAll = it
                            TemplateConfigManager.setApplyToAll(context, it)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Status Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = if (isConfigured) Color(0xFFDCFCE7) else Color(0xFFFEF3C7)
                ) {
                    Text(
                        text = if (isConfigured) "✅ हेडर-फुटर कॉन्फ़िगर है" else "ℹ️ हेडर-फुटर सेट नहीं है (स्टूडियो में 'योर लोगो' व 'योर फुटर' दिखेगा)",
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isConfigured) Color(0xFF166534) else Color(0xFF92400E),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Section A: Header Details
            Text(
                text = "हेडर सेटिंग्स (Header Details):",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = NewsBlack
            )
            Spacer(modifier = Modifier.height(6.dp))

            OutlinedTextField(
                value = brandName,
                onValueChange = { brandName = it },
                label = { Text("चैनल / ब्रांड नाम (Brand Name)") },
                placeholder = { Text("उदा. ब्रेकिंग न्यूज़ वाला") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = brandTagline,
                onValueChange = { brandTagline = it },
                label = { Text("टैगलाइन (Tagline)") },
                placeholder = { Text("उदा. भारत के जिलों से आपके दिलों तक") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = customLogoUrl,
                onValueChange = { customLogoUrl = it },
                label = { Text("लोगो इमेज URL / लिंक (Logo URL)") },
                placeholder = { Text("https://... या लोगो लिंक") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            if (isProOrVip) {
                OutlinedTextField(
                    value = customHeaderPng,
                    onValueChange = { customHeaderPng = it },
                    label = { Text("कस्टम पूरा हेडर बैनर PNG लिंक (PRO / VIP DESK)") },
                    placeholder = { Text("कस्टम हेडर स्ट्रिप PNG इमेज URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                Text(
                    text = "💡 कस्टम हेडर अपलोड होने पर डिफ़ॉल्ट लोकेशन व लोगो बॉक्स स्वतः हाइड हो जाएंगे।",
                    fontSize = 10.sp,
                    color = NewsSlate,
                    modifier = Modifier.padding(start = 4.dp, top = 2.dp)
                )
            } else {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFEF2F2),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(18.dp))
                        Column {
                            Text(
                                text = "🔒 कस्टम हेडर अपलोड केवल PRO व VIP DESK में उपलब्ध है",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsRedPrimary
                            )
                            Text(
                                text = "BASIC और ADVANCED प्लान में कस्टम हेडर उपलब्ध नहीं है। अपग्रेड करें।",
                                fontSize = 10.sp,
                                color = NewsSlate
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Section B: Footer Details
            Text(
                text = "फुटर सेटिंग्स (Footer Details):",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = NewsBlack
            )
            Spacer(modifier = Modifier.height(6.dp))

            OutlinedTextField(
                value = whatsappNumber,
                onValueChange = { whatsappNumber = it },
                label = { Text("व्हाट्सएप नंबर (WhatsApp Number)") },
                placeholder = { Text("उदा. +91 96698 02408") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = socialHandle,
                onValueChange = { socialHandle = it },
                label = { Text("सोशल मीडिया हैंडल (Social Handle)") },
                placeholder = { Text("उदा. @BreakingNewsWala") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = newsUpdateBadge,
                onValueChange = { newsUpdateBadge = it },
                label = { Text("फुटर बैज टेक्स्ट (Footer Badge)") },
                placeholder = { Text("उदा. NEWS UPDATE") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            if (isProOrVip) {
                OutlinedTextField(
                    value = customFooterPng,
                    onValueChange = { customFooterPng = it },
                    label = { Text("कस्टम पूरा फुटर स्ट्रिप PNG लिंक (PRO / VIP DESK)") },
                    placeholder = { Text("कस्टम फुटर स्ट्रिप PNG इमेज URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                Text(
                    text = "💡 कस्टम फुटर अपलोड होने पर डिफ़ॉल्ट फिक्स्ड फुटर स्वतः हाइड हो जाएगा।",
                    fontSize = 10.sp,
                    color = NewsSlate,
                    modifier = Modifier.padding(start = 4.dp, top = 2.dp)
                )
            } else {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFEF2F2),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(18.dp))
                        Column {
                            Text(
                                text = "🔒 कस्टम फुटर अपलोड केवल PRO व VIP DESK में उपलब्ध है",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = NewsRedPrimary
                            )
                            Text(
                                text = "BASIC और ADVANCED प्लान में कस्टम फुटर उपलब्ध नहीं है। अपग्रेड करें।",
                                fontSize = 10.sp,
                                color = NewsSlate
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        val config = TemplateHeaderFooter(
                            templateId = selectedTemplateId,
                            brandName = brandName.trim(),
                            brandTagline = brandTagline.trim(),
                            customLogoUrl = customLogoUrl.trim(),
                            customHeaderPng = if (isProOrVip) customHeaderPng.trim() else "",
                            whatsappNumber = whatsappNumber.trim(),
                            socialHandle = socialHandle.trim(),
                            newsUpdateBadge = newsUpdateBadge.trim(),
                            customFooterPng = if (isProOrVip) customFooterPng.trim() else "",
                            isConfigured = true
                        )
                        TemplateConfigManager.saveTemplateConfig(context, config, applyToAll)
                        isConfigured = true
                        Toast.makeText(
                            context,
                            if (applyToAll) "✅ सभी टेम्पलेट्स के लिए हेडर-फुटर सुरक्षित हुआ!"
                            else "✅ टेम्पलेट हेडर-फुटर सुरक्षित हुआ!",
                            Toast.LENGTH_SHORT
                        ).show()
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("हेडर-फुटर सुरक्षित करें")
                }

                OutlinedButton(
                    onClick = {
                        TemplateConfigManager.deleteTemplateConfig(context, selectedTemplateId)
                        brandName = ""
                        brandTagline = ""
                        customLogoUrl = ""
                        customHeaderPng = ""
                        whatsappNumber = ""
                        socialHandle = ""
                        newsUpdateBadge = ""
                        customFooterPng = ""
                        isConfigured = false
                        Toast.makeText(context, "हेडर-फुटर हटाया गया। स्टूडियो में 'योर लोगो' दिखेगा।", Toast.LENGTH_SHORT).show()
                    },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = NewsRedPrimary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("हटाएं", color = NewsRedPrimary)
                }
            }
        }
    }
}

@Composable
fun EditChannelProfileDialog(
    context: Context,
    onDismiss: () -> Unit
) {
    var fullName by remember { mutableStateOf(com.example.data.AuthManager.currentUser.value?.name ?: "मुख्य संपादक") }
    var channelNameHi by remember { mutableStateOf(com.example.data.AuthManager.channelNameHi.value) }
    var channelNameEn by remember { mutableStateOf(com.example.data.AuthManager.channelNameEn.value) }
    var channelLogoUrl by remember { mutableStateOf(com.example.data.AuthManager.channelLogoUrl.value) }
    var channelLogoType by remember { mutableStateOf(com.example.data.AuthManager.channelLogoType.value) }
    var yt by remember { mutableStateOf(com.example.data.AuthManager.socialYoutube.value) }
    var fb by remember { mutableStateOf(com.example.data.AuthManager.socialFacebook.value) }
    var insta by remember { mutableStateOf(com.example.data.AuthManager.socialInstagram.value) }
    var tw by remember { mutableStateOf(com.example.data.AuthManager.socialTwitter.value) }
    var wa by remember { mutableStateOf(com.example.data.AuthManager.socialWhatsapp.value) }
    var waNumber by remember { mutableStateOf(com.example.data.AuthManager.whatsappNumber.value) }
    var websiteUrl by remember { mutableStateOf(com.example.data.AuthManager.websiteUrl.value) }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Slate900,
            border = androidx.compose.foundation.BorderStroke(1.dp, Slate700),
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            val textFieldColors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = Amber400,
                unfocusedBorderColor = Slate700,
                focusedLabelColor = Amber400,
                unfocusedLabelColor = Slate400,
                cursorColor = Amber400,
                focusedContainerColor = Slate950,
                unfocusedContainerColor = Slate950
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🎨 चैनल ब्रांडिंग व प्रोफ़ाइल",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Slate400)
                    }
                }

                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("पूरा नाम / रिपोर्टर नाम") },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = channelNameHi,
                    onValueChange = { channelNameHi = it },
                    label = { Text("चैनल नाम (हिन्दी)") },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = channelNameEn,
                    onValueChange = { channelNameEn = it },
                    label = { Text("चैनल नाम (English)") },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = channelLogoUrl,
                    onValueChange = { channelLogoUrl = it },
                    label = { Text("लोगो URL या डेटा") },
                    placeholder = { Text("उदा. https://... या डेटा लिंक", color = Slate500) },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "सोशल मीडिया आइकन दिखाएं:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate300
                )

                val chipColors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Amber500,
                    selectedLabelColor = Slate950,
                    containerColor = Slate800,
                    labelColor = Slate300
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = yt,
                        onClick = { yt = !yt },
                        label = { Text("YouTube") },
                        colors = chipColors
                    )
                    FilterChip(
                        selected = fb,
                        onClick = { fb = !fb },
                        label = { Text("Facebook") },
                        colors = chipColors
                    )
                    FilterChip(
                        selected = insta,
                        onClick = { insta = !insta },
                        label = { Text("Insta") },
                        colors = chipColors
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = tw,
                        onClick = { tw = !tw },
                        label = { Text("Twitter/X") },
                        colors = chipColors
                    )
                    FilterChip(
                        selected = wa,
                        onClick = { wa = !wa },
                        label = { Text("WhatsApp") },
                        colors = chipColors
                    )
                }

                OutlinedTextField(
                    value = waNumber,
                    onValueChange = { waNumber = it },
                    label = { Text("WhatsApp नंबर (वैकल्पिक)") },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = websiteUrl,
                    onValueChange = { websiteUrl = it },
                    label = { Text("वेबसाइट URL (Website Link)") },
                    placeholder = { Text("ainewsmaker.online", color = Slate500) },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate700),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate300),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("रद्द करें")
                    }

                    Button(
                        onClick = {
                            com.example.data.AuthManager.saveChannelProfile(
                                context = context,
                                fullName = fullName,
                                channelNameHi = channelNameHi,
                                channelNameEn = channelNameEn,
                                channelLogoUrl = channelLogoUrl,
                                channelLogoType = channelLogoType,
                                youtube = yt,
                                facebook = fb,
                                instagram = insta,
                                twitter = tw,
                                whatsapp = wa,
                                whatsappNumber = waNumber,
                                websiteUrl = websiteUrl
                            )
                            Toast.makeText(context, "✅ चैनल प्रोफ़ाइल सहेजी गई", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500, contentColor = Slate950),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("सहेजें (Save)", color = Slate950, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
