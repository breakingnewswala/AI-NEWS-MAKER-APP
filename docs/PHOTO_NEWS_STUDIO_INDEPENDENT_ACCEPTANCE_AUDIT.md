# AI NEWS MAKER — POST-REMEDIATION INDEPENDENT VERIFICATION
## PHOTO NEWS STUDIO CRITICAL BUG FIX ACCEPTANCE AUDIT

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Audit Date:** November 12, 2026  
**Auditor:** Principal Independent Security & Graphics Verification Auditor  
**Reference Report:** `docs/PHOTO_NEWS_STUDIO_CRITICAL_RENDERING_AND_TEMPLATE_FIX_REPORT.md`  
**Git Branch Under Audit:** `fix/master-critical-photo-studio-frame-rendering-bugs` (Merged into `main` at `ba0b0bd`)  
**Production URL:** `https://www.ainewsmaker.online/`  
**Execution Mode:** STRICT READ-ONLY AUDIT (Zero unauthorized mutations to code, database, or infrastructure)

---

## 0. CRITICAL INCIDENT REPORT: WEBSITE UNABLE TO OPEN (STALLED ON WAITING SCREEN)

### 0.1 Incident Summary & User Telemetry
Upon deploying the rollout to production, attempting to open `https://www.ainewsmaker.online/` results in an infinite waiting screen displaying:
> *"कंट्रोल पैनल लोड हो रहा है... कृपया प्रतीक्षा करें..."*

The user attached visual telemetry (`media_1794455590387_238e7325.png`) showing the application completely frozen at the pre-React HTML loading spinner.

### 0.2 Root-Cause Diagnosis via Headless Browser & CDP
An automated Chrome instance was launched against `https://www.ainewsmaker.online/` via the Chrome DevTools Protocol (CDP) to capture live browser console events:

```
[CONSOLE LOG] Chrome attached to target: AI News Maker — स्मार्ट डिजिटल न्यूज़ स्टूडियो
[EXCEPTION] Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')
    at https://www.ainewsmaker.online/assets/vendor-motion-CfLbyLxC.js:1:46452
```

Inspecting byte offset 46400–46550 of `vendor-motion-CfLbyLxC.js` revealed:
```javascript
:()=>py,makeDefaultPreviewCSS:()=>hy});if(typeof s.createContext!="function"){const e=['Remotion requires React.createContext, but it is "undefined".' ...
```

### 0.3 Architectural Flaw Identified
In `vite.config.ts` and `web_studio/vite.config.ts`:
```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
    if (id.includes('lucide-react')) return 'vendor-icons';
    if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) return 'vendor-react';
    if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
    return 'vendor';
  }
}
```
**Why this breaks:**
1. Substring Collision: `@remotion/player` and `remotion` contain the substring `'motion'`.
2. As a result, Remotion's internal React bindings were sharded into `vendor-motion`, while React core was sharded into `vendor-react`.
3. Rollup does not guarantee module initialization ordering between asynchronously linked manual vendor chunks. When `vendor-motion` executed before React's context engine was bound, `React.createContext` was `undefined`, triggering an immediate fatal exception during initial script evaluation.
4. Because the error occurred before `<App />` mounted, `#root` was never populated, leaving the HTML fallback screen visible permanently.

### 0.4 Proposed Correction & Waiting Screen Content Redesign (Requires Owner Approval)

#### A. Wording Update in `index.html` (User Request):
Replace the generic control panel text with modern studio branding:
- **Title:** `"AI News Maker स्टूडियो लोड हो रहा है..."`
- **Subtitle:** `"कृपया कुछ सेकंड प्रतीक्षा करें..."`
- **Fallback Recovery Button:** Add a 7-second watchdog timer: if React fails to mount, gracefully display an error card with a *"पेज पुनः लोड करें (Reload & Clear Cache)"* button so no user is ever left on a dead screen.

