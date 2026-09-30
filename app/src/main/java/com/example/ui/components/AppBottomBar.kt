package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

enum class AppTab(val title: String, val icon: ImageVector, val tag: String) {
    HOME("होम", Icons.Default.Home, "tab_home"),
    VIDEOS("वीडियो", Icons.Default.PlayCircle, "tab_videos"),
    NEWSROOM("स्टूडियो", Icons.Default.AutoAwesome, "tab_newsroom"),
    EPAPER("ई-पेपर", Icons.Default.MenuBook, "tab_epaper"),
    PROFILE("कंट्रोल पैनल", Icons.Default.Tune, "tab_profile")
}

@Composable
fun AppBottomBar(
    currentTab: AppTab,
    onTabSelected: (AppTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
        contentAlignment = Alignment.BottomCenter
    ) {
        // Base Navigation Bar Surface (Dark Theme matching Web Studio)
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(66.dp),
            color = Slate950,
            shadowElevation = 16.dp,
            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left 2 items: Home, Videos
                BottomNavButton(
                    tab = AppTab.HOME,
                    selected = currentTab == AppTab.HOME,
                    onClick = { onTabSelected(AppTab.HOME) },
                    modifier = Modifier.weight(1f)
                )

                BottomNavButton(
                    tab = AppTab.VIDEOS,
                    selected = currentTab == AppTab.VIDEOS,
                    onClick = { onTabSelected(AppTab.VIDEOS) },
                    modifier = Modifier.weight(1f)
                )

                // Spacer for the center floating Studio button
                Spacer(modifier = Modifier.weight(1.15f))

                // Right 2 items: E-Paper, Control Panel
                BottomNavButton(
                    tab = AppTab.EPAPER,
                    selected = currentTab == AppTab.EPAPER,
                    onClick = { onTabSelected(AppTab.EPAPER) },
                    modifier = Modifier.weight(1f)
                )

                BottomNavButton(
                    tab = AppTab.PROFILE,
                    selected = currentTab == AppTab.PROFILE,
                    onClick = { onTabSelected(AppTab.PROFILE) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Protruding / Floating Studio Center Button matching Web Studio
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .width(72.dp)
                .offset(y = (-14).dp)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = { onTabSelected(AppTab.NEWSROOM) }
                )
                .testTag("tab_newsroom")
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .shadow(
                        elevation = 12.dp,
                        shape = CircleShape,
                        spotColor = if (currentTab == AppTab.NEWSROOM) Amber500 else Color(0xFFDC2626)
                    )
                    .border(
                        width = 2.5.dp,
                        brush = Brush.linearGradient(listOf(Amber400, Color(0xFFDC2626), Amber400)),
                        shape = CircleShape
                    )
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = if (currentTab == AppTab.NEWSROOM) {
                                listOf(Color(0xFFDC2626), Amber500, Color(0xFFDC2626))
                            } else {
                                listOf(Color(0xFF991B1B), Color(0xFFB45309), Color(0xFF7F1D1D))
                            }
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = "स्टूडियो",
                    tint = Color.White,
                    modifier = Modifier.size(26.dp)
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = "स्टूडियो",
                fontSize = 10.sp,
                fontWeight = if (currentTab == AppTab.NEWSROOM) FontWeight.Black else FontWeight.Bold,
                color = if (currentTab == AppTab.NEWSROOM) Amber400 else Color(0xFFFDE68A),
                letterSpacing = 0.2.sp
            )
        }
    }
}

@Composable
private fun BottomNavButton(
    tab: AppTab,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(bounded = true),
                onClick = onClick
            )
            .testTag(tab.tag),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = tab.title,
            tint = if (selected) Amber400 else Slate400,
            modifier = Modifier.size(22.dp)
        )

        Spacer(modifier = Modifier.height(3.dp))

        Text(
            text = tab.title,
            fontSize = 10.5.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = if (selected) Amber400 else Slate400
        )
    }
}
