package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.Amber400
import com.example.ui.theme.NewsBorder
import com.example.ui.theme.Red600
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900

@Composable
fun NotificationDialog(
    onDismiss: () -> Unit
) {
    val sampleNotifications = remember {
        listOf(
            NotificationItem(
                id = "n-1",
                title = "🔴 नई ब्रेकिंग न्यूज़ अलर्ट",
                description = "सुप्रीम कोर्ट द्वारा डिजिटल मीडिया गाइडलाइंस पर नया फैसला जारी किया गया है।",
                time = "5 मिनट पहले",
                isAlert = true
            ),
            NotificationItem(
                id = "n-2",
                title = "🎬 वीडियो रेंडरिंग सफल",
                description = "आपका 'संसद विशेष सत्र' एचडी वीडियो एक्सपोर्ट तैयार है।",
                time = "25 मिनट पहले",
                isAlert = false
            ),
            NotificationItem(
                id = "n-3",
                title = "📰 नया ई-पेपर संस्करण उपलब्ध",
                description = "दैनिक संस्करण पेज 1 से 6 तक प्रकाशित हो चुका है।",
                time = "1 घंटा पहले",
                isAlert = false
            ),
            NotificationItem(
                id = "n-4",
                title = "⚡ एडमिन कमांड प्राप्त",
                description = "चीफ एडिटर द्वारा आज के मुख्य पैकेज पर प्राथमिकता मार्क की गई है।",
                time = "2 घंटे पहले",
                isAlert = true
            )
        )
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Slate900,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .testTag("notification_dialog")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.NotificationsActive,
                            contentDescription = null,
                            tint = Amber400,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "न्यूज़ अपडेट्स एवं सूचनाएं",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "बंद करें",
                            tint = Color.LightGray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 360.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(sampleNotifications, key = { it.id }) { item ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (item.isAlert) Slate800 else Slate900,
                            border = BorderStroke(
                                1.dp,
                                if (item.isAlert) Red600.copy(alpha = 0.5f) else NewsBorder
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = item.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (item.isAlert) Amber400 else Color.White
                                    )
                                    Text(
                                        text = item.time,
                                        fontSize = 10.sp,
                                        color = Color.Gray
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = item.description,
                                    fontSize = 12.sp,
                                    color = Color.LightGray,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Red600)
                ) {
                    Text("ठीक है (बंद करें)", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