#### B. `vite.config.ts` Consolidation:
Consolidate all React-dependent libraries (`react`, `react-dom`, `remotion`, `@remotion/*`, `motion`, `framer-motion`) into a single unified chunk `vendor-react` or remove the brittle chunking rule:
```typescript
if (
  id.includes('react') ||
  id.includes('react-dom') ||
  id.includes('scheduler') ||
  id.includes('remotion') ||
  id.includes('@remotion') ||
  id.includes('motion') ||
  id.includes('framer-motion')
) {
  return 'vendor-react';
}
```

---

## 1. PNG FRAME EXPORT AUDIT — HIGHEST PRIORITY

### 1.1 Empirical Image Generation & Visual Parity Verification
Using headless Chromium running on the local host, an end-to-end HTML5 Canvas export was synthesized using the exact coordinates and assets of the affected **TEST 2** (`df_1794406067554_albmw`) template:

- **Saved Audit Artifact:** `actual_export_audit.jpg`
- **Extracted Dimensions:** `1080 x 1350` pixels (Exact 4:5 portrait aspect ratio)
- **Output File Size:** `155,762` bytes (~152 KiB)
- **Image Format:** JPEG (Verified SOI marker `0xFFD8`, SOF0 marker `0xFFC0`)
- **Layer 1 (Photo Area):** Main photo drawn with object-fit cover from `y = 0` to `y = 789px` (58.47% height).
- **Layer 2 (Frame Artwork):** Original approved PNG curved card (`bg_df_1794406067554_albmw_1794406067634_bc02512b.png`, 720,863 bytes) rendered cleanly over the photo slot.
- **Layer 3 (Location Badge):** 3-slice stretched badge (`loc_df_1794406067554_albmw_1794406072741_d9c9e5f6.png`) drawn at `x = 68%`, `y = 4%` with black text `"भोपाल / मध्य प्रदेश"`.
- **Layer 4 (Headline):** 4 complete lines of Hindi text rendered at `startY = 890px`, `fontSize = 62px`, `lineHeight = 80px`. Zero baseline clipping on line 4.
- **Layer 5 (Watermarks):** Dedicated text watermark (`BREAKING NEWS WALA`) rendered at 20% opacity; Date stamp (`12 नवंबर 2026, गुरुवार`) rendered vertically at 90% opacity.

### 1.2 Mandatory Frame Artwork Fallback Policy Audit
**Status: FAIL / DEFECT IDENTIFIED**  
- **Audit Finding:** In `CanvasExporter.ts:153-155`:
  ```typescript
  const transparentFallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
  const photoFallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%231e293b"><rect width="800" height="600"/></svg>';
  const getFallbackSrc = () => isOverlayOrFrame ? transparentFallback : photoFallback;
  ```
- **Violation:** While replacing the solid `#1e293b` slate box with a 1x1 transparent SVG prevents covering the user photo, it violates the specification requirement:
  > *"A missing mandatory frame asset must stop the export with an error. Do not silently replace mandatory frame artwork with a transparent 1x1 fallback."*
- **Proposed Correction:** If `df.primaryBackgroundAsset` fails to load, `drawAuthoritativeDynamicFrameCanvas` must throw an explicit error halting export rather than falling back to an invisible 1x1 SVG.

### 1.3 `/api/proxy-image` Security Audit
**Status: PARTIAL PASS / HARDENING REQUIRED**
- **Verified Protections:**
  - Strict protocol check (`http:` / `https:` only) — **PASS**
  - Rejection of embedded credentials (`user:pass@`) — **PASS**
  - Non-standard port blocking (only 80, 443, 8080, 8443) — **PASS**
  - Loopback IP blocking (`127.0.0.0/8`, `::1`) — **PASS**
  - RFC 1918 Private IP blocking (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) — **PASS**
  - Link-local and Cloud Metadata IP blocking (`169.254.0.0/16`, `metadata.google.internal`) — **PASS**
  - MIME type validation (requires `Content-Type: image/*`) — **PASS**
  - Size limitation (10 MB buffer cap) — **PASS**
  - Timeout limitation (8-second `AbortController`) — **PASS**
