# AI NEWS MAKER — SECURITY CONFIGURATION GUIDE
## PRODUCTION ENVIRONMENT & SECRET MANAGEMENT SETUP

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Firebase Project ID:** `ai-news-maker-app`  
**Firebase Region:** `asia-east1`  
**Updated:** 11 November 2026  

---

## 1. GOOGLE CLOUD SECRET MANAGER SETUP (CRITICAL FOR PRODUCTION)

> [!IMPORTANT]
> **Strict Security Notice:** Never commit, share, or post production secrets in GitHub, chat, or documentation. Perform these steps directly in the Google Cloud Console.

### Step 1: Create `SESSION_SECRET` in Secret Manager
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project: `ai-news-maker-app`.
3. In the left navigation, go to **Security** -> **Secret Manager**.
4. Click **+ CREATE SECRET**.
5. Set Name: `SESSION_SECRET`.
6. Under **Secret value**, generate a cryptographically strong 256-bit (or 512-bit) random string.
   - You can generate this securely on your local terminal using:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
7. Click **Create secret**.

### Step 2: Grant App Hosting Service Account Secret Accessor Role
1. On the secret details page for `SESSION_SECRET`, click the **Permissions** tab.
2. Click **+ ADD PRINCIPAL**.
3. In New principals, enter your Firebase App Hosting backend service account:
   `ainewsmakerapp@ai-news-maker-app.iam.gserviceaccount.com` (or your project Compute service account: `401033199805-compute@developer.gserviceaccount.com`).
4. Select Role: **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`).
5. Click **Save**.

### Step 3: Verify Mapping in `apphosting.yaml`
Confirm that `apphosting.yaml` contains:
```yaml
  - variable: SESSION_SECRET
    secret: SESSION_SECRET
    availability:
      - RUNTIME
```

---

## 2. CLOUDFLARE EDGE WAF & SSL/TLS HARDENING

Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) and verify:
1. **SSL/TLS Encryption Mode:**
   - Set to **Full (strict)**. This guarantees end-to-end encryption between Cloudflare edge and Firebase App Hosting origin.
2. **Always Use HTTPS:**
   - Under SSL/TLS -> Edge Certificates, toggle **Always Use HTTPS** to ON.
   - Enable **Automatic HTTPS Rewrites**.
3. **Web Application Firewall (WAF):**
   - Under Security -> WAF, ensure **Cloudflare Managed Ruleset** is enabled with Action: Block.
4. **Security Headers at Edge (Transform Rules):**
   - Ensure `X-Content-Type-Options: nosniff` and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` are emitted.

---

## 3. ANDROID PRODUCTION SIGNING & RELEASE KEYSTORE

Before building the production release Android App Bundle (AAB):
1. On your secure local development machine (never in public CI), generate your release keystore:
   ```bash
   keytool -genkey -v -keystore release-upload-key.jks -alias ainewsmaker-release -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Store `release-upload-key.jks` and its passwords in a secure password manager.
3. In `app/build.gradle.kts`, configure signing configs using environment variables (e.g. `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
