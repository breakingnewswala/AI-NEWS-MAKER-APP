package com.example.data

import android.util.Log
import com.example.model.NewsCategory
import com.example.model.NewsPost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.StringReader
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

object LiveFeedNetworkManager {
    private const val TAG = "LiveFeedNetworkManager"

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
    }

    private const val USER_AGENT =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

    /**
     * Fetch and parse real live RSS / Atom XML feed over the internet
     */
    suspend fun fetchRssFeed(
        feedUrl: String,
        channelName: String,
        category: NewsCategory = NewsCategory.BREAKING
    ): List<NewsPost> = withContext(Dispatchers.IO) {
        val cleanUrl = feedUrl.trim()
        if (cleanUrl.isBlank()) return@withContext emptyList()

        try {
            val request = Request.Builder()
                .url(cleanUrl)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/rss+xml, application/xml, text/xml, */*")
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.w(TAG, "RSS fetch HTTP error: ${response.code} for $cleanUrl")
                return@withContext emptyList()
            }

            val bodyString = response.body?.string() ?: return@withContext emptyList()
            parseRssXml(bodyString, cleanUrl, channelName, category)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching live RSS feed: $cleanUrl", e)
            emptyList()
        }
    }

    /**
     * Parse RSS 2.0 / Atom XML content safely
     */
    private fun parseRssXml(
        xmlContent: String,
        feedUrl: String,
        channelName: String,
        category: NewsCategory
    ): List<NewsPost> {
        val result = mutableListOf<NewsPost>()
        try {
            val factory = XmlPullParserFactory.newInstance()
            factory.isNamespaceAware = false
            val parser = factory.newPullParser()
            parser.setInput(StringReader(xmlContent))

            var eventType = parser.eventType
            var inItem = false

            var currentTitle = ""
            var currentLink = ""
            var currentDesc = ""
            var currentPubDate = ""
            var currentImageUrl = ""

            while (eventType != XmlPullParser.END_DOCUMENT) {
                val tagName = parser.name?.lowercase() ?: ""
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        if (tagName == "item" || tagName == "entry") {
                            inItem = true
                            currentTitle = ""
                            currentLink = ""
                            currentDesc = ""
                            currentPubDate = ""
                            currentImageUrl = ""
                        } else if (inItem) {
                            when (tagName) {
                                "title" -> currentTitle = parser.nextText().cleanHtml()
                                "link" -> {
                                    val href = parser.getAttributeValue(null, "href")
                                    currentLink = if (!href.isNullOrBlank()) href else parser.nextText().trim()
                                }
                                "description", "summary", "content" -> {
                                    val rawDesc = parser.nextText()
                                    // Extract image inside description if not found yet
                                    if (currentImageUrl.isBlank()) {
                                        currentImageUrl = extractFirstImageSrc(rawDesc)
                                    }
                                    currentDesc = rawDesc.cleanHtml()
                                }
                                "pubdate", "published", "updated" -> {
                                    currentPubDate = parser.nextText().cleanHtml()
                                }
                                "enclosure" -> {
                                    val type = parser.getAttributeValue(null, "type") ?: ""
                                    val url = parser.getAttributeValue(null, "url") ?: ""
                                    if (url.isNotBlank() && (type.contains("image") || url.contains(".jpg") || url.contains(".png") || url.contains(".jpeg") || url.contains(".webp"))) {
                                        currentImageUrl = url
                                    }
                                }
                                "media:content", "media:thumbnail" -> {
                                    val url = parser.getAttributeValue(null, "url") ?: ""
                                    if (url.isNotBlank()) {
                                        currentImageUrl = url
                                    }
                                }
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        if ((tagName == "item" || tagName == "entry") && inItem) {
                            inItem = false
                            if (currentTitle.isNotBlank()) {
                                val now = System.currentTimeMillis()
                                val finalImage = if (currentImageUrl.isNotBlank()) {
                                    currentImageUrl
                                } else {
                                    getFallbackCategoryPhoto(category)
                                }
                                val finalSummary = if (currentDesc.isNotBlank()) {
                                    currentDesc.take(220)
                                } else {
                                    "लाइव RSS अपडेट: $channelName द्वारा प्रकाशित। विस्तार से पढ़ने के लिए टच करें।"
                                }

                                result.add(
                                    NewsPost(
                                        id = "rss-live-${now}-${result.size}",
                                        title = currentTitle,
                                        summary = finalSummary,
                                        sourceChannel = channelName,
                                        sourceUrl = if (currentLink.isNotBlank()) currentLink else feedUrl,
                                        category = category,
                                        categoryName = category.displayName,
                                        publishedTime = if (currentPubDate.isNotBlank()) currentPubDate.take(25) else "ताज़ा लाइव बुलेटिन",
                                        imageUrl = finalImage,
                                        isRssFeed = true,
                                        breaking = true,
                                        timestamp = now,
                                        fullContent = NewsRepository.generateFullArticleContent(
                                            currentTitle,
                                            finalSummary,
                                            channelName,
                                            category.displayName
                                        ),
                                        isExclusive = (result.isEmpty()) // first item highlighted
                                    )
                                )
                            }
                        }
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            Log.e(TAG, "XML parsing fallback for $feedUrl", e)
        }
        return result.take(25) // Return up to 25 latest real news items
    }

    /**
     * Fetch OpenGraph and metadata from a live Web Article URL
     */
    suspend fun fetchWebArticleMetadata(
        webUrl: String,
        channelName: String,
        categoryName: String
    ): NewsPost = withContext(Dispatchers.IO) {
        val cleanUrl = webUrl.trim()
        val catEnum = NewsCategory.values().find { it.displayName.contains(categoryName, ignoreCase = true) }
            ?: NewsCategory.BREAKING

        var pageTitle = ""
        var pageDesc = ""
        var pageImage = ""

        try {
            val request = Request.Builder()
                .url(cleanUrl)
                .header("User-Agent", USER_AGENT)
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val html = response.body?.string() ?: ""

                // Extract <meta property="og:title" content="...">
                pageTitle = extractMetaTag(html, "og:title")
                    .ifBlank { extractTagContent(html, "title") }
                    .cleanHtml()

                // Extract description
                pageDesc = extractMetaTag(html, "og:description")
                    .ifBlank { extractMetaTag(html, "description") }
                    .cleanHtml()

                // Extract image
                pageImage = extractMetaTag(html, "og:image")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching web article: $cleanUrl", e)
        }

        val domain = try {
            java.net.URI(cleanUrl).host?.replace("www.", "") ?: channelName
        } catch (e: Exception) {
            channelName
        }

        val finalHeadline = if (pageTitle.isNotBlank()) pageTitle else "$channelName विशेष रिपोर्ट: $domain से ताज़ा अपडेट"
        val finalSummary = if (pageDesc.isNotBlank()) pageDesc.take(250) else "इस वेब लिंक से सीधे AI न्यूज़ ग्राफिक और सोशल मीडिया कार्ड तैयार किया जा सकता है। लिंक स्रोत: $cleanUrl"
        val finalImage = if (pageImage.isNotBlank()) pageImage else getFallbackCategoryPhoto(catEnum)

        val now = System.currentTimeMillis()
        NewsPost(
            id = "web-live-${now}",
            title = finalHeadline,
            summary = finalSummary,
            sourceChannel = channelName,
            sourceUrl = cleanUrl,
            category = catEnum,
            categoryName = categoryName,
            publishedTime = "अभी-अभी (Just now)",
            imageUrl = finalImage,
            isRssFeed = false,
            breaking = true,
            timestamp = now,
            fullContent = NewsRepository.generateFullArticleContent(finalHeadline, finalSummary, channelName, categoryName)
        )
    }

    private fun extractMetaTag(html: String, property: String): String {
        val pattern = Pattern.compile(
            """<meta\s+[^>]*(?:property|name)=["']${Pattern.quote(property)}["'][^>]*content=["']([^"']*)["']""",
            Pattern.CASE_INSENSITIVE
        )
        val matcher = pattern.matcher(html)
        if (matcher.find()) {
            return matcher.group(1) ?: ""
        }

        // Alternative attribute order: content first, then property
        val altPattern = Pattern.compile(
            """<meta\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${Pattern.quote(property)}["']""",
            Pattern.CASE_INSENSITIVE
        )
        val altMatcher = altPattern.matcher(html)
        if (altMatcher.find()) {
            return altMatcher.group(1) ?: ""
        }

        return ""
    }

    private fun extractTagContent(html: String, tag: String): String {
        val pattern = Pattern.compile("<$tag[^>]*>(.*?)</$tag>", Pattern.CASE_INSENSITIVE or Pattern.DOTALL)
        val matcher = pattern.matcher(html)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }

    private fun extractFirstImageSrc(html: String): String {
        val pattern = Pattern.compile("""<img\s+[^>]*src=["']([^"']+)["']""", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(html)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }

    private fun String.cleanHtml(): String {
        return this.replace(Regex("<[^>]*>"), "")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
            .trim()
    }

    private fun getFallbackCategoryPhoto(category: NewsCategory): String {
        return when (category) {
            NewsCategory.POLITICS -> "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop"
            NewsCategory.CRIME -> "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop"
            NewsCategory.SPORTS -> "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop"
            NewsCategory.TECH -> "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop"
            NewsCategory.BUSINESS -> "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop"
            NewsCategory.ENTERTAINMENT -> "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop"
            else -> "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop"
        }
    }
}
