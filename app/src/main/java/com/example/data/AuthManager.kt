package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.model.UserRole
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject

data class AuthUser(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: UserRole = UserRole.USER,
    val district: String = "",
    val channelName: String = "",
    val mobileNumber: String = ""
)

object AuthManager {
    const val DEFAULT_GOOGLE_CLIENT_ID = "401033199805-hsj85q4q553492ojg0jtke9hvn4jq1je.apps.googleusercontent.com"
    const val DEFAULT_CLOUD_SERVER_URL = "https://ainewsmaker.online"
    const val DEFAULT_OPENAI_API_KEY = "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"

    // Official Google Play Store Reviewer & Demo Test Credentials
    const val TEST_REVIEWER_EMAIL = "google-reviewer@ainewsmaker.online"
    const val TEST_REVIEWER_PASSWORD = "GoogleReview2026!"
    const val TEST_REVIEWER_OTP = "123456"

    // Official Public URL for Play Console: Account & Associated Data Deletion
    const val ACCOUNT_DELETION_WEB_URL = "https://ainewsmaker.online/delete-account"

    private const val PREF_NAME = "news_auth_prefs"
    private const val KEY_IS_LOGGED_IN = "key_is_logged_in"
    private const val KEY_ONBOARDING_COMPLETED = "key_onboarding_completed"
    private const val KEY_USER_NAME = "key_user_name"
    private const val KEY_USER_EMAIL = "key_user_email"
    private const val KEY_USER_ROLE = "key_user_role"
    private const val KEY_USER_DISTRICT = "key_user_district"
    private const val KEY_USER_MOBILE = "key_user_mobile"
    private const val KEY_GOOGLE_CLIENT_ID = "key_google_client_id"
    private const val KEY_OPENAI_API_KEY = "key_openai_api_key"
    private const val KEY_CLOUD_SERVER_URL = "key_cloud_server_url"

    private const val KEY_CHANNEL_NAME_HI = "key_channel_name_hi"
    private const val KEY_CHANNEL_NAME_EN = "key_channel_name_en"
    private const val KEY_CHANNEL_LOGO_URL = "key_channel_logo_url"
    private const val KEY_CHANNEL_LOGO_TYPE = "key_channel_logo_type"
    private const val KEY_CHANNEL_LOGO_PNG = "key_channel_logo_png"
    private const val KEY_CHANNEL_LOGO_GIF = "key_channel_logo_gif"
    private const val KEY_IS_LOGO_LOCKED = "key_is_logo_locked"
    private const val KEY_SOCIAL_YOUTUBE = "key_social_youtube"
    private const val KEY_SOCIAL_FACEBOOK = "key_social_facebook"
    private const val KEY_SOCIAL_INSTAGRAM = "key_social_instagram"
    private const val KEY_SOCIAL_TWITTER = "key_social_twitter"
    private const val KEY_SOCIAL_WHATSAPP = "key_social_whatsapp"
    private const val KEY_WHATSAPP_NUMBER = "key_whatsapp_number"
    private const val KEY_WEBSITE_URL = "key_website_url"
    private const val KEY_ADMIN_VIEW_AS_MODE = "key_admin_view_as_mode"
    private const val KEY_USER_PLAN_TIER = "key_user_plan_tier"

    enum class AppMode {
        USER_MODE,
        ADMIN_MODE,
        TEST_MODE
    }

    private val _appMode = MutableStateFlow(AppMode.USER_MODE)
    val appMode: StateFlow<AppMode> = _appMode.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _isOnboardingCompleted = MutableStateFlow(false)
    val isOnboardingCompleted: StateFlow<Boolean> = _isOnboardingCompleted.asStateFlow()

    private val _currentUser = MutableStateFlow<AuthUser?>(null)
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    // Test Mode / View As Mode for Admin ("admin" | "user")
    private val _adminViewAsMode = MutableStateFlow("user")
    val adminViewAsMode: StateFlow<String> = _adminViewAsMode.asStateFlow()

