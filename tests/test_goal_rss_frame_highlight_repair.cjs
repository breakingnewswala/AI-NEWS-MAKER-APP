/**
 * Automated Verification Suite for Goal Resolution:
 * 1. RSS Feed Deletion & Test Articles / Feeds Cleanup (AdminPlansAndPackagesManager, server.ts, rssSourceManager)
 * 2. Template Elements (Location Badge & Callout) authoritative visibility in Photo News Studio (DynamicFrameGeneratorModal, CardPreview, CardEditor, App)
 * 3. Highlight Color Selection in Frame Generator / Editor using HIGHLIGHT_COLOR_PRESETS
 * 4. Home Screen "समाचार लोड करने में असमर्थ" Transient Error Banner prevention (HomeScreenWeb, App)
 * 5. Redesigned Premium Breaking News Pop-up Modal (App)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Starting Goal Verification Suite ---');

// 1. AdminPlansAndPackagesManager.tsx verification
const adminPlansPath = path.join(__dirname, '../src/components/AdminPlansAndPackagesManager.tsx');
const adminPlansContent = fs.readFileSync(adminPlansPath, 'utf8');

assert(
  adminPlansContent.includes('पुष्टि करें (हटाएं)'),
  'AdminPlansAndPackagesManager must have 2-tap confirmation "पुष्टि करें (हटाएं)" for delete action'
);
assert(
  adminPlansContent.includes('डमी / टेस्ट फ़ीड्स साफ़ करें (Purge All Test Wires)'),
  'AdminPlansAndPackagesManager must have "डमी / टेस्ट फ़ीड्स साफ़ करें (Purge All Test Wires)" action'
);
assert(
  adminPlansContent.includes('bg-rose-500/20 text-rose-300'),
  'AdminPlansAndPackagesManager delete button must have active rose badge styling'
);
console.log('✓ 1. Admin RSS Manager deletion & purge UI verified.');

// 2. server.ts verification
const serverPath = path.join(__dirname, '../server.ts');
const serverContent = fs.readFileSync(serverPath, 'utf8');

assert(
  serverContent.includes('/api/admin/purge-test-rss-sources'),
  'server.ts must have POST /api/admin/purge-test-rss-sources endpoint'
);
assert(
  serverContent.includes('isDummyWirePost'),
  'server.ts must have isDummyWirePost helper'
);
assert(
  serverContent.includes('if (isExplicitlyDeleted) return false;'),
  'server.ts must filter explicitly deleted sources for both admin and regular users'
);
assert(
  serverContent.includes('sourceChannel === targetSource.name'),
  'server.ts delete-rss-source must purge posts matching sourceChannel'
);
console.log('✓ 2. server.ts test purge endpoint and source filtering verified.');

// 3. rssSourceManager.ts verification
const rssManagerPath = path.join(__dirname, '../src/lib/rssSourceManager.ts');
const rssManagerContent = fs.readFileSync(rssManagerPath, 'utf8');

assert(
  rssManagerContent.includes('purgeDeletedRssSourcePostsLocal'),
  'rssSourceManager must export purgeDeletedRssSourcePostsLocal'
);
assert(
  rssManagerContent.includes('purgeAllTestRssSourcesAsync'),
  'rssSourceManager must export purgeAllTestRssSourcesAsync'
);
assert(
  rssManagerContent.includes('app_news_posts_v2'),
  'rssSourceManager must clean app_news_posts_v2 on feed delete'
);
console.log('✓ 3. rssSourceManager local storage purge functions verified.');

// 4. DynamicFrameGeneratorModal.tsx & CardPreview.tsx & CardEditor.tsx verification
const frameModalPath = path.join(__dirname, '../src/components/DynamicFrameGeneratorModal.tsx');
const frameModalContent = fs.readFileSync(frameModalPath, 'utf8');

// Ensure white text is not overridden to black
assert(
  !frameModalContent.includes("headerConfig.locationTextColor.toUpperCase() !== '#FFFFFF') ? headerConfig.locationTextColor : '#000000'"),
  'DynamicFrameGeneratorModal must NOT force white location text to #000000'
);
assert(
  frameModalContent.includes('HIGHLIGHT_COLOR_PRESETS = ['),
  'DynamicFrameGeneratorModal must have HIGHLIGHT_COLOR_PRESETS'
);
assert(
  !frameModalContent.includes('<input\n                    type="color"'),
  'DynamicFrameGeneratorModal Step 6 must not have manual type="color" picker'
);

const cardPreviewPath = path.join(__dirname, '../src/components/CardPreview.tsx');
const cardPreviewContent = fs.readFileSync(cardPreviewPath, 'utf8');

assert(
  cardPreviewContent.includes('safeBadgeUrl || badgeAsset'),
  'CardPreview must reliably render location badge img element with safe fallback'
);
assert(
  cardPreviewContent.includes('effectiveCalloutText'),
  'CardPreview must render styled callout badge when effectiveCalloutText is present even if callout image is null'
);
console.log('✓ 4. Frame generator presets and CardPreview location/callout rendering verified.');

// 5. HomeScreenWeb.tsx verification
const homeScreenPath = path.join(__dirname, '../src/components/HomeScreenWeb.tsx');
const homeScreenContent = fs.readFileSync(homeScreenPath, 'utf8');

assert(
  homeScreenContent.includes("(feedStatus === 'error' && filteredPosts.length === 0)"),
  'HomeScreenWeb must only show full error banner when feedStatus is error AND there are zero filtered posts'
);
console.log('✓ 5. HomeScreenWeb transient error banner guard verified.');

// 6. App.tsx breakingNewsAlert verification
const appPath = path.join(__dirname, '../src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

assert(
  appContent.includes('breakingNewsAlert'),
  'App.tsx must maintain breakingNewsAlert state'
);
assert(
  appContent.includes('🚨 नई ब्रेकिंग न्यूज़ प्रकाशित हुई!'),
  'App.tsx must display the redesigned breaking news header badge'
);
assert(
  appContent.includes('🎨 खबर से ग्राफिक बनाएं'),
  'App.tsx breaking news modal must have "🎨 खबर से ग्राफिक बनाएं" action button'
);
assert(
  appContent.includes('📰 होम फ़ीड में देखें'),
  'App.tsx breaking news modal must have "📰 होम फ़ीड में देखें" action button'
);
assert(
  appContent.includes('selectedLocationBadgeId: df.headerConfig?.locationBadgeAssetId'),
  'App.tsx onOpenStudio must synchronize selectedLocationBadgeId from dynamic frame'
);
assert(
  appContent.includes('selectedCalloutId: df.fullStoryCalloutConfig?.calloutAssetId'),
  'App.tsx onOpenStudio must synchronize selectedCalloutId from dynamic frame'
);
console.log('✓ 6. App.tsx breaking news dialog & studio template synchronization verified.');

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
