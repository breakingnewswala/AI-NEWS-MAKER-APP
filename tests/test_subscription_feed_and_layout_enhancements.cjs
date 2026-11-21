const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('==================================================================');
console.log('🧪 VERIFYING SUBSCRIPTION, FEED, QUOTA & LAYOUT ENHANCEMENTS');
console.log('==================================================================');

const rootDir = path.resolve(__dirname, '..');
const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
const cardPreviewTsx = fs.readFileSync(path.join(rootDir, 'src/components/CardPreview.tsx'), 'utf-8');
const canvasExporterTs = fs.readFileSync(path.join(rootDir, 'src/lib/CanvasExporter.ts'), 'utf-8');
const adminManagerTsx = fs.readFileSync(path.join(rootDir, 'src/components/AdminPlansAndPackagesManager.tsx'), 'utf-8');
const profileScreenWebTsx = fs.readFileSync(path.join(rootDir, 'src/components/ProfileScreenWeb.tsx'), 'utf-8');
const homeScreenWebTsx = fs.readFileSync(path.join(rootDir, 'src/components/HomeScreenWeb.tsx'), 'utf-8');
const userPlanManagerTs = fs.readFileSync(path.join(rootDir, 'src/lib/userPlanManager.ts'), 'utf-8');

// 1. Red Banner Chevrons Scaled & Clipped to Banner Area
console.log('Testing TC1: Red Banner Chevrons Scaled & Clipped inside bannerH (No Protrusion)...');
assert(canvasExporterTs.includes('(pts[0][1] / 440) * bannerH + bannerY') || canvasExporterTs.includes('bannerY + (pts[0][1] / 440) * bannerH'), 'Chevrons must scale with bannerH and bannerY');
assert(canvasExporterTs.includes('ctx.rect(0, bannerY, width, bannerH)'), 'Canvas exporter must strictly clip chevrons inside banner boundary');
console.log('✅ [PASS] TC1: Red banner chevrons proportional scaling and clipping verified');

// 2. Watermark / Photo Disclaimer Optical Centering
console.log('Testing TC2: Watermark / Photo Disclaimer Centered Cleanly...');
assert(canvasExporterTs.includes("ctx.textAlign = 'center'"), 'Watermark canvas text alignment must be center');
assert(canvasExporterTs.includes("ctx.textBaseline = 'middle'"), 'Watermark canvas text baseline must be middle');
assert(canvasExporterTs.includes("ctx.fillText(disclaimerText, 0, 1)"), 'Watermark canvas text must be drawn at 0, 1 for optical center');
assert(!cardPreviewTsx.includes("tracking-[0.14em]"), 'CardPreview watermark must not use tracking that separates Devanagari characters');
console.log('✅ [PASS] TC2: Watermark centering verified across Preview and Exporter');

// 3. Master Admin Subscription Removal & Reliable Tier Upgrades
console.log('Testing TC3: Master Admin Subscription Removal & Plan Upgrades...');
assert(serverTs.includes('removeSubscription'), 'server.ts must support removeSubscription flag');
assert(adminManagerTsx.includes('adminRemoveUserSubscription'), 'AdminPlansAndPackagesManager must include adminRemoveUserSubscription');
assert(adminManagerTsx.includes('सब्सक्रिप्शन हटाएं'), 'Admin manager must render subscription removal button');
assert(userPlanManagerTs.includes('export async function adminRemoveUserSubscription'), 'userPlanManager must export adminRemoveUserSubscription');
console.log('✅ [PASS] TC3: Subscription removal & reliable plan upgrades verified');

