package com.example.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.Amber400
import com.example.ui.theme.Red600
import com.example.ui.theme.Red800
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900

@Composable
fun AppBottomBar(
    currentTab: AppTab,
    onTabSelected: (AppTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .shadow(16.dp, RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
        color = Slate900,
        tonalElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
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

            // Center prominent Studio action button
            Box(
                modifier = Modifier
                    .weight(1.2f)
                    .padding(horizontal = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                val isStudioSelected = currentTab == AppTab.STUDIO
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .testTag(AppTab.STUDIO.tag)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            brush = if (isStudioSelected) {
                                Brush.linearGradient(listOf(Red600, Amber400))
                            } else {
                                Brush.linearGradient(listOf(Red800, Slate800))
                            }
                        )
                        .clickable { onTabSelected(AppTab.STUDIO) }
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = AppTab.STUDIO.icon,
                        contentDescription = AppTab.STUDIO.title,
                        tint = if (isStudioSelected) Color.White else Amber400,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = AppTab.STUDIO.title,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            BottomNavButton(
                tab = AppTab.NEWSROOM,
                selected = currentTab == AppTab.NEWSROOM,
                onClick = { onTabSelected(AppTab.NEWSROOM) },
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
}

@Composable
private fun BottomNavButton(
    tab: AppTab,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val iconColor by animateColorAsState(
        targetValue = if (selected) Amber400 else Color.LightGray,
        label = "nav_icon_color"
    )
    val textColor by animateColorAsState(
        targetValue = if (selected) Color.White else Color.Gray,
        label = "nav_text_color"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier
            .testTag(tab.tag)
            .clip(RoundedCornerShape(8.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { onClick() }
            .padding(vertical = 6.dp)
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = tab.title,
            tint = iconColor,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(3.dp))
        Text(
            text = tab.title,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = textColor
        )
    }
}