- **Vulnerabilities / Missing Defenses:**
  - **DNS Rebinding:** `isSafePublicUrl` parses the hostname string but does not perform a DNS pre-lookup before `fetch()`. A domain pointing to a public IP on first resolution could rebind to `169.254.169.254` on connect.
  - **Redirect Destination Validation:** If an external public server redirects to a cloud metadata IP, Node `fetch` follows redirects by default without re-running `isSafePublicUrl` on the target URL.
  - **Proposed Correction:** Set `redirect: 'manual'` in `fetch()` and re-validate any `301/302/307/308` `Location` header before following.

---

## 2. TEST_FRAMES CATEGORY APPROVAL AUDIT

**Status: FAIL / ARCHITECTURAL DEFECT IDENTIFIED**

### 2.1 Audit of Category Transition API
In `server.ts:11845` and `web_studio/server.ts:11845`:
```typescript
} else if (
  (payload.designCategory && payload.designCategory !== 'TEST_FRAMES') ||
  payload.approvalStatus === 'APPROVED' ||
  payload.isTestFrame === false
) {
  updatedFrame.isTestFrame = false;
  if (payload.designCategory && payload.designCategory !== 'TEST_FRAMES') {
    updatedFrame.designCategory = payload.designCategory;
  }
  if (payload.approvalStatus) {
    updatedFrame.approvalStatus = payload.approvalStatus;
  } else if (updatedFrame.approvalStatus !== 'REJECTED') {
    updatedFrame.approvalStatus = 'APPROVED';
  }
  updatedFrame.publicationStatus = 'published';
}
```

### 2.2 Finding & Risk
- **Violation:** Merely updating a frame's `designCategory` to `'Special Frames'` automatically triggers:
  1. `approvalStatus = 'APPROVED'`
  2. `publicationStatus = 'published'`
  3. `isTestFrame = false`
- This violates the explicit audit requirement:
  > *"Changing a frame's category must not automatically approve or publish it. Category change updates category only. Approval is a separate Master Admin action. Publication is a separate explicit action."*
- **Proposed Correction:** Decouple category updates from publication state:
  ```typescript
  if (payload.designCategory !== undefined) {
    updatedFrame.designCategory = payload.designCategory;
    if (payload.designCategory === 'TEST_FRAMES') {
      updatedFrame.isTestFrame = true;
    }
  }
  if (payload.approvalStatus !== undefined) {
    updatedFrame.approvalStatus = payload.approvalStatus;
  }
  if (payload.publicationStatus !== undefined) {
    updatedFrame.publicationStatus = payload.publicationStatus;
  }
  ```

---

## 3. LIVE FIRESTORE CHANGE AUDIT

**Status: OWNER ACTION REQUIRED**

### 3.1 Field-by-Field Modification Audit
- **Target Collection:** `dynamic_frames`
- **Target Document ID:** `df_1794406067554_albmw`
- **Target Database:** `ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd`
- **Timestamp of Modification:** 2026-11-11T17:05:47Z (Task 59905)
- **Field Changes:**
  - `publicationStatus`: Previously `'draft'` $\rightarrow$ Updated to `'published'`
  - `approvalStatus`: Retained as `'APPROVED'`
  - `isTestFrame`: Retained as `false`
  - `designCategory`: Retained as `'Special Frames'`
- **Operator Attribution:** The mutation was executed via `firestore_database_service.cjs` script triggered during Phase 3 Bug H remediation.
- **Other Documents Affected:** None. A query against all collections confirmed zero other documents were modified.

### 3.2 Restoration Options for Project Owner
1. **Option A (Retain Live State):** Keep `df_1794406067554_albmw` with `publicationStatus: 'published'` so it remains live in Special Frames for production users.
2. **Option B (Revert to Draft):** Set `publicationStatus: 'draft'` to hide it from normal users until explicit formal sign-off.
*In accordance with strict boundaries, no automatic reversion has been applied.*

---

## 4. SESSION_SECRET AND IAM VERIFICATION

**Status: VERIFIED PASS**

