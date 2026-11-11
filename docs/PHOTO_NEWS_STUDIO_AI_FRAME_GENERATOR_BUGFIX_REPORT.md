# AI NEWS MAKER / BREAKING NEWS WALA
## PHOTO NEWS STUDIO & AI PHOTO FRAME GENERATOR
### MASTER BUG FIX & CANVAS RENDERING REPORT

**Date:** 11 November 2026  
**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Production Target:** `https://www.ainewsmaker.online`  
**GitHub Repository:** `https://github.com/breakingnewswala/AI-NEWS-MAKER-APP`  
**Active Working Branch:** `fix/photo-news-studio-frame-generator-bugs`  
**Base Commit:** `b453493`  

---

## 1. Executive Summary

This report documents the investigation, root-cause analysis, implementation, and empirical verification of all seven core bugs identified across **Photo News Studio** and **AI Photo Frame Generator (Photo Frame Pro)**.

The primary architectural mandate:
$$\text{Canvas Marking} \equiv \text{Dual Live Preview} \equiv \text{Final Graphic Export}$$
has been enforced across all modules. All user-configured design settings—including Devanagari typography, line wrapping, date rotation, watermark rotation, callout dimensions, and catalog categorization—now preserve complete identity throughout the entire pipeline.

| Bug # | Issue Description | Modules Impacted | Status |
|:---:|:---|:---|:---:|
| **Bug 1** | Default headline text was sample political news; needed exact Hindi instructional text with min 70px font | `App.tsx`, `canonicalLayoutEngine.ts`, `DynamicFrameGeneratorModal.tsx` | **PASS** |
| **Bug 2** | Refresh button failed to reset photo preview back to empty placeholder | `App.tsx`, `CardPreview.tsx`, `CardEditor.tsx` | **PASS** |
| **Bug 3** | Date and watermark rotation (0°, 90°, 180°, 270°) missing in Dual Live Preview & final graphic export | `CanvasExporter.ts`, `DynamicFrameGeneratorModal.tsx`, `CardPreview.tsx` | **PASS** |
| **Bug 4** | Headline font size distorted by `* 2.1` multiplier & 3-line layout collapsed to 2 lines | `canonicalLayoutEngine.ts`, `DynamicFrameGeneratorModal.tsx` | **PASS** |
| **Bug 5** | Full News Description / Callout box lacked width/height/spacing/font controls and lock state | `DynamicFrameGeneratorModal.tsx`, `types/dynamicFrame.ts`, `CanvasExporter.ts` | **PASS** |
| **Bug 6** | AI generated `TEST_FRAMES` appeared in Graphic Template Control but missing from Photo News Studio | `CardEditor.tsx`, `dynamicFramesManager.ts` | **PASS** |
| **Bug 7** | Font family & font size duplicated and disconnected between Step 6 and Step 8 | `DynamicFrameGeneratorModal.tsx` | **PASS** |

---

## 2. Root Cause of Each Bug

### Bug 1 — Default Headline Text & Min 70px Font Size
- **Root Cause:** `CANONICAL_DEFAULT_HEADLINE` in `src/App.tsx` (line 45) was hardcoded to:  
  `'मध्य प्रदेश में ऐतिहासिक फैसला:\nकैबिनेट बैठक में बड़े प्रस्तावों को\nमिली अंतिम मंजूरी'`  
  In addition, `canonicalLayoutEngine.ts` scaled default text down to `minFontSize` (36–38px), making the initial instructional prompt small and non-prominent.

### Bug 2 — Refresh Button Failed to Reset Photo Preview
- **Root Cause:** When the user clicked "रिफ्रेश", `handleResetCard()` cleared `card.images.main`, but left `(card as any).photoUrl`, `(card as any).testSamplePhotoUrl`, `card.watermarkImage`, and `card.customWatermarkUrl` untouched in the state. In `CardPreview.tsx`, `resolvedMainRaw` checked `card.images?.main || card.photoUrl || card.testSamplePhotoUrl`. Because the latter fields were non-empty, `hasUploadedPhoto` evaluated to `true`, retaining the uploaded image instead of rendering `"फोटो जोड़ने के लिए स्टेप 4 पर जाएँ"`.

