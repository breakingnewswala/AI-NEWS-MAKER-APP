package com.example.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.vector.ImageVector

enum class ControlPanelTab(
    val title: String,
    val icon: ImageVector,
    val testTag: String
) {
    PROFILE("1. प्रोफाइल व प्लान अपग्रेड", Icons.Default.Person, "tab_control_profile"),
    DASHBOARD("2. डैशबोर्ड (RSS व कैटेगरी)", Icons.Default.Dashboard, "tab_control_dashboard")
}
