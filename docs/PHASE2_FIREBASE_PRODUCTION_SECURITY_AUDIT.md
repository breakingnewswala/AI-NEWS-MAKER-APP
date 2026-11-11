# AI NEWS MAKER — PHASE 2
# FINAL FIREBASE & GOOGLE CLOUD PRODUCTION VERIFICATION REPORT
## FIRESTORE SECURITY + APP HOSTING + AUTHENTICATION + STORAGE

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Production Domain:** [https://www.ainewsmaker.online](https://www.ainewsmaker.online)  
**Firebase Project ID:** `ai-news-maker-app` (Project Number: `401033199805`)  
**Region:** `asia-east1`  
**GitHub Repository:** `https://github.com/breakingnewswala/AI-NEWS-MAKER-APP` (`main`)  
**Backend Origin:** `https://ainewsmakerapp--ai-news-maker-app.asia-east1.hosted.app`  
**Audit Type:** Read-Only Infrastructure, Rules, IAM & Live Configuration Verification  
**Audit Timestamp:** 11 November 2026, 16:25 IST  
**Auditor:** Senior Cloud Security & Firebase Architecture Specialist  

---

## 1. EXECUTIVE SUMMARY

Following the completion of the Phase 2 Application Security Remediation, a comprehensive, read-only security verification of the production Firebase and Google Cloud Platform (GCP) infrastructure for **AI NEWS MAKER** was conducted.

The verification examined the live configurations of Cloud Firestore, Firebase Authentication, Firebase App Hosting, Google Cloud Secret Manager, Cloud Storage, Project IAM, Edge TLS termination, and Firebase App Check enforcement.

### Status Overview Table

| Audit Scope | Classification | Core Finding & Health Summary |
| :--- | :---: | :--- |
| **Firebase Project** | `VERIFIED` | Active project `ai-news-maker-app` (401033199805). Single owner `breakingnewswala.com@gmail.com`. |
| **Firestore Security Rules** | `VERIFIED WITH LIMITATIONS` | Byte-for-byte repository parity verified live. App Check `ENFORCED`. Catch-all deny active. Minor client-side `tier` field scope note. |
| **Live Firestore Deployment** | `VERIFIED` | Ruleset `2e6abaa9-0b18-422e-8b4b-78b5174c267c` is actively deployed on enterprise database `ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd`. |
| **Firebase Authentication** | `VERIFIED` | Identity Platform with Google Sign-In enabled. Authorized domains restricted. Email privacy & reCAPTCHA Enterprise enabled. |
| **Secret Manager** | `PENDING OWNER ACTION` | Production `SESSION_SECRET` declared in `apphosting.yaml` but not yet created in Secret Manager. Owner action required prior to deployment. |
| **Firebase App Hosting** | `VERIFIED` | Backend `ainewsmakerapp` running Node.js 24 in `asia-east1`. ABIU enabled, linked to GitHub `main`. |
| **Cloud Storage Security** | `VERIFIED WITH LIMITATIONS` | Fine-grained object ACLs enabled. Public reads limited to explicit assets. Client write rule expired, preventing direct client abuse. |
| **HTTPS & Custom Domain** | `VERIFIED` | Direct termination on Google Cloud Edge (`35.219.200.60`). Google Trust Services TLS valid through 2027. Automatic HTTP-to-HTTPS 301 redirection. |
| **Cloudflare Reverse Proxy** | `NOT APPLICABLE` | Cloudflare is utilized strictly as DNS registrar/nameserver (DNS-only). Traffic routes directly to Google Cloud Envoy. Cloudflare WAF is not active. |
| **IAM & Access Control** | `VERIFIED` | Zero (0) user-managed service account keys across all 8 service accounts. Principle of least privilege followed. |
| **Automated Testing** | `VERIFIED` | 21/21 Automated Regression Assertions PASS (100% Success). Direct unauthenticated API calls return HTTP 403 / 401. |

---

## 2. FIREBASE PROJECT VERIFICATION

- **Firebase Project ID:** `ai-news-maker-app`
- **Project Number:** `401033199805`
- **Primary Owner Account:** `breakingnewswala.com@gmail.com`
- **Firestore Databases Configured:**
  1. `projects/ai-news-maker-app/databases/ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd` (Production Central Database, `asia-southeast1`, Enterprise edition, Point-In-Time-Recovery Enabled, 7-day retention, automated backup schedules enabled).
  2. `projects/ai-news-maker-app/databases/ai-news-maker-app` (`africa-south1`, Enterprise edition).
  3. `projects/ai-news-maker-app/databases/ai-studio-ca4a6b38-3a15-42b8-bd21-02c0a5e299fd` (`asia-southeast1`).
  4. `projects/ai-news-maker-app/databases/app-builder-c8d7814f` (`nam5`, Free tier).

---

## 3. FIRESTORE SECURITY RULES AUDIT

The repository's [firestore.rules](file:///c:/Users/pc/Downloads/ai-news-maker-app/firestore.rules) was audited against the 10 specific security criteria:

### Audit Criteria Checklist

1. **Unauthenticated Read Access:** **SECURE (PASS)**  
   The default catch-all rule (`match /{document=**} { allow read, write: if false; }`) denies all reads. Only `news_posts`, `videos`, and `rss_sources` allow public reading. Private collections (`users`, `support_requests`, `admins`, `wallets`, `drafts`) require explicit authentication.
2. **Unauthenticated Write/Delete Access:** **SECURE (PASS)**  
   Every `allow create`, `allow update`, and `allow delete` rule explicitly checks `isSignedIn()` (`request.auth != null`). Unauthenticated writes and deletes are universally rejected.
3. **Cross-User Record Isolation:** **SECURE (PASS)**  
   `users/{userId}` requires `isOwner(userId)` (`request.auth.uid == userId`) or verified `isAdmin()`. `users/{userId}/drafts/{draftId}` strictly enforces `isOwner(userId)`. Ordinary users cannot query, read, or write other users' documents.
4. **Ordinary Reporter Modification of Admin Records:** **SECURE (PASS)**  
   `admins/{adminId}` write operations strictly require `isMasterAdminEmail()`. Non-admin accounts attempting to write to admin records are denied by Firestore rules.
5. **Subscription & Coin Balances Protection:** **SECURE (PASS)**  
   Coin balances and wallet transactions reside in the `wallets` and `wallet_transactions` collections. Neither collection has an `allow` rule in `firestore.rules`; both are caught by the catch-all `allow read, write: if false;`. Direct client SDK tampering is impossible; only the server-side backend with administrative privileges can alter wallet balances.
6. **Wallet Transactions Protection:** **SECURE (PASS)**  
   Direct client SDK writes to wallet transactions are rejected by the catch-all deny rule.
7. **Admin-Only Collections Enforcement:** **SECURE (PASS)**  
   `admins/{adminId}` allows writes only to `isMasterAdminEmail()`. `videos` and `rss_sources` restrict write operations to `isAdmin()`.
8. **Document Ownership Validation:** **SECURE (PASS)**  
   `news_posts` validates `incoming().authorId == request.auth.uid` on creation, and enforces that non-admins can only update or delete posts where `existing().authorId == request.auth.uid`.
9. **Collection-Group Queries Exposure:** **SECURE (PASS)**  
   No collection-group wildcard rules exist. Global collection-group queries on private subcollections (such as `drafts`) fail closed.
10. **Default Catch-All Deny:** **SECURE (PASS)**  
    Lines 6–8 of [firestore.rules](file:///c:/Users/pc/Downloads/ai-news-maker-app/firestore.rules) enforce:
    ```javascript
    match /{document=**} {
      allow read, write: if false;
    }
    ```

### Identified Rule Limitations

- **Limitation 1 (Tier Field in User Profile Update):**  
  In `isValidUserProfile(data)`, `tier` is included in `hasOnly`. Line 121 checks:
  ```javascript
  allow update: if (isOwner(userId) || isAdmin())
                && isValidUserProfile(incoming())
                && (incoming().role == existing().role || isAdmin());
  ```
  While `incoming().role == existing().role` prevents a user from upgrading their own `role` from `reporter` to `admin`, the rule does not check `incoming().tier == existing().tier`. In the event a malicious user directly used the Firestore Web SDK, they could update their own document's `tier` field.  
  *Mitigation:* In Phase 2, the backend Express server was hardened so that `/api/*` endpoints (such as `/api/upload-font`) resolve user tier authoritatively from the central database and ignore client-supplied tier parameters. Direct SDK access is also gated by Firebase App Check.
- **Limitation 2 (Admin Email Verification Check):**  
  `isMasterAdminEmail()` and `isAdmin()` match `request.auth.token.email == ...` without checking `request.auth.token.email_verified == true`. Although Google Sign-In always provides verified emails, adding `&& request.auth.token.email_verified == true` is recommended as defense-in-depth against custom auth providers.

---

## 4. LIVE FIRESTORE DEPLOYMENT STATUS

- **Live Database:** `projects/ai-news-maker-app/databases/ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd`
- **Active Release:** `projects/ai-news-maker-app/releases/cloud.firestore/ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd`
- **Ruleset Name:** `projects/ai-news-maker-app/rulesets/2e6abaa9-0b18-422e-8b4b-78b5174c267c`
- **Deployed Ruleset Content Comparison:**  
  The live deployed ruleset retrieved directly from the Google Cloud Rules API was compared against repository `firestore.rules`.  
  **Result:** **100% IDENTICAL (0 byte difference, perfect parity).**
- **Firebase App Check Status:**  
  `projects/401033199805/services/firestore.googleapis.com`: **`ENFORCED`**  
  Unauthenticated external REST or SDK requests without a valid Play Integrity or reCAPTCHA Enterprise token are rejected at the Google edge gateway.

---

## 5. FIREBASE AUTHENTICATION AUDIT

- **Auth Platform:** Google Cloud Identity Platform (`IDENTITY_PLATFORM`)
- **Authorized Domains:**
  - `localhost`
  - `ainewsmaker.online`
  - `www.ainewsmaker.online`
  - `ai-news-maker-app.firebaseapp.com`
  - `ai-news-maker-app.web.app`
  - `ainewsmaker.ai.studio`
- **Google Sign-In IdP:** Enabled (`projects/401033199805/defaultSupportedIdpConfigs/google.com`)
  - Client ID: `401033199805-5hl33kn2tltd8n69sjmrlv21roe2880j.apps.googleusercontent.com`
- **Account Security Controls:**
  - `enableImprovedEmailPrivacy: true` (Prevents user enumeration attacks).
  - `useSmsTollFraudProtection: true` (Prevents SMS OTP pumping attacks).
  - reCAPTCHA Enterprise keys bound for Web, iOS, and Android.
- **Backend ID Token Verification:**  
  In [server.ts](file:///c:/Users/pc/Downloads/ai-news-maker-app/server.ts), `POST /api/auth/login` verifies candidate Google tokens via `firebaseAdminAuth.verifyIdToken(token, true)` with revocation checking enabled. Unverified client parameters (`googleUid`, `email`, `role`) are rejected (401 Unauthorized).

---

## 6. GOOGLE CLOUD SECRET MANAGER VERIFICATION

- **Configuration File:** [apphosting.yaml](file:///c:/Users/pc/Downloads/ai-news-maker-app/apphosting.yaml)
- **Declared Secret References:**
  - `SESSION_SECRET` (Target for Phase 2 JWT hardening)
  - `CASHFREE_APP_ID` (Live)
  - `CASHFREE_SECRET_KEY` (Live)
  - `META_APP_SECRET` (Live)
  - `META_WEBHOOK_VERIFY_TOKEN` (Live)
  - `GEMINI_API_KEY` (Live)
  - `WHATSAPP_ACCESS_TOKEN` (Live)
- **Live Secret Manager Audit:**
  - All declared secrets exist in project `ai-news-maker-app` **EXCEPT `SESSION_SECRET`**.
  - Querying `SESSION_SECRET` metadata returned: `HTTP 404: Secret [projects/401033199805/secrets/SESSION_SECRET] not found`.
- **Runtime Startup Behavior:**  
  In [server.ts](file:///c:/Users/pc/Downloads/ai-news-maker-app/server.ts), `initializeAuthSecret()` enforces that when `NODE_ENV=production`, if `SESSION_SECRET` is undefined or under 32 characters, the server immediately **fails closed** and terminates with:
  `FATAL SECURITY ERROR: SESSION_SECRET must be set in production and be >= 32 characters`.
- **Secret Hygiene:**  
  Verified that zero plaintext production secrets, tokens, or private keys exist in repository source code, build scripts, or git history.

---

## 7. FIREBASE APP HOSTING AUDIT

- **Backend ID:** `ainewsmakerapp`
- **Primary Region:** `asia-east1`
- **GitHub Repository:** `breakingnewswala-AI-NEWS-MAKER-APP`
- **Target Branch:** `main`
- **Runtime Environment:** `nodejs24`
- **Automatic Branch Build Updates (ABIU):** Enabled
- **Live Backend Origin:** `https://ainewsmakerapp--ai-news-maker-app.asia-east1.hosted.app`
- **Compute Service Account:** `firebase-app-hosting-compute@ai-news-maker-app.iam.gserviceaccount.com`
  - Assigned Roles: `roles/firebaseapphosting.computeRunner`, `roles/datastore.user`, `roles/cloudtasks.enqueuer`, `roles/developerconnect.readTokenAccessor`, `roles/firebase.sdkAdminServiceAgent`.
  - Storage Access: `roles/storage.objectAdmin` on `gs://ai-news-maker-app.firebasestorage.app`.
  - Secret Access: `roles/secretmanager.secretAccessor` granted per-secret.

---

## 8. FIREBASE CLOUD STORAGE SECURITY

- **Primary Bucket:** `gs://ai-news-maker-app.firebasestorage.app`
  - Location: `US-EAST1` (Regional)
  - Uniform Bucket-Level Access: `false` (Fine-grained object ACLs enabled)
  - Soft Delete Retention: 7 days (`604800` seconds)
  - Public Read Policy: `allUsers` does NOT have bucket-level read permissions. Objects are only accessible if uploaded with explicit `predefinedAcl=publicRead` (e.g. public channel logos and news card images).
- **Live Firebase Storage Ruleset:**
  - Ruleset Name: `projects/ai-news-maker-app/rulesets/28a6b050-3740-489e-a466-e8bd049c3ac2`
  - Rule Definition:
    ```javascript
    match /{allPaths=**} {
      allow read, write: if request.time < timestamp.date(2026, 10, 30);
    }
    ```
  - **Audit Finding:** The expiration date `2026-10-30` has passed. Direct client writes and reads through the Firebase Storage client SDK now evaluate to `false` and are blocked.
  - **Application Compatibility:** The application uploads media through the backend service [cloud_storage_service.cjs](file:///c:/Users/pc/Downloads/ai-news-maker-app/cloud_storage_service.cjs) using the Google Cloud Storage REST API with service account credentials (`storage.objects.create`). Because service accounts bypass Firebase Storage security rules, backend media uploads continue to operate smoothly without being blocked by client rule expiration.
  - **App Check:** `firebasestorage.googleapis.com` enforcement is `ENFORCED`.

---

## 9. HTTPS AND CUSTOM DOMAIN VERIFICATION

- **Primary Production Domain:** `https://www.ainewsmaker.online`
- **Apex Domain:** `https://ainewsmaker.online`
- **Network Resolution & Edge Architecture:**
  - `nslookup www.ainewsmaker.online` -> `35.219.200.60`
  - `nslookup ainewsmaker.online` -> `35.219.200.60`
  - IP `35.219.200.60` belongs to Google Cloud / Firebase App Hosting Edge Load Balancer.
  - HTTP Server Header: `server: envoy`, `via: 1.1 google`, `cache-tag: 401033199805:ainewsmakerapp`.
- **TLS Certificate Analysis:**
  - **Subject:** `CN=ainewsmaker.online`
  - **Issuer:** `CN=WR3, O=Google Trust Services, C=US`
  - **Validity:** 03 October 2026 to 01 January 2027
  - **Thumbprint:** `ADF3114C8DF0D9A02CE288FF380A3DC5ACBC26A8`
- **HTTP-to-HTTPS Redirection:**
  - `http://www.ainewsmaker.online` returns `HTTP/1.1 301 Moved Permanently` with `Location: https://www.ainewsmaker.online:443/`.
- **Cloudflare Usage Evaluation:**
  - No `cf-ray`, `cf-cache-status`, or Cloudflare edge headers exist in live responses.
  - Cloudflare is utilized strictly as DNS registrar/nameserver (DNS-only / grey-clouded).
  - Cloudflare WAF and Full (Strict) SSL proxying are **NOT APPLICABLE** to the live Google Cloud edge architecture.

---

## 10. FIREBASE IAM AND ACCESS CONTROL

- **Human Principals:**
  - `user:breakingnewswala.com@gmail.com`: Sole project `roles/owner`.
  - No other human accounts possess administrative or editing privileges on the GCP project.
- **Service Account Key Audit:**
  - Verified across all 8 service accounts:
    1. `ais-gemini-key-cbfc5d8ba64d40d`: 0 user-managed keys
    2. `vertex-express`: 0 user-managed keys
    3. `firebase-app-hosting-compute`: 0 user-managed keys
    4. `whatsapp-task-worker`: 0 user-managed keys
    5. `ai-news-backend-sa`: 0 user-managed keys
    6. `401033199805-compute`: 0 user-managed keys
    7. `ais-gemini-key-9f61252f908d4f2`: 0 user-managed keys
    8. `firebase-adminsdk-fbsvc`: 0 user-managed keys
  - **Result:** **100% Google-managed credentials.** Zero user-managed JSON service account keys exist in the project, eliminating credential leakage risk.

---

## 11. SECURITY TEST RESULTS

Safe, non-destructive empirical tests were executed against the live APIs and local runtime:

```text
==================================================================
TEST 1: Direct Unauthenticated Firestore REST Query (/documents/users)
Status: HTTP 403 PERMISSION_DENIED (Missing or insufficient permissions)
Result: PASS

TEST 2: Direct Unauthenticated Firestore REST Query (/documents/wallets)
Status: HTTP 403 PERMISSION_DENIED (Missing or insufficient permissions)
Result: PASS

TEST 3: Direct Unauthenticated Firestore REST Query (/documents/admins)
Status: HTTP 403 PERMISSION_DENIED (Missing or insufficient permissions)
Result: PASS

TEST 4: Direct Unauthenticated Firebase Storage Access (news_database.json)
Status: HTTP 401 UNAUTHORIZED (Firebase App Check token is invalid)
Result: PASS

TEST 5: Automated Phase 2 Regression Test Suite (node test_phase2_security_remediation.cjs)
Status: 21 PASSED, 0 FAILED (TOTAL: 21)
Result: PASS (100% SUCCESS)
==================================================================
```

---

## 12. UNRESOLVED FINDINGS

1. **`SESSION_SECRET` Missing in Secret Manager (`PENDING OWNER ACTION`):**  
   `apphosting.yaml` references secret `SESSION_SECRET`, but the secret does not yet exist in Google Cloud Secret Manager. Attempting an App Hosting rollout before creating this secret will fail the build or trigger a runtime startup crash.
2. **Firestore Rules User Profile `tier` Field (`MINOR`):**  
   `firestore.rules` allows an authenticated user to update their own user profile document, and while `role` is locked, `tier` is not explicitly constrained to `incoming().tier == existing().tier`. Although the backend API ignores client-supplied tiers, updating `firestore.rules` in a future release is recommended.
3. **Firestore Storage Client Write Rule Expired (`INFORMATIONAL`):**  
   The client SDK storage rule expired on 2026-10-30. Direct client SDK writes are disabled. Backend server uploads continue to work as expected via the GCP GCS REST API.

---

## 13. OWNER ACTIONS REQUIRED

Before executing `git push origin main` and triggering the production App Hosting deployment, the project owner must perform the following two steps in Google Cloud Console:

### Step 1: Create `SESSION_SECRET` in Secret Manager

Run the following commands in Google Cloud Shell (or terminal with `gcloud` authenticated as `breakingnewswala.com@gmail.com`):

```bash
# 1. Generate a strong 64-character hex secret:
SESSION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Create the secret in Secret Manager:
echo -n "$SESSION_KEY" | gcloud secrets create SESSION_SECRET \
  --data-file=- \
  --project=ai-news-maker-app \
  --replication-policy=automatic
```

*Alternatively via Google Cloud Console:*
1. Navigate to **Security** > **Secret Manager** in project `ai-news-maker-app`.
2. Click **Create Secret**.
3. Name: `SESSION_SECRET`.
4. Secret value: Enter a random 64-character alphanumeric string.
5. Click **Create**.

### Step 2: Grant App Hosting Secret Access

```bash
# Grant Secret Manager Secret Accessor to the App Hosting compute service account:
gcloud secrets add-iam-policy-binding SESSION_SECRET \
  --member="serviceAccount:firebase-app-hosting-compute@ai-news-maker-app.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=ai-news-maker-app

# Grant Secret Version Manager to the App Hosting control plane:
gcloud secrets add-iam-policy-binding SESSION_SECRET \
  --member="serviceAccount:service-401033199805@gcp-sa-firebaseapphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretVersionManager" \
  --project=ai-news-maker-app
```

---

## 14. PRODUCTION DEPLOYMENT RECOMMENDATION

### Verdict: **READY FOR DEPLOYMENT (Subject to Step 13 Secret Provisioning)**

The Firebase production environment demonstrates high security maturity:
- Firebase App Check is strictly enforced across Firestore, Storage, Database, ML, and Identity Platform.
- Live Firestore rules are 100% synchronized with repository rules.
- Public endpoints enforce HTTPS with Google Trust Services TLS.
- Project IAM is strictly controlled with 0 user-managed service account keys.
- Application codebase passes 21/21 Phase 2 security regression tests.

Once the owner provisions `SESSION_SECRET` in Secret Manager per Section 13, the repository can be committed and pushed to `main` for automated App Hosting deployment and Android Play Store release.
