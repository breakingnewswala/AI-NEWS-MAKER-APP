package com.example.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class AppFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        try {
            val prefs = getSharedPreferences("app_fcm_prefs", Context.MODE_PRIVATE)
            prefs.edit().putString("fcm_device_token", token).apply()
        } catch (_: Exception) {}
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: "AI NEWS MAKER"
        val body = remoteMessage.notification?.body
            ?: remoteMessage.data["message"]
            ?: remoteMessage.data["body"]
            ?: "नई ताज़ा खबर उपलब्ध है"
        val newsId = remoteMessage.data["newsId"] ?: remoteMessage.data["postId"] ?: ""

        // Trigger live In-App notification when WebView is active
        try {
            val safeTitle = title.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "")
            val safeBody = body.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "")
            val safeId = newsId.replace("\\", "\\\\").replace("'", "\\'")
            MainActivity.activeWebView?.post {
                MainActivity.activeWebView?.evaluateJavascript(
                    "(function() { " +
                    "window.dispatchEvent(new CustomEvent('ai_news_notification_received', { detail: { title: '$safeTitle', message: '$safeBody', body: '$safeBody', newsId: '$safeId', postId: '$safeId' } })); " +
                    "if (window.addAppNotification) { window.addAppNotification({ title: '$safeTitle', message: '$safeBody', newsId: '$safeId', type: 'news', unread: true }); } " +
                    "})();",
                    null
                )
            }
        } catch (_: Exception) {}

        sendNotification(title, body, newsId)
    }

    private fun sendNotification(title: String, body: String, newsId: String) {
        val channelId = "ai_news_breaking_channel"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "ब्रेकिंग न्यूज़ अलर्ट्स",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "AI News Maker ताज़ा ब्रेकिंग न्यूज़ सूचनाएं"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            if (newsId.isNotBlank()) {
                putExtra("newsId", newsId)
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            (System.currentTimeMillis() % 100000).toInt(),
            intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        notificationManager.notify((System.currentTimeMillis() % 100000).toInt(), notificationBuilder.build())
    }
}