### Bug 3 — Date and Watermark Rotation Missing in Final Graphic & Live Preview
- **Root Cause:**
  1. In `DynamicFrameGeneratorModal.tsx` (line 4971), Dual Live Preview B checked only `(headerConfig.dateRotation ?? 270) === 270 ? 'rotate(-90deg) origin-left-top' : undefined`. If rotation was 90°, 180°, or 0°, it evaluated to `undefined` (straight horizontal).
  2. In `CanvasExporter.ts` (lines 6262 and 6287), standard templates hardcoded `Math.PI / 2` and `-Math.PI / 2`, ignoring `card.dateRotation` and `card.watermarkRotation`.
  3. In `handleDownloadTestPreview` (lines 1845–1855), date translation applied top-left origin instead of center-pivot `(dx + dw / 2, dy + dh / 2)`.

### Bug 4 — Headline Font Size and 3-Line Configuration Mismatch
- **Root Cause:**
  1. In `canonicalLayoutEngine.ts` (line 539), `options.userFontSize` was multiplied by 2.1 (`Math.round(options.userFontSize * 2.1)`). When the Frame Generator passed `userFontSize: 72`, it became `151.2px` and was clamped by `maxFontSize: 86px`, distorting the intended typography.
  2. In `DynamicFrameGeneratorModal.tsx` (line 4875), Dual Live Preview B rendered headline text inside an unscaled HTML `<p>` element with hardcoded `12px` font size and `line-clamp-3`. Because `12px` was disproportionately small in the preview box, 3-line headlines naturally collapsed into 2 lines.

### Bug 5 — Full News Description / Callout Box Sizing & Locking
- **Root Cause:**
  1. The Callout layer lacked explicit width, height, font size, line spacing, alignment, and lock controls in the Canvas Marking inspector panel.
  2. `FullStoryCalloutConfig` lacked the `isLocked?: boolean` persistence field.
  3. In `CanvasExporter.ts` (line 1812), the callout background and text were drawn without canvas rotation (`cRot`), ignoring user orientation adjustments.

### Bug 6 — AI Generated `TEST_FRAMES` Missing in Photo News Studio
- **Root Cause:** In `CardEditor.tsx` (line 99), `buildUnifiedFrameOptions` filtered frames using:  
  `if (df.publicationStatus !== 'published') return false;`  
  When an admin saves a frame in category `TEST_FRAMES`, `DynamicFrameGeneratorModal.tsx` sets `publicationStatus: 'draft'`. Consequently, line 99 discarded every test frame before the category filter could evaluate it. Furthermore, line 116 restricted test frames to `isMaster` only, excluding standard `admin` accounts.

### Bug 7 — Font Family & Size Duplicated Between Step 6 and Step 8
- **Root Cause:** Step 6 (`text_quote_config`) updated `textSlots[0].fontFamily` and `textSlots[0].fontSize`, but did not update `typographyFontFamily` and `typographyFontSize`. Step 8 (`plan_publish`) presented separate independent `<select>` and `<input>` fields referencing `typographyFontFamily`. Upon clicking "Save & Publish", `typographyFontFamily` was non-empty and silently overwrote `textSlots[0].fontFamily`.

---

## 3. Files Modified

| File Path | Description of Changes |
|:---|:---|
| `src/types/dynamicFrame.ts` | Added `isLocked?: boolean` to `FullStoryCalloutConfig`. |
| `src/App.tsx` | Restored `CANONICAL_DEFAULT_HEADLINE` exact text; updated `handleResetCard()` to purge all photo and watermark URLs; added `handleRefreshPreview()` preserving user entered headline and templates. |
| `src/lib/canonicalLayoutEngine.ts` | Enforced min 70px font size for default headline; normalized `userFontSize` (`>= 45` treated as canvas pixels, `< 45` scaled from slider units); ensured 3-line maximum line constraint is strictly honored. |
| `src/components/DynamicFrameGeneratorModal.tsx` | Replaced political headlines with default instructional Hindi text; unified Step 6 & Step 8 typography synchronization; added rotation buttons (0°, 90°, 180°, 270°) to Watermark layer; added Callout box width/height/font/spacing/lock controls; aligned Dual Live Preview to render canonical layout lines. |
| `src/lib/CanvasExporter.ts` | Applied center-pivot rotation (`card.dateRotation ?? df.dateRotation`, `card.watermarkRotation ?? wm.rotation`) to date stamp, watermark, and callout layers across dynamic and standard templates. |
| `src/components/CardEditor.tsx` | Allowed `publicationStatus: 'draft'` for `isTest` frames in `buildUnifiedFrameOptions`; enabled `TEST_FRAMES` tab and template card rendering for `isMaster || isAdmin`. |
| `src/components/CardPreview.tsx` | Connected `card.dateRotation` and `card.watermarkRotation` to standard template previews; verified empty-photo placeholder rendering. |
| `web_studio/src/*` | Synchronized 100% byte-for-byte with root `src/` files via dual-directory parity build. |