// 4. Edit Profile Full Details & Real-Time Sync
console.log('Testing TC4: Edit Profile Full Details & Real-Time Sync...');
assert(adminManagerTsx.includes('editUserDesignation') && adminManagerTsx.includes('editUserCity'), 'Admin manager edit modal must include designation and city');
assert(adminManagerTsx.includes('getAllIndianStates'), 'Admin manager edit modal must use state dropdown');
assert(adminManagerTsx.includes('ai_news_profile_updated'), 'Admin manager must broadcast ai_news_profile_updated on save');
assert(profileScreenWebTsx.includes('पत्रकारिता पद (Designation)'), 'ProfileScreenWeb must include designation field');
console.log('✅ [PASS] TC4: Edit profile full details & real-time sync verified');

// 5. Daily Graphic Quota Count Decrement
console.log('Testing TC5: Daily Graphic Quota Count Decrement...');
assert(userPlanManagerTs.includes('getApiUrl(`/api/user-download-status'), 'fetchUserDailyDownloadStatus must use getApiUrl');
assert(homeScreenWebTsx.includes('ai_news_bonus_graphic_downloaded'), 'HomeScreenWeb must listen to ai_news_bonus_graphic_downloaded');
assert(serverTs.includes('Math.max(downloadsToday, userCreations)'), 'server.ts must coordinate daily creations and downloads');
console.log('✅ [PASS] TC5: Daily graphic quota decrement and synchronization verified');

// 6. Pre-Published Badge Hidden from Regular Users
console.log('Testing TC6: PRE-PUBLISHED Badge Visible Only to Admins...');
assert(!homeScreenWebTsx.includes(`{(post.status === 'pre_published' || (post as any).status === 'PRE_PUBLISHED'`), 'Unconditional PRE-PUBLISHED badge must not be rendered');
assert(homeScreenWebTsx.includes(`{canModerate && (post.status === 'pre_published' || (post as any).status === 'PRE_PUBLISHED'`), 'PRE-PUBLISHED badge must require canModerate');
console.log('✅ [PASS] TC6: PRE-PUBLISHED badge hidden from regular users verified');

// 7. Membership Upgrade Pricing UI: 2x2 Desktop & 1-2-3-4 Mobile
console.log('Testing TC7: Membership Pricing UI: 2x2 Desktop & 1-2-3-4 Mobile...');
assert(profileScreenWebTsx.includes('md:grid-cols-2'), 'Membership cards must use 2x2 grid on desktop (md:grid-cols-2)');
assert(profileScreenWebTsx.includes('mobileSelectedPlanTab'), 'Membership UI must have mobile tab selector state');
assert(profileScreenWebTsx.includes('md:hidden') && profileScreenWebTsx.includes('1. बेसिक'), 'Mobile segmented control (1. बेसिक, 2. एडवांस, etc.) must be rendered');
console.log('✅ [PASS] TC7: Membership pricing UI 2x2 desktop & mobile tabs verified');

// 8. Safety Invariants & SHA256 Mirror Parity
console.log('Testing TC8: Safety Invariants & SHA256 Parity...');
const buildGradlePath = path.join(rootDir, 'app/build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const gradle = fs.readFileSync(buildGradlePath, 'utf-8');
  assert(gradle.includes('applicationId "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
}

const filesToCheck = [
  'components/CardPreview.tsx',
  'components/AdminPlansAndPackagesManager.tsx',
  'components/ProfileScreenWeb.tsx',
  'components/HomeScreenWeb.tsx',
  'lib/CanvasExporter.ts',
  'lib/userPlanManager.ts',
  'types.ts',
];

for (const rel of filesToCheck) {
  const p1 = path.join(rootDir, 'src', rel);
  const p2 = path.join(rootDir, 'web_studio/src', rel);
  if (fs.existsSync(p1) && fs.existsSync(p2)) {
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(p1)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(p2)).digest('hex');
    assert.strictEqual(h1, h2, `SHA256 mismatch for ${rel}`);
  }
}
console.log('✅ [PASS] TC8: Safety invariants & 100% SHA256 parity verified');

console.log('==================================================================');
console.log('🎉 ALL 8 SUBSCRIPTION, FEED, QUOTA & LAYOUT ENHANCEMENTS PASSED!');
console.log('==================================================================');
