package com.example.model

import android.net.Uri

enum class AspectRatioType(val label: String, val ratioWidth: Int, val ratioHeight: Int) {
    SHORTS_9_16("9:16 (रील्स / शॉर्ट्स)", 9, 16),
    FEED_4_5("4:5 (इंस्टा / FB पोस्ट)", 4, 5),
    YOUTUBE_16_9("16:9 (यूट्यूब HD)", 16, 9),
    SQUARE_1_1("1:1 (स्क्वायर)", 1, 1)
}

enum class HeadlineAlignment(val label: String) {
    LEFT("बायें (Left)"),
    CENTER("मध्य (Center)"),
    RIGHT("दायें (Right)")
}

enum class HeadlineLineMode(val label: String, val maxLines: Int) {
    ONE_LINE("1 लाइन", 1),
    TWO_LINES("2 लाइनें", 2),
    THREE_LINES("3 लाइनें", 3)
}

enum class HindiFontOption(val displayName: String, val cssFamily: String) {
    SAMARKAN("समरकन (शाही / हेडिंग)", "Samarkan"),
    YATRA_ONE("यात्रा वन (बोल्ड न्यूज़)", "Yatra One"),
    ROZHA_ONE("रोज़ा वन (क्लासिक)", "Rozha One"),
    TEKO("टेको (सुपर इम्पैक्ट)", "Teko"),
    MODAK("मोदक (मजबूत)", "Modak"),
    NOTO_SANS_DEVANAGARI("नोतो सेन्स देवनागरी (साफ)", "Noto Sans Devanagari")
}

enum class JacketStyle(val label: String, val headerBgHex: Long, val accentHex: Long, val studioId: String) {
    RED_BREAKING("रेड ब्रेकिंग", 4291176488L, 4294962432L, "red-breaking"),
    GOLD_PRIME("गोल्ड प्राइम", 4280166715L, 4292128567L, "gold-prime"),
    BLUE_SPECIAL("ब्लू स्पेशल", 4280640491L, 4294967295L, "blue-special"),
    DARK_EXCLUSIVE("डार्क एक्सक्लूसिव", 4279769115L, 4291176488L, "dark-exclusive"),
    ORIGINAL_STUDIO("मूल चैनल जैकेट", 4293571336L, 4292617766L, "jacket-original"),
    MORNING("मॉर्निंग सुविचार", 0xFF064E3BL, 0xFFF59E0BL, "jacket-morning"),
    EPAPER("ई-पेपर 2-कॉलम", 0xFF18181BL, 0xFFD4AF37L, "jacket-epaper"),
    TEXT_BREAKING("3D टेक्स्ट ब्रेकिंग", 0xFF991B1BL, 0xFFFBBF24L, "jacket-text-breaking"),
    QUOTE("बयान / कोटेशन", 0xFF1E293BL, 0xFF38BDF8L, "jacket-quote"),
    INVESTIGATION("विशेष पड़ताल", 0xFF0F172AL, 0xFFEF4444L, "jacket-investigation"),
    ORIGINAL("ओरिजिनल जैकेट", 0xFFEAB308L, 0xFFDC2626L, "jacket-original"),
    CUSTOM_PNG("कस्टम PNG", 4278556265L, 4292128567L, "custom-png")
}

data class ManagedCategory(
    val id: String,
    val displayName: String,
    val isDeletable: Boolean = true
)

data class MediaClipItem(
    val id: String,
    val uri: Uri,
    val isVideo: Boolean,
    val durationSeconds: Float = 0f,
    val startTrimSeconds: Float = 0f,
    val endTrimSeconds: Float = 0f
)

enum class NewsCategory(val displayName: String) {
    ALL("सभी (All)"),
    BREAKING("ब्रेकिंग न्यूज़"),
    POLITICS("राजनीति"),
    TECH("टेक्नोलॉजी"),
    ENTERTAINMENT("मनोरंजन"),
    SPORTS("खेल"),
    BUSINESS("कारोबार"),
    CRIME("क्राइम / अपराध"),
    STATE("राज्य / स्थानीय")
}

data class NewsJacketData(
    val headline: String = "",
    val subHeadline: String = "",
    val headerTitle: String = "NEWS 24 LIVE",
    val reporterName: String = "",
    val location: String = "",
    val dateText: String = "",
    val channelName: String = "AI NEWS MAKER",
    val tagText: String = "BREAKING",
    val sourceLink: String = "",
    val showQrPlaceholder: Boolean = false,
    val style: JacketStyle = JacketStyle.RED_BREAKING
)

data class NewsPost(
    val id: String,
    val title: String,
    val summary: String,
    val sourceChannel: String,
    val sourceUrl: String,
    val category: NewsCategory = NewsCategory.BREAKING,
    val categoryName: String = "ब्रेकिंग",
    val publishedTime: String,
    val imageUrl: String? = null,
    val isRssFeed: Boolean = false,
    val breaking: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    val fullContent: String = "",
    val isExclusive: Boolean = false
)

data class NewsProject(
    val id: String,
    val title: String,
    val templateId: String,
    val firstTitle: String,
    val secondTitle: String,
    val tickerText: String,
    val cityName: String,
    val channelLogoTag: String,
    val mediaUri: String,
    val isVideo: Boolean = false,
    val aspectRatio: AspectRatioType = AspectRatioType.FEED_4_5,
    val timestamp: Long = System.currentTimeMillis(),
    val isArchived: Boolean = false,
    val archivedAt: Long? = null,
    val isOriginalAudioEnabled: Boolean = true,
    val selectedAudioTrackId: String = "",
    val voiceoverRecorded: Boolean = false
)

