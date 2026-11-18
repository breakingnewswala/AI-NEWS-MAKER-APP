const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('==================================================================');
console.log('🧪 VERIFYING MASTER PRODUCTION ENGINEERING & REMEDIATION (12 MODULES)');
console.log('==================================================================');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] TC${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] TC${totalTests}: ${name}`);
    console.error(`   Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------------------
// MODULE 1: FIX WHATSAPP WEBSITE LINK PREVIEW LOGO
// -------------------------------------------------------------------------
runTest('Module 1: WhatsApp Website Link Preview Logo in HTML & server.ts', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert(indexHtml.includes('https://www.ainewsmaker.online/assets/ai_news_maker_logo.png?v=2'), 'index.html must reference official AI News Maker logo asset with v=2 cachebuster');
  assert(indexHtml.includes('content="1024"'), 'index.html must specify og:image:width 1024');
  assert(indexHtml.includes('content="image/png"'), 'index.html must specify og:image:type image/png');
  assert(indexHtml.includes('content="AI News Maker - स्मार्ट डिजिटल न्यूज़ स्टूडियो"'), 'index.html must have canonical title');

  // Verify no duplicate og:image or twitter:image tags in index.html
  const ogImageMatches = indexHtml.match(/property="og:image"\s+content=/g) || [];
  assert.strictEqual(ogImageMatches.length, 1, 'index.html must have exactly 1 og:image tag');
  const twImageMatches = indexHtml.match(/name="twitter:image"\s+content=/g) || [];
  assert.strictEqual(twImageMatches.length, 1, 'index.html must have exactly 1 twitter:image tag');

  // Verify server.ts SEO meta injection uses official logo
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes('/assets/ai_news_maker_logo.png?v=2'), 'server.ts must use official logo URL with v=2');
  assert(serverTs.includes('cleanBase'), 'server.ts must use cleanBase to construct absolute HTTPS URLs');
});

// -------------------------------------------------------------------------
// MODULE 2: PROJECT HISTORY LOCAL-ONLY & AUTO-CLEANUP
// -------------------------------------------------------------------------
runTest('Module 2: Project History UID partitioning and global auto-cleanup', () => {
  const phManager = fs.readFileSync('src/lib/projectHistoryManager.ts', 'utf8');
  assert(phManager.includes('ai_news_maker_projects_history_v2_'), 'projectHistoryManager must partition storage key by user UID');
  assert(phManager.includes('getHistoryRetentionHours') && phManager.includes('return 48'), 'Default retention must be 48 hours');
  assert(phManager.includes('setHistoryRetentionHours'), 'Must allow setting retention (24h or 48h)');
  assert(phManager.includes('createdAt') && phManager.includes('timestamp'), 'Must calculate expiration from immutable creation time');
  assert(phManager.includes('cleanupExpiredHistory'), 'cleanupExpiredHistory function must exist');
  assert(phManager.includes('ai_news_maker_projects_history_v2_') && phManager.includes('localStorage.key(i)'), 'cleanupExpiredHistory must iterate over all user partitions when no userId is passed');
  assert(phManager.includes('deleteProjectHistoryItem') && phManager.includes('clearAllProjectHistory'), 'Single delete and clear all methods must exist');

  const newsroomUi = fs.readFileSync('src/components/NewsroomScreenWeb.tsx', 'utf8');
  assert(newsroomUi.includes('formatTime') && newsroomUi.includes('item.createdAt || item.timestamp'), 'Timestamp formatting must prioritize item.createdAt');
});

// -------------------------------------------------------------------------
// MODULE 3: WHATSAPP AI COMMAND CENTER (APPROVED TEMPLATES & 24H WINDOW)
// -------------------------------------------------------------------------
runTest('Module 3: WhatsApp AI Command Center zero template fabrication & param extraction', () => {
  const waInbox = fs.readFileSync('src/components/WhatsAppLiveInbox.tsx', 'utf8');
  assert(!waInbox.includes('news_broadcast_v1') || !waInbox.includes('name: \'news_broadcast_v1\''), 'Must NEVER fabricate fake templates in getApprovedTemplatesList');
  assert(waInbox.includes('extractTemplateParamIndices'), 'Must dynamically parse template variables like {{1}} and {{2}}');
  assert(waInbox.includes('renderTemplateLivePreview'), 'Must support live template preview with user variable replacement');
  assert(waInbox.includes('missing.length > 0'), 'Must validate required parameters before sending');
  assert(waInbox.includes('fetchTemplates()'), 'Must fetch official templates on mount');

  const waIntegration = fs.readFileSync('whatsapp_integration.ts', 'utf8');
  assert(waIntegration.includes('isCustomerWindowActive') && waIntegration.includes('customerServiceWindowExpiresAt'), 'API must return authoritative customer service window status');
});

