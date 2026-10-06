package com.example.data

import com.example.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

object NewsRepository {
    private val scope = CoroutineScope(Dispatchers.Main)

    private val _savedChannels = MutableStateFlow<List<String>>(
        listOf("आज तक (Aaj Tak)", "दैनिक भास्कर", "NDTV इंडिया", "ज़ी न्यूज़", "अमर उजाला", "News18 इंडिया")
    )
    val savedChannels: StateFlow<List<String>> = _savedChannels.asStateFlow()

    private val _categories = MutableStateFlow<List<ManagedCategory>>(
        listOf(
            ManagedCategory("cat-1", "ब्रेकिंग न्यूज़", false),
            ManagedCategory("cat-2", "राजनीति", false),
            ManagedCategory("cat-3", "टेक्नोलॉजी", false),
            ManagedCategory("cat-4", "मनोरंजन", false),
            ManagedCategory("cat-5", "खेल", false),
            ManagedCategory("cat-6", "कारोबार", false),
            ManagedCategory("cat-7", "क्राइम / अपराध", false),
            ManagedCategory("cat-8", "राज्य / स्थानीय", false)
        )
    )
    val categories: StateFlow<List<ManagedCategory>> = _categories.asStateFlow()

    private val _userRole = MutableStateFlow(UserRole.ADMIN)
    val userRole: StateFlow<UserRole> = _userRole.asStateFlow()

    private val _liveTickerText = MutableStateFlow("⚡ देश दुनिया की तमाम बड़ी ख़बरें सबसे पहले AI NEWS MAKER पर...")
    val liveTickerText: StateFlow<String> = _liveTickerText.asStateFlow()

    private val _pendingGraphicPost = MutableStateFlow<NewsPost?>(null)
    val pendingGraphicPost: StateFlow<NewsPost?> = _pendingGraphicPost.asStateFlow()

    private val _pendingVideoItem = MutableStateFlow<VideoNewsItem?>(null)
    val pendingVideoItem: StateFlow<VideoNewsItem?> = _pendingVideoItem.asStateFlow()

    private val _masterChannelName = MutableStateFlow("AI NEWS MAKER")
    val masterChannelName: StateFlow<String> = _masterChannelName.asStateFlow()

    private val _masterLogoText = MutableStateFlow("AI NEWS 24")
    val masterLogoText: StateFlow<String> = _masterLogoText.asStateFlow()

    private val _masterDefaultReporter = MutableStateFlow("एडमिन डेस्क")
    val masterDefaultReporter: StateFlow<String> = _masterDefaultReporter.asStateFlow()

    private val _masterLocation = MutableStateFlow("नई दिल्ली")
    val masterLocation: StateFlow<String> = _masterLocation.asStateFlow()

    private val _users = MutableStateFlow<List<UserAccount>>(
        listOf(
            UserAccount("u-1", "राहुल शर्मा (सीनियर रिपोर्टर)", "फील्ड रिपोर्टर", "rahul@ainewsmaker.online", 12, true),
            UserAccount("u-2", "अमित कुमार (वीडियो डेस्क)", "वीडियो एडिटर", "amit@ainewsmaker.online", 8, true),
            UserAccount("u-3", "प्रिया वर्मा (ई-पेपर डेस्क)", "ई-पेपर इंचार्ज", "priya@ainewsmaker.online", 5, false)
        )
    )
    val users: StateFlow<List<UserAccount>> = _users.asStateFlow()

    private val _userProjects = MutableStateFlow<List<UserProject>>(
        listOf(
            UserProject(
                id = "proj-101",
                userId = "u-1",
                userName = "राहुल शर्मा",
                userRoleLabel = "रिपोर्टर",
                type = ProjectType.GRAPHIC_JACKET,
                title = "संसद का विशेष सत्र: नए विधेयकों पर जोरदार बहस",
                summary = "संसद में आगामी सत्र को लेकर विपक्ष और सरकार के बीच रणनीति पर चर्चा।",
                status = ProjectStatus.IN_REVIEW,
                timestamp = "15 मिनट पहले"
            ),
            UserProject(
                id = "proj-102",
                userId = "u-2",
                userName = "अमित कुमार",
                userRoleLabel = "वीडियो एडिटर",
                type = ProjectType.VIDEO_NEWS,
                title = "इसरो का नया मिशन: गगनयान ट्रेनिंग का वीडियो जारी",
                summary = "अंतरिक्ष यात्रियों की विशेष ट्रेनिंग का विशेष वीडियो बुलेटिन।",
                status = ProjectStatus.APPROVED,
                timestamp = "1 घंटा पहले"
            )
        )
    )
    val userProjects: StateFlow<List<UserProject>> = _userProjects.asStateFlow()

