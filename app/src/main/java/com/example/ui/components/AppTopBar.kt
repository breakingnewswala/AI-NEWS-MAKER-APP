package com.example.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.R
import com.example.data.NewsRepository
import com.example.model.UserRole
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    currentTab: AppTab = AppTab.HOME,
    onRefreshClick: () -> Unit,
    onLogoutClick: (() -> Unit)? = null,
    onNotificationClick: () -> Unit,
    onAdminConsoleClick: (() -> Unit)? = null,
    onSettingsClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val currentRole by NewsRepository.userRole.collectAsState()
    val userProfile by NewsRepository.userProfile.collectAsState()
    val currentUser by com.example.data.AuthManager.currentUser.collectAsState()
    val adminViewAsMode by com.example.data.AuthManager.adminViewAsMode.collectAsState()
    val userPlanTier by com.example.data.AuthManager.userPlanTier.collectAsState()

    val planDisplay = when (userPlanTier) {
        "enterprise", "ultra" -> "अल्ट्रा"
        "pro", "professional" -> "प्रोफेशनल"
        "standard", "advanced" -> "एडवांस"
        "basic" -> "7-डे ट्रायल"
        else -> "7-डे ट्रायल"
    }

    // Refresh button spin animation state
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val rotation by animateFloatAsState(
        targetValue = if (isRefreshing) 360f else 0f,
        animationSpec = tween(durationMillis = 600, easing = LinearEasing),
        finishedListener = { isRefreshing = false },
        label = "refresh_rotation"
    )

    // Pulsing/Blinking LIVE badge animation matching Web Studio
    val infiniteTransition = rememberInfiniteTransition(label = "live_pulse")
    val liveAlpha by infiniteTransition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 650, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "live_alpha"
    )

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Slate950,
        shadowElevation = 8.dp
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Left: Official Fixed AI NEWS MAKER Logo & App Title + Blinking LIVE
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Official AI NEWS MAKER Logo with Gold/Red Ring
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color.Black)
                            .border(
                                1.5.dp,
                                Brush.sweepGradient(listOf(Amber400, NewsRedPrimary, Amber400)),
                                CircleShape
                            )
                            .testTag("app_official_logo_circle"),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_app_logo),
                            contentDescription = "AI NEWS MAKER Logo",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    }

                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "AI NEWS MAKER",
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.5.sp
                            )

                            // Pulsing / Blinking LIVE Badge matching Web Studio
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(0xFFDC2626).copy(alpha = liveAlpha),
                                modifier = Modifier.padding(start = 6.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(4.dp)
                                            .clip(CircleShape)
                                            .background(Color.White)
                                    )
                                    Text(
                                        text = "LIVE",
                                        color = Color.White,
                                        fontSize = 8.5.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 0.5.sp
                                    )
                                }
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "स्मार्ट डिजिटल न्यूज़ स्टूडियो",
                                color = Slate400,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 0.2.sp
                            )
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(0xFF1E293B),
                                border = androidx.compose.foundation.BorderStroke(0.6.dp, Amber400.copy(alpha = 0.6f)),
                                modifier = Modifier.testTag("header_plan_badge")
                            ) {
                                Text(
                                    text = "⚡ $planDisplay",
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Amber400,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 0.5.dp)
                                )
                            }
                        }
                    }
                }

                // Right: Global Refresh Button + Notification Bell
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // When in Settings (PROFILE): Show only text "लॉग आउट" at the top as requested
                    if (currentTab == AppTab.PROFILE && onLogoutClick != null) {
                        Text(
                            text = "लॉग आउट",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFEF4444),
                            modifier = Modifier
                                .clickable { onLogoutClick() }
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                                .testTag("app_header_logout_text")
                        )
                    } else {
                        // Sleek Dark Refresh Button (रिफ्रेश)
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = Slate900,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                            modifier = Modifier
                                .clip(RoundedCornerShape(18.dp))
                                .clickable {
                                    isRefreshing = true
                                    onRefreshClick()
                                }
                                .testTag("app_header_refresh_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "रिफ्रेश",
                                    tint = NewsRedPrimary,
                                    modifier = Modifier
                                        .size(14.dp)
                                        .rotate(rotation)
                                )
                                Text(
                                    text = "रिफ्रेश",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate200
                                )
                            }
                        }

                        // RSS management is now kept exclusively in the Admin / Control Panel section (ProfileScreen)
                    }

                    IconButton(
                        onClick = onNotificationClick,
                        modifier = Modifier
                            .testTag("notification_button")
                            .size(36.dp)
                    ) {
                        Box {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "सूचनाएं",
                                tint = Slate200,
                                modifier = Modifier.size(22.dp)
                            )
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(NewsRedPrimary)
                            )
                        }
                    }
                }
            }

            // Global Test Mode Banner for Admin testing as User
            if (currentUser?.role == UserRole.ADMIN && adminViewAsMode == "user") {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFF451A03),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Amber400)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = "🧪 टेस्ट मोड:",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Amber400
                            )
                            Text(
                                text = "सामान्य यूजर व्यू (Admin अनुमतियाँ सुरक्षित)",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Amber400,
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    com.example.data.AuthManager.setAdminViewAsMode(context, "admin")
                                }
                                .testTag("exit_test_mode_button")
                        ) {
                            Text(
                                text = "एडमिन मोड में लौटें",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Slate950,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
            }

            // Dark border divider
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Slate800)
            )
        }
    }
}

