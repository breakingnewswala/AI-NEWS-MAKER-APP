package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.EPaperPage
import com.example.ui.theme.*

@Composable
fun EPaperScreen(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedEdition by remember { mutableStateOf("राष्ट्रीय (National)") }
    var selectedPageNumber by remember { mutableStateOf(1) }

    val editions = listOf("राष्ट्रीय (National)", "दिल्ली एनसीआर", "मुंबई", "लखनऊ", "भोपाल", "जयपुर")

    val samplePages = remember {
        listOf(
            EPaperPage(
                pageNumber = 1,
                title = "मुख्य पृष्ठ (Front Page)",
                subtitle = "देश-दुनिया की बड़ी खबरें",
                headlines = listOf(
                    "डिजिटल मीडिया एवं AI न्यूज़ पर ऐतिहासिक नीति पारित",
                    "भारतीय अर्थव्यवस्था 8.2% की दर से अग्रसर",
                    "टेक्नोलॉजी में भारत का नया स्वर्णिम युग"
                )
            ),
            EPaperPage(
                pageNumber = 2,
                title = "देश-प्रदेश (National)",
                subtitle = "राज्यों से महत्वपूर्ण अपडेट्स",
                headlines = listOf(
                    "रेलवे नेटवर्क का 100% विद्युतीकरण पूर्ण",
                    "नई राष्ट्रीय खेल नीति को मंजूरी",
                    "स्वास्थ्य क्षेत्र में आयुष्मान भारत का विस्तार"
                )
            ),
            EPaperPage(
                pageNumber = 3,
                title = "संपादकीय एवं विचार (Editorial)",
                subtitle = "विशेषज्ञों का नजरिया",
                headlines = listOf(
                    "कृत्रिम बुद्धिमत्ता और भविष्य की पत्रकारिता",
                    "जलवायु परिवर्तन की चुनौतियां और समाधान"
                )
            ),
            EPaperPage(
                pageNumber = 4,
                title = "व्यापार एवं खेल (Business & Sports)",
                subtitle = "मार्केट और खेल जगत की हलचल",
                headlines = listOf(
                    "सेंसेक्स में रिकॉर्ड स्तर, स्टार्टअप्स को बूस्ट",
                    "विश्वकप की तैयारियों में जुटी भारतीय टीम"
                )
            )
        )
    }

    val currentPage = samplePages.firstOrNull { it.pageNumber == selectedPageNumber } ?: samplePages.first()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Slate950),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 90.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Section Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MenuBook,
                        contentDescription = null,
                        tint = Amber400,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = "दैनिक ई-पेपर (E-Paper)",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Slate900,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Amber400, modifier = Modifier.size(13.dp))
                        Text(
                            text = "आज का अंक",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Amber400
                        )
                    }
                }
            }
        }

        // Edition Selector Row
        item {
            Column {
                Text(
                    text = "संस्करण चुनें (Select Edition)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate400
                )
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(editions) { edition ->
                        val isSelected = edition == selectedEdition
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (isSelected) Amber400 else Slate900,
                            border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .clickable { selectedEdition = edition }
                        ) {
                            Text(
                                text = edition,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSelected) Slate950 else Slate400,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // Page Number Switcher
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "पृष्ठ संख्या:",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    samplePages.forEach { page ->
                        val isSelected = page.pageNumber == selectedPageNumber
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (isSelected) Amber400 else Slate900,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSelected) Amber400 else Slate800
                            ),
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .clickable { selectedPageNumber = page.pageNumber }
                                .testTag("epaper_page_${page.pageNumber}")
                        ) {
                            Text(
                                text = "पेज ${page.pageNumber}",
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) Slate950 else Slate400,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                    }
                }
            }
        }

        // E-Paper Sheet Replica Layout (Dark Broadsheet Newsprint Look)
        item {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(elevation = 4.dp, shape = RoundedCornerShape(10.dp)),
                shape = RoundedCornerShape(10.dp),
                color = Slate900,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp)
                ) {
                    // Masthead
                    Text(
                        text = "AI NEWS MAKER - ई-संस्करण",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Serif,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "$selectedEdition | वर्ष 1, अंक 124", fontSize = 9.sp, color = Slate400)
                        Text(text = "पेज संख्या ${currentPage.pageNumber}", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Amber400)
                    }

                    Divider(color = Slate800, thickness = 1.5.dp, modifier = Modifier.padding(vertical = 6.dp))

                    // Page Headline Box
                    Text(
                        text = currentPage.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Amber400,
                        fontFamily = FontFamily.Serif
                    )

                    Text(
                        text = currentPage.subtitle,
                        fontSize = 12.sp,
                        color = Slate400,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    // Newsprint multi-column articles
                    currentPage.headlines.forEachIndexed { index, hl ->
                        Surface(
                            color = Slate950,
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(color = NewsRedPrimary, shape = RoundedCornerShape(2.dp)) {
                                        Text(
                                            text = "लेख ${index + 1}",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                        )
                                    }
                                    Text(
                                        text = hl,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "विशेष संवाददाता द्वारा विस्तृत रिपोर्टिंग के अनुसार यह बदलाव भारतीय मीडिया परिदृश्य में अभूतपूर्व प्रभाव डालेगा...",
                                    fontSize = 11.sp,
                                    color = Slate400,
                                    maxLines = 2
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // PDF Download & Full View buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                Toast.makeText(context, "ई-पेपर PDF डाउनलोड शुरू हो गया", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = NewsRedPrimary),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("PDF डाउनलोड", fontSize = 12.sp, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = {
                                Toast.makeText(context, "फुल स्क्रीन मोड सक्रिय", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Slate700)
                        ) {
                            Icon(Icons.Default.Fullscreen, contentDescription = null, tint = Slate200, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("फुल स्क्रीन", fontSize = 12.sp, color = Slate200)
                        }
                    }
                }
            }
        }

        // Dedicated E-Paper Source Code Slot Container
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Slate900),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Amber400),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.IntegrationInstructions,
                                contentDescription = null,
                                tint = Amber400,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "ई-पेपर सोर्स कोड स्लॉट (EPaper Engine)",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        Surface(
                            color = Amber400,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "SEPARATE MODULE",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = Slate950,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "• ई-पेपर का अलग आर्किटेक्चर यहाँ पृथक (separate) रखा गया है।\n• आपके द्वारा प्रदान किए जाने वाले PDF रेंडरर, ई-पेपर ज़ूम व्यूअर और कटआउट टूल सोर्स कोड को सीधे इस सेक्शन में माउंट किया जाएगा।",
                        fontSize = 12.sp,
                        color = Slate300,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Module Path: com.example.epaper.EPaperModule (Reserved)",
                        fontSize = 11.sp,
                        color = Amber400,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}