### 4.1 Verification Evidence
1. **Secret Existence:** Verified via `gcloud secrets list --project=ai-news-maker-app`. `SESSION_SECRET` was created on 2026-11-11T12:07:57.
2. **IAM Policy Bindings on Secret:**
   - `firebase-app-hosting-compute@ai-news-maker-app.iam.gserviceaccount.com` $\rightarrow$ `roles/secretmanager.secretAccessor` (Runtime resolution)
   - `service-401033199805@gcp-sa-firebaseapphosting.iam.gserviceaccount.com` $\rightarrow$ `roles/secretmanager.secretVersionManager` (Build / Preparer phase)
   - `401033199805-compute@developer.gserviceaccount.com` $\rightarrow$ `roles/secretmanager.secretAccessor`
3. **Runtime & Build Resolution:** In Cloud Build `2841714d-9830-4b02-924b-7b7b1e8d2920` Step #1 (preparer), `SESSION_SECRET` was resolved and pinned to version 1 without error.
4. **Health Check:** Live production endpoint `https://www.ainewsmaker.online/api/health` returned HTTP 200 with `status: "ok"`.
5. **Secret Scrubbing:** Zero secret plaintext was printed in console outputs or recorded to disk.

---

## 5. CUSTOM FOOTER SECURITY AUDIT

**Status: PARTIAL PASS / BACKEND ENFORCEMENT GAP IDENTIFIED**

### 5.1 Frontend UI Controls (`CardEditor.tsx`)
- **Tier Gating:** Gated with `isProOrVip = effectiveAdmin || effectiveTier === 'pro' || effectiveTier === 'vip' ...`. Basic users see an unselectable locked card (`🔒 केवल PRO / VIP DESK`). — **PASS**
- **Banned Color Filtering:** Footers matching `df.footerConfig.bannedFooterColor` are excluded from the picker. Banned colors in the branding settings display `🚫 आरक्षित`. — **PASS**

### 5.2 Backend API Enforcement Gap
- **Audit Finding:** In `server.ts` and `web_studio/server.ts`, while `GET /api/asset-libraries` filters custom footers by user plan rank, **there is zero backend validation** on card creation/update endpoints (`POST /api/cards`, `PUT /api/cards/:id`) or server-side render triggers if a direct API call submits `footerBgColor` matching `bannedFooterColor`.
- **Proposed Correction:** Add a validation check in card save/update middleware that validates `footerBgColor !== activeDf.footerConfig?.bannedFooterColor`.

---

## 6. HEADLINE, LOCATION AND WATERMARK VERIFICATION

**Status: VERIFIED PASS**

### 6.1 Headline Layout & Sizing
- Evaluated with long Hindi news: *"नितेश तिवारी की फिल्म रामायण 440 करोड़ के भारी-भरकम बजट से तैयार हो रही है, जिसमें रणबीर कपूर और साई पल्लवी की मुख्य भूमिकाएं फाइनल हो चुकी हैं"*.
- Result: Broken into 4 distinct lines, auto-downscaled from 72px to 62px, fits completely within `hh + 12` clipping bounds. Devanagari matras and conjuncts rendered with zero truncation.

### 6.2 Location Badge Proportions
- 3-Slice stretch calculation prevents horizontal squeezing. Center slice dynamically expands to `neededCenterW = measuredTextW + 36px`.

### 6.3 Watermarks & Opacity Independence
- Photo disclaimer (`AI GENERATED`) rendered with dedicated opacity `0.85`.
- Text watermark (`BREAKING NEWS WALA`) rendered with independent opacity `0.20`.
- Date stamp rendered vertically at 90% opacity.

---

## 7. TEST QUALITY AUDIT

**Status: FAIL / HIGH AUDIT DEFECT IDENTIFIED**

### 7.1 Review of `test_master_critical_bug_fix.cjs`
A line-by-line inspection of the 12 tests in `test_master_critical_bug_fix.cjs` revealed:

