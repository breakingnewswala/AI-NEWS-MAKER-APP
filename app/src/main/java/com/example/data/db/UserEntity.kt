package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_users")
data class UserEntity(
    @PrimaryKey
    val email: String,
    val fullName: String,
    val mobileNumber: String = "",
    val district: String = "सेंट्रल डेस्क",
    val channelNameHi: String = "एआई न्यूज़ मेकर",
    val channelNameEn: String = "AI News Maker",
    val channelLogoUrl: String = "",
    val channelLogoType: String = "png",
    val websiteUrl: String = "ainewsmaker.online",
    val role: String = "USER",
    val planTier: String = "basic",
    val isOnboarded: Boolean = true,
    val isOtpVerified: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
