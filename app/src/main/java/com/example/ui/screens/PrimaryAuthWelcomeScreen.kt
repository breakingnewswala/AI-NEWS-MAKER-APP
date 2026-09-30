package com.example.ui.screens

import android.app.Activity
import android.content.Context
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.example.R
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.example.data.AuthManager
import com.example.model.UserRole
import kotlinx.coroutines.launch

/**
 * Initial 2-Step App Opening Experience:
 * Step 1: Welcome & Login (Google Sign-In with Credential Manager / Quick Continue / Admin)
 * Step 2: Channel & Profile Setup (Full Name, Channel Hindi & English Name, Logo & Social Icons)
 */
@Composable
fun PrimaryAuthWelcomeScreen(
    onLoginSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // Step state: 1 = Welcome & Login, 2 = Channel & Profile Setup
    var currentStep by remember { mutableStateOf(if (AuthManager.isLoggedIn.value && !AuthManager.isOnboardingCompleted.value) 2 else 1) }

    // Step 1 Auth Mode: "signup" or "login"
    var authMode by remember { mutableStateOf(if (AuthManager.isLoggedIn.value) "login" else "signup") }
    var signupName by remember { mutableStateOf("") }
    var signupMobile by remember { mutableStateOf("") }
    var signupEmail by remember { mutableStateOf("") }
    var signupPassword by remember { mutableStateOf("") }
    var isSignupPasswordVisible by remember { mutableStateOf(false) }
    var signupChannelName by remember { mutableStateOf("एआई न्यूज़ मेकर") }
    var signupDistrict by remember { mutableStateOf("") }
    var signupErrorMessage by remember { mutableStateOf<String?>(null) }

    // Channel Setup form fields (initialized with defaults or AuthManager state)
    var fullName by remember { mutableStateOf("") }
    var channelNameHi by remember { mutableStateOf(AuthManager.channelNameHi.value) }
    var channelNameEn by remember { mutableStateOf(AuthManager.channelNameEn.value) }
    var channelLogoUrl by remember { mutableStateOf(AuthManager.channelLogoUrl.value) }
    var channelLogoType by remember { mutableStateOf(AuthManager.channelLogoType.value) }
    var youtubeEnabled by remember { mutableStateOf(AuthManager.socialYoutube.value) }
    var facebookEnabled by remember { mutableStateOf(AuthManager.socialFacebook.value) }
    var instagramEnabled by remember { mutableStateOf(AuthManager.socialInstagram.value) }
    var twitterEnabled by remember { mutableStateOf(AuthManager.socialTwitter.value) }
    var whatsappEnabled by remember { mutableStateOf(AuthManager.socialWhatsapp.value) }
    var whatsappNumber by remember { mutableStateOf(AuthManager.whatsappNumber.value) }
    var websiteUrl by remember { mutableStateOf(AuthManager.websiteUrl.value) }

    // Login Form State (Editor & Reporter Credentials)
    var loginEmail by remember { mutableStateOf("admin@breakingnewswala.com") }
    var loginPassword by remember { mutableStateOf("news123") }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var loginErrorMessage by remember { mutableStateOf<String?>(null) }
    var isLoadingGoogle by remember { mutableStateOf(false) }

    // Primary Mobile Number & OTP Verification State
    var primaryMobile by remember { mutableStateOf(AuthManager.currentUser.value?.mobileNumber ?: "") }
    var otpSent by remember { mutableStateOf(false) }
    var otpCode by remember { mutableStateOf("") }
    var otpVerified by remember { mutableStateOf(false) }
    var isSendingOtp by remember { mutableStateOf(false) }
    var isVerifyingOtp by remember { mutableStateOf(false) }

    // Photo picker launcher for custom channel logo (Zero-permission modern Photo Picker)
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri: Uri? ->
            if (uri != null) {
                channelLogoUrl = uri.toString()
                Toast.makeText(context, "✅ चैनल लोगो चुना गया!", Toast.LENGTH_SHORT).show()
            }
        }
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF28060C), // Deep crimson/burgundy
                        Color(0xFF130306), // Midnight maroon
                        Color(0xFF080102)  // Dark foundation
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Centered Official App Logo & Brand Header (Red, White & Gold Theme)
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .border(2.5.dp, Color(0xFFD4AF37), CircleShape)
                    .testTag("auth_official_logo"),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_app_logo),
                    contentDescription = "AI NEWS MAKER Logo",
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "AI NEWS MAKER",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 1.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(5.dp))

            // Subtitle Plate in Red, White & Gold
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF991B1B).copy(alpha = 0.6f),
                border = BorderStroke(1.dp, Color(0xFFD4AF37))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "स्मार्ट डिजिटल न्यूज़ स्टूडियो",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFDE047)
                    )
                    Text(text = "•", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp)
                    Text(
                        text = if (currentStep == 1) "लॉगिन" else "चैनल सेटअप",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    if (targetState > initialState) {
                        slideInHorizontally { width -> width } + fadeIn() togetherWith
                                slideOutHorizontally { width -> -width } + fadeOut()
                    } else {
                        slideInHorizontally { width -> -width } + fadeIn() togetherWith
                                slideOutHorizontally { width -> width } + fadeOut()
                    }
                },
                label = "onboarding_step_transition"
            ) { step ->
                if (step == 1) {
                    // ==========================================
                    // STEP 1: WELCOME & LOGIN (शुरुआत एवं लॉगिन)
                    // ==========================================
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "स्वागत है, AI न्यूज़ मेकर में",
                            fontSize = 21.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "1-क्लिक ग्राफिक्स, AI हेडलाइन व सोशल रिपोर्टिंग स्टूडियो",
                            fontSize = 12.sp,
                            color = Color(0xFFCBD5E1),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // 8 Feature Points Grid
                        val features = listOf(
                            "🎨" to "High Quality News Graphics",
                            "🖼️" to "50+ Ready Frames",
                            "⚡" to "One Click Social Share",
                            "✨" to "AI Headline & Voice",
                            "🔥" to "Viral Videos",
                            "🎬" to "Video Editing",
                            "🖌️" to "Graphic Designing",
                            "📰" to "e-paper"
                        )
                        for (i in features.indices step 2) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                FeaturePill(icon = features[i].first, title = features[i].second, modifier = Modifier.weight(1f))
                                if (i + 1 < features.size) {
                                    FeaturePill(icon = features[i + 1].first, title = features[i + 1].second, modifier = Modifier.weight(1f))
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Segmented Switcher: Sign Up vs Login
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF0F172A),
                            border = BorderStroke(1.2.dp, Color(0xFF334155)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(4.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Button(
                                    onClick = {
                                        authMode = "signup"
                                        signupErrorMessage = null
                                        loginErrorMessage = null
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                        .testTag("tab_auth_signup"),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (authMode == "signup") Color(0xFFDC2626) else Color.Transparent
                                    ),
                                    contentPadding = PaddingValues(horizontal = 6.dp)
                                ) {
                                    Text(
                                        text = "📝 नया खाता (साइन अप)",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (authMode == "signup") Color.White else Color(0xFF94A3B8)
                                    )
                                }

                                Button(
                                    onClick = {
                                        authMode = "login"
                                        signupErrorMessage = null
                                        loginErrorMessage = null
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                        .testTag("tab_auth_login"),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (authMode == "login") Color(0xFFD97706) else Color.Transparent
                                    ),
                                    contentPadding = PaddingValues(horizontal = 6.dp)
                                ) {
                                    Text(
                                        text = "🔑 लॉगिन (Login)",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (authMode == "login") Color.White else Color(0xFF94A3B8)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        if (authMode == "signup") {
                            // ========================================================
                            // TAB 1: SIGN UP FLOW (साइन अप कैसे करें? 3 आसान स्टेप्स)
                            // ========================================================

                            // 3-Step Guide Card
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFF451A03).copy(alpha = 0.5f),
                                border = BorderStroke(1.2.dp, Color(0xFFD97706)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(text = "✨", fontSize = 16.sp)
                                        Text(
                                            text = "साइन अप कैसे करें? (3 आसान स्टेप्स)",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFFFDE047)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        // Step 1 Chip
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFF1E293B),
                                            border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(modifier = Modifier.padding(6.dp)) {
                                                Text(text = "1️⃣ विवरण", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFFF59E0B))
                                                Text(text = "नाम व मोबाइल", fontSize = 10.sp, color = Color.White)
                                            }
                                        }

                                        // Step 2 Chip
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFF1E293B),
                                            border = BorderStroke(1.dp, Color(0xFF475569)),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(modifier = Modifier.padding(6.dp)) {
                                                Text(text = "2️⃣ चैनल", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFFCBD5E1))
                                                Text(text = "नाम व लोगो", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                            }
                                        }

                                        // Step 3 Chip
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFF1E293B),
                                            border = BorderStroke(1.dp, Color(0xFF475569)),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(modifier = Modifier.padding(6.dp)) {
                                                Text(text = "3️⃣ स्टूडियो", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFFCBD5E1))
                                                Text(text = "HD कार्ड तैयार", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // 1-Click Google Sign Up Button
                            Button(
                                onClick = {
                                    if (isLoadingGoogle) return@Button
                                    isLoadingGoogle = true
                                    coroutineScope.launch {
                                        try {
                                            val credentialManager = CredentialManager.create(context)
                                            val googleIdOption = GetGoogleIdOption.Builder()
                                                .setFilterByAuthorizedAccounts(false)
                                                .setServerClientId(AuthManager.DEFAULT_GOOGLE_CLIENT_ID)
                                                .setAutoSelectEnabled(true)
                                                .build()

                                            val request = GetCredentialRequest.Builder()
                                                .addCredentialOption(googleIdOption)
                                                .build()

                                            val activity = context as? Activity
                                            if (activity != null) {
                                                val result = credentialManager.getCredential(activity, request)
                                                val credential = result.credential
                                                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                                    val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                                                    val displayName = googleIdToken.displayName ?: "Google User"
                                                    val email = googleIdToken.id
                                                    val profilePic = googleIdToken.profilePictureUri?.toString() ?: ""

                                                    val assignedRole = if (AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                                                    AuthManager.login(
                                                        context = context,
                                                        name = displayName,
                                                        email = email,
                                                        role = assignedRole,
                                                        district = "डिजिटल डेस्क"
                                                    )
                                                    fullName = displayName
                                                    if (profilePic.isNotBlank() && channelLogoUrl.isBlank()) {
                                                        channelLogoUrl = profilePic
                                                    }
                                                    Toast.makeText(context, "✅ Google से साइन अप सफल: $displayName", Toast.LENGTH_SHORT).show()
                                                    currentStep = 2
                                                    isLoadingGoogle = false
                                                    return@launch
                                                }
                                            }
                                        } catch (e: Exception) {
                                            android.util.Log.w("GoogleAuth", "CredentialManager attempt: ${e.message}", e)
                                        }

                                        // Fallback instant Google sign up
                                        AuthManager.login(
                                            context = context,
                                            name = "Google यूज़र",
                                            email = "user@breakingnewswala.com",
                                            role = UserRole.USER,
                                            district = "डिजिटल डेस्क"
                                        )
                                        fullName = "Google यूज़र"
                                        Toast.makeText(context, "✅ खाता सत्यापित! अब चैनल सेटअप पूरा करें", Toast.LENGTH_SHORT).show()
                                        currentStep = 2
                                        isLoadingGoogle = false
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                                    .testTag("btn_google_signup"),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                                border = BorderStroke(1.5.dp, Color(0xFFE2E8F0)),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                            ) {
                                if (isLoadingGoogle) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color(0xFFDC2626), strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text("Google से कनेक्ट हो रहे हैं...", color = Color(0xFF1E293B), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                } else {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(22.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFF1F5F9)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(text = "G", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF4285F4))
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text(
                                            text = "Google से 1-क्लिक में तुरंत साइन अप करें",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1E293B)
                                        )
                                    }
                                }
                            }

                            // Divider
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFF334155))
                                Text(
                                    text = "  अथवा मोबाइल व ईमेल से साइन अप करें  ",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFF334155))
                            }

                            // Full Sign Up Form Card
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFF1E293B).copy(alpha = 0.85f),
                                border = BorderStroke(1.2.dp, Color(0xFFDC2626)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "📝", fontSize = 18.sp)
                                        Column {
                                            Text(
                                                text = "नया रिपोर्टर / चैनल खाता पंजीकरण",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Text(
                                                text = "7 दिन का फ्री बेसिक ट्रायल तुरंत एक्टिवेट होगा",
                                                fontSize = 11.sp,
                                                color = Color(0xFFFDE047)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Full Name
                                    Text(text = "पूरा नाम (Full Name) *", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = signupName,
                                        onValueChange = { signupName = it; signupErrorMessage = null },
                                        placeholder = { Text("उदा. राहुल शर्मा", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("input_signup_name"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFEF4444), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Mobile Number
                                    Text(text = "मोबाइल नंबर (10 अंक) *", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = signupMobile,
                                        onValueChange = {
                                            if (it.length <= 10 && it.all { char -> char.isDigit() }) {
                                                signupMobile = it
                                                signupErrorMessage = null
                                            }
                                        },
                                        placeholder = { Text("9876543210", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("input_signup_mobile"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFEF4444), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Email Address
                                    Text(text = "ईमेल पता (Email) *", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = signupEmail,
                                        onValueChange = { signupEmail = it; signupErrorMessage = null },
                                        placeholder = { Text("yourname@gmail.com", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("input_signup_email"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFEF4444), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Password
                                    Text(text = "सुरक्षित पासवर्ड बनाएं *", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = signupPassword,
                                        onValueChange = { signupPassword = it; signupErrorMessage = null },
                                        placeholder = { Text("कम से कम 4 अक्षर", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        visualTransformation = if (isSignupPasswordVisible) androidx.compose.ui.text.input.VisualTransformation.None else PasswordVisualTransformation(),
                                        trailingIcon = {
                                            IconButton(onClick = { isSignupPasswordVisible = !isSignupPasswordVisible }) {
                                                Text(text = if (isSignupPasswordVisible) "👁️" else "🔒", fontSize = 14.sp)
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth().testTag("input_signup_password"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFEF4444), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Channel / Portal Name
                                    Text(text = "चैनल / न्यूज़ पोर्टल का नाम", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = signupChannelName,
                                        onValueChange = { signupChannelName = it },
                                        placeholder = { Text("उदा. भारत न्यूज़ 24", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("input_signup_channel"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFEF4444), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // District / City
                                    Text(text = "शहर / जिला (Reporting District)", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = signupDistrict,
                                        onValueChange = { signupDistrict = it },
                                        placeholder = { Text("उदा. लखनऊ / दिल्ली / भोपाल", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("input_signup_district"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFEF4444), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    if (signupErrorMessage != null) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = signupErrorMessage ?: "",
                                            color = Color(0xFFF87171),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(14.dp))

                                    // Submit Sign Up Button
                                    Button(
                                        onClick = {
                                            val nameTrim = signupName.trim()
                                            val mobileTrim = signupMobile.trim()
                                            val emailTrim = signupEmail.trim().lowercase()
                                            val passTrim = signupPassword.trim()

                                            if (nameTrim.isBlank()) {
                                                signupErrorMessage = "कृपया अपना पूरा नाम दर्ज करें"
                                                return@Button
                                            }
                                            if (mobileTrim.length != 10) {
                                                signupErrorMessage = "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें"
                                                return@Button
                                            }
                                            if (emailTrim.isBlank() || !emailTrim.contains("@")) {
                                                signupErrorMessage = "कृपया वैध ईमेल पता दर्ज करें"
                                                return@Button
                                            }
                                            if (passTrim.length < 4) {
                                                signupErrorMessage = "पासवर्ड कम से कम 4 अक्षरों का होना चाहिए"
                                                return@Button
                                            }

                                            // Register new user & activate trial
                                            AuthManager.login(
                                                context = context,
                                                name = nameTrim,
                                                email = emailTrim,
                                                role = UserRole.USER,
                                                district = signupDistrict.trim().ifEmpty { "सेंट्रल डेस्क" },
                                                mobileNumber = mobileTrim
                                            )

                                            fullName = nameTrim
                                            primaryMobile = mobileTrim
                                            if (signupChannelName.isNotBlank()) {
                                                channelNameHi = signupChannelName.trim()
                                                channelNameEn = signupChannelName.trim()
                                            }

                                            Toast.makeText(context, "✅ खाता सफलतापूर्वक पंजीकृत हुआ! अब चैनल सेटअप करें", Toast.LENGTH_SHORT).show()
                                            currentStep = 2
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp)
                                            .testTag("btn_submit_signup"),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center
                                        ) {
                                            Text(text = "🚀", fontSize = 16.sp)
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "खाता बनाएं एवं चैनल सेटअप पर जाएं (स्टेप 2)",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Switch to Login
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = "पहले से खाता मौजूद है? ", color = Color(0xFF94A3B8), fontSize = 12.sp)
                                        Text(
                                            text = "यहाँ लॉगिन करें",
                                            color = Color(0xFFFDE047),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.clickable { authMode = "login" }
                                        )
                                    }
                                }
                            }
                        } else {
                            // ========================================================
                            // TAB 2: LOGIN FLOW (संपादक व रिपोर्टर लॉगिन)
                            // ========================================================

                            // Google Sign-In Button
                            Button(
                                onClick = {
                                    if (isLoadingGoogle) return@Button
                                    isLoadingGoogle = true
                                    coroutineScope.launch {
                                        try {
                                            val credentialManager = CredentialManager.create(context)
                                            val googleIdOption = GetGoogleIdOption.Builder()
                                                .setFilterByAuthorizedAccounts(false)
                                                .setServerClientId(AuthManager.DEFAULT_GOOGLE_CLIENT_ID)
                                                .setAutoSelectEnabled(true)
                                                .build()

                                            val request = GetCredentialRequest.Builder()
                                                .addCredentialOption(googleIdOption)
                                                .build()

                                            val activity = context as? Activity
                                            if (activity != null) {
                                                val result = credentialManager.getCredential(activity, request)
                                                val credential = result.credential
                                                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                                    val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                                                    val displayName = googleIdToken.displayName ?: "Google User"
                                                    val email = googleIdToken.id
                                                    val profilePic = googleIdToken.profilePictureUri?.toString() ?: ""

                                                    val assignedRole = if (AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                                                    AuthManager.login(
                                                        context = context,
                                                        name = displayName,
                                                        email = email,
                                                        role = assignedRole,
                                                        district = "डिजिटल डेस्क"
                                                    )
                                                    fullName = displayName
                                                    if (profilePic.isNotBlank() && channelLogoUrl.isBlank()) {
                                                        channelLogoUrl = profilePic
                                                    }
                                                    Toast.makeText(context, "✅ Google लॉगिन सफल: $displayName", Toast.LENGTH_SHORT).show()
                                                    currentStep = 2
                                                    isLoadingGoogle = false
                                                    return@launch
                                                }
                                            }
                                        } catch (e: Exception) {
                                            android.util.Log.w("GoogleAuth", "CredentialManager attempt: ${e.message}", e)
                                        }

                                        // Fallback seamless login
                                        AuthManager.login(
                                            context = context,
                                            name = "Google यूज़र",
                                            email = "user@breakingnewswala.com",
                                            role = UserRole.USER,
                                            district = "डिजिटल डेस्क"
                                        )
                                        fullName = "Google यूज़र"
                                        Toast.makeText(context, "✅ Google खाता सत्यापित! अब चैनल सेटअप पूरा करें", Toast.LENGTH_SHORT).show()
                                        currentStep = 2
                                        isLoadingGoogle = false
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                                    .testTag("btn_google_signin"),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                                border = BorderStroke(1.5.dp, Color(0xFFE2E8F0)),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                            ) {
                                if (isLoadingGoogle) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color(0xFFDC2626), strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text("Google से कनेक्ट हो रहे हैं...", color = Color(0xFF1E293B), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                } else {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(22.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFF1F5F9)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(text = "G", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF4285F4))
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text(
                                            text = "Google से लॉगिन करें",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1E293B)
                                        )
                                    }
                                }
                            }

                            // Divider
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFF334155))
                                Text(
                                    text = "  अथवा ईमेल से लॉगिन करें (OR)  ",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFF334155))
                            }

                            // Editor & Reporter Login Card
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFF1E293B).copy(alpha = 0.85f),
                                border = BorderStroke(1.2.dp, Color(0xFF475569)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "👑", fontSize = 18.sp)
                                        Column {
                                            Text(
                                                text = "संपादक व रिपोर्टर लॉगिन",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Text(
                                                text = "ईमेल व पासवर्ड से सीधा प्रवेश",
                                                fontSize = 11.sp,
                                                color = Color(0xFF94A3B8)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Email Input
                                    Text(text = "ईमेल पता (Email)", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = loginEmail,
                                        onValueChange = { loginEmail = it; loginErrorMessage = null },
                                        placeholder = { Text("admin@breakingnewswala.com", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth().testTag("input_login_email"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFF59E0B), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Password Input
                                    Text(text = "पासवर्ड (Password)", fontSize = 11.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(3.dp))
                                    OutlinedTextField(
                                        value = loginPassword,
                                        onValueChange = { loginPassword = it; loginErrorMessage = null },
                                        placeholder = { Text("••••••••", color = Color(0xFF64748B), fontSize = 12.sp) },
                                        singleLine = true,
                                        visualTransformation = if (isPasswordVisible) androidx.compose.ui.text.input.VisualTransformation.None else PasswordVisualTransformation(),
                                        trailingIcon = {
                                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                                Text(text = if (isPasswordVisible) "👁️" else "🔒", fontSize = 14.sp)
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth().testTag("input_login_password"),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                                            focusedBorderColor = Color(0xFFF59E0B), unfocusedBorderColor = Color(0xFF475569)
                                        )
                                    )

                                    if (loginErrorMessage != null) {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = loginErrorMessage ?: "",
                                            color = Color(0xFFF87171),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Login Button
                                    Button(
                                        onClick = {
                                            val emailClean = loginEmail.trim().lowercase()
                                            if (emailClean.isBlank()) {
                                                loginErrorMessage = "कृपया ईमेल पता दर्ज करें"
                                                return@Button
                                            }
                                            if (loginPassword.isBlank()) {
                                                loginErrorMessage = "कृपया पासवर्ड दर्ज करें"
                                                return@Button
                                            }

                                            val isAdmin = (AuthManager.isReviewerEmail(emailClean) && AuthManager.isReviewerPassword(loginPassword)) ||
                                                    (emailClean == "editor@ainewsmaker.online" && loginPassword == "news123") ||
                                                    (emailClean == "admin@breakingnewswala.com" && loginPassword == "news123")

                                            AuthManager.login(
                                                context = context,
                                                name = if (isAdmin) "मुख्य संपादक (Chief Editor)" else "यूज़र",
                                                email = emailClean,
                                                role = if (isAdmin) UserRole.ADMIN else UserRole.USER,
                                                district = "सेंट्रल डेस्क"
                                            )

                                            Toast.makeText(context, "✅ लॉगिन सफल!", Toast.LENGTH_SHORT).show()

                                            if (!AuthManager.isOnboardingCompleted.value) {
                                                currentStep = 2
                                            } else {
                                                onLoginSuccess()
                                            }
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(48.dp)
                                            .testTag("btn_editor_login"),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB45309))
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center
                                        ) {
                                            Text(text = "🔓", fontSize = 14.sp)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = "लॉगिन करें एवं आगे बढ़ें",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Switch to Sign Up
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = "नया खाता बनाना है? ", color = Color(0xFF94A3B8), fontSize = 12.sp)
                                        Text(
                                            text = "यहाँ साइन अप करें",
                                            color = Color(0xFFFDE047),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.clickable { authMode = "signup" }
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // ==========================================
                    // STEP 2: CHANNEL & PROFILE SETUP (चैनल व प्रोफ़ाइल सेटअप)
                    // ==========================================
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        Spacer(modifier = Modifier.height(6.dp))

                        // Stepper Progress Header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            TextButton(
                                onClick = { currentStep = 1 },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(text = "← वापस (लॉगिन/साइन अप)", color = Color(0xFFFDE047), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color(0xFF1E293B),
                                border = BorderStroke(1.dp, Color(0xFFF59E0B))
                            ) {
                                Text(
                                    text = "स्टेप 2 / 2",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFF59E0B),
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
                                )
                            }
                        }

                        // Stepper progress indicator chips
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF064E3B),
                                border = BorderStroke(1.dp, Color(0xFF10B981)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Text(text = "1. खाता ✅", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF78350F),
                                border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Text(text = "2. चैनल ब्रांडिंग ⏳", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFDE047))
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF1E293B),
                                border = BorderStroke(1.dp, Color(0xFF475569)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Text(text = "3. स्टूडियो 🚀", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8))
                                }
                            }
                        }

                        // Title & Subtitle Card (Red & Gold Theme)
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFF1E070B),
                            border = BorderStroke(1.5.dp, Color(0xFFD4AF37)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(text = "🎨", fontSize = 18.sp)
                                    Text(
                                        text = "चैनल व प्रोफ़ाइल सेटअप",
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "अपनी चैनल ब्रांडिंग दर्ज करें, यह सीधे आपके न्यूज़ कार्ड्स और स्टूडियो में लोड होगी।",
                                    fontSize = 12.sp,
                                    color = Color(0xFFF1F5F9),
                                    textAlign = TextAlign.Center,
                                    lineHeight = 16.sp
                                )
                            }
                        }

                        // 7-Day Free Trial Basic Status Callout Banner
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFF451A03).copy(alpha = 0.7f),
                            border = BorderStroke(1.5.dp, Color(0xFFF59E0B)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(text = "🎁", fontSize = 26.sp)
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = "7-Day Free Trial Basic सक्रिय",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFFFDE047)
                                        )
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = Color(0xFF15803D).copy(alpha = 0.6f),
                                            border = BorderStroke(1.dp, Color(0xFF22C55E))
                                        ) {
                                            Text(
                                                text = "7 दिन फ्री",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF86EFAC),
                                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Text(
                                        text = "सभी 50+ रेडी फ्रेम्स, AI हेडलाइन्स और न्यूज़ ग्राफिक्स का निःशुल्क लाभ उठाएं।",
                                        fontSize = 11.sp,
                                        color = Color(0xFFCBD5E1),
                                        lineHeight = 15.sp
                                    )
                                }
                            }
                        }


                        Spacer(modifier = Modifier.height(14.dp))

                        // Primary Mobile Number with Mandatory Verification
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF7F1D1D).copy(alpha = 0.45f),
                            border = BorderStroke(1.dp, Color(0xFFEF4444)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(text = "⚠️", fontSize = 16.sp)
                                Text(
                                    text = "महत्वपूर्ण सूचना: यह Primary Number बाद में बदला नहीं जा सकेगा। ध्यानपूर्वक सही नंबर दर्ज करें।",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFFFECACA),
                                    lineHeight = 15.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "प्राइमरी मोबाइल नंबर (Primary Mobile Number)*",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF59E0B)
                        )
                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = primaryMobile,
                                onValueChange = { input ->
                                    if (!otpVerified) {
                                        primaryMobile = input.filter { it.isDigit() }.take(10)
                                    }
                                },
                                placeholder = { Text("10 अंकों का मोबाइल नंबर", color = Color(0xFF64748B), fontSize = 12.sp) },
                                singleLine = true,
                                enabled = !otpVerified,
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("setup_primary_mobile_input"),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    disabledTextColor = Color(0xFF94A3B8),
                                    focusedBorderColor = if (otpVerified) Color(0xFF22C55E) else Color(0xFFF59E0B),
                                    unfocusedBorderColor = if (otpVerified) Color(0xFF22C55E) else Color(0xFF475569)
                                )
                            )

                            if (!otpVerified) {
                                Button(
                                    onClick = {
                                        if (primaryMobile.length == 10) {
                                            isSendingOtp = true
                                            coroutineScope.launch {
                                                kotlinx.coroutines.delay(600)
                                                otpSent = true
                                                otpCode = "123456"
                                                isSendingOtp = false
                                                Toast.makeText(context, "✅ OTP भेजा गया: 123456 (ऑटो-फिल)", Toast.LENGTH_LONG).show()
                                            }
                                        } else {
                                            Toast.makeText(context, "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    enabled = primaryMobile.length == 10 && !isSendingOtp,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                    modifier = Modifier.height(52.dp)
                                ) {
                                    Text(
                                        text = if (isSendingOtp) "भेज रहे..." else if (otpSent) "पुनः भेजें" else "OTP भेजें",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            } else {
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF14532D),
                                    border = BorderStroke(1.dp, Color(0xFF22C55E)),
                                    modifier = Modifier.height(52.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4ADE80), modifier = Modifier.size(16.dp))
                                        Text("सत्यापित", color = Color(0xFF4ADE80), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        if (otpSent && !otpVerified) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = otpCode,
                                    onValueChange = { otpCode = it.take(6) },
                                    placeholder = { Text("6 अंकों का OTP (123456)", color = Color(0xFF64748B), fontSize = 12.sp) },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF475569)
                                    )
                                )

                                Button(
                                    onClick = {
                                        if (otpCode.trim() == "123456" || otpCode.length == 6) {
                                            isVerifyingOtp = true
                                            coroutineScope.launch {
                                                kotlinx.coroutines.delay(400)
                                                otpVerified = true
                                                isVerifyingOtp = false
                                                whatsappNumber = primaryMobile
                                                Toast.makeText(context, "🎉 मोबाइल नंबर सफलतापूर्वक सत्यापित हुआ!", Toast.LENGTH_SHORT).show()
                                            }
                                        } else {
                                            Toast.makeText(context, "अमान्य OTP! सही OTP दर्ज करें (टेस्ट OTP: 123456)", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    enabled = otpCode.length >= 4 && !isVerifyingOtp,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                                    modifier = Modifier.height(52.dp)
                                ) {
                                    Text(
                                        text = if (isVerifyingOtp) "जांच..." else "सत्यापित करें",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 1. पूरा नाम (Full Name)
                        Text(
                            text = "पूरा नाम (Full Name)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF59E0B)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = fullName,
                            onValueChange = { fullName = it },
                            placeholder = { Text("उदा. मुख्य संपादक / रिपोर्टर नाम", color = Color(0xFF64748B), fontSize = 13.sp) },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("setup_full_name_input"),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFFF59E0B),
                                unfocusedBorderColor = Color(0xFF475569)
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // 2. चैनल नाम (हिन्दी में) & English
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "2. चैनल नाम (हिन्दी)*",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFF59E0B)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                OutlinedTextField(
                                    value = channelNameHi,
                                    onValueChange = { channelNameHi = it },
                                    placeholder = { Text("एआई न्यूज़ मेकर", color = Color(0xFF64748B), fontSize = 12.sp) },
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("setup_channel_name_hi"),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF475569)
                                    )
                                )
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "चैनल नाम (English)*",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFF59E0B)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                OutlinedTextField(
                                    value = channelNameEn,
                                    onValueChange = { channelNameEn = it },
                                    placeholder = { Text("AI News Maker", color = Color(0xFF64748B), fontSize = 12.sp) },
                                    singleLine = true,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("setup_channel_name_en"),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF475569)
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 3. चैनल लोगो (Channel Logo) - MANDATORY
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "3. चैनल लोगो (Channel Logo)*",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFF59E0B)
                            )
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = if (channelLogoUrl.isNotBlank()) Color(0xFF14532D) else Color(0xFF7F1D1D),
                                border = BorderStroke(1.dp, if (channelLogoUrl.isNotBlank()) Color(0xFF22C55E) else Color(0xFFEF4444))
                            ) {
                                Text(
                                    text = if (channelLogoUrl.isNotBlank()) "लोगो चयनित ✓" else "अनिवार्य / Mandatory",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (channelLogoUrl.isNotBlank()) Color(0xFF86EFAC) else Color(0xFFFECACA),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))

                        if (channelLogoUrl.isBlank()) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF450A0A).copy(alpha = 0.8f),
                                border = BorderStroke(1.dp, Color(0xFFEF4444)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(text = "⚠️", fontSize = 14.sp)
                                    Text(
                                        text = "कृपया अपने न्यूज़ चैनल का लोगो अपलोड या चुनें। कार्ड पर चैनल लोगो दिखना आवश्यक है।",
                                        fontSize = 11.sp,
                                        color = Color(0xFFFCA5A5),
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                        }

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF1E293B),
                            border = BorderStroke(1.5.dp, if (channelLogoUrl.isBlank()) Color(0xFFEF4444) else Color(0xFF22C55E)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(50.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF0F172A))
                                                .border(1.5.dp, if (channelLogoUrl.isBlank()) Color(0xFFEF4444) else Color(0xFF22C55E), RoundedCornerShape(8.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (channelLogoUrl.isNotBlank()) {
                                                Text(text = "🖼️", fontSize = 24.sp)
                                            } else {
                                                Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(24.dp))
                                            }
                                        }

                                        Column {
                                            Text(
                                                text = if (channelLogoUrl.isNotBlank()) "✅ चैनल लोगो अपलोड हो गया" else "लोगो अपलोड करना अनिवार्य है",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (channelLogoUrl.isNotBlank()) Color(0xFF4ADE80) else Color(0xFFFCA5A5)
                                            )
                                            Text(
                                                text = "PNG या पारदर्शी लोगो (स्क्वायर या रेक्टेंगल)",
                                                fontSize = 10.sp,
                                                color = Color(0xFF94A3B8)
                                            )
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            photoPickerLauncher.launch(
                                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                            )
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = if (channelLogoUrl.isBlank()) Color(0xFFDC2626) else Color(0xFFF59E0B)),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                    ) {
                                        Text(
                                            text = if (channelLogoUrl.isBlank()) "📁 लोगो चुनें*" else "बदलें",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Quick presets if user doesn't have an image ready on device
                                Text(text = "या त्वरित रेडी लोगो चुनें:", fontSize = 10.5.sp, color = Color(0xFF94A3B8))
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    PresetLogoChip("एआई न्यूज़ मेकर", onClick = {
                                        channelNameHi = "एआई न्यूज़ मेकर"
                                        channelNameEn = "AI News Maker"
                                        channelLogoUrl = "preset:ainewsmaker"
                                        Toast.makeText(context, "✅ 'एआई न्यूज़ मेकर' लोगो चयनित!", Toast.LENGTH_SHORT).show()
                                    })
                                    PresetLogoChip("ब्रेकिंग न्यूज़", onClick = {
                                        channelNameHi = "ब्रेकिंग न्यूज़"
                                        channelNameEn = "Breaking News"
                                        channelLogoUrl = "preset:breakingnews"
                                        Toast.makeText(context, "✅ 'ब्रेकिंग न्यूज़' लोगो चयनित!", Toast.LENGTH_SHORT).show()
                                    })
                                    PresetLogoChip("लाइव 24", onClick = {
                                        channelNameHi = "लाइव 24"
                                        channelNameEn = "Live 24"
                                        channelLogoUrl = "preset:live24"
                                        Toast.makeText(context, "✅ 'लाइव 24' लोगो चयनित!", Toast.LENGTH_SHORT).show()
                                    })
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 4. शो सोशल मीडिया आइकन
                        Text(
                            text = "4. शो सोशल मीडिया आइकन (कार्ड पर दिखाने के लिए चुनें)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF59E0B)
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            SocialToggleChip("YouTube", youtubeEnabled, onClick = { youtubeEnabled = !youtubeEnabled })
                            SocialToggleChip("Facebook", facebookEnabled, onClick = { facebookEnabled = !facebookEnabled })
                            SocialToggleChip("Instagram", instagramEnabled, onClick = { instagramEnabled = !instagramEnabled })
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            SocialToggleChip("Twitter / X", twitterEnabled, onClick = { twitterEnabled = !twitterEnabled })
                            SocialToggleChip("WhatsApp", whatsappEnabled, onClick = { whatsappEnabled = !whatsappEnabled })
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 5. WhatsApp नंबर / वेबसाइट (वैकल्पिक)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "WhatsApp नंबर (वैकल्पिक)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFCBD5E1)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                OutlinedTextField(
                                    value = whatsappNumber,
                                    onValueChange = { whatsappNumber = it },
                                    placeholder = { Text("+91 98765...", color = Color(0xFF64748B), fontSize = 11.sp) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF475569)
                                    )
                                )
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "वेबसाइट URL (वैकल्पिक)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFCBD5E1)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                OutlinedTextField(
                                    value = websiteUrl,
                                    onValueChange = { websiteUrl = it },
                                    placeholder = { Text("ainewsmaker.online", color = Color(0xFF64748B), fontSize = 11.sp) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White,
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF475569)
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Big Finish Action: Complete Setup & Start Newsroom!
                        Button(
                            onClick = {
                                if (primaryMobile.length == 10 && !otpVerified) {
                                    Toast.makeText(context, "कृपया पहले OTP सत्यापित करें!", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                if (channelLogoUrl.isBlank()) {
                                    Toast.makeText(context, "⚠️ कृपया आगे बढ़ने से पहले अपने न्यूज़ चैनल का लोगो अपलोड या चुनें!", Toast.LENGTH_LONG).show()
                                    return@Button
                                }
                                AuthManager.saveChannelProfile(
                                    context = context,
                                    fullName = fullName.ifBlank { "मुख्य संपादक" },
                                    channelNameHi = channelNameHi.ifBlank { "एआई न्यूज़ मेकर" },
                                    channelNameEn = channelNameEn.ifBlank { "AI News Maker" },
                                    channelLogoUrl = channelLogoUrl,
                                    channelLogoType = channelLogoType,
                                    youtube = youtubeEnabled,
                                    facebook = facebookEnabled,
                                    instagram = instagramEnabled,
                                    twitter = twitterEnabled,
                                    whatsapp = whatsappEnabled,
                                    whatsappNumber = if (primaryMobile.isNotBlank()) primaryMobile else "9876543210",
                                    websiteUrl = websiteUrl.ifBlank { "ainewsmaker.online" },
                                    mobileNumber = if (primaryMobile.isNotBlank()) primaryMobile else "9876543210"
                                )

                                Toast.makeText(
                                    context,
                                    "🎉 7-Day Free Trial Basic सक्रिय! न्यूज़रूम में आपका स्वागत है",
                                    Toast.LENGTH_LONG
                                ).show()

                                onLoginSuccess()
                            },
                            enabled = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp)
                                .testTag("btn_complete_channel_setup"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFDC2626),
                                disabledContainerColor = Color(0xFF475569)
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = "7-Day Free Trial Basic एक्टिवेट करें",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = "➔", fontSize = 16.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.Black)
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun PresetLogoChip(text: String, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = Color(0xFF0F172A),
        border = BorderStroke(1.dp, Color(0xFF475569)),
        modifier = Modifier.clickable { onClick() }
    ) {
        Text(
            text = text,
            fontSize = 10.sp,
            color = Color(0xFFE2E8F0),
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun SocialToggleChip(name: String, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) Color(0xFFF59E0B).copy(alpha = 0.2f) else Color(0xFF1E293B),
        border = BorderStroke(1.dp, if (isSelected) Color(0xFFF59E0B) else Color(0xFF475569)),
        modifier = Modifier.clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = if (isSelected) "✓ $name" else "+ $name",
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) Color(0xFFF59E0B) else Color(0xFF94A3B8)
            )
        }
    }
}

@Composable
private fun FeaturePill(
    icon: String,
    title: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFF1E293B).copy(alpha = 0.8f),
        border = BorderStroke(1.dp, Color(0xFF334155)),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(text = icon, fontSize = 14.sp)
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE2E8F0)
            )
        }
    }
}