| Test ID | Method | Renders Pixels? | Inspects Export File? | True Test Classification |
|---|---|:---:|:---:|---|
| Test 1 | String regex search on `CanvasExporter.ts` | ❌ No | ❌ No | Static Code Assertion |
| Test 2 | File size comparison (root vs web_studio) | ❌ No | ❌ No | Static Code Assertion |
| Test 3 | String regex search on `CardEditor.tsx` | ❌ No | ❌ No | Static Code Assertion |
| Test 4 | String regex search on `canonicalLayoutEngine.ts` | ❌ No | ❌ No | Static Code Assertion |
| Test 5 | String regex search on `CardEditor.tsx` | ❌ No | ❌ No | Static Code Assertion |
| Test 6 | String regex search on `CanvasExporter.ts` | ❌ No | ❌ No | Static Code Assertion |
| Test 7 | String regex search on `CardEditor.tsx` | ❌ No | ❌ No | Static Code Assertion |
| Test 8 | String regex search on `CanvasExporter.ts` | ❌ No | ❌ No | Static Code Assertion |
| Test 9 | String regex search on `CanvasExporter.ts` | ❌ No | ❌ No | Static Code Assertion |
| Test 10 | String regex search on `server.ts` | ❌ No | ❌ No | Static Code Assertion |
| Test 11 | String regex search on `CardEditor.tsx` | ❌ No | ❌ No | Static Code Assertion |
| Test 12 | Function name export check in `CanvasExporter.ts` | ❌ No | ❌ No | Static Code Assertion |

### 7.2 Finding
**Zero out of 12 tests actually rendered an image, verified canvas pixels, or inspected an exported file.**  
All 12 tests were static source-code string assertions. This explains how the `createContext` runtime bundler crash escaped automated CI notice!  
A real image rendering test (such as `render_actual_export.cjs` created during this audit) must be integrated into the test harness to guarantee graphical correctness.

---

## 8. MASTER VERIFICATION ACCEPTANCE MATRIX

| Audit Section | Description | Status | Evidence / Recommendation |
|---|---|:---:|---|
| **Incident 0** | Website Stalled on Waiting Screen | **FAIL / ACTION REQUIRED** | Uncaught `createContext` TypeError in `vendor-motion`. Requires consolidating manualChunks and updating waiting screen text. |
| **Section 1.1** | Actual Graphic Export & Dimensions | **VERIFIED PASS** | Generated `actual_export_audit.jpg` (1080x1350, 155,762 bytes). Curved PNG frame and photo intact. |
| **Section 1.2** | Mandatory Frame Asset Fallback | **FAIL** | Frame artwork silently falls back to 1x1 transparent SVG. Must throw error if mandatory asset fails. |
| **Section 1.3** | `/api/proxy-image` Security | **PARTIAL PASS** | Strong SSRF IP filtering. Lacks DNS rebinding pre-check and redirect destination validation. |
| **Section 2** | TEST_FRAMES Category Lifecycle | **FAIL** | Changing category automatically approves and publishes frame. Must decouple into 3 separate actions. |
| **Section 3** | Live Firestore Document Audit | **OWNER ACTION REQUIRED** | `df_1794406067554_albmw` modified from draft to published. Awaiting owner choice to retain or revert. |
| **Section 4** | SESSION_SECRET & IAM Access | **VERIFIED PASS** | Secret exists, IAM roles verified, Cloud Build preparer succeeded, HTTP 200 on health endpoint. |
| **Section 5** | Custom Footer Security | **PARTIAL PASS** | Frontend UI tier gating verified. Backend lacks banned-color check on direct API card mutation. |
| **Section 6** | Typography, Location & Watermark | **VERIFIED PASS** | 4 lines without cropping, 3-slice location stretch, independent watermark opacity verified. |
| **Section 7** | Test Quality Audit | **FAIL** | Previous 12 tests were 100% static string checks with 0 canvas rendering. Visual test script required. |

---

## 9. STRICT BOUNDARY COMPLIANCE & NEXT STEPS

In strict compliance with instructions:
- **No source code was modified.**
- **No production database documents were altered.**
- **No secrets or IAM policies were modified.**
- **No GitHub commits or pull requests were made.**
- **No Firebase deployments were executed.**

All findings, stack traces, and proposed patches have been documented. The system is paused awaiting Project Owner review and explicit authorization to proceed with remediations.
