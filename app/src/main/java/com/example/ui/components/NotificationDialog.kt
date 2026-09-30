package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.*

data class NotificationItem(
    val id: String,
    val title: String,
    val description: String,
    val time: String,
    val isAlert: Boolean = false
)

@Composable
fun NotificationDialog(
    onDismiss: () -> Unit
) {
    val sampleNotifications = listOf(
        NotificationItem(
            id = "n1",
            title = "🔴 ब्रेकिंग अलर्ट: नई राष्ट्रीय AI पॉलिसी जारी",
            description = "लाइव फीड में नया पोस्ट उपलब्ध है। 1-क्लिक में हेडर-फुटर जैकेट तैयार करें।",
            time = "5 मिनट पहले",
            isAlert = true
        ),
        NotificationItem(
            id = "n2",
            title = "✨ न्यूज़ जैकेट तैयार",
            description = "दैनिक भास्कर की रिपोर्ट का ग्राफिक न्यूज़ रूम में तैयार है।",
            time = "15 मिनट पहले"
        ),
        NotificationItem(
            id = "n3",
            title = "📰 नया ई-पेपर संस्करण उपलब्ध",
            description = "आज का राष्ट्रीय संस्करण (पेज 1-4) पढ़ने हेतु तैयार है।",
            time = "1 घंटा पहले"
        )
    )

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            shadowElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(NewsRedPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.NotificationsActive,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            text = "सूचनाएं एवं अलर्ट (Notifications)",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = NewsBlack
                        )
                    }

                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = NewsSlate)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = NewsBorder)
                Spacer(modifier = Modifier.height(10.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.heightIn(max = 350.dp)
                ) {
                    items(sampleNotifications, key = { it.id }) { notif ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (notif.isAlert) Color(0xFFFFF1F2) else Color(0xFFF9FAFB),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (notif.isAlert) Color(0xFFFECDD3) else NewsBorder
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = notif.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (notif.isAlert) NewsRedDark else NewsBlack
                                    )
                                }
                                Spacer(modifier = Modifier.height(3.dp))
                                Text(
                                    text = notif.description,
                                    fontSize = 11.sp,
                                    color = NewsSlate
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = notif.time,
                                    fontSize = 10.sp,
                                    color = NewsMuted
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = NewsBlack),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("ठीक है (Close)", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
