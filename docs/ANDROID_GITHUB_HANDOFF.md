# ANDROID GITHUB DEVELOPMENT HANDOFF GUIDE
## AI NEWS MAKER / BREAKING NEWS WALA

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Repository:** https://github.com/breakingnewswala/AI-NEWS-MAKER-APP  
**Pull Request:** #4 — https://github.com/breakingnewswala/AI-NEWS-MAKER-APP/pull/4  
**Base Branch:** `main`  
**Feature Branch:** `fix/owner-authorized-final-remediation`  
**Latest Head Commit SHA:** `2827a17deb0da9866b9561bcb53a377803fdf223`  
**Package Name / Application ID:** `com.aistudio.ainewsmaker.dyynbu`  
**Firebase Project:** `ai-news-maker-app`  
**Production Domain:** https://www.ainewsmaker.online  

---

## 1. OVERVIEW & PURPOSE

This document provides a clean, authoritative handoff specification for opening, building, and developing the AI NEWS MAKER Android application in Android Studio and Google AI Studio environments.

The repository incorporates a hybrid architecture:
1. **Native Android Shell:** Built using Jetpack Compose, Kotlin 2.2.10, Android Gradle Plugin (AGP) 9.1.1, and Gradle 9.3.1.
2. **High-Performance WebView Graphic Studio:** High-resolution 1080x1350 canvas rendering, photo news design, frame overlays, and typography controls bundled into `app/src/main/assets/news_studio/` and loaded securely via AndroidX `WebViewAssetLoader` over `https://appassets.androidplatform.net/`.
3. **Bi-directional Native Bridge:** `NewsStudioBridge.kt` connects web studio actions with Android MediaStore gallery export, system file pickers, Google Authentication, native sharing, and notification permissions.

---

## 2. REPOSITORY & BRANCH DETAILS

* **Remote Origin:** `https://github.com/breakingnewswala/AI-NEWS-MAKER-APP.git`
* **Development Branch:** `fix/owner-authorized-final-remediation`
* **Target PR:** Pull Request #4
* **Latest Verified Commit SHA:** `2827a17deb0da9866b9561bcb53a377803fdf223`
* **Clean Working Tree:** Verified with zero uncommitted or untracked changes.

---

## 3. ANDROID PROJECT STRUCTURE

```
ai-news-maker-app/
├── app/
│   ├── build.gradle.kts                # Android application build configuration
│   ├── google-services.json            # Firebase config (git-ignored for security)
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml     # App permissions, activities, cleartext=false
│   │   │   ├── assets/
│   │   │   │   └── news_studio/        # Pre-compiled Web Studio assets (Vite bundle)
│   │   │   │       ├── index.html
│   │   │   │       ├── assets/         # JS and CSS chunks
│   │   │   │       └── ...
│   │   │   ├── java/com/example/
│   │   │   │   ├── MainActivity.kt     # App entrypoint & Compose host
│   │   │   │   ├── MainApplication.kt  # Application class & initialization
│   │   │   │   ├── audio/              # Audio studio engine
│   │   │   │   ├── data/               # Auth, Firestore, Network, Room DB
│   │   │   │   ├── model/              # News and User data models
│   │   │   │   ├── ui/                 # Jetpack Compose UI screens & components
│   │   │   │   │   └── screens/
│   │   │   │   │       ├── NewsroomScreen.kt    # BreakingNewsStudioWebView host
│   │   │   │   │       ├── NewsStudioBridge.kt  # Native JavaScript Interface Bridge
│   │   │   │   │       └── ...
│   │   │   │   └── util/               # Video and canvas render utilities
│   │   │   └── res/                    # Drawables, layouts, mipmaps, strings
├── gradle/
│   ├── libs.versions.toml              # Centralized version catalog
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties   # Gradle 9.3.1 distribution
├── build.gradle.kts                    # Root project build configuration
├── settings.gradle.kts                 # Module inclusion & plugin management
├── gradlew / gradlew.bat               # Gradle wrapper execution scripts
└── docs/                               # Architecture and verification reports
```

### Key Version Specifications
* **Gradle:** `9.3.1`
* **Android Gradle Plugin (AGP):** `9.1.1`
* **Kotlin:** `2.2.10`
* **Jetpack Compose BoM:** `2024.09.00`
* **Compile SDK:** `36`
* **Target SDK:** `36`
* **Minimum SDK:** `24` (Android 7.0+)
* **Java Compatibility:** Java 17 / Java 21 toolchains supported
* **Firebase BoM:** `34.17.0`
* **Room Database:** `2.7.0`

---

## 4. BUILD INSTRUCTIONS & COMMANDS

### Prerequisites
1. **JDK 17 or JDK 21** installed and configured (`JAVA_HOME`).
2. **Android SDK Platform 36** and Build Tools installed.
3. Node.js 20+ (if modifying or re-building web studio assets).

### 4.1 Sync and Build Web Assets (If Frontend Changed)
Before compiling the Android APK, ensure the Web Studio assets are compiled and copied into Android assets:
```bash
npm run build
```
This automatically updates `app/src/main/assets/news_studio/`.

