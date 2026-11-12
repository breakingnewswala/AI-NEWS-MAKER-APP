package com.example.ui.screens

import android.app.Activity
import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.example.data.AuthManager
import com.example.data.FirestoreSyncRepository
import com.example.model.UserRole
import com.example.ui.theme.Amber400
import com.example.ui.theme.Red600
import com.example.ui.theme.Slate800
import com.example.ui.theme.Slate900
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.Firebase
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.auth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

@Composable
fun PrimaryAuthWelcomeScreen(
    onLoginSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var isSignUp by remember { mutableStateOf(false) }
    var isGoogleSigningIn by remember { mutableStateOf(false) }
    var googleError by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Slate900)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(30.dp))

            // App Brand Logo
            Box(
                modifier = Modifier
                    .size(70.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brush.linearGradient(listOf(Red600, Amber400))),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "AI",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "AI NEWS MAKER APP",
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "प्रोफेशनल ब्रेकिंग न्यूज़ ग्राफिक एवं वीडियो स्टूडियो",
                fontSize = 13.sp,
                color = Color.LightGray,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Primary Google Sign-In via Jetpack Credential Manager + Firebase Auth
            OutlinedButton(
                onClick = {
                    val activity = context as? Activity
                    val clientId = AuthManager.resolveDefaultWebClientId(context)
                    if (activity == null || clientId.isBlank()) {
                        googleError = "Google Sign-In configuration missing"
                        return@OutlinedButton
                    }
                    isGoogleSigningIn = true
                    googleError = null
                    coroutineScope.launch {
                        try {
                            val credentialManager = CredentialManager.create(context)
                            val signInOption = GetSignInWithGoogleOption.Builder(serverClientId = clientId).build()
                            val request = GetCredentialRequest.Builder()
                                .addCredentialOption(signInOption)
                                .build()
                            val result = credentialManager.getCredential(activity, request)
                            val credential = result.credential
                            if (credential is CustomCredential &&
                                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                            ) {
                                val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data)
                                val authCredential = GoogleAuthProvider.getCredential(googleIdToken.idToken, null)
                                val authResult = Firebase.auth.signInWithCredential(authCredential).await()
                                val firebaseUser = authResult.user
                                val displayName = firebaseUser?.displayName ?: googleIdToken.displayName ?: "Google User"
                                val userEmail = firebaseUser?.email ?: googleIdToken.id
                                if (firebaseUser != null) {
                                    try {
                                        withContext(Dispatchers.IO) {
                                            FirestoreSyncRepository(context).syncSignedInUserProfile(
                                                user = firebaseUser,
                                                channelName = AuthManager.channelNameHi.value
                                            )
                                        }
                                    } catch (syncErr: Exception) {
                                        Log.w("Auth", "Firestore profile sync skipped: ${syncErr.message}")
                                    }
                                }
                                val assignedRole = if (AuthManager.isReviewerEmail(userEmail)) UserRole.ADMIN else UserRole.USER
                                AuthManager.login(
                                    context = context,
                                    name = displayName,
                                    email = userEmail,
                                    role = assignedRole,
                                    district = "डिजिटल डेस्क"
                                )
                                isGoogleSigningIn = false
                                Toast.makeText(context, "Google लॉगिन सफल!", Toast.LENGTH_SHORT).show()
                                onLoginSuccess()
                            } else {
                                isGoogleSigningIn = false
                                googleError = "Unexpected credential type"
                            }
                        } catch (e: GetCredentialCancellationException) {
                            Log.w("Auth", "Google Sign-In cancelled or dismissed: ${e.message}", e)
                            isGoogleSigningIn = false
                        } catch (e: Exception) {
                            Log.e("Auth", "Google Sign-In failed", e)
                            isGoogleSigningIn = false
                            googleError = e.localizedMessage ?: "Google Sign-In failed"
                        }
                    }
                },
                enabled = !isGoogleSigningIn,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Amber400),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Slate800,
                    contentColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("google_sign_in_button")
            ) {
                if (isGoogleSigningIn) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Amber400,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Sign in with Google",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            if (googleError != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = googleError ?: "",
                    fontSize = 12.sp,
                    color = Red600,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Quick Demo Role Chips
            Text(
                text = "त्वरित एक्सेस (डेमो लॉगिन चयन करें)",
                fontSize = 12.sp,
                color = Amber400,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PresetLogoChip("चीफ एडिटर (Admin)", Modifier.weight(1f)) {
                    AuthManager.login(
                        context = context,
                        name = "मुख्य संपादक (Chief Editor)",
                        email = "editor@ainewsmaker.online",
                        role = UserRole.ADMIN,
                        district = "सेंट्रल डेस्क"
                    )
                    Toast.makeText(context, "एडमिन लॉगिन सफल", Toast.LENGTH_SHORT).show()
                    onLoginSuccess()
                }

                PresetLogoChip("फील्ड रिपोर्टर", Modifier.weight(1f)) {
                    AuthManager.login(
                        context = context,
                        name = "राहुल शर्मा (रिपोर्टर)",
                        email = "rahul@ainewsmaker.online",
                        role = UserRole.REPORTER,
                        district = "लखनऊ"
                    )
                    Toast.makeText(context, "रिपोर्टर लॉगिन सफल", Toast.LENGTH_SHORT).show()
                    onLoginSuccess()
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Main Auth Form
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Slate800),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = if (isSignUp) "नया खाता बनाएं" else "खाते में लॉगिन करें",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    if (isSignUp) {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("आपका नाम") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Amber400) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                    }

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("ईमेल पता") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Amber400) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("पासवर्ड / पिन") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Amber400) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Button(
                        onClick = {
                            val userEmail = email.ifBlank { "reporter@ainewsmaker.online" }
                            val userName = name.ifBlank { "न्यूज़ रिपोर्टर" }
                            AuthManager.login(
                                context = context,
                                name = userName,
                                email = userEmail,
                                role = UserRole.REPORTER,
                                district = "सेंट्रल डेस्क"
                            )
                            Toast.makeText(context, "लॉगिन सफल!", Toast.LENGTH_SHORT).show()
                            onLoginSuccess()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Red600),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = if (isSignUp) "साइन अप एवं प्रारंभ करें" else "लॉगिन करें",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = if (isSignUp) "पहले से खाता है? लॉगिन करें" else "नया खाता बनाएं (साइन अप)",
                            color = Amber400,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { isSignUp = !isSignUp }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Test credentials helper
            Text(
                text = "गूगल प्ले परीक्षक क्रेडेंशियल्स:\nईमेल: google-reviewer@ainewsmaker.online | पिन: 123456",
                fontSize = 10.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun PresetLogoChip(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Slate800,
        modifier = modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        }
    }
}
