package com.example.model

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

data class UserProfileData(
    val name: String = "चीफ एडिटर (Admin Desk)",
    val channelName: String = "AI NEWS MAKER",
    val email: String = "editor@ainewsmaker.online",
    val logoUri: String? = null,
    val isVerified: Boolean = true
)

data class ManagedCategory(
    val id: String,
    val displayName: String,
    val isDeletable: Boolean = true
)

data class NewsPost(
    val id: String,
    val title: String,
    val summary: String,
    val sourceChannel: String,
    val sourceUrl: String,
    val category: NewsCategory = NewsCategory.BREAKING,
    val categoryName: String = category.displayName,
    val publishedTime: String,
    val imageUrl: String? = null,
    val isRssFeed: Boolean = true,
    val breaking: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    val fullContent: String = summary,
    val isExclusive: Boolean = false
)

enum class JacketStyle(val label: String, val headerBgHex: Long, val accentHex: Long, val studioId: String) {
    RED_BREAKING("सुपर ब्रेकिंग", 0xFFC62828, 0xFFD4AF37, "jacket-breaking-red"),
    MORNING("मॉर्निंग सुविचार", 0xFF064E3B, 0xFFF59E0B, "jacket-morning"),
    EPAPER("ई-पेपर 2-कॉलम", 0xFF18181B, 0xFFD4AF37, "jacket-epaper"),
    TEXT_BREAKING("3D टेक्स्ट ब्रेकिंग", 0xFF991B1B, 0xFFFBBF24, "jacket-text-breaking"),
    QUOTE("बयान / कोटेशन", 0xFF1E293B, 0xFF38BDF8, "jacket-quote"),
    INVESTIGATION("विशेष पड़ताल", 0xFF0F172A, 0xFFEF4444, "jacket-investigation"),
    ORIGINAL("ओरिजिनल जैकेट", 0xFFEAB308, 0xFFDC2626, "jacket-original"),
    CUSTOM_PNG("कस्टम PNG", 0xFF059669, 0xFFD4AF37, "custom-png")
}

data class NewsJacketData(
    val headline: String = "",
    val subHeadline: String = "",
    val headerTitle: String = "AI NEWS MAKER",
    val tagText: String = "BREAKING NEWS",
    val channelName: String = "AI NEWS 24",
    val reporterName: String = "विशेष संवाददाता",
    val location: String = "नई दिल्ली",
    val dateText: String = "15 सितम्बर, 2026",
    val sourceLink: String = "",
    val style: JacketStyle = JacketStyle.RED_BREAKING,
    val showQrPlaceholder: Boolean = true
)

data class VideoNewsItem(
    val id: String,
    val title: String,
    val duration: String,
    val channel: String,
    val views: String,
    val videoUrl: String,
    val category: NewsCategory,
    val ratio: String = "16:9"
)

data class EPaperPage(
    val pageNumber: Int,
    val title: String,
    val subtitle: String,
    val headlines: List<String>
)

enum class UserRole {
    USER,
    REPORTER,
    ADMIN
}

enum class AspectRatioType(val label: String, val ratioWidth: Int, val ratioHeight: Int) {
    SHORTS_9_16("9:16 (रील्स / शॉर्ट्स)", 9, 16),
    FEED_4_5("4:5 (इंस्टा / FB पोस्ट)", 4, 5),
    YOUTUBE_16_9("16:9 (यूट्यूब HD)", 16, 9),
    SQUARE_1_1("1:1 (स्क्वायर)", 1, 1)
}

enum class HeadlineLineMode(val label: String) {
    THREE_LINE("3-लाइन ब्रॉडकास्ट जैकेट"),
    SINGLE_LINE("सिंगल हेडलाइन मोड")
}

enum class TemplateStyle(val label: String) {
    REGULAR_NEWS_FRAME("रेगुलर न्यूज़ फ्रेम (मरून 3-लाइन प्लेट)"),
    STANDARD_BREAKING("स्टैंडर्ड ब्रेकिंग अलर्ट"),
    EXCLUSIVE_FLASH("एक्सक्लूसिव फ़्लैश रिपोर्ट")
}

enum class HeadlineAlignment(val label: String, val textAlign: androidx.compose.ui.text.style.TextAlign) {
    CENTER("सेंटर", androidx.compose.ui.text.style.TextAlign.Center),
    JUSTIFY("जस्टिफाई", androidx.compose.ui.text.style.TextAlign.Justify)
}

enum class HindiFontOption(val label: String, val fontFamily: androidx.compose.ui.text.font.FontFamily) {
    HIND_BOLD("हिंद बोल्ड (Hind Bold)", androidx.compose.ui.text.font.FontFamily.Default),
    SANS_SERIF("सेंस-सेरिफ हैवी (Sans Serif)", androidx.compose.ui.text.font.FontFamily.SansSerif),
    SERIF("देवनागरी क्लासिक (Serif)", androidx.compose.ui.text.font.FontFamily.Serif)
}

data class UserProfile(
    val username: String = "admin",
    val reporterName: String = "Rajesh Sharma",
    val role: UserRole = UserRole.ADMIN,
    val isLoggedIn: Boolean = true
) {
    fun verifyPassword(role: UserRole, enteredPass: String): Boolean {
        return enteredPass.isNotBlank() && (enteredPass == "admin123" || enteredPass == "1234" || enteredPass == "news24")
    }
}

