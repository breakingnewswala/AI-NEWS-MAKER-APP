package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.model.UserRole
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

data class AuthUser(
    val id: String = "user_default",
    val name: String = "मुख्य संपादक (Chief Editor)",
    val email: String = "editor@ainewsmaker.online",
    val role: UserRole = UserRole.ADMIN,
    val district: String = "सेंट्रल डेस्क",
    val channelName: String = "AI NEWS MAKER",
    val mobileNumber: String = ""
)

object AuthManager {
    enum class AppMode {
        USER_MODE,
        ADMIN_MODE,
        TEST_MODE
    }

    const val DEFAULT_GOOGLE_CLIENT_ID = "401033199805-04o13ssp6vnvm498r1fr392qbco6tcva.apps.googleusercontent.com"
    const val FALLBACK_GOOGLE_CLIENT_ID = "401033199805-04o13ssp6vnvm498r1fr392qbco6tcva.apps.googleusercontent.com"
    const val DEFAULT_CLOUD_SERVER_URL = "https://ainewsmaker.online"
    const val DEFAULT_OPENAI_API_KEY = "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"

    const val ACCOUNT_DELETION_WEB_URL = "https://ainewsmaker.online/delete-account"
    const val TEST_REVIEWER_EMAIL = "google-reviewer@ainewsmaker.online"
    const val TEST_REVIEWER_OTP = "123456"
    const val TEST_REVIEWER_PASSWORD = "GoogleReview2026!"

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

    private val _appMode = MutableStateFlow(AppMode.ADMIN_MODE)
    val appMode: StateFlow<AppMode> = _appMode.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _isOnboardingCompleted = MutableStateFlow(false)
    val isOnboardingCompleted: StateFlow<Boolean> = _isOnboardingCompleted.asStateFlow()

    private val _currentUser = MutableStateFlow<AuthUser?>(null)
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    // Test Mode / View As Mode for Admin ("admin" | "user")
    private val _adminViewAsMode = MutableStateFlow("admin")
    val adminViewAsMode: StateFlow<String> = _adminViewAsMode.asStateFlow()

    private val _userPlanTier = MutableStateFlow("pro")
    val userPlanTier: StateFlow<String> = _userPlanTier.asStateFlow()

    private val _channelLogoPng = MutableStateFlow("")
    val channelLogoPng: StateFlow<String> = _channelLogoPng.asStateFlow()

    private val _channelLogoGif = MutableStateFlow("")
    val channelLogoGif: StateFlow<String> = _channelLogoGif.asStateFlow()

    private val _isLogoLocked = MutableStateFlow(false)
    val isLogoLocked: StateFlow<Boolean> = _isLogoLocked.asStateFlow()

    private val _channelNameHi = MutableStateFlow("एआई न्यूज़ मेकर")
    val channelNameHi: StateFlow<String> = _channelNameHi.asStateFlow()

    private val _channelNameEn = MutableStateFlow("AI News Maker")
    val channelNameEn: StateFlow<String> = _channelNameEn.asStateFlow()

    private val _channelLogoUrl = MutableStateFlow("")
    val channelLogoUrl: StateFlow<String> = _channelLogoUrl.asStateFlow()

    private val _channelLogoType = MutableStateFlow("png")
    val channelLogoType: StateFlow<String> = _channelLogoType.asStateFlow()

    private val _socialYoutube = MutableStateFlow("")
    val socialYoutube: StateFlow<String> = _socialYoutube.asStateFlow()

    private val _socialFacebook = MutableStateFlow("")
    val socialFacebook: StateFlow<String> = _socialFacebook.asStateFlow()

    private val _socialInstagram = MutableStateFlow("")
    val socialInstagram: StateFlow<String> = _socialInstagram.asStateFlow()

    private val _socialTwitter = MutableStateFlow("")
    val socialTwitter: StateFlow<String> = _socialTwitter.asStateFlow()

    private val _socialWhatsapp = MutableStateFlow("")
    val socialWhatsapp: StateFlow<String> = _socialWhatsapp.asStateFlow()

    private val _whatsappNumber = MutableStateFlow("9876543210")
    val whatsappNumber: StateFlow<String> = _whatsappNumber.asStateFlow()

    private val _websiteUrl = MutableStateFlow("ainewsmaker.online")
    val websiteUrl: StateFlow<String> = _websiteUrl.asStateFlow()

    private val _googleClientId = MutableStateFlow(DEFAULT_GOOGLE_CLIENT_ID)
    val googleClientId: StateFlow<String> = _googleClientId.asStateFlow()

    private val _cloudServerUrl = MutableStateFlow(DEFAULT_CLOUD_SERVER_URL)
    val cloudServerUrl: StateFlow<String> = _cloudServerUrl.asStateFlow()

    private val _openaiApiKey = MutableStateFlow(DEFAULT_OPENAI_API_KEY)
    val openaiApiKey: StateFlow<String> = _openaiApiKey.asStateFlow()