    private val _adminCommands = MutableStateFlow<List<AdminCommand>>(
        listOf(
            AdminCommand("cmd-1", "राहुल शर्मा", "प्रोजेक्ट #proj-101 में सब-हेडलाइन अपडेट करें और री-सबमिट करें।", "10 मिनट पहले", false),
            AdminCommand("cmd-2", "अमित कुमार", "इसरो वीडियो रील को सभी सोशल प्लेटफॉर्म्स पर पब्लिश करें।", "30 मिनट पहले", true)
        )
    )
    val adminCommands: StateFlow<List<AdminCommand>> = _adminCommands.asStateFlow()

    private val _rssChannels = MutableStateFlow<List<RssChannelSource>>(
        listOf(
            RssChannelSource("ch-1", "दैनिक भास्कर", "https://dainikbhaskar.com/rss/national.xml", NewsCategory.POLITICS, true, "5 मिनट पहले", 18),
            RssChannelSource("ch-2", "आज तक (Aaj Tak)", "https://aajtak.in/rss/breaking.xml", NewsCategory.BREAKING, true, "2 मिनट पहले", 24),
            RssChannelSource("ch-3", "NDTV इंडिया", "https://ndtv.in/rss/topstories.xml", NewsCategory.SPORTS, true, "12 मिनट पहले", 10),
            RssChannelSource("ch-4", "मनीकंट्रोल (Moneycontrol)", "https://moneycontrol.com/rss/market.xml", NewsCategory.BUSINESS, true, "20 मिनट पहले", 15),
            RssChannelSource("ch-5", "बीबीसी हिंदी (BBC Hindi)", "https://bbc.com/hindi/rss.xml", NewsCategory.ENTERTAINMENT, true, "30 मिनट पहले", 8)
        )
    )
    val rssChannels: StateFlow<List<RssChannelSource>> = _rssChannels.asStateFlow()

    private val todayFormatted = SimpleDateFormat("dd MMMM, yyyy", Locale("hi", "IN")).format(Date())

    private val _activeJacketData = MutableStateFlow(
        NewsJacketData(
            headline = "AI NEWS MAKER में आपका स्वागत है",
            subHeadline = "किसी भी न्यूज़ लिंक से तुरंत हेडर-फुटर जैकेट ग्राफ़िक तैयार करें",
            headerTitle = "AI NEWS 24 LIVE",
            reporterName = "एडमिन डेस्क",
            location = "नई दिल्ली",
            dateText = todayFormatted,
            channelName = "AI NEWS MAKER",
            tagText = "BREAKING",
            sourceLink = "https://ainewsmaker.online",
            showQrPlaceholder = false,
            style = JacketStyle.RED_BREAKING
        )
    )
    val activeJacketData: StateFlow<NewsJacketData> = _activeJacketData.asStateFlow()

    private val _userProfile = MutableStateFlow(
        UserProfileData("चीफ एडिटर (Admin Desk)", "AI NEWS MAKER", "editor@ainewsmaker.online", "", true)
    )
    val userProfile: StateFlow<UserProfileData> = _userProfile.asStateFlow()

