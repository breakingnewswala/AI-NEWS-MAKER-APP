# AI NEWS MAKER — PHASE 3
# FINAL PRE-DEPLOYMENT REMEDIATION & RELEASE READINESS REPORT

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Production Domain:** [https://www.ainewsmaker.online](https://www.ainewsmaker.online)  
**Firebase Project ID:** `ai-news-maker-app` (Project Number: `401033199805`)  
**Region:** `asia-east1`  
**GitHub Repository:** `https://github.com/breakingnewswala/AI-NEWS-MAKER-APP`  
**Working Branch:** `remediation/phase3-pre-deployment`  
**Report Date:** 11 November 2026  
**Auditor & Release Engineer:** Senior Application Security & Cloud Architecture Specialist  

---

## EXECUTIVE READINESS SUMMARY

This report completes Phase 3 Pre-Deployment Remediation & Release Readiness based on the findings of the 11 November 2026 Master Security Audit and Firebase & Google Cloud Production Verification.

All local source code remediations, Firestore user tier locking, Storage security rules authoring, and comprehensive functional regression tests have been executed on dedicated branch `remediation/phase3-pre-deployment`. In strict adherence to authorization boundaries, no commits have been pushed to `main`, no live Firebase rules deployed, and no live production secrets modified.

### High-Level Readiness Dashboard

| Component | Status Classification | Details |
| :--- | :---: | :--- |
| **1. Firestore Tier Protection** | `FIXED AND TESTED` | Implemented `isUnchangedOrAdmin('tier')` & `isUnchangedOrAdmin('role')`. 5/5 automated test assertions PASS. |
| **2. Storage Rules Compatibility** | `VERIFIED` | Confirmed all media uploads use backend GCS REST API via App Hosting service account. Expired client rule safely blocks direct client writes. |
| **3. Proposed Storage Rules** | `FIXED AND TESTED` | Created [storage.rules](file:///c:/Users/pc/Downloads/ai-news-maker-app/storage.rules) and registered in [firebase.json](file:///c:/Users/pc/Downloads/ai-news-maker-app/firebase.json). Least-privilege public reads + user isolation. |
| **4. SESSION_SECRET Setup** | `PENDING OWNER ACTION` | Detailed non-destructive owner instructions prepared for Google Cloud Secret Manager. |
| **5. App Hosting Configuration** | `VERIFIED` | Runtime Node.js 24 in `asia-east1`. Fail-closed validation verified at startup if `SESSION_SECRET` is missing in production. |
| **6. Authentication Tests** | `FIXED AND TESTED` | Google auth bypass eliminated, PBKDF2 upgraded (210,000 iterations), Admin endpoints protected by verified JWTs. |
| **7. Media Upload / Download** | `FIXED AND TESTED` | Logo uploads require auth & magic bytes. Public news graphics delivered without regression. |
| **8. Application Functional Tests** | `FIXED AND TESTED` | 20/20 functional regression assertions PASS across newsroom, photo studio, video studio, wallet, and WhatsApp AI. |
| **9. Android Release Build** | `BLOCKED` | `./gradlew :app:assembleRelease` blocked by missing `app/google-services.json` and release signing keystore configuration. |
| **10. Owner Actions** | `PENDING OWNER ACTION` | Secret provisioning and Android Play Store keystore setup required from owner. |
| **11. Deployment Checklist** | `VERIFIED` | Full step-by-step checklist prepared for post-owner-action release. |
| **12. Rollback Strategy** | `VERIFIED` | Detailed App Hosting rollback, Git revert, and Firestore PITR recovery procedure documented. |

---

## 1. FIRESTORE USER TIER PROTECTION

- **Status:** `FIXED AND TESTED`
- **Location:** [firestore.rules](file:///c:/Users/pc/Downloads/ai-news-maker-app/firestore.rules)
- **Problem Statement:**  
  Previously, while `incoming().role == existing().role` prevented an authenticated user from modifying their `role` field on `/users/{userId}`, `tier` was included in `hasOnly` without a corresponding immutability check on `update`. An attacker using direct Firestore client SDK calls could potentially set their own `tier` field to `vip` or `ultra`.

- **Implementation:**  
  Added robust helper functions and updated document write rules in [firestore.rules](file:///c:/Users/pc/Downloads/ai-news-maker-app/firestore.rules):
  ```javascript
  function isUnchangedOrAdmin(field) {
    return isAdmin() || (
      (field in existing() && field in incoming() && incoming()[field] == existing()[field]) ||
      (!(field in existing()) && (!(field in incoming()) || incoming()[field] == null))
    );
  }

  function isAllowedInitialRole() {
    return isAdmin() || incoming().role == null || incoming().role == 'reporter' || incoming().role == 'user';
  }

  function isAllowedInitialTier() {
    return isAdmin() || incoming().tier == null || incoming().tier == 'free' || incoming().tier == 'basic';
  }
  ```

  Applied to `match /users/{userId}`:
  ```javascript
  match /users/{userId} {
    allow get: if isSignedIn() && (isOwner(userId) || isAdmin());
    allow list: if isAdmin();
    allow create: if (isOwner(userId) || isAdmin())
                  && isValidUserProfile(incoming())
                  && isAllowedInitialRole()
                  && isAllowedInitialTier();
    allow update: if (isOwner(userId) || isAdmin())
                  && isValidUserProfile(incoming())
                  && isUnchangedOrAdmin('role')
                  && isUnchangedOrAdmin('tier');
    allow delete: if isAdmin();

    match /drafts/{draftId} {
      allow read, write: if isOwner(userId) && isValidId(draftId);
    }
  }
  ```

- **Email Verification Guard:**  
  Also hardened `isMasterAdminEmail()` and `isAdmin()` to explicitly verify `request.auth.token.email_verified == true`.

- **Test Results (`node test_phase3_firestore_rules.cjs`):**
  - ✅ PASS [1/5]: User profile name update succeeds (`canUpdate: true`).
  - ✅ PASS [2/5]: User profile image update succeeds (`canUpdate: true`).
  - ✅ PASS [3/5]: Self-upgrade from basic to VIP is rejected (`canUpdate: false`).
  - ✅ PASS [4/5]: Self-assignment of admin role is rejected (`canUpdate: false`).
  - ✅ PASS [5/5]: Authorized administrative subscription updates succeed (`canUpdate: true`).

---

## 2. FIREBASE STORAGE RULES INVESTIGATION & COMPATIBILITY

- **Status:** `VERIFIED`
- **Audit Findings on Media Operations:**
  A complete code-level audit was performed on all media workflows:
  1. **Logo Uploads (`POST /api/upload-logo`):** Handled via `cloudStorage.saveMedia` in [server.ts](file:///c:/Users/pc/Downloads/ai-news-maker-app/server.ts).
  2. **News Graphic Uploads / Exports:** Generated on HTML5 Canvas via [CanvasExporter.ts](file:///c:/Users/pc/Downloads/ai-news-maker-app/src/lib/CanvasExporter.ts) and saved via `cloudStorage.saveMedia`.
  3. **Photo News Studio Media Access:** Serves logos and images from `/uploads/*` (local cache / CDN) or `https://storage.googleapis.com/ai-news-maker-app.firebasestorage.app/uploads/...`.
  4. **Video Studio Media:** Videos and thumbnails uploaded through `POST /api/admin/videos/upload` and saved via `cloudStorage.saveMedia`.
  5. **User Profile Images:** Uploaded to `/api/upload-logo` or `/api/upload-avatar` using `cloudStorage.saveMedia`.
  6. **Public News Graphics Delivery:** Served publicly with `predefinedAcl=publicRead` directly through Google Cloud Storage Edge or cached by Express static middleware.
  7. **Android Media Workflows:** Android app interacts strictly with the WebView via `@JavascriptInterface` (`downloadCanvas`, `saveImageToGallery`, `saveVideoToGallery`) saving to local `MediaStore.Images.Media`. No native Android Firebase Storage SDK is utilized.

- **Storage Protocol Determination:**
  - **Firebase Storage Client SDK (`firebase/storage`):** NOT used for uploads in production.
  - **Google Cloud Storage JSON REST API:** Used exclusively by the backend in [cloud_storage_service.cjs](file:///c:/Users/pc/Downloads/ai-news-maker-app/cloud_storage_service.cjs).
  - **Service Account Identity:** Backed by `firebase-app-hosting-compute@ai-news-maker-app.iam.gserviceaccount.com` holding `roles/storage.objectAdmin`.
  - **Object ACLs:** Public assets uploaded with `predefinedAcl=publicRead`.

- **Compatibility with Expired Rule:**  
  Because all uploads are handled by the backend service account (which bypasses Firebase Storage Security Rules), the expiration of the client starter rule on 30 October 2026 has **zero negative impact** on production uploads. In fact, it effectively closed direct client-side bucket abuse.

---

## 3. PROPOSED LEAST-PRIVILEGE STORAGE RULES

- **Status:** `FIXED AND TESTED`
- **Location:** [storage.rules](file:///c:/Users/pc/Downloads/ai-news-maker-app/storage.rules)
- **Registered in:** [firebase.json](file:///c:/Users/pc/Downloads/ai-news-maker-app/firebase.json)

The proposed rules implement least-privilege access control:
1. **Public News Assets:** Public `read` allowed for categories `['logos', 'news', 'graphics', 'thumbnails', 'avatars', 'frames', 'music', 'fonts', 'branding']`. Client `write` is restricted strictly to administrators.
2. **User-Specific Media:** Scoped under `/users/{userId}/{allPaths=**}` with `isOwner(userId)` verification and 10MB image size limit.
3. **Private Support Attachments:** Scoped under `/support/{inquiryId}/*` allowing access only to the ticket creator or admins.
4. **Catch-All Deny:** All unmapped paths evaluate to `allow read, write: if false;`.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isMasterAdmin() {
      return isSignedIn() && (
        (request.auth.token.email == 'breakingnewswala.com@gmail.com' ||
         request.auth.token.email == 'breakingnewsvala.com@gmail.com') &&
        request.auth.token.email_verified == true
      );
    }

    function isAdmin() {
      return isSignedIn() && (
        isMasterAdmin() ||
        (request.auth.token.email == 'admin.ainewsmaker@gmail.com' && request.auth.token.email_verified == true)
      );
    }

    function isValidImage() {
      return request.resource.contentType.matches('image/.*')
        && request.resource.size < 10 * 1024 * 1024;
    }

    match /uploads/{category}/{fileName} {
      allow read: if category in ['logos', 'news', 'graphics', 'thumbnails', 'avatars', 'frames', 'music', 'fonts', 'branding'];
      allow write: if isAdmin();
    }

    match /users/{userId}/{allPaths=**} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId) && isValidImage();
    }

    match /support/{inquiryId}/{fileName} {
      allow read, write: if isSignedIn() && (
        request.auth.uid == inquiryId || isAdmin()
      );
    }
  }
}
```

---

## 4. `SESSION_SECRET` OWNER CONFIGURATION INSTRUCTIONS

- **Status:** `PENDING OWNER ACTION`
- **Owner Action Required:** Provision `SESSION_SECRET` in Google Cloud Secret Manager.

### Step 1: Generate a Cryptographically Secure 256-Bit Secret Locally
Run this in any local Node.js terminal (this generates 32 bytes / 64 hex characters of entropy):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
*(Store this generated string securely in your password manager. Never commit it to git).*

### Step 2: Create `SESSION_SECRET` in Google Cloud Secret Manager
Execute in Google Cloud Shell or authenticated terminal:
```bash
# Set project context
gcloud config set project ai-news-maker-app

# Create the secret in Secret Manager
gcloud secrets create SESSION_SECRET \
  --replication-policy="automatic" \
  --project="ai-news-maker-app"

# Add the secret version (paste your generated secret when prompted, or pass via standard input)
echo -n "PASTE_YOUR_GENERATED_SECRET_HERE" | gcloud secrets versions add SESSION_SECRET --data-file=-
```

### Step 3: Grant IAM Secret Access to App Hosting
```bash
# Grant Secret Accessor to the App Hosting compute service account
gcloud secrets add-iam-policy-binding SESSION_SECRET \
  --member="serviceAccount:firebase-app-hosting-compute@ai-news-maker-app.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project="ai-news-maker-app"

# Grant Secret Version Manager to the App Hosting service agent
gcloud secrets add-iam-policy-binding SESSION_SECRET \
  --member="serviceAccount:service-401033199805@gcp-sa-firebaseapphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretVersionManager" \
  --project="ai-news-maker-app"
```

### Step 4: Verify Secret Status (Without Exposing the Value)
```bash
# Verify secret versions are enabled and healthy:
npx firebase-tools apphosting:secrets:describe SESSION_SECRET --project ai-news-maker-app
```
*Expected Output:* Status `ENABLED` with Version `1`.

---

## 5. FIREBASE APP HOSTING CONFIGURATION AUDIT

- **Status:** `VERIFIED`
- **Configuration File:** [apphosting.yaml](file:///c:/Users/pc/Downloads/ai-news-maker-app/apphosting.yaml)
- **Backend ID:** `ainewsmakerapp`
- **Runtime:** `nodejs24`
- **Region:** `asia-east1`
- **Repository Connection:** `breakingnewswala-AI-NEWS-MAKER-APP` (`main`)
- **Build Script:** `npm run build` (`node web_studio/build_and_sync.js`)
- **Production Secret Binding:**
  ```yaml
  - variable: SESSION_SECRET
    secret: SESSION_SECRET
    availability:
      - RUNTIME
  ```
- **Fail-Closed Runtime Verification:**  
  Tested in [server.ts](file:///c:/Users/pc/Downloads/ai-news-maker-app/server.ts) `initializeAuthSecret()`:
  When `NODE_ENV=production`, if `SESSION_SECRET` is unset or `< 32` characters, the server immediately executes `process.exit(1)` with:
  `FATAL SECURITY ERROR: In production, SESSION_SECRET environment variable must be set and be at least 32 characters long.`

---

## 6. AUTHENTICATION REGRESSION TESTS

- **Status:** `FIXED AND TESTED`
- **Verification Suite:** `test_phase2_security_remediation.cjs` & `test_phase3_functional_regression.cjs`

| Assertion | Expected Result | Actual Result | Status |
| :--- | :---: | :---: | :---: |
| Unauthenticated forged `googleUid` | HTTP 401 Unauthorized | HTTP 401 | **PASS** |
| Tampered / invalid Firebase JWT | HTTP 401 Unauthorized | HTTP 401 | **PASS** |
| Old hardcoded JWT token forgery | HTTP 401 / 403 Forbidden | HTTP 401 | **PASS** |
| Master Admin Login with verified JWT | HTTP 200 OK (`role: superadmin`) | HTTP 200 OK | **PASS** |
| Sub Admin Login with verified JWT | HTTP 200 OK | HTTP 200 OK | **PASS** |
| Reporter Login with verified JWT | HTTP 200 OK (`role: reporter`) | HTTP 200 OK | **PASS** |
| Reporter access to Admin API | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| Invalid password rejection | HTTP 401 Unauthorized | HTTP 401 | **PASS** |
| PBKDF2 Modern Hashing (210,000 iter) | SHA-512, 128 hex chars | Verified | **PASS** |

---

## 7. MEDIA UPLOAD AND DOWNLOAD TESTS

- **Status:** `FIXED AND TESTED`

| Test Scenario | Method / Endpoint | Result | Status |
| :--- | :--- | :---: | :---: |
| Authenticated Channel Logo Upload | `POST /api/upload-logo` (Valid PNG base64) | HTTP 200 OK | **PASS** |
| Unauthenticated Logo Upload Attempt | `POST /api/upload-logo` (No JWT) | HTTP 401 Unauthorized | **PASS** |
| Cross-User Logo Tampering Attempt | `POST /api/upload-logo` (Reporter updating Admin logo) | HTTP 403 Forbidden | **PASS** |
| Logo Magic Byte Validation | `POST /api/upload-logo` (Invalid corrupted header) | HTTP 400 Bad Request | **PASS** |
| Public News Graphics Fetching | `GET /uploads/logos/channel_logo.png` | Served with cache header | **PASS** |

---

## 8. COMPLETE APPLICATION FUNCTIONAL TESTS

- **Status:** `FIXED AND TESTED`
- **Automated Test Suite:** `test_phase3_functional_regression.cjs` (20/20 PASS)

```text
==================================================================
🏁 FUNCTIONAL REGRESSION TEST SUITE PASSED: 20/20 SUCCESSFUL
==================================================================
 [1] Google Sign-In (Rejection of unverified/forged tokens)      -> PASS
 [2] Master Admin Authorization (/api/admin/notifications)       -> PASS
 [3] Sub Admin Authorization (/api/admin/notifications)          -> PASS
 [4] Reporter Authorization & Admin Isolation                    -> PASS
 [5] Password Hashing Verification (210,000 PBKDF2 iterations)   -> PASS
 [6] Password Security (Invalid credential rejection)            -> PASS
 [7] Newsroom Dashboard API (/api/news-posts)                    -> PASS
 [8] RSS Feed Engine (/rss.xml valid XML structure)             -> PASS
 [9] News Publishing System (/api/news-posts creation)           -> PASS
[10] Photo News Studio Template & State Engine                   -> PASS
[11] Video News Studio & Reels Feed (/api/videos)                -> PASS
[12] Quick Video Mode & Music Library (/api/music-library)       -> PASS
[13] Graphic Generation & Canvas Export Engine                   -> PASS
[14] Logo Upload with Magic Byte & Ownership Verification        -> PASS
[15] User Profile Management & Quota Endpoint                    -> PASS
[16] Coin Wallet & IDOR Isolation (/api/wallet/unlocked-items)   -> PASS
[17] Subscription Plans Catalog & Font Upload Paywall            -> PASS
[18] Payment Integration (Cashfree Configuration & Webhook)      -> PASS
[19] WhatsApp AI Integration (/api/admin/whatsapp/settings)      -> PASS
[20] Offline Web Studio Parity (Dual-directory sync)             -> PASS
==================================================================
```

---

## 9. ANDROID RELEASE BUILD AUDIT

- **Status:** `BLOCKED` (Owner Prerequisite Required)
- **Command Executed:** `./gradlew :app:assembleRelease` and `./gradlew :app:bundleRelease`
- **Output:**
  ```text
  > Task :app:processReleaseGoogleServices FAILED

  FAILURE: Build failed with an exception.
  * What went wrong:
  Execution failed for task ':app:processReleaseGoogleServices'.
  > File google-services.json is missing.
    The Google Services Plugin cannot function without it.
    Searched locations: app/google-services.json, app/src/release/google-services.json
  ```

- **Root Cause & Blocker Analysis:**
  1. **Missing `google-services.json`:** The Google Services Gradle plugin is enabled in `app/build.gradle.kts`, but the configuration file `google-services.json` from Firebase Console has not been placed in `app/`.
  2. **Release Keystore Missing:** `app/build.gradle.kts` does not yet have release `signingConfigs` mapped to a private keystore (`.jks` / `.keystore`).

- **Resolution Steps for the Owner:**
  1. Open [Firebase Console](https://console.firebase.google.com/) > Project `ai-news-maker-app` > Project Settings > General.
  2. In **Your apps**, select Android app package `com.example` (or `com.ainewsmaker.online`).
  3. Click **Download google-services.json** and place the file at `app/google-services.json`.
  4. Follow the steps in [ANDROID_SECURITY_GUIDE.md](file:///c:/Users/pc/Downloads/ai-news-maker-app/docs/ANDROID_SECURITY_GUIDE.md) to generate your private release keystore and add signing properties to your local `key.properties` (never commit keystores to Git).

---

## 10. OUTSTANDING OWNER ACTIONS

The following actions must be performed directly by the project owner in the respective cloud consoles:

| # | Action Item | Platform / Interface | Purpose |
| :-: | :--- | :--- | :--- |
| **1** | Create `SESSION_SECRET` in Secret Manager | Google Cloud Console / Secret Manager | Enables App Hosting runtime to decrypt and sign JWT sessions securely. |
| **2** | Grant Secret Accessor to App Hosting | Google Cloud Console / IAM | Authorizes `firebase-app-hosting-compute` service account. |
| **3** | Download `google-services.json` into `app/` | Firebase Console | Unblocks Android release APK and AAB compilation. |
| **4** | Configure Play Store Keystore | Local Android Studio / `key.properties` | Required for signing release builds for Google Play Console. |
| **5** | Deploy Firestore Rules (`firebase deploy --only firestore:rules`) | Firebase CLI / Console | Deploys the verified user tier & role locking rules live. |

---

## 11. PRODUCTION DEPLOYMENT CHECKLIST

Once Actions 1 & 2 are complete, the following controlled release procedure is recommended:

```markdown
- [ ] 1. Confirm `npx firebase-tools apphosting:secrets:describe SESSION_SECRET --project ai-news-maker-app` returns ENABLED.
- [ ] 2. Merge `remediation/phase3-pre-deployment` into `main`:
         git checkout main
         git merge remediation/phase3-pre-deployment
- [ ] 3. Push to GitHub main:
         git push origin main
- [ ] 4. Monitor App Hosting build at Firebase Console > App Hosting > ainewsmakerapp.
- [ ] 5. Deploy updated Firestore and Storage rules:
         npx firebase-tools deploy --only firestore:rules,storage --project ai-news-maker-app
- [ ] 6. Execute smoke test on live domain:
         curl -I https://www.ainewsmaker.online/api/health
```

---

## 12. ROLLBACK STRATEGY

In the event of an unexpected issue during production deployment:

1. **App Hosting Instant Rollback (Zero Downtime):**
   - Navigate to Firebase Console > **App Hosting** > `ainewsmakerapp` > **Deployments**.
   - Select the previous stable rollout (commit `4af1f12`) and click **Rollback to this version**. Traffic immediately shifts back to the previous container.

2. **Git Branch Rollback:**
   ```bash
   git checkout main
   git revert HEAD -m 1
   git push origin main
   ```

3. **Firestore Point-in-Time Recovery (PITR):**
   - Database `ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd` has PITR enabled with 7-day version retention (`versionRetentionPeriod: 604800s`).
   - If required, restore the database to any exact timestamp within the last 7 days via:
     ```bash
     gcloud firestore databases restore \
       --source-database=projects/ai-news-maker-app/databases/ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd \
       --destination-database=projects/ai-news-maker-app/databases/ai-studio-ainewsmakerapp-recovery \
       --recovery-time="YYYY-MM-DDTHH:MM:SSZ"
     ```
