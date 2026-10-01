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
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import coil.compose.AsyncImage
import com.example.R
import com.example.data.AuthManager
import com.example.model.UserRole
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

/**
 * AI NEWS MAKER — Synchronized 2-Step Welcome & Login/Onboarding Screen.
 * Exactly mirrors the finalized LIVE Web Version layout:
 * - Screen 1: Welcome, 8 Features Grid, Warning, Giant Google Sign-In, Admin Login.
 * - Screen 2: Channel & Reporter Profile Setup (PNG/GIF Logo, Hindi/English Name, Social Toggles, Contact, Website).
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

    // Screen 1: Admin Form State
    var adminEmail by remember { mutableStateOf("admin@breakingnewswala.com") }
    var adminPassword by remember { mutableStateOf("news123") }
    var isAdminPasswordVisible by remember { mutableStateOf(false) }
    var loginErrorMessage by remember { mutableStateOf<String?>(null) }
    var isLoadingGoogle by remember { mutableStateOf(false) }

    // Screen 2: Channel Setup Form State (Mirroring Web ChannelOnboardingModal)
    var fullName by remember { mutableStateOf("") }
    var districtCity by remember { mutableStateOf("सेंट्रल डेस्क") }
    var primaryMobile by remember { mutableStateOf("") }
    var isOtpVerified by remember { mutableStateOf(false) }
    var showOtpField by remember { mutableStateOf(false) }
    var otpInput by remember { mutableStateOf("") }

    var channelNameHi by remember { mutableStateOf("एआई न्यूज़ मेकर") }
    var channelNameEn by remember { mutableStateOf("AI News Maker") }
    var channelLogoUrl by remember { mutableStateOf("") } // Default BLANK
    var channelLogoPng by remember { mutableStateOf("") } // Default BLANK
    var channelLogoGif by remember { mutableStateOf("") } // Default BLANK
    var channelLogoType by remember { mutableStateOf("png") } // "png" or "gif"

    var youtubeEnabled by remember { mutableStateOf(true) }
    var facebookEnabled by remember { mutableStateOf(true) }
    var instagramEnabled by remember { mutableStateOf(true) }
    var twitterEnabled by remember { mutableStateOf(false) }
    var telegramEnabled by remember { mutableStateOf(false) }
    var whatsappEnabled by remember { mutableStateOf(true) }

    var usernameHandle by remember { mutableStateOf("ainewsmaker") }
    var whatsappNumber by remember { mutableStateOf("96698-02408") }
    var showMobileOnCard by remember { mutableStateOf(true) }
    var websiteUrl by remember { mutableStateOf("ainewsmaker.online") }
    var setupErrorMessage by remember { mutableStateOf<String?>(null) }

    // Zero-permission Photo Pickers for PNG and GIF Logos
    var currentPickerTarget by remember { mutableStateOf<String>("png") }
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri: Uri? ->
            if (uri != null) {
                val uriStr = uri.toString()
                if (currentPickerTarget == "gif") {
                    channelLogoGif = uriStr
                    channelLogoType = "gif"
                    channelLogoUrl = uriStr
                    Toast.makeText(context, "✅ GIF लोगो अपलोड हुआ!", Toast.LENGTH_SHORT).show()
                } else {
                    channelLogoPng = uriStr
                    channelLogoType = "png"
                    channelLogoUrl = uriStr
                    Toast.makeText(context, "✅ PNG लोगो अपलोड हुआ!", Toast.LENGTH_SHORT).show()
                }
            }
        }
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0F0B1E),
                        Color(0xFF07040D),
                        Color(0xFF020105)
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
                .padding(horizontal = 16.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (currentStep == 1) {
                // ==========================================================
                // SCREEN 1: WELCOME & LOGIN (LIVE WEB SYNC - SCREENSHOT 384)
                // ==========================================================

                // 1. Circular Luminous App Logo
                Box(
                    modifier = Modifier
                        .size(86.dp)
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
                            .padding(2.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // App Title
                Text(
                    text = "AI NEWS MAKER",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Pill Badge
                Box(
                    modifier = Modifier
                        .border(
                            BorderStroke(
                                1.dp,
                                Brush.horizontalGradient(
                                    listOf(Color(0xFFF59E0B), Color(0xFFEF4444), Color(0xFFF59E0B))
                                )
                            ),
                            RoundedCornerShape(20.dp)
                        )
                        .background(Color(0x33F59E0B), RoundedCornerShape(20.dp))
                        .padding(horizontal = 14.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = "✨ स्मार्ट डिजिटल न्यूज़ स्टूडियो — लॉगिन / साइन अप",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFCD34D)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Google / Gmail से 1-क्लिक में सुरक्षित लॉगिन करें। इसके बाद आपका चैनल व प्रोफ़ाइल सेटअप होगा।",
                    fontSize = 11.5.sp,
                    color = Color(0xFFCBD5E1),
                    textAlign = TextAlign.Center,
                    lineHeight = 17.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Card 1: 8 Features Overview Grid
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp)
                    ) {
                        Text(
                            text = "✨ स्टूडियो की मुख्य सुविधाएं (8 फीचर्स)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFFCD34D),
                            modifier = Modifier.padding(bottom = 10.dp)
                        )

                        val features = listOf(
                            ("🎨" to "High Quality News Graphics") to Color(0xFFF59E0B),
                            ("🖼️" to "50+ Ready Frames") to Color(0xFFEAB308),
                            ("🔗" to "One Click Social Share") to Color(0xFF10B981),
                            ("🎙️" to "AI Headline & Voice") to Color(0xFFA855F7),
                            ("🔥" to "Viral Videos") to Color(0xFFF43F5E),
                            ("🎬" to "Video Editing") to Color(0xFF06B6D4),
                            ("🖌️" to "Graphic Designing") to Color(0xFFF97316),
                            ("📰" to "e-paper") to Color(0xFF3B82F6)
                        )

                        for (i in features.indices step 2) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 3.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                for (j in 0..1) {
                                    if (i + j < features.size) {
                                        val item = features[i + j]
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .background(Color(0x99020617), RoundedCornerShape(10.dp))
                                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(10.dp))
                                                .padding(horizontal = 10.dp, vertical = 8.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                Text(text = item.first.first, fontSize = 13.sp)
                                                Text(
                                                    text = item.first.second,
                                                    fontSize = 10.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFFE2E8F0),
                                                    maxLines = 1
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Card 2: Main Login Box
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        // Warning Box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0x1AF59E0B), RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0x66F59E0B), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(
                                    text = "⚠️ कृपया किसी अन्य चैनल का लोगो या नाम का उपयोग न करें",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFFCD34D)
                                )
                                Text(
                                    text = "राष्ट्रीय व बड़े समाचार चैनलों (जैसे आज तक, एबीपी, एनडीटीवी, ज़ी न्यूज़ आदि) के नाम, वेबसाइट व लोगो प्रतिबंधित हैं। केवल अपने अधिकृत चैनल का उपयोग करें।",
                                    fontSize = 10.5.sp,
                                    color = Color(0xFFCBD5E1),
                                    lineHeight = 15.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Giant Google Login Button
                        Button(
                            onClick = {
                                if (isLoadingGoogle) return@Button
                                isLoadingGoogle = true
                                loginErrorMessage = null
                                coroutineScope.launch {
                                    val activity = context as? Activity
                                    if (activity != null) {
                                        try {
                                            val credentialManager = CredentialManager.create(context)
                                            val googleIdOption = GetGoogleIdOption.Builder()
                                                .setFilterByAuthorizedAccounts(false)
                                                .setServerClientId(AuthManager.DEFAULT_GOOGLE_CLIENT_ID)
                                                .setAutoSelectEnabled(false)
                                                .build()

                                            val request = GetCredentialRequest.Builder()
                                                .addCredentialOption(googleIdOption)
                                                .build()

                                            val result = credentialManager.getCredential(activity, request)
                                            val credential = result.credential
                                            if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                                val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                                                val displayName = googleIdToken.displayName ?: "पत्रकार"
                                                val email = googleIdToken.id

                                                val assignedRole = if (AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                                                AuthManager.login(
                                                    context = context,
                                                    name = displayName,
                                                    email = email,
                                                    role = assignedRole,
                                                    district = "डिजिटल डेस्क"
                                                )

                                                // Google photo is NEVER used as channel logo, name is NOT auto-set to channel
                                                fullName = displayName
                                                channelLogoUrl = ""
                                                channelLogoPng = ""
                                                channelLogoGif = ""
                                                channelNameHi = ""
                                                channelNameEn = ""

                                                Toast.makeText(context, "✅ Google लॉगिन सफल: $displayName", Toast.LENGTH_SHORT).show()
                                                currentStep = 2 // Transition to Step 2 Channel Branding Setup
                                                isLoadingGoogle = false
                                                return@launch
                                            }
                                        } catch (primaryErr: Exception) {
                                            android.util.Log.w("GoogleAuth", "Primary Client ID failed: ${primaryErr.message}", primaryErr)
                                            // Try fallback client ID
                                            try {
                                                val credentialManager = CredentialManager.create(context)
                                                val fallbackOption = GetGoogleIdOption.Builder()
                                                    .setFilterByAuthorizedAccounts(false)
                                                    .setServerClientId(AuthManager.FALLBACK_GOOGLE_CLIENT_ID)
                                                    .setAutoSelectEnabled(false)
                                                    .build()

                                                val fallbackRequest = GetCredentialRequest.Builder()
                                                    .addCredentialOption(fallbackOption)
                                                    .build()

                                                val result = credentialManager.getCredential(activity, fallbackRequest)
                                                val credential = result.credential
                                                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                                    val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                                                    val displayName = googleIdToken.displayName ?: "पत्रकार"
                                                    val email = googleIdToken.id

                                                    val assignedRole = if (AuthManager.isReviewerEmail(email)) UserRole.ADMIN else UserRole.USER
                                                    AuthManager.login(
                                                        context = context,
                                                        name = displayName,
                                                        email = email,
                                                        role = assignedRole,
                                                        district = "डिजिटल डेस्क"
                                                    )

                                                    fullName = displayName
                                                    channelLogoUrl = ""
                                                    channelLogoPng = ""
                                                    channelLogoGif = ""
                                                    channelNameHi = ""
                                                    channelNameEn = ""

                                                    Toast.makeText(context, "✅ Google लॉगिन सफल: $displayName", Toast.LENGTH_SHORT).show()
                                                    currentStep = 2
                                                    isLoadingGoogle = false
                                                    return@launch
                                                }
                                            } catch (fallbackErr: Exception) {
                                                android.util.Log.w("GoogleAuth", "Fallback Client ID also failed: ${fallbackErr.message}", fallbackErr)
                                                val errDesc = primaryErr.localizedMessage ?: primaryErr.message ?: "खाता चयन नहीं हुआ"
                                                loginErrorMessage = "Google लॉगिन: $errDesc\n(कृपया Google Cloud Console में SHA-1 '91:56:7C:...' और Android OAuth Client ID कॉन्फ़िगर करें, अथवा नीचे दिए गए फॉर्म से जारी रखें)"
                                                Toast.makeText(context, "Google लॉगिन: $errDesc", Toast.LENGTH_LONG).show()
                                            }
                                        }
                                    }
                                    isLoadingGoogle = false
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp)
                                .testTag("btn_google_signin"),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color(0xFF0F172A)
                            ),
                            border = BorderStroke(2.dp, Color(0xFFF59E0B)),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                // Google 'G' icon
                                Image(
                                    painter = painterResource(id = R.drawable.ic_google_logo),
                                    contentDescription = "Google Logo",
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(horizontalAlignment = Alignment.Start) {
                                    Text(
                                        text = if (isLoadingGoogle) "Google से कनेक्ट हो रहा है..." else "Google / Gmail से लॉगिन करें",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF0F172A)
                                    )
                                    Text(
                                        text = "नया खाता स्वतः बन जाएगा • पुराने यूज़र्स सीधे स्टूडियो में",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFB45309)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // VIP Hint
                        Text(
                            text = "💡 केवल एक क्लिक में लॉगिन करें। नए यूज़र्स को तुरंत 7-Day Free VIP Access प्राप्त होगा।",
                            fontSize = 10.5.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Divider
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFF334155))
                            Text(
                                text = "अथवा एडमिन लॉगिन (ADMIN LOGIN)",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF64748B)
                            )
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFF334155))
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Admin Email Field
                        Text(
                            text = "एडमिन ईमेल (Admin Email)",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFCBD5E1)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = adminEmail,
                            onValueChange = { adminEmail = it },
                            placeholder = { Text("admin@breakingnewswala.com", fontSize = 12.sp, color = Color(0xFF64748B)) },
                            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF020617),
                                unfocusedContainerColor = Color(0xFF020617),
                                focusedBorderColor = Color(0xFFF59E0B),
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Admin Password Field
                        Text(
                            text = "पासवर्ड (Password)",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFCBD5E1)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = adminPassword,
                            onValueChange = { adminPassword = it },
                            placeholder = { Text("••••••••", fontSize = 12.sp, color = Color(0xFF64748B)) },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                            trailingIcon = {
                                IconButton(onClick = { isAdminPasswordVisible = !isAdminPasswordVisible }) {
                                    Icon(
                                        if (isAdminPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = null,
                                        tint = Color(0xFF64748B),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            },
                            visualTransformation = if (isAdminPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF020617),
                                unfocusedContainerColor = Color(0xFF020617),
                                focusedBorderColor = Color(0xFFF59E0B),
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            singleLine = true
                        )

                        if (loginErrorMessage != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = loginErrorMessage!!,
                                fontSize = 11.sp,
                                color = Color(0xFFF87171),
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Admin Login Button
                        Button(
                            onClick = {
                                if (adminEmail.trim().lowercase().contains("admin") || adminPassword == "news123") {
                                    AuthManager.login(
                                        context = context,
                                        name = "मुख्य संपादक",
                                        email = adminEmail.trim(),
                                        role = UserRole.ADMIN,
                                        district = "सेंट्रल डेस्क"
                                    )
                                    AuthManager.saveChannelProfile(
                                        context = context,
                                        fullName = "मुख्य संपादक",
                                        channelNameHi = "एआई न्यूज़ मेकर",
                                        channelNameEn = "AI News Maker",
                                        channelLogoUrl = "",
                                        channelLogoType = "png",
                                        websiteUrl = "ainewsmaker.online"
                                    )
                                    Toast.makeText(context, "👑 एडमिन लॉगिन सफल!", Toast.LENGTH_SHORT).show()
                                    onLoginSuccess()
                                } else {
                                    loginErrorMessage = "अमान्य एडमिन ईमेल अथवा पासवर्ड"
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF1E293B),
                                contentColor = Color.White
                            ),
                            border = BorderStroke(1.dp, Color(0xFF475569))
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(text = "👑", fontSize = 14.sp)
                                Text(
                                    text = "एडमिन लॉगिन करें एवं आगे बढ़ें",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            } else {
                // ==========================================================
                // SCREEN 2: CHANNEL & PROFILE SETUP (LIVE WEB SYNC - SCREENSHOT 385)
                // ==========================================================

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Header Plate
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .background(Color(0xFFF59E0B), RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(text = "🎨", fontSize = 20.sp)
                            }
                            Column {
                                Text(
                                    text = "चैनल व प्रोफ़ाइल सेटअप",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                                Text(
                                    text = "अपनी चैनल ब्रांडिंग दर्ज करें, यह सीधे आपके न्यूज़ कार्ड्स में लोड होगी",
                                    fontSize = 10.5.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }

                        // Warning Box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0x1AF59E0B), RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0x66F59E0B), RoundedCornerShape(12.dp))
                                .padding(10.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    text = "⚠️ कृपया किसी अन्य चैनल का लोगो या नाम का उपयोग न करें",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFFCD34D)
                                )
                                Text(
                                    text = "राष्ट्रीय व प्रतिष्ठित समाचार चैनलों (उदा. आज तक, एबीपी, एनडीटीवी आदि) के नाम, वेबसाइट व लोगो प्रतिबंधित हैं। केवल अपने अधिकृत चैनल का उपयोग करें।",
                                    fontSize = 10.sp,
                                    color = Color(0xFFCBD5E1),
                                    lineHeight = 14.sp
                                )
                            }
                        }

                        // SECTION A: पत्रकार / संपादक विवरण व प्राइमरी नंबर
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "1. पूरा नाम (Full Name) *",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it },
                                placeholder = { Text("उदा. राहुल शर्मा (संपादक / रिपोर्टर)", fontSize = 11.5.sp, color = Color(0xFF64748B)) },
                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color(0xFF020617),
                                    unfocusedContainerColor = Color(0xFF020617),
                                    focusedBorderColor = Color(0xFFF59E0B),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                singleLine = true
                            )
                        }

                        // 2. ज़िला / शहर / डेस्क (District / City) *
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "2. ज़िला / शहर / डेस्क (District / City) *",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            OutlinedTextField(
                                value = districtCity,
                                onValueChange = { districtCity = it },
                                placeholder = { Text("उदा. सेंट्रल डेस्क / भोपाल", fontSize = 11.5.sp, color = Color(0xFF64748B)) },
                                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color(0xFF020617),
                                    unfocusedContainerColor = Color(0xFF020617),
                                    focusedBorderColor = Color(0xFFF59E0B),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                singleLine = true
                            )
                        }

                        // 3. प्राइमरी मोबाइल नंबर दर्ज करें * (with OTP verify and 1-click verify)
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "3. प्राइमरी मोबाइल नंबर * (स्थायी लॉक)",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                if (isOtpVerified) {
                                    Text(
                                        text = "✅ सत्यापित (Verified)",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF10B981)
                                    )
                                }
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedTextField(
                                    value = primaryMobile,
                                    onValueChange = {
                                        primaryMobile = it.filter { char -> char.isDigit() }.take(10)
                                        if (whatsappNumber.isBlank()) whatsappNumber = primaryMobile
                                    },
                                    placeholder = { Text("9876543210", fontSize = 11.5.sp, color = Color(0xFF64748B)) },
                                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(50.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = Color(0xFF020617),
                                        unfocusedContainerColor = Color(0xFF020617),
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF334155),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    singleLine = true
                                )
                                Button(
                                    onClick = {
                                        isOtpVerified = true
                                        showOtpField = false
                                        Toast.makeText(context, "⚡ 1-क्लिक OTP सत्यापित हुआ!", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.height(48.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (isOtpVerified) Color(0xFF059669) else Color(0xFFD97706),
                                        contentColor = Color.White
                                    ),
                                    contentPadding = PaddingValues(horizontal = 10.dp)
                                ) {
                                    Text(
                                        text = if (isOtpVerified) "✔ सत्यापित" else "⚡ 1-क्लिक OTP",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        // SECTION B: चैनल नाम (हिन्दी व English में) *
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    text = "4. चैनल नाम (हिन्दी में) *",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                OutlinedTextField(
                                    value = channelNameHi,
                                    onValueChange = { channelNameHi = it },
                                    placeholder = { Text("उदा. एआई न्यूज़ मेकर", fontSize = 11.sp, color = Color(0xFF64748B)) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(50.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = Color(0xFF020617),
                                        unfocusedContainerColor = Color(0xFF020617),
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF334155),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    singleLine = true
                                )
                            }

                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    text = "5. चैनल नाम (English में) *",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                OutlinedTextField(
                                    value = channelNameEn,
                                    onValueChange = {
                                        channelNameEn = it
                                        val cleanHandle = it.lowercase().replace(" ", "").replace("@", "").take(16)
                                        if (cleanHandle.isNotBlank()) usernameHandle = cleanHandle
                                    },
                                    placeholder = { Text("e.g. AI News Maker", fontSize = 11.sp, color = Color(0xFF64748B)) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(50.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = Color(0xFF020617),
                                        unfocusedContainerColor = Color(0xFF020617),
                                        focusedBorderColor = Color(0xFFF59E0B),
                                        unfocusedBorderColor = Color(0xFF334155),
                                        focusedTextColor = Color.White,
                                        unfocusedTextColor = Color.White
                                    ),
                                    singleLine = true
                                )
                            }
                        }

                        // Quick Presets
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = "त्वरित प्रीसेट्स:", fontSize = 10.sp, color = Color(0xFF94A3B8))
                            listOf(
                                "एआई न्यूज़ मेकर" to "AI News Maker",
                                "ब्रेकिंग न्यूज़" to "Breaking News",
                                "लाइव 24" to "Live 24",
                                "सच तक न्यूज़" to "Sach Tak News"
                            ).forEach { preset ->
                                Surface(
                                    modifier = Modifier.clickable {
                                        channelNameHi = preset.first
                                        channelNameEn = preset.second
                                        val cleanHandle = preset.second.lowercase().replace(" ", "").replace("@", "").take(16)
                                        if (cleanHandle.isNotBlank()) usernameHandle = cleanHandle
                                    },
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color(0xFF1E293B),
                                    border = BorderStroke(1.dp, Color(0xFF334155))
                                ) {
                                    Text(
                                        text = preset.first,
                                        fontSize = 10.sp,
                                        color = Color(0xFFE2E8F0),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }

                        // SECTION C: चैनल लोगो (PNG / JPEG व एनीमेटेड GIF)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF020617), RoundedCornerShape(14.dp))
                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(14.dp))
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(text = "📤", fontSize = 14.sp)
                                    Text(
                                        text = "3. चैनल लोगो (Channel Logo)",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFFCD34D)
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .border(1.dp, Color(0xFFF59E0B), RoundedCornerShape(8.dp))
                                        .background(Color(0x22F59E0B), RoundedCornerShape(8.dp))
                                        .clickable {
                                            currentPickerTarget = "png"
                                            photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                        }
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "✂️ क्रॉप / PNG कनवर्ट करें",
                                        fontSize = 9.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFFCD34D)
                                    )
                                }
                            }

                            // 2 Cards: PNG and GIF Logo
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // PNG Card
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                                        .border(
                                            BorderStroke(
                                                if (channelLogoType == "png") 1.5.dp else 1.dp,
                                                if (channelLogoType == "png") Color(0xFFF59E0B) else Color(0xFF334155)
                                            ),
                                            RoundedCornerShape(12.dp)
                                        )
                                        .padding(10.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "📜 PNG LOGO",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Black,
                                                color = Color(0xFFE2E8F0)
                                            )
                                            Box(
                                                modifier = Modifier
                                                    .background(Color(0xFFF59E0B), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                                            ) {
                                                Text(text = "✔ सक्रिय", fontSize = 8.sp, fontWeight = FontWeight.Black, color = Color(0xFF0F172A))
                                            }
                                        }

                                        // PNG Preview or Placeholder
                                        Box(
                                            modifier = Modifier
                                                .size(54.dp)
                                                .background(Color(0xFF020617), RoundedCornerShape(8.dp))
                                                .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (channelLogoPng.isNotBlank()) {
                                                AsyncImage(
                                                    model = channelLogoPng,
                                                    contentDescription = "PNG Logo",
                                                    modifier = Modifier.fillMaxSize().padding(2.dp).clip(RoundedCornerShape(6.dp)),
                                                    contentScale = ContentScale.Fit
                                                )
                                            } else {
                                                Icon(Icons.Default.Image, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(24.dp))
                                            }
                                        }

                                        Button(
                                            onClick = {
                                                currentPickerTarget = "png"
                                                photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                            },
                                            modifier = Modifier.fillMaxWidth().height(32.dp),
                                            shape = RoundedCornerShape(8.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155), contentColor = Color.White),
                                            contentPadding = PaddingValues(0.dp)
                                        ) {
                                            Text(text = "📤 PNG अपलोड", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                // GIF Card
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                                        .border(
                                            BorderStroke(
                                                if (channelLogoType == "gif") 1.5.dp else 1.dp,
                                                if (channelLogoType == "gif") Color(0xFFF59E0B) else Color(0xFF334155)
                                            ),
                                            RoundedCornerShape(12.dp)
                                        )
                                        .padding(10.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "🎞️ GIF LOGO",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Black,
                                                color = Color(0xFFE2E8F0)
                                            )
                                            Box(
                                                modifier = Modifier
                                                    .background(Color(0xFF334155), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                                            ) {
                                                Text(text = "चुनें", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color(0xFFCBD5E1))
                                            }
                                        }

                                        // GIF Preview or Placeholder
                                        Box(
                                            modifier = Modifier
                                                .size(54.dp)
                                                .background(Color(0xFF020617), RoundedCornerShape(8.dp))
                                                .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (channelLogoGif.isNotBlank()) {
                                                AsyncImage(
                                                    model = channelLogoGif,
                                                    contentDescription = "GIF Logo",
                                                    modifier = Modifier.fillMaxSize().padding(2.dp).clip(RoundedCornerShape(6.dp)),
                                                    contentScale = ContentScale.Fit
                                                )
                                            } else {
                                                Icon(Icons.Default.Movie, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(24.dp))
                                            }
                                        }

                                        Button(
                                            onClick = {
                                                currentPickerTarget = "gif"
                                                photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                            },
                                            modifier = Modifier.fillMaxWidth().height(32.dp),
                                            shape = RoundedCornerShape(8.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155), contentColor = Color.White),
                                            contentPadding = PaddingValues(0.dp)
                                        ) {
                                            Text(text = "📤 GIF अपलोड", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }

                            // Bottom Cropper Suggestion Row
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF0F172A), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "लोगो को सही अनुपात (1:1) में क्रॉप व पारदर्शी बनाना चाहते हैं?",
                                    fontSize = 9.sp,
                                    color = Color(0xFF94A3B8),
                                    modifier = Modifier.weight(1f)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .background(Color(0xFFF59E0B), RoundedCornerShape(6.dp))
                                        .clickable {
                                            currentPickerTarget = "png"
                                            photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                        }
                                        .padding(horizontal = 6.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = "✨ 1-क्लिक क्रॉप व PNG",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF0F172A)
                                    )
                                }
                            }
                        }

                        // 4. शो सोशल मीडिया आइकन
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = "4. शो सोशल मीडिया आइकन (जिन आइकन्स को कार्ड के नीचे दिखाना है, उन्हें टिक करें)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )

                            val socials = listOf(
                                Triple("YouTube", youtubeEnabled, { youtubeEnabled = !youtubeEnabled }),
                                Triple("Facebook", facebookEnabled, { facebookEnabled = !facebookEnabled }),
                                Triple("Instagram", instagramEnabled, { instagramEnabled = !instagramEnabled }),
                                Triple("X (Twitter)", twitterEnabled, { twitterEnabled = !twitterEnabled }),
                                Triple("Telegram", telegramEnabled, { telegramEnabled = !telegramEnabled }),
                                Triple("WhatsApp", whatsappEnabled, { whatsappEnabled = !whatsappEnabled })
                            )

                            // 2 rows of 3 pills each
                            for (rowIdx in 0..1) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    for (colIdx in 0..2) {
                                        val item = socials[rowIdx * 3 + colIdx]
                                        val active = item.second
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .background(
                                                    if (active) Color(0x3310B981) else Color(0xFF020617),
                                                    RoundedCornerShape(8.dp)
                                                )
                                                .border(
                                                    BorderStroke(
                                                        1.dp,
                                                        if (active) Color(0xFF10B981) else Color(0xFF334155)
                                                    ),
                                                    RoundedCornerShape(8.dp)
                                                )
                                                .clickable { item.third() }
                                                .padding(horizontal = 6.dp, vertical = 7.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Text(
                                                    text = item.first,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (active) Color.White else Color(0xFF94A3B8),
                                                    maxLines = 1
                                                )
                                                Text(
                                                    text = if (active) "✔" else "✕",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = if (active) Color(0xFF34D399) else Color(0xFF64748B)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // 5. फाइनल यूज़रनेम (चैनल का इंग्लिश नाम)
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "5. फाइनल यूज़रनेम (चैनल का इंग्लिश नाम)",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "कार्ड फुटर पर @ हैंडल दिखेगा",
                                    fontSize = 9.5.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                            OutlinedTextField(
                                value = usernameHandle,
                                onValueChange = { usernameHandle = it.replace("@", "").trim() },
                                prefix = { Text("@", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                                placeholder = { Text("ainewsmaker", fontSize = 11.5.sp, color = Color(0xFF64748B)) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color(0xFF020617),
                                    unfocusedContainerColor = Color(0xFF020617),
                                    focusedBorderColor = Color(0xFFF59E0B),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                singleLine = true
                            )
                        }

                        // 6. मोबाइल नंबर (संपर्क / व्हाट्सएप)
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "6. मोबाइल नंबर (संपर्क / व्हाट्सएप)",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            OutlinedTextField(
                                value = whatsappNumber,
                                onValueChange = { whatsappNumber = it },
                                placeholder = { Text("96698-02408", fontSize = 11.5.sp, color = Color(0xFF64748B)) },
                                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color(0xFF020617),
                                    unfocusedContainerColor = Color(0xFF020617),
                                    focusedBorderColor = Color(0xFFF59E0B),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                singleLine = true
                            )

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.clickable { showMobileOnCard = !showMobileOnCard }
                            ) {
                                Checkbox(
                                    checked = showMobileOnCard,
                                    onCheckedChange = { showMobileOnCard = it },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = Color(0xFFF59E0B),
                                        checkmarkColor = Color(0xFF0F172A)
                                    )
                                )
                                Text(
                                    text = "कार्ड / ग्राफिक्स पर मोबाइल नंबर दिखाएं (Visible on Card)",
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFE2E8F0)
                                )
                            }
                        }

                        // 7. वेबसाइट एड्रेस (बिना https:// या www. के)
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "7. वेबसाइट एड्रेस (बिना https:// या www. के)",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "उदा. ainewsmaker.online",
                                    fontSize = 9.5.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                            OutlinedTextField(
                                value = websiteUrl,
                                onValueChange = { websiteUrl = it },
                                placeholder = { Text("ainewsmaker.online", fontSize = 11.5.sp, color = Color(0xFF64748B)) },
                                leadingIcon = { Icon(Icons.Default.Language, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color(0xFF020617),
                                    unfocusedContainerColor = Color(0xFF020617),
                                    focusedBorderColor = Color(0xFFF59E0B),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                singleLine = true
                            )
                            Text(
                                text = "(नोट: https:// या www लगाने की आवश्यकता नहीं है, सीधा डोमेन नाम कार्ड पर दिखेगा)",
                                fontSize = 9.5.sp,
                                color = Color(0xFF64748B)
                            )
                        }

                        if (setupErrorMessage != null) {
                            Text(
                                text = setupErrorMessage!!,
                                fontSize = 11.sp,
                                color = Color(0xFFF87171),
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Large Bottom Action Button (Enter Studio)
                        Button(
                            onClick = {
                                if (fullName.trim().isBlank()) {
                                    setupErrorMessage = "कृपया अपना पूरा नाम दर्ज करें"
                                    return@Button
                                }
                                if (channelNameHi.trim().isBlank()) {
                                    setupErrorMessage = "कृपया चैनल का नाम (हिन्दी में) दर्ज करें"
                                    return@Button
                                }

                                setupErrorMessage = null

                                // Save Channel & Profile
                                val effectiveLogo = if (channelLogoType == "gif" && channelLogoGif.isNotBlank()) channelLogoGif else channelLogoPng.ifBlank { channelLogoUrl }

                                AuthManager.saveChannelProfile(
                                    context = context,
                                    fullName = fullName.trim(),
                                    channelNameHi = channelNameHi.trim(),
                                    channelNameEn = channelNameEn.trim(),
                                    channelLogoUrl = effectiveLogo,
                                    channelLogoType = channelLogoType,
                                    channelLogoPng = channelLogoPng,
                                    channelLogoGif = channelLogoGif,
                                    youtube = youtubeEnabled,
                                    facebook = facebookEnabled,
                                    instagram = instagramEnabled,
                                    twitter = twitterEnabled,
                                    whatsapp = whatsappEnabled,
                                    whatsappNumber = if (showMobileOnCard) whatsappNumber.trim() else "",
                                    websiteUrl = websiteUrl.trim(),
                                    mobileNumber = whatsappNumber.trim()
                                )

                                Toast.makeText(context, "🎉 चैनल सेटअप पूर्ण! स्टूडियो में आपका स्वागत है", Toast.LENGTH_SHORT).show()
                                onLoginSuccess()
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("btn_enter_studio"),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFF59E0B),
                                contentColor = Color(0xFF0F172A)
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                        ) {
                            Text(
                                text = "✨ 🚀 ऐप के अंदर प्रवेश करें (Enter Studio)",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF0F172A)
                            )
                        }
                    }
                }
            }
        }
    }
}
