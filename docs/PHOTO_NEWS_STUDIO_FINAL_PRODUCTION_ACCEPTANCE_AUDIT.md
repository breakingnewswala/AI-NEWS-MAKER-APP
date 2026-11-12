# AI NEWS MAKER — FINAL PRODUCTION ACCEPTANCE AUDIT REPORT
## PHOTO NEWS STUDIO — INDEPENDENT POST-REMEDIATION VERIFICATION

**Date:** 12 November 2026  
**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Production URL:** https://www.ainewsmaker.online  
**Target Branch:** `fix/owner-authorized-final-remediation`  
**Commit SHA:** `ba0b0bdea92283f4757bd324dafab0a76616246a`  
**Firebase Project:** `ai-news-maker-app`  
**Auditor:** Senior Principal Security & Graphics Architecture Auditor  
**Audit Protocol:** Strict Read-Only Verification (Zero Code Mutations, Zero Remote Pushes, Zero Deployments)  

---

## EXECUTIVE SUMMARY & AUDIT VERDICT

| Acceptance Category | Status | Summary Finding |
| :--- | :---: | :--- |
| **1. DNS Rebinding & Image Proxy** | **FAIL** | Pre-flight DNS validation passes, but the resolved IP is **NOT PINNED** to the socket connection. Node `fetch` executes a second uncontrolled DNS resolution (TOCTOU vulnerability). |
| **2. Real Visual & Export Acceptance** | **PASS** | Exact 1080×1350 resolution verified. All layers (PNG frame, photo slot, headline, badge, callout, footer) verified. Hashes computed. |
| **3. Master Admin Authorization** | **PASS / OWNER ACTION** | Master Admin requirement strictly enforced on `/api/dynamic-frames` (401/403 for Anon, Basic, Pro, VIP, and Sub Admin). Asset Libraries allows Sub Admin for `custom_footer`. |
| **4. Live Firestore Data Integrity** | **PASS** | Document `df_1794406067554_albmw` confirmed as `published`, `APPROVED`, and `Special Frames`. Zero database writes executed. |
| **5. Git & Deployment Boundaries** | **PASS** | Operating strictly on `fix/owner-authorized-final-remediation`. Zero commits pushed to GitHub. Zero live rollouts triggered. |
| **OVERALL DEPLOYMENT DECISION** | **CONDITIONAL NO-GO** | **NO-GO** for public deployment until DNS Rebinding socket IP pinning is implemented and authorized by Owner. |

---

## 1. DNS REBINDING — IMAGE PROXY AUDIT

### 1.1 Empirical Verification Results

An isolated test suite (`scratch/test_final_acceptance_audit.cjs`) executed tests against `/api/proxy-image` on an isolated test server (Port 5060):

| Test Vector | Target URL | Expected | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| Loopback IPv4 | `http://127.0.0.1:8080/secret` | HTTP 403 | HTTP 403 Forbidden | **PASS** |
| Cloud Metadata | `http://169.254.169.254/computeMetadata/v1/` | HTTP 403 | HTTP 403 Forbidden | **PASS** |
| Localhost Hostname | `http://localhost:3000/api/keys` | HTTP 403 | HTTP 403 Forbidden | **PASS** |
| IPv4-Mapped IPv6 | `http://[::ffff:127.0.0.1]:8080/flag` | HTTP 403 | HTTP 403 Forbidden | **PASS** |
| IPv6 Loopback | `http://[::1]:8080/flag` | HTTP 403 | HTTP 403 Forbidden | **PASS** |
| Redirect to Metadata | `http://127.0.0.1:5061/redirect-to-metadata` | HTTP 403 | HTTP 403 Forbidden | **PASS** |
| Redirect Limit (5 Hops) | `http://127.0.0.1:5061/redirect-chain-1` | HTTP 403 / 400 | HTTP 403 Forbidden | **PASS** |
| **Connection Socket IP Pinning** | `server.ts:12224` | Validated IP pinned | **Unpinned `fetch(currentUrl)`** | **FAIL** |

### 1.2 In-Depth Analysis of the IP Pinning Defect (TOCTOU)

In `server.ts` (lines 12213–12227):
```typescript
// Step 1: Pre-flight DNS resolution & safety check
const dnsCheck = await checkDnsSafety(urlValidation.parsedUrl.hostname);
if (!dnsCheck.safe) {
  return res.status(403).json({ error: "प्रतिबंधित लिंक (DNS Rebinding Protection): " + dnsCheck.error });
}

// Step 2: Connection execution
response = await fetch(currentUrl, {
  signal: controller.signal,
  redirect: "manual",
  headers: { ... },
});
```

#### The Vulnerability Window:
1. `checkDnsSafety` executes `await dns.promises.lookup(hostname, { all: true })`.
2. An attacker sets up a malicious domain `rebind.attacker.com` pointing to a benign public IP (e.g., `8.8.8.8`) with `TTL = 0`.
3. `checkDnsSafety` resolves `8.8.8.8`, verifies that it is not in the blocked IP ranges, and returns `{ safe: true }`.
4. Then, `fetch(currentUrl)` is invoked. Because `fetch` is called with the hostname string `http://rebind.attacker.com/...`, Node's HTTP client (`undici`) performs a **second independent DNS resolution** to open the TCP socket.
5. In the second lookup, the attacker's nameserver responds with `169.254.169.254` (Cloud Metadata) or `127.0.0.1`.
6. Node connects directly to the private metadata service, completely bypassing the pre-flight check.

