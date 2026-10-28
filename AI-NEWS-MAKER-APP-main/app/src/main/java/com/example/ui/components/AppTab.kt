package com.example.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Tune
import androidx.compose.ui.graphics.vector.ImageVector

enum class AppTab(
    val title: String,
    val icon: ImageVector,
    val tag: String
) {
    HOME("होम", Icons.Default.Home, "tab_home"),
    VIDEOS("वीडियो", Icons.Default.PlayCircle, "tab_videos"),
    STUDIO("स्टूडियो", Icons.Default.AutoAwesome, "tab_studio"),
    NEWSROOM("न्यूज़रूम", Icons.Default.MenuBook, "tab_newsroom"),
    PROFILE("कंट्रोल पैनल", Icons.Default.Tune, "tab_profile")
}