enum class TemplateCategory(val displayName: String) {
    BASIC("BASIC"),
    ADVANCED("ADVANCED"),
    PRO("PRO"),
    VIP_DESK("VIP DESK")
}

enum class TemplateStyle(val label: String) {
    REGULAR_NEWS_FRAME("रेगुलर न्यूज़ फ्रेम (मरून 3-लाइन प्लेट)"),
    STANDARD_BREAKING("स्टैंडर्ड ब्रेकिंग अलर्ट"),
    EXCLUSIVE_FLASH("एक्सक्लूसिव फ़्लैश रिपोर्ट")
}

data class NewsTemplate(
    val id: String,
    val title: String,
    val category: TemplateCategory,
    val style: TemplateStyle,
    val aspectRatio: AspectRatioType,
    val line1: String,
    val line2: String,
    val line3: String,
    val defaultCity: String,
    val channelLogoTag: String,
    val defaultFirstTitle: String,
    val defaultSecondTitle: String,
    val defaultTicker: String,
    val customLogoUri: String? = null,
    val customJacketUri: String? = null
)

enum class ProjectStatus(val label: String, val colorHex: Long) {
    DRAFT("ड्राफ्ट (Draft)", 4287931320L),
    IN_REVIEW("रिव्यू में (In Review)", 4294688548L),
    APPROVED("स्वीकृत (Approved)", 4279673674L),
    PUBLISHED("पब्लिश हुआ (Published)", 4280640491L)
}

enum class ProjectType(val label: String) {
    GRAPHIC_JACKET("ग्राफिक जैकेट"),
    VIDEO_NEWS("वीडियो न्यूज़"),
    EPAPER_EDITION("ई-पेपर पेज")
}

data class RssChannelSource(
    val id: String,
    val channelName: String,
    val feedUrl: String,
    val category: NewsCategory,
    val isActive: Boolean = true,
    val lastSyncTime: String = "",
    val postsTodayCount: Int = 0
)

data class UserAccount(
    val id: String,
    val name: String,
    val roleTitle: String,
    val email: String,
    val activeProjectsCount: Int,
    val isOnline: Boolean = true
)

enum class UserRole {
    USER,
    REPORTER,
    ADMIN
}

data class UserProfile(
    val username: String = "",
    val role: UserRole = UserRole.REPORTER,
    val isLoggedIn: Boolean = false,
    val reporterName: String = ""
)

data class UserProfileData(
    val name: String = "",
    val channelName: String = "",
    val email: String = "",
    val logoUri: String = "",
    val isVerified: Boolean = false
)

data class UserProject(
    val id: String,
    val userId: String,
    val userName: String,
    val userRoleLabel: String,
    val type: ProjectType,
    val title: String,
    val summary: String,
    val status: ProjectStatus,
    val timestamp: String,
    val assignedJacketTheme: String = "रेड ब्रेकिंग",
    val adminNotes: String = "",
    val isArchived: Boolean = false,
    val archivedAt: String? = null
)

data class VideoNewsItem(
    val id: String,
    val title: String,
    val channel: String,
    val duration: String,
    val views: String,
    val videoUrl: String,
    val category: NewsCategory,
    val ratio: String
)

data class AdminCommand(
    val id: String,
    val targetUserName: String,
    val commandText: String,
    val issuedTime: String,
    val isCompleted: Boolean = false
)

data class AudioTrackItem(
    val id: String,
    val name: String,
    val category: String,
    val duration: String,
    val fileResId: Int? = null,
    val uriString: String? = null
)

data class EPaperPage(
    val pageNumber: Int,
    val title: String,
    val dateText: String,
    val editionName: String,
    val imageResOrUrl: String,
    val pdfUrl: String? = null
)

object TemplateRepository {
    val GRAPHIC_1 = NewsTemplate(
        id = "graphic_001",
        title = "Graphic 1 (बेसिक 4:5 न्यूज़ जैकेट)",
        category = TemplateCategory.BASIC,
        style = TemplateStyle.REGULAR_NEWS_FRAME,
        aspectRatio = AspectRatioType.FEED_4_5,
        line1 = "YOUR HEADLINE",
        line2 = "",
        line3 = "ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर...",
        defaultCity = "LOCATION",
        channelLogoTag = "YOUR LOGO",
        defaultFirstTitle = "YOUR HEADLINE",
        defaultSecondTitle = "यहाँ आपकी हेडलाइन आएगी",
        defaultTicker = "(अधिकतम 3 लाइन में)",
        customLogoUri = null,
        customJacketUri = null
    )

    val templates: MutableList<NewsTemplate> = mutableListOf(GRAPHIC_1)
    val defaultPlaceholderTemplate: NewsTemplate = GRAPHIC_1

    fun clearAll() {
        templates.clear()
    }

    fun registerTemplate(template: NewsTemplate) {
        templates.removeAll { it.id == template.id }
        templates.add(template)
    }
}

object AudioRepository {
    val tracks: List<AudioTrackItem> = listOf(
        AudioTrackItem("breaking_sting_1", "Breaking News Signature Sting", "News Alert", "0:08"),
        AudioTrackItem("fast_ticker_beat", "Fast Studio Ticker Rhythm", "Studio Beat", "0:25"),
        AudioTrackItem("urgent_countdown", "Urgent Headline Countdown", "Urgent Alert", "0:15"),
        AudioTrackItem("prime_debate", "Prime Time Debate Theme", "Theme", "0:30")
    )
}