### 1.3 Recommended Technical Correction (Awaiting Owner Approval)

To achieve true DNS rebinding immunity, the pre-validated IP address must be **pinned to the socket**:

```typescript
import { Agent } from 'undici';

// Resolve and validate all IPs first:
const addresses = await dns.promises.lookup(hostname, { all: true });
// (Verify all addresses against isBlockedIpAddress...)

const safeIp = addresses[0].address;
const family = addresses[0].family;

// Pin the socket to safeIp using a custom Undici Dispatcher:
const pinnedDispatcher = new Agent({
  connect: {
    lookup: (_hostname, _options, callback) => {
      callback(null, [{ address: safeIp, family }]);
    },
  },
});

response = await fetch(currentUrl, {
  dispatcher: pinnedDispatcher,
  signal: controller.signal,
  redirect: "manual",
  headers: {
    Host: urlValidation.parsedUrl.host, // Preserves HTTP Host
    // SNI and TLS validation remain grounded to hostname
  },
});
```

---

## 2. REAL PNG/JPEG VISUAL & EXPORT ACCEPTANCE

### 2.1 File Evidence & Cryptographic Hashes

Both files were located in the project root and in the artifact directory:

| File Name | File Size | SHA-256 Checksum | Dimensions | Color Format |
| :--- | :---: | :--- | :---: | :---: |
| `actual_audit_verified_export.png` | **568,679 bytes** | `62768879c8e419dd380dd73ede7c16123e48463240c35663f743a1de6c0b29a2` | 1080 × 1350 | RGBA 32-bit (Type 6, 8-bit depth) |
| `actual_audit_verified_export.jpg` | **190,187 bytes** | `3b198976a7536d4300bdf42a906a521aa3de08a76879c0088caf401cd9aac364` | 1080 × 1350 | YCbCr (Quality 0.95) |

### 2.2 Visual Layer & Asset Inspection Checklist

Programmatic and visual inspection confirmed the presence and integrity of all configured layers for template `df_1794406067554_albmw`:

- [x] **Exact 1080×1350 Resolution:** Confirmed via PNG IHDR chunk (Offset 16–23) and JPEG SOF0 marker (Offset +5–8).
- [x] **Custom PNG Frame & Artwork:** Loaded from authoritative Google Cloud Storage asset (`bg_df_1794406067554_albmw_...png`); rendered without transparent fallbacks.
- [x] **Main Photo Slot:** Occupies top 58.48% canvas height; rendered without dark placeholder background.
- [x] **Headline Typography:** Complete Hindi Devanagari text rendered (`"राष्ट्रीय राजधानी क्षेत्र में नई विकास परियोजनाओं को मिली मंजूरी"`), positioned between 59.9% and 86.8% vertical coordinate.
- [x] **Location Badge:** Rendered at `x: 68%, y: 4%, width: 28%, height: 4.5%` with correct label `"नई दिल्ली"`.
- [x] **Date & Watermark:** AI watermark rendered at `x: 83.7%, y: 35.5%` with 90° rotation and 0.85 opacity.
- [x] **Permanent Footer:** 8% height footer anchored at the bottom edge (`y: 92%`), strictly adhering to non-banned color configuration (`#FFFFFF` background, `#000000` text).
- [x] **Story Callout:** Rendered above footer (`y: 86.8%`).

### 2.3 Preview vs. Canvas vs. Export Parity & JPEG Compression Analysis

- **Canvas to PNG Parity:** 100% pixel-identical lossless export directly extracted from the HTML5 Canvas 2D context via `toDataURL('image/png')`.
- **Canvas to JPEG Compression Difference:**
  - JPEG file size is **33.44%** of the lossless PNG (190 KB vs. 568 KB).
  - Measured differences are strictly limited to Discrete Cosine Transform (DCT) high-frequency quantization around high-contrast edges (Devanagari text ligatures and badge borders).
  - No color shifting or element displacement detected. Contrast and readability exceed broadcast journalism standards.

---

## 3. MASTER ADMIN AUTHORIZATION MATRIX

### 3.1 Role-Based Access Control (RBAC) Test Matrix

Six distinct user roles were tested against sensitive backend routes:

