package com.example.ui.components

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.model.NewsProject
import com.example.ui.theme.Amber400
import com.example.ui.theme.Red600
import com.example.ui.theme.Slate900

@Composable
fun ExportProgressDialog(
    isExporting: Boolean,
    progress: Float,
    isSuccess: Boolean,
    project: NewsProject?,
    onDismiss: () -> Unit,
    onViewSaved: () -> Unit,
    onDownloadToPhone: ((Uri) -> Unit)? = null
) {
    Dialog(onDismissRequest = {
        if (!isExporting) onDismiss()
    }) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Slate900,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .testTag("export_progress_dialog")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (isExporting) {
                    CircularProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.size(64.dp),
                        color = Amber400,
                        trackColor = Color.DarkGray,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "एचडी वीडियो रेंडर हो रहा है...",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "${(progress * 100).toInt()}% संपन्न",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Amber400
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = Red600,
                        trackColor = Color.DarkGray
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "कृपया इंतज़ार करें, उच्च गुणवत्ता वाला वीडियो तैयार किया जा रहा है...",
                        fontSize = 12.sp,
                        color = Color.LightGray,
                        textAlign = TextAlign.Center
                    )
                } else if (isSuccess) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF16A34A).copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF22C55E),
                            modifier = Modifier.size(44.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "एक्सपोर्ट सफलतापूर्वक संपन्न!",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    if (project != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = project.title,
                            fontSize = 13.sp,
                            color = Color.LightGray,
                            textAlign = TextAlign.Center,
                            maxLines = 2
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = onViewSaved,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Amber400)
                    ) {
                        Icon(Icons.Default.Visibility, contentDescription = null, tint = Slate900)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("सहेजे गए प्रोजेक्ट्स देखें", color = Slate900, fontWeight = FontWeight.Bold)
                    }

                    if (onDownloadToPhone != null && project != null && project.mediaUri.isNotBlank()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = { onDownloadToPhone(Uri.parse(project.mediaUri)) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.CloudDownload, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("गैलरी में सेव करें", color = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("बंद करें", color = Color.Gray)
                    }
                }
            }
        }
    }
}