    private val initialPosts = listOf(
        NewsPost(
            id = "p-1",
            title = "🔴 सुप्रीम कोर्ट का ऐतिहासिक फैसला: डिजिटल मीडिया व प्राइवेसी पर नई राष्ट्रीय गाइडलाइंस लागू",
            summary = "शीर्ष अदालत की पांच जजों की संविधान पीठ ने डिजिटल समाचार, सोशल मीडिया और एआई प्लेटफॉर्म्स के लिए अनिवार्य सुरक्षा एवं पारदर्शिता मानकों को तुरंत प्रभावी करने का आदेश दिया।",
            sourceChannel = "आज तक (Aaj Tak)",
            sourceUrl = "https://aajtak.in/national/supreme-court-digital-privacy-guidelines-live",
            category = NewsCategory.BREAKING,
            categoryName = "ब्रेकिंग",
            publishedTime = "5 मिनट पहले",
            imageUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop",
            breaking = true,
            isExclusive = true
        ),
        NewsPost(
            id = "p-2",
            title = "🔴 इसरो का बड़ा ऐलान: भारतीय अंतरिक्ष स्टेशन (BAS) के प्रथम मॉड्यूल का सफल परीक्षण",
            summary = "भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) ने स्वदेशी अंतरिक्ष स्टेशन के लाइफ सपोर्ट और क्रू-डॉकिंग सिस्टम का ग्राउंड परीक्षण सफलतापूर्वक संपन्न किया।",
            sourceChannel = "दैनिक भास्कर",
            sourceUrl = "https://bhaskar.com/science/isro-space-station-module-tested",
            category = NewsCategory.TECH,
            categoryName = "टेक्नोलॉजी",
            publishedTime = "15 मिनट पहले",
            imageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
            breaking = true
        ),
        NewsPost(
            id = "p-3",
            title = "🔴 शेयर बाजार में ऐतिहासिक तेजी: सेंसेक्स पहली बार 85,500 के पार, निवेशकों को 3 लाख करोड़ का मुनाफा",
            summary = "घरेलू एवं वैश्विक अर्थव्यवस्था में मजबूत संकेतकों के चलते बैंकिंग, ऑटो, आईटी और ऊर्जा शेयरों में रिकॉर्ड स्तर की खरीदारी देखी गई।",
            sourceChannel = "NDTV इंडिया",
            sourceUrl = "https://ndtv.in/business/sensex-nifty-all-time-high-rally",
            category = NewsCategory.BUSINESS,
            categoryName = "कारोबार",
            publishedTime = "30 मिनट पहले",
            imageUrl = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
            breaking = false
        ),
        NewsPost(
            id = "p-4",
            title = "🔴 रेल मंत्रालय का मेगा प्रोजेक्ट: 50 नई वंदे भारत स्लीपर और बुलेट ट्रेन का रूट मैप फाइनल",
            summary = "लंबी दूरी के यात्रियों के लिए अत्यधिक आधुनिक और सुरक्षा कवच 4.0 से सुसज्जित नई ट्रेनों का नियमित संचालन अगले माह से प्रारंभ होगा।",
            sourceChannel = "ज़ी न्यूज़ (Zee News)",
            sourceUrl = "https://zeenews.india.com/railways/vande-bharat-sleeper-trial-update",
            category = NewsCategory.POLITICS,
            categoryName = "राजनीति",
            publishedTime = "45 मिनट पहले",
            imageUrl = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
            breaking = false
        )
    )

    private val _posts = MutableStateFlow<List<NewsPost>>(initialPosts)
    val posts: StateFlow<List<NewsPost>> = _posts.asStateFlow()

    fun addSavedChannel(name: String) {
        val clean = name.trim()
        if (clean.isNotBlank() && !_savedChannels.value.contains(clean)) {
            _savedChannels.value = listOf(clean) + _savedChannels.value
        }
    }

    fun addCategory(displayName: String) {
        val clean = displayName.trim()
        if (clean.isNotBlank()) {
            _categories.value = _categories.value + ManagedCategory(
                id = "cat-${System.currentTimeMillis()}",
                displayName = clean,
                isDeletable = true
            )
        }
    }

    fun editCategory(id: String, newName: String) {
        _categories.value = _categories.value.map {
            if (it.id == id) it.copy(displayName = newName) else it
        }
    }

    fun deleteCategory(id: String) {
        _categories.value = _categories.value.filter { it.id != id || !it.isDeletable }
    }

    fun generateFullArticleContent(title: String, summary: String, channel: String, category: String): String {
        return "$title\n\nस्रोत: $channel ($category)\n\n$summary\n\nविस्तृत रिपोर्ट: इस खबर के संबंध में प्रशासनिक व संबंधित विभागों द्वारा आधिकारिक विज्ञप्ति जारी की गई है। ताज़ा अपडेट्स के लिए जुड़े रहें।"
    }

    fun setUserRole(role: UserRole) {
        _userRole.value = role
    }

    fun setLiveTickerText(text: String) {
        _liveTickerText.value = text
    }

    fun setPendingVideo(video: VideoNewsItem) {
        _pendingVideoItem.value = video
    }

    fun clearPendingVideo() {
        _pendingVideoItem.value = null
    }

    fun setPendingGraphicNews(post: NewsPost) {
        _pendingGraphicPost.value = post
        prepareJacketFromPost(post)
    }

    fun setCurrentEditingPost(post: NewsPost) {
        setPendingGraphicNews(post)
    }

    fun clearPendingGraphicNews() {
        _pendingGraphicPost.value = null
    }

    fun clearPendingNews() {
        _pendingGraphicPost.value = null
        _pendingVideoItem.value = null
    }

