package com.example.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.RssFeed
import androidx.compose.ui.graphics.vector.ImageVector

enum class AdminTab(
    val title: String,
    val icon: ImageVector
) {
    OVERVIEW("डैशबोर्ड", Icons.Default.Dashboard),
    PROJECTS("यूज़र प्रोजेक्ट्स", Icons.Default.Assignment),
    FEEDS("RSS चैनल्स", Icons.Default.RssFeed),
    BRANDING("मास्टर जैकेट", Icons.Default.Brush),
    WEB_PORTAL("वेब पोर्टल", Icons.Default.Language)
}
