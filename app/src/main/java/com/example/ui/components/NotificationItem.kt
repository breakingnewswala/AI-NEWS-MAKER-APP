package com.example.ui.components

data class NotificationItem(
    val id: String,
    val title: String,
    val description: String,
    val time: String,
    val isAlert: Boolean = false
)