    fun resetAllUserData() {
        _posts.value = initialPosts
        _pendingGraphicPost.value = null
        _pendingVideoItem.value = null
        _userProjects.value = emptyList()
        _adminCommands.value = emptyList()
        resetJacketData()
    }

    fun getPendingNewsJson(): String {
        val post = _pendingGraphicPost.value ?: return "{}"
        val obj = JSONObject().apply {
            put("id", post.id)
            put("title", post.title)
            put("summary", post.summary)
            put("sourceChannel", post.sourceChannel)
            put("sourceUrl", post.sourceUrl)
            put("imageUrl", post.imageUrl ?: "")
            put("category", post.categoryName)
        }
        return obj.toString()
    }

    fun pruneExpiredPosts() {
        val cutoff = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
        _posts.value = _posts.value.filter { it.timestamp >= cutoff }
    }

    fun updateMasterBranding(channel: String, logo: String, reporter: String, location: String) {
        _masterChannelName.value = channel
        _masterLogoText.value = logo
        _masterDefaultReporter.value = reporter
        _masterLocation.value = location
    }

    fun toggleRssChannel(channelId: String) {
        _rssChannels.value = _rssChannels.value.map {
            if (it.id == channelId) it.copy(isActive = !it.isActive) else it
        }
    }

    fun addRssChannel(name: String, url: String, category: NewsCategory) {
        _rssChannels.value = _rssChannels.value + RssChannelSource(
            id = "ch-${System.currentTimeMillis()}",
            channelName = name,
            feedUrl = url,
            category = category,
            isActive = true,
            lastSyncTime = "अभी",
            postsTodayCount = 0
        )
    }

    fun deleteRssChannel(channelId: String) {
        _rssChannels.value = _rssChannels.value.filter { it.id != channelId }
    }

    fun updateProjectStatus(projectId: String, newStatus: ProjectStatus, note: String) {
        _userProjects.value = _userProjects.value.map {
            if (it.id == projectId) it.copy(status = newStatus, adminNotes = note) else it
        }
    }

    fun archiveProject(projectId: String) {
        _userProjects.value = _userProjects.value.map {
            if (it.id == projectId) it.copy(isArchived = true, archivedAt = "अभी") else it
        }
    }

    fun unarchiveProject(projectId: String) {
        _userProjects.value = _userProjects.value.map {
            if (it.id == projectId) it.copy(isArchived = false, archivedAt = null) else it
        }
    }

    fun archiveCompletedProjects(): Int {
        var count = 0
        _userProjects.value = _userProjects.value.map {
            if (it.status == ProjectStatus.PUBLISHED && !it.isArchived) {
                count++
                it.copy(isArchived = true, archivedAt = "ऑटो-संग्रहीत")
            } else it
        }
        return count
    }

    fun deleteProjectPermanently(projectId: String) {
        _userProjects.value = _userProjects.value.filter { it.id != projectId }
    }

    fun sendAdminCommand(targetUserName: String, commandText: String) {
        _adminCommands.value = listOf(
            AdminCommand(
                id = "cmd-${System.currentTimeMillis()}",
                targetUserName = targetUserName,
                commandText = commandText,
                issuedTime = "अभी-अभी",
                isCompleted = false
            )
        ) + _adminCommands.value
    }

    fun markCommandDone(commandId: String) {
        _adminCommands.value = _adminCommands.value.map {
            if (it.id == commandId) it.copy(isCompleted = true) else it
        }
    }

    fun addWebLinkPost(url: String, channel: String, category: String, customTitle: String = "", customSummary: String = "") {
        scope.launch {
            val fetched = LiveFeedNetworkManager.fetchWebArticleMetadata(url, channel, category)
            val post = fetched.copy(
                title = if (customTitle.isNotBlank()) customTitle else fetched.title,
                summary = if (customSummary.isNotBlank()) customSummary else fetched.summary
            )
            _posts.value = listOf(post) + _posts.value
            addSavedChannel(channel)
        }
    }