### 4.2 Compile Android Debug APK
* **Windows (PowerShell / Command Prompt):**
  ```powershell
  .\gradlew.bat :app:assembleDebug
  ```
* **Linux / macOS:**
  ```bash
  ./gradlew :app:assembleDebug
  ```

### 4.3 Output Location
* **Debug APK Path:** `app/build/outputs/apk/debug/app-debug.apk`
* **Output File Size:** ~`51.27 MB`
* **Verification SHA-256 Checksum:** `45934864e807555597de9e448ffd584d24c1578437346a7ca66bf6fa22d114a4`

---

## 5. FIREBASE CONFIGURATION & SECURITY RULES

### 5.1 `app/google-services.json`
* The Google Services configuration file must reside at `app/google-services.json`.
* **Security Rule:** This file is strictly excluded in `.gitignore` (`.gitignore:139:app/google-services.json`). It must **NEVER** be committed or pushed to any public or shared branch.
* **Package Binding:**
  ```json
  "package_name": "com.aistudio.ainewsmaker.dyynbu"
  ```
* **Firebase Project ID:** `ai-news-maker-app`

### 5.2 Environment Variables (`.env`)
The Android build utilizes the `com.google.android.libraries.mapsplatform.secrets-gradle-plugin` to safely read API keys from `.env`. Ensure your local `.env` contains valid strings:
```bash
ADMIN_API_KEY="default_admin_key"
SESSION_SECRET="ainewsmaker_prod_sec_token_9669802408_2026"
```

---

## 6. WEBVIEW RUNTIME ARCHITECTURE

### 6.1 Secure HTTPS Asset Loading
* The WebView does not load unencrypted `file:///android_asset/` URLs.
* It uses AndroidX WebKit `WebViewClient` intercepting `https://appassets.androidplatform.net/assets/news_studio/index.html`.
* This ensures full DOM Storage, Web Workers, Canvas 2D / WebGL acceleration, and modern JavaScript modules operate without CORS or cross-origin restrictions.

### 6.2 Security Restrictions
* `allowFileAccessFromFileURLs = false`
* `allowUniversalAccessFromFileURLs = false`
* `mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW`
* `android:usesCleartextTraffic = "false"` in `AndroidManifest.xml`

### 6.3 Native JavaScript Bridge (`AndroidNewsStudio`)
* Injected into the WebView window via `addJavascriptInterface(NewsStudioBridge(context, ...), "AndroidNewsStudio")`.
* **Export Handling:** The web canvas generates a high-resolution base64 JPEG (`downloadImage(base64Data, filename)`). The bridge decodes the byte stream, creates a native `Bitmap`, writes it to Android MediaStore (`Pictures/AINewsMaker`), and triggers a MediaScanner scan so the image appears instantly in the user's Gallery.

---

## 7. TESTING INSTRUCTIONS

### 7.1 Running Automated Regression Test Suites
From the project root:
```bash
node tests/test_master_critical_bug_fix.cjs
node tests/test_blocker_remediation.cjs
node tests/test_remediation_acceptance.cjs
node tests/test_master_admin_newsroom_improvements.cjs
```
* **Expected Result:** 88 Test Cases, 166 Assertions, 100% Pass Rate.

### 7.2 Running Android Unit Tests
```powershell
.\gradlew.bat :app:testDebugUnitTest
```

---

## 8. KNOWN LIMITATIONS & OWNER ACTIONS

1. **Release APK Keystore Signing:**
   * `:app:assembleRelease` requires the repository owner's private release keystore (`keystore.jks`) and signing credentials.
   * Do not generate or commit production keystores to the repository.
2. **GitHub Actions Workflow Modifications:**
   * Modifying `.github/workflows/whatsapp-integration-ci.yml` requires an OAuth token or Personal Access Token with the `workflow` administrative scope.
3. **Pull Request #4 Merge:**
   * All changes are staged on `fix/owner-authorized-final-remediation`. The repository owner should review and merge PR #4 into `main` via the GitHub Web UI.

---

## 9. STEPS TO CONTINUE DEVELOPMENT IN GOOGLE AI STUDIO / ANDROID STUDIO

1. **Clone or Open Workspace:**
   Open the root directory `ai-news-maker-app` in Android Studio (Ladybug / Koala or newer) or Google AI Studio.
2. **Gradle Sync:**
   Allow Gradle to synchronize using Gradle Wrapper 9.3.1 and download required dependencies.
3. **Confirm `app/google-services.json`:**
   Verify the file is present in `app/` and matches package `com.aistudio.ainewsmaker.dyynbu`.
4. **Deploy to Device / Emulator:**
   Select the `app` configuration and run on an Android 7.0+ (API 24+) physical device or emulator.
5. **Develop Web Studio Components:**
   If editing canvas export or newsroom components, edit in `src/` or `web_studio/src/`, run `npm run build`, and rebuild `:app:assembleDebug`.