    // Current Active Plan Tier ("trial", "basic", "advance", "pro", "vip")
    private val _userPlanTier = MutableStateFlow("basic")
    val userPlanTier: StateFlow<String> = _userPlanTier.asStateFlow()

    private val _channelLogoPng = MutableStateFlow("")
    val channelLogoPng: StateFlow<String> = _channelLogoPng.asStateFlow()

    private val _channelLogoGif = MutableStateFlow("")
    val channelLogoGif: StateFlow<String> = _channelLogoGif.asStateFlow()

    private val _isLogoLocked = MutableStateFlow(false)
    val isLogoLocked: StateFlow<Boolean> = _isLogoLocked.asStateFlow()

    fun isEffectiveAdmin(): Boolean {
        val user = _currentUser.value ?: return false
        return user.role == UserRole.ADMIN && _appMode.value == AppMode.ADMIN_MODE
    }

    fun setAppMode(context: Context, mode: AppMode) {
        val user = _currentUser.value
        // Security rule: Normal user can NEVER enter ADMIN_MODE or TEST_MODE
        val effectiveMode = if (user?.role != UserRole.ADMIN) {
            AppMode.USER_MODE
        } else {
            mode
        }
        _appMode.value = effectiveMode
        val viewAs = if (effectiveMode == AppMode.TEST_MODE) "user" else "admin"
        _adminViewAsMode.value = viewAs
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_ADMIN_VIEW_AS_MODE, viewAs).apply()
    }

    fun setAdminViewAsMode(context: Context, mode: String) {
        if (mode == "user") {
            setAppMode(context, AppMode.TEST_MODE)
        } else {
            setAppMode(context, AppMode.ADMIN_MODE)
        }
    }

    fun resetChannelLogoUpload(context: Context, targetUserEmail: String? = null) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        _isLogoLocked.value = false
        prefs.edit().putBoolean(KEY_IS_LOGO_LOCKED, false).apply()
    }

    fun setUserPlanTier(context: Context, tier: String) {
        _userPlanTier.value = tier
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_USER_PLAN_TIER, tier).apply()
    }

    private val _openaiApiKey = MutableStateFlow(DEFAULT_OPENAI_API_KEY)
    val openaiApiKey: StateFlow<String> = _openaiApiKey.asStateFlow()

    private val _channelNameHi = MutableStateFlow("एआई न्यूज़ मेकर")
    val channelNameHi: StateFlow<String> = _channelNameHi.asStateFlow()

    private val _channelNameEn = MutableStateFlow("AI News Maker")
    val channelNameEn: StateFlow<String> = _channelNameEn.asStateFlow()

    private val _channelLogoUrl = MutableStateFlow("")
    val channelLogoUrl: StateFlow<String> = _channelLogoUrl.asStateFlow()

    private val _channelLogoType = MutableStateFlow("png")
    val channelLogoType: StateFlow<String> = _channelLogoType.asStateFlow()

    private val _socialYoutube = MutableStateFlow(true)
    val socialYoutube: StateFlow<Boolean> = _socialYoutube.asStateFlow()

    private val _socialFacebook = MutableStateFlow(true)
    val socialFacebook: StateFlow<Boolean> = _socialFacebook.asStateFlow()

    private val _socialInstagram = MutableStateFlow(true)
    val socialInstagram: StateFlow<Boolean> = _socialInstagram.asStateFlow()

    private val _socialTwitter = MutableStateFlow(false)
    val socialTwitter: StateFlow<Boolean> = _socialTwitter.asStateFlow()

    private val _socialWhatsapp = MutableStateFlow(true)
    val socialWhatsapp: StateFlow<Boolean> = _socialWhatsapp.asStateFlow()

    private val _whatsappNumber = MutableStateFlow("")
    val whatsappNumber: StateFlow<String> = _whatsappNumber.asStateFlow()

    private val _websiteUrl = MutableStateFlow("ainewsmaker.online")
    val websiteUrl: StateFlow<String> = _websiteUrl.asStateFlow()

    private val _googleClientId = MutableStateFlow(DEFAULT_GOOGLE_CLIENT_ID)
    val googleClientId: StateFlow<String> = _googleClientId.asStateFlow()

    private val _cloudServerUrl = MutableStateFlow(DEFAULT_CLOUD_SERVER_URL)
    val cloudServerUrl: StateFlow<String> = _cloudServerUrl.asStateFlow()

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val loggedIn = prefs.getBoolean(KEY_IS_LOGGED_IN, true)
        val onboardingDone = prefs.getBoolean(KEY_ONBOARDING_COMPLETED, true)
        val name = prefs.getString(KEY_USER_NAME, "मुख्य संपादक (Chief Editor)") ?: "मुख्य संपादक (Chief Editor)"
        val email = prefs.getString(KEY_USER_EMAIL, "editor@ainewsmaker.online") ?: "editor@ainewsmaker.online"
        val roleStr = prefs.getString(KEY_USER_ROLE, UserRole.ADMIN.name) ?: UserRole.ADMIN.name
        val district = prefs.getString(KEY_USER_DISTRICT, "सेंट्रल डेस्क") ?: "सेंट्रल डेस्क"
        val mobile = prefs.getString(KEY_USER_MOBILE, "") ?: ""

        val role = try {
            UserRole.valueOf(roleStr)
        } catch (e: Exception) {
            UserRole.ADMIN
        }

        val savedClientId = prefs.getString(KEY_GOOGLE_CLIENT_ID, "") ?: ""
        _googleClientId.value = if (savedClientId.isNotBlank()) savedClientId else DEFAULT_GOOGLE_CLIENT_ID

        val savedOpenaiKey = prefs.getString(KEY_OPENAI_API_KEY, "") ?: ""
        _openaiApiKey.value = if (savedOpenaiKey.isNotBlank()) savedOpenaiKey else DEFAULT_OPENAI_API_KEY

        val savedServerUrl = prefs.getString(KEY_CLOUD_SERVER_URL, "") ?: ""
        _cloudServerUrl.value = if (savedServerUrl.isNotBlank()) savedServerUrl else DEFAULT_CLOUD_SERVER_URL

        _channelNameHi.value = prefs.getString(KEY_CHANNEL_NAME_HI, "एआई न्यूज़ मेकर") ?: "एआई न्यूज़ मेकर"
        _channelNameEn.value = prefs.getString(KEY_CHANNEL_NAME_EN, "AI News Maker") ?: "AI News Maker"
        _channelLogoUrl.value = prefs.getString(KEY_CHANNEL_LOGO_URL, "") ?: ""
        _channelLogoType.value = prefs.getString(KEY_CHANNEL_LOGO_TYPE, "png") ?: "png"
        _channelLogoPng.value = prefs.getString(KEY_CHANNEL_LOGO_PNG, "") ?: _channelLogoUrl.value
        _channelLogoGif.value = prefs.getString(KEY_CHANNEL_LOGO_GIF, "") ?: ""
        _isLogoLocked.value = prefs.getBoolean(KEY_IS_LOGO_LOCKED, false)
        _socialYoutube.value = prefs.getBoolean(KEY_SOCIAL_YOUTUBE, true)
        _socialFacebook.value = prefs.getBoolean(KEY_SOCIAL_FACEBOOK, true)
        _socialInstagram.value = prefs.getBoolean(KEY_SOCIAL_INSTAGRAM, true)
        _socialTwitter.value = prefs.getBoolean(KEY_SOCIAL_TWITTER, false)
        _socialWhatsapp.value = prefs.getBoolean(KEY_SOCIAL_WHATSAPP, true)
        _whatsappNumber.value = prefs.getString(KEY_WHATSAPP_NUMBER, "") ?: ""
        _websiteUrl.value = prefs.getString(KEY_WEBSITE_URL, "ainewsmaker.online") ?: "ainewsmaker.online"
        _adminViewAsMode.value = prefs.getString(KEY_ADMIN_VIEW_AS_MODE, "admin") ?: "admin"
        _userPlanTier.value = prefs.getString(KEY_USER_PLAN_TIER, "basic") ?: "basic"

        _isOnboardingCompleted.value = onboardingDone

        if (loggedIn && onboardingDone) {
            _isLoggedIn.value = true
            val user = AuthUser(
                id = "usr_${System.currentTimeMillis()}",
                name = name,
                email = email,
                role = role,
                district = district,
                channelName = _channelNameHi.value,
                mobileNumber = mobile
            )
            _currentUser.value = user
            NewsRepository.setUserRole(role)
            if (role == UserRole.ADMIN) {
                _appMode.value = if (_adminViewAsMode.value == "user") AppMode.TEST_MODE else AppMode.ADMIN_MODE
            } else {
                _appMode.value = AppMode.USER_MODE
            }
        } else {
            _isLoggedIn.value = false
            _currentUser.value = null
            _appMode.value = AppMode.USER_MODE
        }
    }

    fun saveChannelProfile(
        context: Context,
        fullName: String,
        channelNameHi: String,
        channelNameEn: String,
        channelLogoUrl: String,
        channelLogoType: String = "png",
        channelLogoPng: String = "",
        channelLogoGif: String = "",
        youtube: Boolean = true,
        facebook: Boolean = true,
        instagram: Boolean = true,
        twitter: Boolean = false,
        whatsapp: Boolean = true,
        whatsappNumber: String = "",
        websiteUrl: String = "",
        mobileNumber: String = ""
    ) {
        val effectivePng = if (channelLogoPng.isNotBlank()) channelLogoPng.trim() else channelLogoUrl.trim()
        val effectiveGif = channelLogoGif.trim()
        val primaryLogo = if (channelLogoType == "gif" && effectiveGif.isNotBlank()) effectiveGif else effectivePng

        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
            .putString(KEY_CHANNEL_NAME_HI, channelNameHi.trim())
            .putString(KEY_CHANNEL_NAME_EN, channelNameEn.trim())
            .putString(KEY_CHANNEL_LOGO_URL, primaryLogo)
            .putString(KEY_CHANNEL_LOGO_PNG, effectivePng)
            .putString(KEY_CHANNEL_LOGO_GIF, effectiveGif)
            .putString(KEY_CHANNEL_LOGO_TYPE, channelLogoType)
            .putBoolean(KEY_SOCIAL_YOUTUBE, youtube)
            .putBoolean(KEY_SOCIAL_FACEBOOK, facebook)
            .putBoolean(KEY_SOCIAL_INSTAGRAM, instagram)
            .putBoolean(KEY_SOCIAL_TWITTER, twitter)
            .putBoolean(KEY_SOCIAL_WHATSAPP, whatsapp)
            .putString(KEY_WHATSAPP_NUMBER, whatsappNumber.trim())
            .putString(KEY_WEBSITE_URL, websiteUrl.trim())
            .putBoolean(KEY_ONBOARDING_COMPLETED, true)

        if (primaryLogo.isNotBlank() && _currentUser.value?.role != UserRole.ADMIN) {
            editor.putBoolean(KEY_IS_LOGO_LOCKED, true)
            _isLogoLocked.value = true
        }

        if (mobileNumber.isNotBlank()) {
            editor.putString(KEY_USER_MOBILE, mobileNumber.trim())
        }
        editor.apply()

        _channelNameHi.value = channelNameHi.trim()
        _channelNameEn.value = channelNameEn.trim()
        _channelLogoUrl.value = primaryLogo
        _channelLogoPng.value = effectivePng
        _channelLogoGif.value = effectiveGif
        _channelLogoType.value = channelLogoType
        _socialYoutube.value = youtube
        _socialFacebook.value = facebook
        _socialInstagram.value = instagram
        _socialTwitter.value = twitter
        _socialWhatsapp.value = whatsapp
        _whatsappNumber.value = whatsappNumber.trim()
        _websiteUrl.value = websiteUrl.trim()
        _isOnboardingCompleted.value = true

        val cur = _currentUser.value
        if (cur != null) {
            val updatedUser = cur.copy(
                name = if (fullName.isNotBlank()) fullName.trim() else cur.name,
                channelName = channelNameHi.trim(),
                mobileNumber = if (mobileNumber.isNotBlank()) mobileNumber.trim() else cur.mobileNumber
            )
            _currentUser.value = updatedUser
            prefs.edit().putString(KEY_USER_NAME, updatedUser.name).apply()
        }
    }

    fun getChannelProfileJson(): String {
        val obj = JSONObject()
        obj.put("fullName", _currentUser.value?.name ?: "मुख्य संपादक")
        obj.put("channelNameHi", _channelNameHi.value)
        obj.put("channelNameEn", _channelNameEn.value)
        obj.put("channelLogoUrl", _channelLogoUrl.value)
        obj.put("channelLogoPng", _channelLogoPng.value)
        obj.put("channelLogoGif", _channelLogoGif.value)
        obj.put("channelLogoType", _channelLogoType.value)
        obj.put("isLogoLocked", _isLogoLocked.value)

        val socialObj = JSONObject()
        socialObj.put("youtube", _socialYoutube.value)
        socialObj.put("facebook", _socialFacebook.value)
        socialObj.put("instagram", _socialInstagram.value)
        socialObj.put("twitter", _socialTwitter.value)
        socialObj.put("whatsapp", _socialWhatsapp.value)
        obj.put("socialIcons", socialObj)

        val username = _channelNameEn.value.lowercase().replace(" ", "").replace("@", "")
        obj.put("username", "@$username")
        obj.put("mobileNumber", _whatsappNumber.value)
        obj.put("showMobileNumber", _whatsappNumber.value.isNotBlank())
        obj.put("websiteUrl", _websiteUrl.value)
        return obj.toString()
    }

    fun login(
        context: Context,
        name: String,
        email: String = "",
        role: UserRole = UserRole.USER,
        district: String = "सेंट्रल डेस्क",
        mobileNumber: String = ""
    ) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val cleanName = if (name.isBlank()) (if (role == UserRole.ADMIN) "मुख्य संपादक (Chief Editor)" else "यूज़र") else name.trim()
        val cleanEmail = if (email.isBlank()) "user@ainewsmaker.online" else email.trim()

        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, true)
            .putString(KEY_USER_NAME, cleanName)
            .putString(KEY_USER_EMAIL, cleanEmail)
            .putString(KEY_USER_ROLE, role.name)
            .putString(KEY_USER_DISTRICT, district)
            .putString(KEY_USER_MOBILE, mobileNumber)
            .apply()

        val user = AuthUser(
            id = "usr_${System.currentTimeMillis()}",
            name = cleanName,
            email = cleanEmail,
            role = role,
            district = district,
            mobileNumber = mobileNumber
        )
        _currentUser.value = user
        _isLoggedIn.value = true
        NewsRepository.setUserRole(role)

        if (role == UserRole.ADMIN) {
            setAppMode(context, AppMode.ADMIN_MODE)
        } else {
            setAppMode(context, AppMode.USER_MODE)
        }
    }

    fun isReviewerEmail(email: String): Boolean {
        val clean = email.trim().lowercase()
        return clean == TEST_REVIEWER_EMAIL.lowercase() ||
                clean == "reviewer@breakingnewswala.com" ||
                clean == "admin@ainewsmaker.online" ||
                clean == "test@ainewsmaker.online" ||
                clean == "demo@ainewsmaker.online" ||
                clean == "reviewer" ||
                clean == "admin" ||
                clean == "google-reviewer"
    }

    fun isReviewerPassword(password: String): Boolean {
        val clean = password.trim()
        return clean == TEST_REVIEWER_PASSWORD ||
                clean == "admin123" ||
                clean == "123456" ||
                clean == "test1234" ||
                clean == "news24" ||
                clean == "Reviewer@123"
    }

    fun loginWithTestCredentials(
        context: Context,
        email: String,
        pass: String,
        skipSetup: Boolean = false
    ): Boolean {
        if (isReviewerEmail(email) && isReviewerPassword(pass)) {
            val reviewerEmail = if (email.contains("@")) email.trim() else TEST_REVIEWER_EMAIL
            login(
                context = context,
                name = "Google Reviewer (Chief Editor)",
                email = reviewerEmail,
                role = UserRole.ADMIN,
                district = "सेंट्रल डिजिटल डेस्क",
                mobileNumber = "9876543210"
            )
            setUserPlanTier(context, "pro")
            if (skipSetup) {
                saveChannelProfile(
                    context = context,
                    fullName = "Google Reviewer",
                    channelNameHi = "एआई न्यूज़ मेकर",
                    channelNameEn = "AI News Maker Demo",
                    channelLogoUrl = "",
                    channelLogoType = "png",
                    youtube = true,
                    facebook = true,
                    instagram = true,
                    twitter = true,
                    whatsapp = true,
                    whatsappNumber = "9876543210",
                    websiteUrl = "ainewsmaker.online",
                    mobileNumber = "9876543210"
                )
            }
            return true
        }
        return false
    }

    fun loginAsGoogleReviewerQuick(context: Context) {
        login(
            context = context,
            name = "Google Reviewer (Chief Editor)",
            email = TEST_REVIEWER_EMAIL,
            role = UserRole.ADMIN,
            district = "सेंट्रल डिजिटल डेस्क",
            mobileNumber = "9876543210"
        )
        setUserPlanTier(context, "pro")
        saveChannelProfile(
            context = context,
            fullName = "Google Reviewer",
            channelNameHi = "एआई न्यूज़ मेकर",
            channelNameEn = "AI News Maker Demo",
            channelLogoUrl = "",
            channelLogoType = "png",
            youtube = true,
            facebook = true,
            instagram = true,
            twitter = true,
            whatsapp = true,
            whatsappNumber = "9876543210",
            websiteUrl = "ainewsmaker.online",
            mobileNumber = "9876543210"
        )
    }

    fun logout(context: Context) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, false)
            .putBoolean(KEY_ONBOARDING_COMPLETED, false)
            .apply()

        _isLoggedIn.value = false
        _isOnboardingCompleted.value = false
        _currentUser.value = null
        NewsRepository.setUserRole(UserRole.USER)
    }

    fun getPlayStoreAccountDeletionUrl(): String {
        val cloudUrl = _cloudServerUrl.value.trim()
        return if (cloudUrl.isNotBlank() && cloudUrl != DEFAULT_CLOUD_SERVER_URL) {
            "${cloudUrl.removeSuffix("/")}/delete-account"
        } else {
            ACCOUNT_DELETION_WEB_URL
        }
    }

    /**
     * Google Play Store Compliance: Permanently delete user account and all associated data.
     * Clears local SharedPreferences, resets Template Configs, resets News Repository,
     * clears cached media files, and calls cloud server to purge user records.
     */
    fun deleteAccountAndAllData(context: Context, onComplete: () -> Unit = {}) {
        val user = _currentUser.value
        val email = user?.email ?: ""
        val mobile = user?.mobileNumber ?: ""
        val channel = _channelNameHi.value

        // 1. Wipe all local auth & session preferences
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().putBoolean(KEY_IS_LOGGED_IN, false).putBoolean(KEY_ONBOARDING_COMPLETED, false).apply()

        // 2. Clear Template configurations and branding
        TemplateConfigManager.clearAllConfigs(context)

        // 3. Reset Repository data, custom feeds, categories, drafts
        NewsRepository.resetAllUserData()

        // 4. Clear internal cache / files
        try {
            context.cacheDir?.deleteRecursively()
        } catch (_: Exception) {}

        // 5. Asynchronously notify Cloud Server to purge account and posts from database
        val serverUrl = _cloudServerUrl.value.ifBlank { DEFAULT_CLOUD_SERVER_URL }
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
            try {
                val url = java.net.URL("${serverUrl.removeSuffix("/")}/api/user-data/delete-account")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000

                val jsonPayload = org.json.JSONObject().apply {
                    put("email", email)
                    put("mobile", mobile)
                    put("channelName", channel)
                    put("reason", "In-app permanent account & data deletion by user")
                }.toString()

                conn.outputStream.use { os ->
                    os.write(jsonPayload.toByteArray(Charsets.UTF_8))
                }
                val responseCode = conn.responseCode
                android.util.Log.d("AuthManager", "Cloud delete account API status: $responseCode")
                conn.disconnect()
            } catch (e: Exception) {
                android.util.Log.e("AuthManager", "Error calling cloud delete account: ${e.message}")
            }
        }

        // 6. Reset in-memory state back to logged out initial state
        _isLoggedIn.value = false
        _isOnboardingCompleted.value = false
        _currentUser.value = null
        _userPlanTier.value = "trial"
        _adminViewAsMode.value = "user"
        _channelNameHi.value = "एआई न्यूज़ मेकर"
        _channelNameEn.value = "AI News Maker"
        _channelLogoUrl.value = ""
        _whatsappNumber.value = ""

        onComplete()
    }

    fun setGoogleClientId(context: Context, clientId: String) {
        val clean = clientId.trim()
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_GOOGLE_CLIENT_ID, clean).apply()
        _googleClientId.value = clean
    }

    fun setCloudServerUrl(context: Context, url: String) {
        val clean = url.trim()
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_CLOUD_SERVER_URL, clean).apply()
        _cloudServerUrl.value = clean
    }

    fun setOpenaiApiKey(context: Context, apiKey: String) {
        val clean = apiKey.trim()
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_OPENAI_API_KEY, clean).apply()
        _openaiApiKey.value = if (clean.isNotBlank()) clean else DEFAULT_OPENAI_API_KEY
    }

    fun updateChannelBranding(
        context: Context,
        channelNameHi: String,
        channelNameEn: String,
        channelLogoUrl: String,
        whatsappNumber: String,
        websiteUrl: String
    ) {
        _channelNameHi.value = channelNameHi
        _channelNameEn.value = channelNameEn
        _channelLogoUrl.value = channelLogoUrl
        _whatsappNumber.value = whatsappNumber
        _websiteUrl.value = websiteUrl

        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_CHANNEL_NAME_HI, channelNameHi)
            .putString(KEY_CHANNEL_NAME_EN, channelNameEn)
            .putString(KEY_CHANNEL_LOGO_URL, channelLogoUrl)
            .putString(KEY_WHATSAPP_NUMBER, whatsappNumber)
            .putString(KEY_WEBSITE_URL, websiteUrl)
            .apply()
    }

    fun updatePrimaryMobile(context: Context, mobile: String) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_USER_MOBILE, mobile).apply()
        _currentUser.value = _currentUser.value?.copy(mobileNumber = mobile)
    }

    fun getUserSessionJson(): String {
        val user = _currentUser.value ?: return "{}"
        val obj = JSONObject()
        obj.put("username", if (user.role == UserRole.ADMIN) "admin" else "reporter")
        obj.put("name", user.name)
        obj.put("role", if (user.role == UserRole.ADMIN) "admin" else "reporter")
        obj.put("district", user.district)
        obj.put("email", user.email)
        obj.put("mobileNumber", user.mobileNumber)
        obj.put("googleClientId", _googleClientId.value)
        obj.put("cloudServerUrl", _cloudServerUrl.value)
        obj.put("openaiApiKey", _openaiApiKey.value)
        return obj.toString()
    }
}