---

## 4. Remediation Details

### 4.1 Refresh Button Fix (Bug 2)
```typescript
// src/App.tsx -> handleRefreshPreview
const handleRefreshPreview = () => {
  setCard((prev) => {
    const currentHeadline = prev.headline?.trim() || '';
    const isHeadlineEmpty =
      !currentHeadline ||
      currentHeadline === CANONICAL_DEFAULT_HEADLINE;

    return {
      ...prev,
      headline: isHeadlineEmpty ? CANONICAL_DEFAULT_HEADLINE : prev.headline,
      formattedHeadline: isHeadlineEmpty ? CANONICAL_DEFAULT_HEADLINE : prev.formattedHeadline,
      images: { main: '', second: '', third: '', fourth: '' },
      photoUrl: '',
      testSamplePhotoUrl: '',
      watermarkImage: undefined,
      customWatermarkUrl: undefined,
      extractedArticlePhotos: [],
    };
  });
  window.dispatchEvent(new CustomEvent('ai_news_studio_reset_preview'));
  showToast('🔄 प्रीव्यू सफलतापूर्वक रिफ्रेश हुआ!');
};
```
- **State Preservation Verified:** Selected frame design, template ID, aspect ratio, headline font family, headline font size, date rotation, watermark rotation, layer coordinates, and user branding are preserved intact.
- **Empty State Restored:** `CardPreview.tsx` immediately renders the blank photo area displaying:  
  `"फोटो जोड़ने के लिए स्टेप 4 पर जाएँ"`

### 4.2 Default Headline Fix (Bug 1)
- **Exact Hindi Text:**  
  `"कृपया स्टेप 3 (हेडलाइन) में जाकर अपनी मुख्य खबर का शीर्षक दर्ज करें..."`
- **Minimum Font Size:** Guaranteed at $\ge 70\text{px}$ in `canonicalLayoutEngine.ts`.
- **User Protection:** If the user has typed or edited a custom headline, refreshing the preview retains the user's text and never overwrites it.

### 4.3 Date Rotation Fix (Bug 3)
- Rotations of 0°, 90°, 180°, and 270° are supported and rendered identically across Canvas Marking, Dual Live Preview B, and CanvasExporter:
```typescript
// CanvasExporter.ts & DynamicFrameGeneratorModal.tsx
const dateRotDeg = card.dateRotation ?? df.headerConfig.dateRotation ?? 270;
ctx.save();
ctx.translate(dx + dw / 2, dy + dh / 2); // Center-pivot translation
ctx.rotate((dateRotDeg * Math.PI) / 180);
ctx.fillText(card.dateStr || getFormattedHindiDate(), 0, 0);
ctx.restore();
```

### 4.4 Watermark Rotation Fix (Bug 3)
- Added 0°, 90°, 180°, and 270° angle selector buttons to the Canvas Marking layer properties panel.
- Verified in `CanvasExporter.ts` and `CardPreview.tsx` that `card.watermarkRotation` is applied with center-pivot transformation.

### 4.5 Headline Typography & 3-Line Layout Fix (Bug 4)
- **Font Size Normalization:**
```typescript
const normalizedUserFontSize = options.userFontSize
  ? (options.userFontSize >= 45 ? options.userFontSize : Math.round(options.userFontSize * 2.15))
  : undefined;
```
- **Dual Live Preview Line Parity:** Preview B computes `computeCanonicalHeadlineLayout` on the 1080px base dimensions and renders the resulting lines with proportional scale `previewScale = 280 / 1080`, guaranteeing that 3 lines in the editor render as 3 lines in preview and export.