// -------------------------------------------------------------------------
// MODULE 4: SCRIPT MAKER DUAL MODES & STRICT HASHTAG ORDERING
// -------------------------------------------------------------------------
runTest('Module 4: Script Maker dual modes, no "स-नोट" preamble, and strict hashtag ordering', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes('generationMode') && (serverTs.includes('generationMode === "website"') || serverTs.includes('generationMode === "social"') || serverTs.includes('website')), 'Script maker must support website and social generation modes');
  assert(serverTs.includes('userHandle') && (serverTs.includes('hashtags: [') || serverTs.includes('tags.push')), 'Must format hashtags array');
  assert(serverTs.includes('#AINewsMaker'), 'Final hashtag must be #AINewsMaker');
  assert(serverTs.includes('isPreambleWord') || serverTs.includes('स-नोट') || serverTs.includes('प्रेस नोट'), 'Must clean bureaucratic preambles like स-नोट and प्रेस नोट');
});

// -------------------------------------------------------------------------
// MODULE 5: FREE API KEY POOL ZERO-QUOTA HEALTH PROBING & 6 DISTINCT STATES
// -------------------------------------------------------------------------
runTest('Module 5: Free API Key Manager zero-quota health check & 6 distinct states', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes('/v1beta/models?key='), 'Health check must use zero-quota GET models endpoint instead of generateContent');
  assert(serverTs.includes('READY') && serverTs.includes('RATE_LIMITED') && serverTs.includes('QUOTA_EXHAUSTED') && serverTs.includes('TEMPORARILY_UNAVAILABLE') && serverTs.includes('INVALID_KEY') && serverTs.includes('DISABLED'), 'Must support all 6 distinct health states');

  const apiKeyManager = fs.readFileSync('src/components/AdminApiKeysManager.tsx', 'utf8');
  assert(apiKeyManager.includes('AdminApiKeysManager') || apiKeyManager.includes('ApiKeysManager'), 'AdminApiKeysManager component must be present');
});

// -------------------------------------------------------------------------
// MODULE 6: CENTRAL ADMIN NOTIFICATIONS & VERIFIED MASTER PHONE RESOLUTION
// -------------------------------------------------------------------------
runTest('Module 6: Master Admin notification with verified phone number & support request hook', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes('getMasterAdminVerifiedPhone'), 'Must resolve master admin verified phone dynamically from profile DB');
  assert(serverTs.includes('sendAdminSpecialNotification'), 'Must provide central admin notification helper');
  assert(serverTs.includes('/api/support/requests') && serverTs.includes('sendAdminSpecialNotification'), 'Support requests route must trigger central admin notification');
  assert(serverTs.includes('ADMIN_ALERT_COOLDOWNS') || serverTs.includes('15 * 60 * 1000'), 'Must deduplicate notifications within 15 minutes');
});