data class NewsProject(
    val id: String = java.util.UUID.randomUUID().toString(),
    val templateId: String = "",
    val title: String = "",
    val firstTitle: String = "",
    val secondTitle: String = "",
    val tickerText: String = "",
    val cityName: String = "",
    val channelLogoTag: String = "",
    val mediaUri: String? = null,
    val isVideo: Boolean = true,
    val selectedAudioTrackId: String? = null,
    val isOriginalAudioEnabled: Boolean = true,
    val voiceoverRecorded: Boolean = false,
    val aspectRatio: AspectRatioType = AspectRatioType.SHORTS_9_16,
    val timestamp: Long = System.currentTimeMillis(),
    val isArchived: Boolean = false,
    val archivedAt: Long? = null
)

data class MediaClipItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val uri: android.net.Uri,
    val isVideo: Boolean = true,
    val durationSeconds: Float = 5.0f,
    val startTrimSeconds: Float = 0f,
    val endTrimSeconds: Float = 5.0f
)

data class AudioTrackItem(
    val id: String,
    val title: String,
    val category: String,
    val duration: String,
    val resourceId: Int? = null,
    val uri: String? = null
)

object AudioRepository {
    val tracks = listOf(
        AudioTrackItem("breaking_sting_1", "Breaking News Signature Sting", "News Alert", "0:08"),
        AudioTrackItem("fast_ticker_beat", "Fast Studio Ticker Rhythm", "Studio Beat", "0:25"),
        AudioTrackItem("urgent_countdown", "Urgent Headline Countdown", "Urgent Alert", "0:15"),
        AudioTrackItem("prime_debate", "Prime Time Debate Theme", "Theme", "0:30")
    )
}

enum class TemplateCategory(val displayName: String) {
    BASIC("BASIC"),
    ADVANCED("ADVANCED"),
    PRO("PRO"),
    VIP_DESK("VIP DESK")
}

data class NewsTemplate(
    val id: String,
    val title: String,
    val category: TemplateCategory = TemplateCategory.BASIC,
    val style: TemplateStyle = TemplateStyle.REGULAR_NEWS_FRAME,
    val aspectRatio: AspectRatioType = AspectRatioType.FEED_4_5,
    val defaultFirstTitle: String = "YOUR HEADLINE",
    val defaultSecondTitle: String = "",
    val defaultTicker: String = "ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर...",
    val defaultCity: String = "LOCATION",
    val channelLogoTag: String = "YOUR LOGO",
    val line1: String = "YOUR HEADLINE",
    val line2: String = "",
    val line3: String = "",
    val customJacketUri: String? = null,
    val customLogoUri: String? = null
)

object TemplateRepository {
    // Graphic 1 registered in Basic Plan as requested by user
    val GRAPHIC_1 = NewsTemplate(
        id = "graphic_001",
        title = "Graphic 1 (बेसिक 4:5 न्यूज़ जैकेट)",
        category = TemplateCategory.BASIC,
        style = TemplateStyle.REGULAR_NEWS_FRAME,
        aspectRatio = AspectRatioType.FEED_4_5,
        defaultFirstTitle = "YOUR HEADLINE",
        defaultSecondTitle = "",
        defaultTicker = "ताजा समाचार सबसे पहले सिर्फ आपके अपने पसंदीदा चैनल पर...",
        defaultCity = "LOCATION",
        channelLogoTag = "YOUR LOGO",
        line1 = "YOUR HEADLINE",
        line2 = "यहाँ आपकी हेडलाइन आएगी",
        line3 = "(अधिकतम 3 लाइन में)"
    )

    val templates = mutableListOf<NewsTemplate>(GRAPHIC_1)

    val defaultPlaceholderTemplate = GRAPHIC_1

    fun clearAll() {
        templates.clear()
    }

    fun registerTemplate(template: NewsTemplate) {
        templates.removeAll { it.id == template.id }
        templates.add(template)
    }
}

enum class ProjectType(val label: String) {
    GRAPHIC_JACKET("ग्राफिक जैकेट"),
    VIDEO_NEWS("वीडियो न्यूज़"),
    EPAPER_EDITION("ई-पेपर पेज")
}

enum class ProjectStatus(val label: String, val colorHex: Long) {
    DRAFT("ड्राफ्ट (Draft)", 0xFF64748B),
    IN_REVIEW("रिव्यू में (In Review)", 0xFFF59E0B),
    APPROVED("स्वीकृत (Approved)", 0xFF10B981),
    PUBLISHED("पब्लिश हुआ (Published)", 0xFF2563EB)
}

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

data class UserAccount(
    val id: String,
    val name: String,
    val roleTitle: String,
    val email: String,
    val activeProjectsCount: Int,
    val isOnline: Boolean = true
)

data class RssChannelSource(
    val id: String,
    val channelName: String,
    val feedUrl: String,
    val category: NewsCategory,
    val isActive: Boolean = true,
    val lastSyncTime: String = "10 मिनट पहले",
    val postsTodayCount: Int = 14
)

data class AdminCommand(
    val id: String,
    val targetUserName: String,
    val commandText: String,
    val issuedTime: String,
    val isCompleted: Boolean = false
)