### 4.6 Full News Description / Callout Resize & Lock Fix (Bug 5)
- Added layer controls for Width, Height, X, Y, Font Size, Line Spacing (`lineHeight`), Alignment (`left`, `center`, `right`), and Lock toggle.
- When `isLocked` is toggled ON:
  - Dragging and resizing on the canvas are prevented.
  - Locked dimensions persist in `df.fullStoryCalloutConfig`.
  - `CanvasExporter.ts` respects the exact locked dimensions and rotation during final export.

### 4.7 `TEST_FRAMES` Catalog Synchronization Fix (Bug 6)
```typescript
// src/components/CardEditor.tsx -> buildUnifiedFrameOptions
if (df.publicationStatus !== 'published' && !isTest) return false;
if (isTest && !(isMaster || isAdmin)) return false;
```
- Test frames in `draft` status are permitted for admin/master testing.
- `frameCategoryItems` unshifts `{ id: 'TEST_FRAMES', label: 'TEST_FRAMES', badge: '${testCount}' }` for `isMaster || isAdmin`.
- Photo News Studio now displays all newly generated test frames identically to Graphic Template Control.

### 4.8 Step 6 and Step 8 Font Synchronization Fix (Bug 7)
- In Step 6 (`text_quote_config`), changes to `slot.fontFamily` or `slot.fontSize` automatically call `setTypographyFontFamily(val)` and `setTypographyFontSize(val)`.
- In Step 8 (`plan_publish`), duplicate editable inputs have been replaced with a synchronized summary card displaying:
  - **फ़ॉन्ट फ़ैमिली:** `Noto Sans Devanagari`
  - **फ़ॉन्ट साइज़:** `72px`
  - **अधिकतम लाइन्स:** `3 लाइन्स (मैक्स)`
  - **स्टेटस बैज:** `✓ स्टेप 6 से सिंक्रोनाइज़्ड`
- Eliminates duplicate state and guarantees 100% typography consistency upon publish.

---

## 5. Automated Test Results

### 5.1 Master Bug Fix Suite (`test_master_photo_studio_frame_fixes.cjs`)
```
====================================================
🧪 Starting Photo News Studio & AI Frame Generator Tests
====================================================

✅ [PASS] Test 1: Bug 1: CANONICAL_DEFAULT_HEADLINE is exact required Hindi instructional text
✅ [PASS] Test 2: Bug 1: canonicalLayoutEngine enforces minimum 70px font size for default headline
✅ [PASS] Test 3: Bug 2: handleRefreshPreview resets photos without clearing headline or template
✅ [PASS] Test 4: Bug 2: CardPreview renders empty-photo instruction when no photo is active
✅ [PASS] Test 5: Bug 3: CanvasExporter and CardPreview respect date and watermark rotation (0, 90, 180, 270)
✅ [PASS] Test 6: Bug 4: canonicalLayoutEngine normalizes userFontSize without 2.1x distortion for >=45px
✅ [PASS] Test 7: Bug 4: DynamicFrameGeneratorModal Dual Live Preview renders exact canonicalLayout lines
✅ [PASS] Test 8: Bug 5: DynamicFrame and FullStoryCalloutConfig support isLocked and full layer controls
✅ [PASS] Test 9: Bug 6: CardEditor allows draft TEST_FRAMES and shows TEST_FRAMES catalog for admin/master
✅ [PASS] Test 10: Bug 7: Step 6 typography changes sync directly to Step 8 without duplicate independent state
✅ [PASS] Test 11: Parity: Root and web_studio files have 100% byte-for-byte synchronization

====================================================
📊 Summary: 11 of 11 tests passed
====================================================
🎉 ALL 11 TEST SUITES PASSED FLAWLESSLY!
```

### 5.2 Canvas Transformation & Export Tracer (`test_canvas_export_simulation.cjs`)
```
====================================================
🎨 Starting Canvas Export & Transformation Tracer
====================================================

✅ Verified Date Stamp export applies exact 0° rotation
✅ Verified Watermark export applies exact 0° rotation
✅ Verified Date Stamp export applies exact 90° rotation
✅ Verified Watermark export applies exact 90° rotation
✅ Verified Date Stamp export applies exact 180° rotation
✅ Verified Watermark export applies exact 180° rotation
✅ Verified Date Stamp export applies exact 270° rotation
✅ Verified Watermark export applies exact 270° rotation
✅ Verified Callout Box export applies exact locked X, Y, W, H and font size

====================================================
🎉 ALL EXPORT & TRANSFORMATION TESTS PASSED EMPIRICALLY!
====================================================
```

