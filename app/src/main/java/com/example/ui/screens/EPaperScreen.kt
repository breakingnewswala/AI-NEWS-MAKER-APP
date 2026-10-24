package com.example.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.Amber400
import com.example.ui.theme.NewsBorder
import com.example.ui.theme.Red600
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900

@Composable
fun EPaperScreen(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedEdition by remember { mutableStateOf("राष्ट्रीय मुख्य संस्करण") }
    var selectedPageNumber by remember { mutableIntStateOf(1) }

    val editions = listOf("राष्ट्रीय मुख्य संस्करण", "दिल्ली NCR", "उत्तर प्रदेश / लखनऊ", "मध्य प्रदेश / भोपाल")
    val pages = (1..6).toList()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Slate900)
    ) {
        // Top Edition Bar
        Surface(
            color = Slate800,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.MenuBook,
                            contentDescription = null,
                            tint = Amber400,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "दैनिक डिजिटल ई-पेपर",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    Row {
                        IconButton(onClick = {
                            Toast.makeText(context, "ई-पेपर PDF डाउनलोड हो रहा है...", Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.Download, contentDescription = "डाउनलोड", tint = Amber400)
                        }

                        IconButton(onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "आज का दैनिक ई-पेपर संस्करण यहाँ पढ़ें: https://ainewsmaker.online/epaper")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "ई-पेपर शेयर करें"))
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "शेयर", tint = Color.LightGray)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Edition Selector
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(editions) { edition ->
                        val isSelected = selectedEdition == edition
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedEdition = edition },
                            label = { Text(edition, fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Red600,
                                selectedLabelColor = Color.White,
                                containerColor = Slate900,
                                labelColor = Color.LightGray
                            )
                        )
                    }
                }
            }
        }

        // Page Numbers Strip
        Surface(
            color = Slate900,
            modifier = Modifier.fillMaxWidth()
        ) {
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(pages) { pageNum ->
                    val isSelected = selectedPageNumber == pageNum
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isSelected) Amber400 else Slate800)
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "पेज $pageNum",
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Slate900 else Color.LightGray
                        )
                    }
                }
            }
        }

        // E-Paper Sheet simulation
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(12.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            item {
                Card(
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                    border = BorderStroke(2.dp, Color(0xFFCBD5E1)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("epaper_sheet")
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // Newspaper Masthead
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "AI NEWS MAKER DIGITAL",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF0F172A),
                                letterSpacing = 1.sp
                            )
                            Divider(
                                color = Color.Black,
                                thickness = 2.dp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("वर्ष 5 | अंक 142", fontSize = 10.sp, color = Color.DarkGray)
                                Text(selectedEdition, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.DarkGray)
                                Text("पेज सं. $selectedPageNumber", fontSize = 10.sp, color = Color.DarkGray)
                            }
                            Divider(
                                color = Color.Black,
                                thickness = 1.dp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Lead Headline
                        Text(
                            text = "सुप्रीम कोर्ट का ऐतिहासिक आदेश: देश भर में डिजिटल मीडिया और एआई के लिए पारदर्शी राष्ट्रीय नीति लागू",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF991B1B),
                            lineHeight = 24.sp,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "नई दिल्ली (विशेष संवाददाता) — पांच जजों की संविधान पीठ ने डिजिटल समाचार, सोशल मीडिया और एआई प्लेटफॉर्म्स के लिए अनिवार्य सुरक्षा मानकों को तुरंत प्रभाव से लागू करने का निर्देश दिया है। अदालत ने कहा कि नागरिक सुरक्षा और जवाबदेही प्राथमिक है।",
                            fontSize = 13.sp,
                            color = Color(0xFF1E293B),
                            lineHeight = 18.sp,
                            textAlign = TextAlign.Justify
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Multi-Column Layout
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "🚀 अंतरिक्ष में भारत की छलांग",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "इसरो ने भारतीय अंतरिक्ष स्टेशन (BAS) के प्रथम क्रू-डॉकिंग मॉड्यूल का ग्राउंड टेस्ट सफलतापूर्वक पूरा किया। 2035 तक स्थायी स्टेशन की योजना।",
                                    fontSize = 11.sp,
                                    color = Color(0xFF334155),
                                    lineHeight = 15.sp
                                )
                            }

                            Divider(
                                modifier = Modifier
                                    .width(1.dp)
                                    .height(100.dp),
                                color = Color.LightGray
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "📈 बाजार में रिकॉर्ड तेजी",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "सेंसेक्स 85,500 के ऐतिहासिक स्तर पर बंद हुआ। निवेशकों की संपत्ति में 3.2 लाख करोड़ का इजाफा दर्ज हुआ।",
                                    fontSize = 11.sp,
                                    color = Color(0xFF334155),
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