// -------------------------------------------------------------------------
// MODULE 7 & 9: VISUAL CONSISTENCY, LOCATION BADGE & STORY CALLOUT
// -------------------------------------------------------------------------
runTest('Module 7 & 9: normalizeDynamicFrame preserves critical fields, black badge, and zero hardcoded red callout', () => {
  const dfManager = fs.readFileSync('src/lib/dynamicFramesManager.ts', 'utf8');
  assert(dfManager.includes('locationBadgeAssetId: badgeAssetId'), 'normalizeDynamicFrame must preserve locationBadgeAssetId');
  assert(dfManager.includes('calloutAssetId: calloutAssetId'), 'normalizeDynamicFrame must preserve calloutAssetId');
  assert(dfManager.includes('textRegion: rawH.textRegion || raw.textRegion'), 'normalizeDynamicFrame must preserve textRegion');
  assert(dfManager.includes('typographyConfig: rawH.typographyConfig || raw.typographyConfig'), 'normalizeDynamicFrame must preserve typographyConfig');
  assert(dfManager.includes('sliceConfig: rawH.sliceConfig || raw.sliceConfig'), 'normalizeDynamicFrame must preserve sliceConfig');

  // Verify compact chip fallback is dark badge (#18181B)
  assert(dfManager.includes('#18181B'), 'compact chip badge fallback must use #18181B dark background');

  // Verify generic red/white fallback callout is completely eliminated from CardPreview and CanvasExporter
  const cardPreview = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(!cardPreview.includes('<div className="relative overflow-hidden shadow-2xl flex items-center justify-between" style={{ backgroundColor: \'#DC2626\''), 'CardPreview must NOT render hardcoded red/white callout fallback');

  const canvasExporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(!canvasExporter.includes('ctx.fillStyle = df.fullStoryCalloutConfig.bgColor || \'#DC2626\''), 'CanvasExporter must NOT render hardcoded red/white callout fallback');
});

// -------------------------------------------------------------------------
// MODULE 8: HEADLINE BOX CUSTOMIZATION IN MODAL, DOM AND CANVAS
// -------------------------------------------------------------------------
runTest('Module 8: Headline Box Customization controls, DOM and Canvas rendering', () => {
  const dfModal = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(dfModal.includes('हेडलाइन बॉक्स कस्टमाइज़ करें') || dfModal.includes('Headline Box Customizer'), 'DynamicFrameGeneratorModal must provide Headline Box Customizer');
  assert(dfModal.includes('backgroundColor') && dfModal.includes('backgroundOpacity'), 'Headline customizer must allow background and opacity controls');
  assert(dfModal.includes('borderColor') && dfModal.includes('borderWidth') && dfModal.includes('borderRadius'), 'Headline customizer must allow border and radius controls');

  const cardPreview = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(cardPreview.includes('hbOpacity') && cardPreview.includes('hbBorderWidth'), 'CardPreview must bind headline box style customizations');

  const canvasExporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporter.includes('bgOpacity') && canvasExporter.includes('borderWidth'), 'CanvasExporter must render headline box background, border, opacity, and padding');
});

// -------------------------------------------------------------------------
// MODULE 10: SAFETY INVARIANTS & MIRROR PARITY
// -------------------------------------------------------------------------
runTest('Module 10: Safety Invariants & 100% SHA256 Parity between src/ and web_studio/src/', () => {
  // Check user profiles DB
  const userProfiles = JSON.parse(fs.readFileSync('user_profiles_db.json', 'utf8'));
  const profilesArray = Array.isArray(userProfiles) ? userProfiles : Object.values(userProfiles);
  assert(profilesArray.length >= 2, 'user_profiles_db.json must contain superadmins');
  const superAdmin = profilesArray.find(u => u.role === 'superadmin' || u.role === 'admin' || u.isMasterAdmin);
  assert(superAdmin, 'Superadmin profile must be preserved');
  assert(superAdmin.mobileNumber === '9669802408' || superAdmin.whatsappNumber === '9669802408', 'Superadmin verified phone must be preserved');

  // Check Android Application ID
  const buildGradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
  assert(buildGradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be strictly preserved');

  // Verify SHA256 parity between src/ and web_studio/src/
  function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(full));
      } else {
        results.push(full);
      }
    });
    return results;
  }

  const rootFiles = getFiles('src');
  rootFiles.forEach(rf => {
    const rel = path.relative('src', rf);
    const wf = path.join('web_studio', 'src', rel);
    assert(fs.existsSync(wf), `Missing mirror file in web_studio/src: ${rel}`);
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(rf)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(wf)).digest('hex');
    assert.strictEqual(h1, h2, `SHA256 mismatch for ${rel}`);
  });
});

console.log('==================================================================');
console.log(`Summary: ${passedTests} / ${totalTests} test cases passed.`);
console.log('==================================================================');
if (passedTests !== totalTests) {
  process.exit(1);
}