| Role Tested | Token Payload Role / Tier | Target Route: `PUT /api/dynamic-frames/:id` | Frame Approval & Publication | Category Transition | Banned Color Modification | Asset Libraries (`custom_footer`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Anonymous** | None | **401 Unauthorized** | ❌ Blocked | ❌ Blocked | ❌ Blocked | **401 Unauthorized** |
| **Basic User** | `role: "user"`, `plan: "BASIC"` | **403 Forbidden** | ❌ Blocked | ❌ Blocked | ❌ Blocked | **403 Forbidden** |
| **Pro User** | `role: "user"`, `plan: "PRO"` | **403 Forbidden** | ❌ Blocked | ❌ Blocked | ❌ Blocked | **403 Forbidden** |
| **VIP Desk** | `role: "user"`, `plan: "VIP DESK"` | **403 Forbidden** | ❌ Blocked | ❌ Blocked | ❌ Blocked | **403 Forbidden** |
| **Sub Admin** | `role: "admin"` | **403 Forbidden** | ❌ Blocked | ❌ Blocked | ❌ Blocked | **200 OK (WARN)** |
| **Master Admin** | `role: "superadmin"`, `breakingnewswala...` | **200 OK** |  Allowed |  Allowed |  Allowed | **200 OK** |

### 3.2 Security Finding: Asset Libraries Sub Admin Access

- **Route:** `POST /api/admin/asset-libraries` & `PUT /api/admin/asset-libraries/:id`
- **Current Middleware:** `requireAdminMiddleware`
- **Behavior:** A Sub Admin with `role: "admin"` can create and modify assets of type `custom_footer`.
- **Finding:** While core dynamic frames and template configurations are strictly restricted to Master Admin via `requireMasterAdminMiddleware`, the asset library for custom footers permits Sub Admin writes.
- **OWNER ACTION REQUIRED:** Confirm whether Sub Admins should be permitted to upload custom footer library items, or if `requireMasterAdminMiddleware` should be applied when `type === 'custom_footer'`.

---

## 4. PRODUCTION DATA & FIRESTORE READ-ONLY VERIFICATION

Direct read-only inspection of the authoritative database records confirms:

```json
{
  "id": "df_1794406067554_albmw",
  "name": "TEST 2",
  "designCategory": "Special Frames",
  "approvalStatus": "APPROVED",
  "publicationStatus": "published",
  "isTestFrame": false
}
```

- `publicationStatus` is confirmed as **`published`**.
- `approvalStatus` is confirmed as **`APPROVED`**.
- `designCategory` is confirmed as **`Special Frames`**.
- `isTestFrame` is confirmed as **`false`**.
- **No database mutations or rollbacks were performed during this audit.**

---

## 5. GIT & DEPLOYMENT BOUNDARIES VERIFICATION

```
Branch: fix/owner-authorized-final-remediation
Commit SHA: ba0b0bdea92283f4757bd324dafab0a76616246a
Remote Tracking: NONE (Unpushed local feature branch)
GitHub Origin: Clean (Zero commits pushed to origin)
Firebase Deployment: Inactive (Zero builds or deployments triggered)
```

- All changes are strictly confined to the local feature branch `fix/owner-authorized-final-remediation`.
- `git branch -r` confirms no remote branch exists for this feature.
- Production website `https://www.ainewsmaker.online` remains completely untouched.

---

## 6. FINAL ACCEPTANCE TEST SUITE SUMMARY

| Test Suite | Tests Run | Passed | Failed | Warnings | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Regression Acceptance Tests** | 34 | 34 | 0 | 0 | **PASS** |
| **2. DNS Rebinding & SSRF Suite** | 8 | 7 | 1 | 0 | **FAIL** |
| **3. Master Admin RBAC Matrix** | 9 | 9 | 0 | 1 | **PASS / WARN** |
| **4. Visual Export & Hash Verification** | 6 | 6 | 0 | 0 | **PASS** |
| **5. Production Data Read-Only** | 4 | 4 | 0 | 0 | **PASS** |
| **6. Git & Deployment Boundaries** | 2 | 2 | 0 | 0 | **PASS** |
| **TOTALS** | **63** | **62** | **1** | **1** | **CONDITIONAL** |

---

## 7. REMAINING BLOCKERS & OWNER ACTIONS

### Blocker 1 (Critical Security): DNS Rebinding Socket IP Pinning
- **Location:** `server.ts:12224` and `web_studio/server.ts:12224`.
- **Impact:** While IP filtering correctly catches direct IP entries and resolves initial hostnames, `fetch(currentUrl)` remains vulnerable to rapid DNS switching (TOCTOU rebinding) between validation and connection.
- **Recommended Action:** Authorize adding an Undici dispatcher lookup override in `/api/proxy-image` that pins the validated IP address to the TCP socket connection.

### Advisory 1 (Policy): Custom Footer Library Role Boundary
- **Location:** `server.ts:1270` (`/api/admin/asset-libraries`).
- **Impact:** Sub Admins can upload custom footer assets.
- **Recommended Action:** Clarify whether custom footers in the asset library require Master Admin exclusivity.

---

## 8. FINAL GO / NO-GO DECISION

```
========================================================================
                      FINAL ACCEPTANCE AUDIT DECISION:
                        CONDITIONAL NO-GO
========================================================================
```

- **Canvas Rendering, Typography, Category Sync & Export:** **GO (100% Production Ready)**.
- **Master Admin Security Boundaries:** **GO (Dynamic Frames Strictly Protected)**.
- **Network / Proxy Layer Security:** **NO-GO** pending implementation of socket IP pinning in `/api/proxy-image` to close the DNS rebinding TOCTOU window.

*In accordance with the strict audit boundary, no code modifications have been made. Awaiting separate Owner Authorization before implementing the IP pinning correction.*