    fun addRssFeedPost(channel: String, url: String, categoryName: String, customTitle: String = "", customSummary: String = "") {
        val cat = NewsCategory.entries.find { it.displayName == categoryName } ?: NewsCategory.BREAKING
        scope.launch {
            val fetched = LiveFeedNetworkManager.fetchRssFeed(url, channel, cat)
            if (fetched.isNotEmpty()) {
                val toAdd = if (customTitle.isNotBlank()) {
                    val first = fetched[0].copy(
                        title = customTitle,
                        summary = if (customSummary.isNotBlank()) customSummary else fetched[0].summary
                    )
                    listOf(first) + fetched.drop(1)
                } else fetched
                _posts.value = toAdd + _posts.value
            } else {
                addPost(
                    title = if (customTitle.isNotBlank()) customTitle else "RSS फ़ीड अपडेट ($channel)",
                    summary = if (customSummary.isNotBlank()) customSummary else "फ़ीड से सामग्री लोड की गई।",
                    channel = channel,
                    url = url,
                    category = cat,
                    isRss = true
                )
            }
            addSavedChannel(channel)
        }
    }

    fun deletePost(postId: String) {
        _posts.value = _posts.value.filter { it.id != postId }
    }

    fun updatePost(
        postId: String,
        newTitle: String,
        newSummary: String,
        newChannel: String,
        newCategoryName: String,
        isBreaking: Boolean,
        isExclusive: Boolean
    ) {
        val cat = NewsCategory.entries.find { it.displayName == newCategoryName } ?: NewsCategory.BREAKING
        _posts.value = _posts.value.map {
            if (it.id == postId) {
                it.copy(
                    title = newTitle,
                    summary = newSummary,
                    sourceChannel = newChannel,
                    category = cat,
                    categoryName = newCategoryName,
                    breaking = isBreaking,
                    isExclusive = isExclusive
                )
            } else it
        }
    }

    fun bulkDeletePosts(postIds: Set<String>) {
        _posts.value = _posts.value.filter { !postIds.contains(it.id) }
    }

    fun bulkHighlightPosts(postIds: Set<String>, isExclusive: Boolean) {
        _posts.value = _posts.value.map {
            if (postIds.contains(it.id)) it.copy(isExclusive = isExclusive) else it
        }
    }

    fun toggleHighlight(postId: String) {
        _posts.value = _posts.value.map {
            if (it.id == postId) it.copy(isExclusive = !it.isExclusive) else it
        }
    }

    fun setPostHighlight(postId: String, isHighlighted: Boolean) {
        _posts.value = _posts.value.map {
            if (it.id == postId) it.copy(isExclusive = isHighlighted) else it
        }
    }

    fun updateUserLogo(logoUri: String) {
        _userProfile.value = _userProfile.value.copy(logoUri = logoUri)
    }

    fun updateUserProfile(name: String, channelName: String, email: String, logoUri: String) {
        _userProfile.value = UserProfileData(name, channelName, email, logoUri, true)
    }

    fun addPost(
        title: String,
        summary: String,
        channel: String,
        url: String,
        category: NewsCategory = NewsCategory.BREAKING,
        isRss: Boolean = false
    ) {
        val post = NewsPost(
            id = UUID.randomUUID().toString(),
            title = title,
            summary = summary,
            sourceChannel = channel,
            sourceUrl = url,
            category = category,
            categoryName = category.displayName,
            publishedTime = "अभी",
            imageUrl = LiveFeedNetworkManager.getFallbackCategoryPhoto(category),
            isRssFeed = isRss,
            breaking = true
        )
        _posts.value = listOf(post) + _posts.value
        addSavedChannel(channel)
    }

    fun prepareJacketFromPost(post: NewsPost) {
        _activeJacketData.value = _activeJacketData.value.copy(
            headline = post.title,
            subHeadline = post.summary,
            channelName = post.sourceChannel,
            sourceLink = post.sourceUrl,
            tagText = if (post.isExclusive) "EXCLUSIVE" else if (post.breaking) "BREAKING" else "UPDATE"
        )
    }

    fun updateJacketData(data: NewsJacketData) {
        _activeJacketData.value = data
    }

    fun resetJacketData() {
        _activeJacketData.value = NewsJacketData(
            headline = "AI NEWS MAKER में आपका स्वागत है",
            subHeadline = "किसी भी न्यूज़ लिंक से तुरंत हेडर-फुटर जैकेट ग्राफ़िक तैयार करें",
            headerTitle = "AI NEWS 24 LIVE",
            reporterName = "एडमिन डेस्क",
            location = "नई दिल्ली",
            dateText = todayFormatted,
            channelName = "AI NEWS MAKER",
            tagText = "BREAKING",
            sourceLink = "https://ainewsmaker.online",
            showQrPlaceholder = false,
            style = JacketStyle.RED_BREAKING
        )
    }

    fun refreshFeed() {
        val top = _posts.value.shuffled()
        _posts.value = top
    }
}
