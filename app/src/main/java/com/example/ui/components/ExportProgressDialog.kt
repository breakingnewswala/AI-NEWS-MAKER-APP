package com.example.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.FirebaseCloudStorageManager
import com.example.model.NewsProject
import com.example.ui.theme.NewsBlack
import com.example.ui.theme.NewsCardDark
import com.example.ui.theme.NewsGrayText
import com.example.ui.theme.NewsRed
import com.example.ui.theme.NewsSurfaceDark
import com.example.ui.theme.NewsWhite
import com.example.ui.theme.NewsYellow
import com.example.util.VideoExportDownloader

@Composable
fun ExportProgressDialog(
    isExporting: Boolean,
    progress: Float,
    isSuccess: Boolean,
    project: NewsProject?,
    onDismiss: () -> Unit,
    onViewSaved: () -> Unit,
    onDownloadToPhone: ((NewsProject) -> Unit)? = null
) {
    if (!isExporting && !isSuccess) return

    var isUploadingToCloud by remember { mutableStateOf(false) }
    var cloudUploadProgress by remember { mutableFloatStateOf(0f) }
    var cloudVideoUrl by remember { mutableStateOf<String?>(null) }
    var cloudUploadError by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = { if (!isExporting && !isUploadingToCloud) onDismiss() }) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = NewsSurfaceDark,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.5.dp, NewsYellow, RoundedCornerShape(16.dp))
                .testTag("export_dialog")
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (isExporting) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(NewsRed.copy(alpha = 0.2f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = NewsYellow,
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(48.dp)
                        )
                        Icon(
                            imageVector = Icons.Default.Movie,
                            contentDescription = "Rendering",
                            tint = NewsRed,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Rendering News Video...",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = NewsWhite
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Composing live tickers, headlines, and studio audio overlay in 1080p Full HD",
                        fontSize = 12.sp,
                        color = NewsGrayText,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp),
                        color = NewsYellow,
                        trackColor = NewsCardDark
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "${(progress * 100).toInt()}%",
                        color = NewsYellow,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                } else if (isSuccess && project != null) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(NewsYellow, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Success",
                            tint = NewsRed,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Video Ready & Saved!",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = NewsWhite
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = project.title.ifBlank { "Breaking News Special" },
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = NewsYellow,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = "Aspect: ${project.aspectRatio.label} • Ready to post on YouTube & Shorts",
                        fontSize = 11.sp,
                        color = NewsGrayText
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    val context = LocalContext.current
                    val videoUri = project.mediaUri?.let { Uri.parse(it) }

                    // Jacket confirmed banner
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF1B5E20), RoundedCornerShape(8.dp))
                            .border(1.dp, NewsYellow, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "✓ न्यूज़ जैकेट, ब्रेकिंग टिकर और हेडलाइंस वीडियो में सफलतापूर्वक रेंडर हो चुकी हैं!",
                            color = NewsWhite,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (videoUri != null) {
                        // 1. Play Video button
                        Button(
                            onClick = { VideoExportDownloader.playVideoInDevice(context, videoUri) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = NewsRed,
                                contentColor = NewsWhite
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Play",
                                tint = NewsYellow,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "वीडियो तुरंत चलाएं (Play Video)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // 2. Share to WhatsApp / Social button
                        Button(
                            onClick = { VideoExportDownloader.shareVideo(context, videoUri, project.firstTitle) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF25D366), // WhatsApp Green
                                contentColor = NewsWhite
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Share",
                                tint = NewsWhite,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "व्हाट्सएप / सोशल मीडिया पर भेजें (Share)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // 3. Firebase Cloud Storage Upload (Auto-deletes in 4 days)
                        if (cloudVideoUrl != null) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF064E3B), RoundedCornerShape(8.dp))
                                    .border(1.dp, Color(0xFF34D399), RoundedCornerShape(8.dp))
                                    .padding(10.dp)
                            ) {
                                Column {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.CloudDone,
                                            contentDescription = null,
                                            tint = Color(0xFF34D399),
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "☁️ क्लाउड लिंक तैयार (4 दिन में स्वतः डिलीट)",
                                            color = Color(0xFF6EE7B7),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Button(
                                            onClick = {
                                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                                val clip = ClipData.newPlainText("News Video Link", cloudVideoUrl)
                                                clipboard.setPrimaryClip(clip)
                                                Toast.makeText(context, "क्लाउड लिंक कॉपी हो गया!", Toast.LENGTH_SHORT).show()
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(38.dp),
                                            shape = RoundedCornerShape(6.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF047857))
                                        ) {
                                            Icon(Icons.Default.ContentCopy, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("लिंक कॉपी", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                        }
                                        Button(
                                            onClick = {
                                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                                    type = "text/plain"
                                                    putExtra(Intent.EXTRA_SUBJECT, project.title)
                                                    putExtra(
                                                        Intent.EXTRA_TEXT,
                                                        "📰 ब्रेकिंग न्यूज़ वीडियो: ${project.title}\n\n🎬 वीडियो लिंक (4 दिन वैध):\n$cloudVideoUrl"
                                                    )
                                                }
                                                context.startActivity(Intent.createChooser(shareIntent, "Share Video Link"))
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(38.dp),
                                            shape = RoundedCornerShape(6.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                                        ) {
                                            Icon(Icons.Default.Share, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("लिंक शेयर", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        } else {
                            Button(
                                onClick = {
                                    if (!isUploadingToCloud) {
                                        isUploadingToCloud = true
                                        cloudUploadError = null
                                        FirebaseCloudStorageManager.uploadVideo(
                                            context = context,
                                            videoUri = videoUri,
                                            title = project.title,
                                            onProgress = { p -> cloudUploadProgress = p },
                                            onSuccess = { url, _ ->
                                                isUploadingToCloud = false
                                                cloudVideoUrl = url
                                                Toast.makeText(context, "✅ क्लाउड अपलोड सफल!", Toast.LENGTH_SHORT).show()
                                            },
                                            onError = { err ->
                                                isUploadingToCloud = false
                                                cloudUploadError = err
                                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                            }
                                        )
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF0284C7),
                                    contentColor = NewsWhite
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                            ) {
                                if (isUploadingToCloud) {
                                    CircularProgressIndicator(
                                        color = NewsWhite,
                                        strokeWidth = 2.dp,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "क्लाउड अपलोड हो रहा है... ${(cloudUploadProgress * 100).toInt()}%",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.CloudUpload,
                                        contentDescription = null,
                                        tint = NewsWhite,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "☁️ Firebase क्लाउड अपलोड (4 दिन ऑटो-डिलीट लिंक)",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    if (onDownloadToPhone != null) {
                        Button(
                            onClick = { onDownloadToPhone(project) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2E7D32),
                                contentColor = NewsWhite
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(42.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Download,
                                contentDescription = "Download",
                                tint = NewsYellow,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "गैलरी में दोबारा सुरक्षित करें (Download)",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                onDismiss()
                                onViewSaved()
                            },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = NewsYellow
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("View Saved", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = onDismiss,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = NewsRed,
                                contentColor = NewsWhite
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Done", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
