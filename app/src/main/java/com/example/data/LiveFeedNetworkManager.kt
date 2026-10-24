package com.example.data

import com.example.model.NewsCategory
import com.example.model.NewsPost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.StringReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.regex.Pattern

object LiveFeedNetworkManager {

    fun getFallbackCategoryPhoto(category: NewsCategory): String {
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

    suspend fun fetchRssFeed(
        feedUrl: String,
        channelName: String,
        category: NewsCategory = NewsCategory.BREAKING
    ): List<NewsPost> = withContext(Dispatchers.IO) {
        try {
            val url = URL(feedUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 12000
                readTimeout = 15000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)")
            }
            if (connection.responseCode in 200..299) {
                val xml = connection.inputStream.bufferedReader().use { it.readText() }
                return@withContext parseRssXml(xml, channelName, feedUrl, category)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        emptyList()
    }

    fun parseRssXml(
        xml: String,
        channelName: String,
        feedUrl: String,
        category: NewsCategory
    ): List<NewsPost> {
        val posts = mutableListOf<NewsPost>()
        try {
            val factory = XmlPullParserFactory.newInstance()
            factory.isNamespaceAware = false
            val parser = factory.newPullParser()
            parser.setInput(StringReader(xml))

            var eventType = parser.eventType
            var inItem = false
            var currentTitle = ""
            var currentDescription = ""
            var currentLink = ""
            var currentPubDate = ""
            var currentImageUrl: String? = null

            while (eventType != XmlPullParser.END_DOCUMENT) {
                val name = parser.name ?: ""
                when (eventType) {
                    XmlPullParser.START_TAG -> {
                        if (name.equals("item", ignoreCase = true) || name.equals("entry", ignoreCase = true)) {
                            inItem = true
                            currentTitle = ""
                            currentDescription = ""
                            currentLink = ""
                            currentPubDate = ""
                            currentImageUrl = null
                        } else if (inItem) {
                            when (name.lowercase()) {
                                "title" -> currentTitle = parser.nextText()
                                "description", "summary" -> currentDescription = cleanHtml(parser.nextText())
                                "link" -> {
                                    val href = parser.getAttributeValue(null, "href")
                                    currentLink = if (!href.isNullOrBlank()) href else parser.nextText()
                                }
                                "pubdate", "published", "updated" -> currentPubDate = parser.nextText()
                                "enclosure" -> {
                                    val url = parser.getAttributeValue(null, "url")
                                    if (!url.isNullOrBlank()) currentImageUrl = url
                                }
                                "media:content", "media:thumbnail" -> {
                                    val url = parser.getAttributeValue(null, "url")
                                    if (!url.isNullOrBlank()) currentImageUrl = url
                                }
                            }
                        }
                    }
                    XmlPullParser.END_TAG -> {
                        if (name.equals("item", ignoreCase = true) || name.equals("entry", ignoreCase = true)) {
                            if (currentTitle.isNotBlank()) {
                                posts.add(
                                    NewsPost(
                                        id = UUID.randomUUID().toString(),
                                        title = currentTitle.trim(),
                                        summary = currentDescription.ifBlank { currentTitle }.trim(),
                                        sourceChannel = channelName,
                                        sourceUrl = currentLink.ifBlank { feedUrl },
                                        category = category,
                                        categoryName = category.displayName,
                                        publishedTime = currentPubDate.ifBlank { "अभी-अभी" },
                                        imageUrl = currentImageUrl ?: getFallbackCategoryPhoto(category),
                                        isRssFeed = true,
                                        breaking = true
                                    )
                                )
                            }
                            inItem = false
                        }
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return posts
    }

    suspend fun fetchWebArticleMetadata(
        webUrl: String,
        channelName: String,
        categoryName: String
    ): NewsPost = withContext(Dispatchers.IO) {
        val cat = NewsCategory.entries.find { it.displayName == categoryName } ?: NewsCategory.BREAKING
        try {
            val url = URL(webUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 12000
                readTimeout = 15000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)")
            }
            if (connection.responseCode in 200..299) {
                val html = connection.inputStream.bufferedReader().use { it.readText() }
                val title = extractMetaTag(html, "og:title")
                    .ifBlank { extractTagContent(html, "title") }
                    .ifBlank { "विशेष समाचार रिपोर्ट" }
                val desc = extractMetaTag(html, "og:description")
                    .ifBlank { extractMetaTag(html, "description") }
                    .ifBlank { title }
                val image = extractMetaTag(html, "og:image")
                    .ifBlank { getFallbackCategoryPhoto(cat) }

                return@withContext NewsPost(
                    id = UUID.randomUUID().toString(),
                    title = cleanHtml(title),
                    summary = cleanHtml(desc),
                    sourceChannel = channelName.ifBlank { "वेब स्रोत" },
                    sourceUrl = webUrl,
                    category = cat,
                    categoryName = cat.displayName,
                    publishedTime = "अभी-अभी",
                    imageUrl = image,
                    isRssFeed = false,
                    breaking = true
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        NewsPost(
            id = UUID.randomUUID().toString(),
            title = "न्यूज़ अपडेट: $categoryName",
            summary = "वेब आर्टिकल से विस्तृत जानकारी प्राप्त की जा रही है...",
            sourceChannel = channelName.ifBlank { "वेब" },
            sourceUrl = webUrl,
            category = cat,
            categoryName = cat.displayName,
            publishedTime = "अभी",
            imageUrl = getFallbackCategoryPhoto(cat),
            isRssFeed = false,
            breaking = true
        )
    }

    private fun extractMetaTag(html: String, property: String): String {
        val pattern = Pattern.compile("<meta\\s+[^>]*(?:property|name)=[\"']" + Pattern.quote(property) + "[\"'][^>]*content=[\"']([^\"']*)[\"']", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(html)
        if (matcher.find()) {
            return matcher.group(1) ?: ""
        }
        val altPattern = Pattern.compile("<meta\\s+[^>]*content=[\"']([^\"']*)[\"'][^>]*(?:property|name)=[\"']" + Pattern.quote(property) + "[\"']", Pattern.CASE_INSENSITIVE)
        val altMatcher = altPattern.matcher(html)
        return if (altMatcher.find()) altMatcher.group(1) ?: "" else ""
    }

    private fun extractTagContent(html: String, tag: String): String {
        val pattern = Pattern.compile("<$tag[^>]*>(.*?)</$tag>", Pattern.CASE_INSENSITIVE or Pattern.DOTALL)
        val matcher = pattern.matcher(html)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }

    fun cleanHtml(html: String): String {
        return html
            .replace(Regex("<[^>]*>"), "")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
            .trim()
    }
}