### 5.3 Full Production Functional Regression Suite (`test_phase3_functional_regression.cjs`)
```
==================================================================
🏁 FUNCTIONAL REGRESSION TEST SUITE PASSED: 21/21 SUCCESSFUL
==================================================================
- Google Sign-In & Token Security: PASS
- Master & Sub-Admin Roles: PASS
- Reporter Isolation (403): PASS
- PBKDF2 Password Hashing: PASS
- Newsroom, RSS & Publishing: PASS
- Photo News Studio & Video Studio: PASS
- Dual-Secret Rotation Grace Period & Session Refresh: PASS
```

### 5.4 Production Build & Sync Verification (`npm run build`)
- Vite client build: `✓ built in 7.95s`
- Esbuild server bundling: `dist/server.cjs (1.7MB)`
- Root to `web_studio/` synchronization: 100% byte-for-byte match.
- Exit code: `0`.

---

## 6. Before-and-After Verification Matrix

| Feature | Before Remediation | After Remediation | Empirical Evidence |
|:---|:---|:---|:---|
| **Default Headline** | `'मध्य प्रदेश में ऐतिहासिक फैसला:...'` (cabinet news) | `'कृपया स्टेप 3 (हेडलाइन) में जाकर अपनी मुख्य खबर का शीर्षक दर्ज करें...'` | `App.tsx:45`, min 70px in `canonicalLayoutEngine.ts` |
| **Preview Refresh** | Retained old photo/watermark due to stale `photoUrl`/`testSamplePhotoUrl` | Stale URLs purged; restores `"फोटो जोड़ने के लिए स्टेप 4 पर जाएँ"` | `handleRefreshPreview()` in `App.tsx:2220` |
| **Headline User Input** | Could be wiped on full session reset | Preserved on preview refresh | `isHeadlineEmpty ? DEFAULT : prev.headline` |
| **Date Rotation** | Appeared straight in Dual Live Preview at 90°/180°; standard export hardcoded to 90° | 0°, 90°, 180°, 270° center-pivot rotation in preview & CanvasExporter | `CanvasExporter.ts:1786`, `Modal:5128` |
| **Watermark Rotation** | No angle buttons in layer inspector; export hardcoded to 270° | 0°, 90°, 180°, 270° buttons in inspector; applied in CanvasExporter | `CanvasExporter.ts:1852`, `Modal:3840` |
| **Dual Live Preview Layout** | Unscaled `<p>` with 12px text; 3 lines collapsed to 2 lines | Computed canonical layout lines with preview scale; exact 3 lines rendered | `Modal:4980-5020` |
| **Callout Box Controls** | No box size/spacing/font controls; no lock toggle | W, H, X, Y, font size, spacing, alignment controls & `isLocked` toggle | `types/dynamicFrame.ts:305`, `Modal:3880` |
| **`TEST_FRAMES` Catalog** | Draft test frames dropped by `publicationStatus !== 'published'` | Test frames allowed for admin/master; visible in Studio catalog | `CardEditor.tsx:99, 589, 1661` |
| **Step 6 & 8 Font Fields** | Duplicate independent fields; Step 8 silently overwrote Step 6 | Synchronized; Step 8 displays Step 6 typography read-only | `Modal:4545, 5365` |

---

## 7. Remaining Issues & Blockers

- **Zero Remaining Code Issues:** All seven reported bugs have been addressed at the root-cause level with comprehensive unit tests and empirical validation.
- **Git Branch Status:** All changes reside cleanly on feature branch `fix/photo-news-studio-frame-generator-bugs`.
- **Pre-Deployment Safety:** In accordance with Project Restrictions, no changes have been pushed to GitHub `main` or deployed to Firebase App Hosting.

---

## 8. Release Readiness & Production Sign-Off Recommendation

The codebase on branch `fix/photo-news-studio-frame-generator-bugs` is stable, secure, regression-tested, and ready for owner review.

**Recommended Next Step:**
1. User reviews this report and verifies the implementation.
2. User authorizes merging `fix/photo-news-studio-frame-generator-bugs` into `main` or creating a GitHub Pull Request.
3. Automated Firebase App Hosting CI/CD deploys the verified commit to production.

---
*Report authored by Senior Full-Stack & Canvas Rendering Specialist on 11 November 2026.*
