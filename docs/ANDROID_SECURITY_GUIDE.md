# AI NEWS MAKER — ANDROID SECURITY & PLAY STORE GUIDE
## NATIVE JETPACK COMPOSE APPLICATION SECURITY MANUAL

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Application ID:** `com.aistudio.ainewsmaker.dyynbu`  
**Target SDK:** Android 16 (API Level 36) | **Min SDK:** Android 8.0 (API Level 26)  
**Updated:** 11 November 2026  

---

## 1. ANDROID WEBVIEW SECURITY HARDENING

The Android native application incorporates an embedded Web Studio shell in `app/src/main/java/com/example/ui/screens/NewsroomScreen.kt`.

To comply with Google Play security standards and Android sandbox isolation:
1. **Disabled Cross-Origin File URL Access:**
   ```kotlin
   allowFileAccessFromFileURLs = false
   allowUniversalAccessFromFileURLs = false
   ```
   *Protection:* Prevents local HTML or script files from reading arbitrary files from private app internal storage (`/data/data/com.aistudio...`).
2. **Disabled Mixed Content:**
   ```kotlin
   mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
   ```
   *Protection:* Blocks loading insecure HTTP images or scripts inside HTTPS web views.
3. **Restricted File Access:**
   Only `allowFileAccess = true` and `domStorageEnabled = true` are kept active strictly to render the bundled offline Web Studio assets in `file:///android_asset/news_studio/index.html`.

---

## 2. NETWORK SECURITY & CLEARTEXT TRAFFIC

In `app/src/main/AndroidManifest.xml`:
```xml
android:usesCleartextTraffic="false"
```
- All API communication, image assets, and WebSocket connections MUST use HTTPS or WSS.
- Plaintext HTTP connections are rejected by the Android runtime, satisfying Google Play Store API 36 security requirements.

---

## 3. JAVASCRIPT BRIDGE SECURITY (`NewsStudioBridge.kt`)

The JavaScript interface exposed via `@JavascriptInterface` is strictly hardened:
- **`saveNewsGraphicJpeg(base64Data, filename)`**: Validates base64 image data, decodes via `BitmapFactory`, and saves strictly through the Android `MediaStore.Images.Media` API. No raw file path traversal is permitted.
- **`shareNewsGraphic(base64Data, text)`**: Uses standard `Intent.ACTION_SEND` with `FileProvider` URIs (`androidx.core.content.FileProvider`), preventing `FileUriExposedException`.
- **Permissions:** Only runtime permissions for notifications (`Manifest.permission.POST_NOTIFICATIONS` on Android 13+) and biometric auth (`USE_BIOMETRIC`) are requested. No dangerous background location, SMS, or contacts permissions are requested.

---

## 4. GOOGLE PLAY BILLING POLICY COMPLIANCE

> [!WARNING]
> **Play Store Monetization Requirement:**
> Under Google Play Payments Policy, digital goods and subscriptions (such as graphic coins and VIP plans) consumed inside an Android app cannot be sold directly through third-party payment gateways (Cashfree / Razorpay UPI).

### Recommended Compliance Strategy:
1. **Web-Only Billing Model (Zero 15% Google cut):**
   - Reporters purchase plans and top up coins on the official website: `https://www.ainewsmaker.online/profile`.
   - In the Android app, reporters log in to consume their quotas without an in-app purchase checkout screen.
2. **Native In-App Billing Model (Optional alternative):**
   - Implement the official Google Play Billing Library (`com.android.billingclient:billing-ktx`) for buying coins directly inside the APK.