    fun isEffectiveAdmin(): Boolean {
        val user = _currentUser.value
        return user?.role == UserRole.ADMIN && _adminViewAsMode.value == "admin"
    }

    fun setAppMode(context: Context, mode: AppMode) {
        _appMode.value = mode
    }

    fun setAdminViewAsMode(context: Context, mode: String) {
        _adminViewAsMode.value = mode
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_ADMIN_VIEW_AS_MODE, mode).apply()
    }

    fun resetChannelLogoUpload(context: Context, targetUserEmail: String? = null) {
        _channelLogoPng.value = ""
        _channelLogoGif.value = ""
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove(KEY_CHANNEL_LOGO_PNG).remove(KEY_CHANNEL_LOGO_GIF).apply()
    }

    fun setUserPlanTier(context: Context, tier: String) {
        _userPlanTier.value = tier
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_USER_PLAN_TIER, tier).apply()
    }

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        _isLoggedIn.value = prefs.getBoolean(KEY_IS_LOGGED_IN, false)
        _isOnboardingCompleted.value = prefs.getBoolean(KEY_ONBOARDING_COMPLETED, false)
        _channelNameHi.value = prefs.getString(KEY_CHANNEL_NAME_HI, "एआई न्यूज़ मेकर") ?: "एआई न्यूज़ मेकर"
        _channelNameEn.value = prefs.getString(KEY_CHANNEL_NAME_EN, "AI News Maker") ?: "AI News Maker"
        _channelLogoUrl.value = prefs.getString(KEY_CHANNEL_LOGO_URL, "") ?: ""
        _whatsappNumber.value = prefs.getString(KEY_WHATSAPP_NUMBER, "9876543210") ?: "9876543210"
        _websiteUrl.value = prefs.getString(KEY_WEBSITE_URL, "ainewsmaker.online") ?: "ainewsmaker.online"
        _userPlanTier.value = prefs.getString(KEY_USER_PLAN_TIER, "pro") ?: "pro"
        _adminViewAsMode.value = prefs.getString(KEY_ADMIN_VIEW_AS_MODE, "admin") ?: "admin"

        if (_isLoggedIn.value) {
            val userName = prefs.getString(KEY_USER_NAME, "मुख्य संपादक (Chief Editor)") ?: "मुख्य संपादक (Chief Editor)"
            val userEmail = prefs.getString(KEY_USER_EMAIL, "editor@ainewsmaker.online") ?: "editor@ainewsmaker.online"
            val userRoleStr = prefs.getString(KEY_USER_ROLE, UserRole.ADMIN.name) ?: UserRole.ADMIN.name
            val userRole = try { UserRole.valueOf(userRoleStr) } catch (_: Exception) { UserRole.ADMIN }
            val district = prefs.getString(KEY_USER_DISTRICT, "सेंट्रल डेस्क") ?: "सेंट्रल डेस्क"
            val mobile = prefs.getString(KEY_USER_MOBILE, "") ?: ""

            _currentUser.value = AuthUser(
                name = userName,
                email = userEmail,
                role = userRole,
                district = district,
                mobileNumber = mobile,
                channelName = _channelNameHi.value
            )
        } else {
            _currentUser.value = null
        }
    }

    fun saveChannelProfile(
        context: Context,
        fullName: String,
        channelHi: String = "",
        channelEn: String = "",
        logoUrl: String = "",
        logoType: String = "png",
        logoPng: String? = null,
        logoGif: String? = null,
        youtube: Boolean = true,
        facebook: Boolean = true,
        instagram: Boolean = true,
        twitter: Boolean = true,
        whatsapp: Boolean = true,
        whatsappNum: String = "9876543210",
        webUrl: String = "ainewsmaker.online",
        mobileNum: String = "9876543210",
        channelNameHi: String = channelHi,
        channelNameEn: String = channelEn,
        channelLogoUrl: String = logoUrl,
        channelLogoType: String = logoType,
        whatsappNumber: String = whatsappNum,
        websiteUrl: String = webUrl,
        mobileNumber: String = mobileNum
    ) {
        val finalChannelHi = if (channelNameHi.isNotBlank()) channelNameHi else channelHi
        val finalChannelEn = if (channelNameEn.isNotBlank()) channelNameEn else channelEn
        val finalLogoUrl = if (channelLogoUrl.isNotBlank()) channelLogoUrl else logoUrl
        val finalLogoType = if (channelLogoType.isNotBlank()) channelLogoType else logoType
        val finalWhatsappNum = if (whatsappNumber != "9876543210") whatsappNumber else whatsappNum
        val finalWebUrl = if (websiteUrl != "ainewsmaker.online") websiteUrl else webUrl
        val finalMobileNum = if (mobileNumber != "9876543210") mobileNumber else mobileNum

        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_USER_NAME, fullName)
            .putString(KEY_CHANNEL_NAME_HI, finalChannelHi)
            .putString(KEY_CHANNEL_NAME_EN, finalChannelEn)
            .putString(KEY_CHANNEL_LOGO_URL, finalLogoUrl)
            .putString(KEY_CHANNEL_LOGO_TYPE, finalLogoType)
            .putString(KEY_WHATSAPP_NUMBER, finalWhatsappNum)
            .putString(KEY_WEBSITE_URL, finalWebUrl)
            .putString(KEY_USER_MOBILE, finalMobileNum)
            .apply()

        _channelNameHi.value = finalChannelHi
        _channelNameEn.value = finalChannelEn
        _channelLogoUrl.value = finalLogoUrl
        _channelLogoType.value = finalLogoType
        _whatsappNumber.value = finalWhatsappNum
        _websiteUrl.value = finalWebUrl

        val curr = _currentUser.value
        if (curr != null) {
            _currentUser.value = curr.copy(
                name = fullName,
                channelName = finalChannelHi,
                mobileNumber = finalMobileNum
            )
        }
    }

    fun getChannelProfileJson(): String {
        val socialObj = JSONObject().apply {
            put("youtube", true)
            put("facebook", true)
            put("instagram", true)
            put("twitter", false)
            put("telegram", false)
            put("whatsapp", true)
        }
        val obj = JSONObject().apply {
            put("channelNameHi", _channelNameHi.value)
            put("channelNameEn", _channelNameEn.value)
            put("logoUrl", _channelLogoUrl.value)
            put("whatsappNumber", _whatsappNumber.value)
            put("websiteUrl", _websiteUrl.value)
            put("tier", _userPlanTier.value)
            put("socialIcons", socialObj)
        }
        return obj.toString()
    }

    fun login(
        context: Context,
        name: String,
        email: String,
        role: UserRole = UserRole.REPORTER,
        district: String = "सेंट्रल डेस्क",
        mobileNumber: String = ""
    ) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, true)
            .putBoolean(KEY_ONBOARDING_COMPLETED, true)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_ROLE, role.name)
            .putString(KEY_USER_DISTRICT, district)
            .putString(KEY_USER_MOBILE, mobileNumber)
            .apply()

        _isLoggedIn.value = true
        _isOnboardingCompleted.value = true
        _currentUser.value = AuthUser(
            name = name,
            email = email,
            role = role,
            district = district,
            mobileNumber = mobileNumber,
            channelName = _channelNameHi.value
        )
        NewsRepository.setUserRole(role)
    }

    fun isReviewerEmail(email: String): Boolean {
        return email.trim().equals(TEST_REVIEWER_EMAIL, ignoreCase = true)
    }

    fun isReviewerPassword(pass: String): Boolean {
        return pass.trim() == TEST_REVIEWER_PASSWORD
    }

    fun loginWithTestCredentials(context: Context, email: String, pass: String, skipSetup: Boolean = false): Boolean {
        if (isReviewerEmail(email) && isReviewerPassword(pass)) {
            login(context, "Google Reviewer (Chief Editor)", TEST_REVIEWER_EMAIL, UserRole.ADMIN, "सेंट्रल डिजिटल डेस्क", "9876543210")
            setUserPlanTier(context, "pro")
            return true
        }
        return false
    }

    fun loginAsGoogleReviewerQuick(context: Context) {
        login(context, "Google Reviewer (Chief Editor)", TEST_REVIEWER_EMAIL, UserRole.ADMIN, "सेंट्रल डिजिटल डेस्क", "9876543210")
        setUserPlanTier(context, "pro")
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
        if (cloudUrl.isNotBlank() && cloudUrl != DEFAULT_CLOUD_SERVER_URL) {
            return cloudUrl.trimEnd('/') + "/delete-account"
        }
        return ACCOUNT_DELETION_WEB_URL
    }

    fun deleteAccountAndAllData(context: Context, onComplete: () -> Unit = {}) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().putBoolean(KEY_IS_LOGGED_IN, false).putBoolean(KEY_ONBOARDING_COMPLETED, false).apply()
        TemplateConfigManager.clearAllConfigs(context)
        NewsRepository.resetAllUserData()
        try {
            context.cacheDir?.deleteRecursively()
        } catch (_: Exception) {}

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
        if (!_isLoggedIn.value) return "{}"
        val user = _currentUser.value ?: return "{}"
        val obj = JSONObject().apply {
            put("username", if (user.role == UserRole.ADMIN) "admin" else "reporter")
            put("name", user.name)
            put("role", if (user.role == UserRole.ADMIN) "admin" else "reporter")
            put("district", user.district)
            put("email", user.email)
            put("mobileNumber", user.mobileNumber)
            put("googleClientId", _googleClientId.value)
            put("cloudServerUrl", _cloudServerUrl.value)
            put("openaiApiKey", _openaiApiKey.value)
        }
        return obj.toString()
    }
}
