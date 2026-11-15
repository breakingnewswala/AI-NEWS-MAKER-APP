const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('================================================================');
console.log('🧪 VERIFYING MASTER ENGINEERING REPAIR PROMPT (17 NUMBERED AREAS)');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
  }
}

// -----------------------------------------------------------------------------
// Area 1 & 2: User Profile & Admin Auth Error Elimination
// -----------------------------------------------------------------------------
runTest('Area 1: apiConfig.ts only triggers admin_auth_required for admin endpoints', () => {
  const content = fs.readFileSync('src/lib/apiConfig.ts', 'utf8');
  assert(content.includes("urlStr.includes('/api/admin') || urlStr.includes('/api/master-admin')"), 'Must restrict admin auth toast to admin endpoints');
  assert(content.includes("ai_news_session_expired"), 'Must use session expired event for normal endpoints');
});

runTest('Area 1: userPlanManager.ts avoids calling admin registration for normal users', () => {
  const content = fs.readFileSync('src/lib/userPlanManager.ts', 'utf8');
  assert(content.includes("if (isSuper || cleanEmail === 'admin.ainewsmaker@gmail.com')"), 'Must only call register-user endpoint for authorized admins');
  assert(content.includes("/api/user-profile"), 'Must sync normal user profile via /api/user-profile');
});

runTest('Area 1 & 2: server.ts /api/user-profile authorizes authenticated users and strips privilege fields', () => {
  const content = fs.readFileSync('server.ts', 'utf8');
  assert(content.includes('resolveAuthenticatedUser(req, res)'), 'Must resolve authenticated user from token/session');
  assert(content.includes('delete profile.role'), 'Must strip role from normal user profile update');
  assert(content.includes('delete profile.tier'), 'Must strip tier from normal user profile update');
  assert(content.includes('delete profile.isBlocked'), 'Must strip isBlocked from normal user profile update');
});

// -----------------------------------------------------------------------------
// Area 2 & 3: Profile Persistence, Separated App Logo & Profile Completion Gate
// -----------------------------------------------------------------------------
runTest('Area 2 & 3: ProfileScreenWeb.tsx preserves state, district, social icons and separates app logo', () => {
  const content = fs.readFileSync('src/components/ProfileScreenWeb.tsx', 'utf8');
  assert(content.includes("isAuthoritativeAdmin ?"), 'Must only send admin headers if caller is authoritative admin');
  assert(content.includes("includes('ai_news_maker_logo.png')"), 'Must strip app logo from normal user profile display');
  assert(content.includes('setReporterState(cloudP.state)') || content.includes('setReporterState(savedProf.state)'), 'Must hydrate reporter state from user record');
  assert(content.includes('setReporterDistrict'), 'Must hydrate reporter district from user record');
});

runTest('Area 3: App.tsx getSavedChannelProfile never substitutes app logo for normal users and protects khabridasnews', () => {
  const content = fs.readFileSync('src/App.tsx', 'utf8');
  assert(content.includes("khabridasnews@gmail.com"), 'Must handle khabridasnews profile');
  assert(content.includes("खबरीदास न्यूज़"), 'Must enforce Hindi channel name खबरीदास न्यूज़');
  assert(content.includes("sanitizeProfile"), 'Must sanitize profile against app logo substitution');
});

runTest('Area 3: App.tsx Profile Completion Gate blocks studio entry when profile is incomplete', () => {
  const content = fs.readFileSync('src/App.tsx', 'utf8');
  assert(content.includes("Profile Completion Gate"), 'Must implement Profile Completion Gate');
  assert(content.includes("hasValidLogo"), 'Gate must check for a valid non-app custom logo');
  assert(content.includes("hasChannelName"), 'Gate must check for channel name');
  assert(content.includes("hasUsername"), 'Gate must check for username');
});

// -----------------------------------------------------------------------------
// Area 4 & 5: AI Photo & Video Frame Generator
// -----------------------------------------------------------------------------
runTest('Area 4: DynamicFrameGeneratorModal.tsx imports ensureAuthToken and labels Gemini AI', () => {
  const content = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(content.includes("ensureAuthToken"), 'Must import ensureAuthToken');
  assert(content.includes("Gemini AI विज़न एनालिसिस"), 'Must label UI as Gemini AI विज़न एनालिसिस');
});

runTest('Area 5: DynamicFrameGeneratorModal.tsx supports video input and extracts frame for AI vision', () => {
  const content = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(content.includes("accept={generatorMode === 'video' ? 'image/*,video/*' : 'image/*'}"), 'Must accept video input in video mode');
  assert(content.includes("document.createElement('video')"), 'Must use in-memory video element to extract frame');
  assert(content.includes("ctx.drawImage(video, 0, 0, canvas.width, canvas.height)"), 'Must render video frame to canvas for base64 extraction');
});

// -----------------------------------------------------------------------------
// Area 6 & 7: CardEditor currentDynamicFrame & Transformation Parity
// -----------------------------------------------------------------------------
runTest('Area 6: CardEditor.tsx defines currentDynamicFrame via useMemo', () => {
  const content = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(content.includes("const currentDynamicFrame = React.useMemo("), 'Must memoize currentDynamicFrame');
});

runTest('Area 7: DynamicFrameGeneratorModal & CardPreview center transform-origin watermark parity', () => {
  const previewContent = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  const modalContent = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(previewContent.includes("translate(-50%, -50%)"), 'CardPreview watermark preview must use translate(-50%, -50%) center pivot');
  assert(modalContent.includes("translate(-50%, -50%)"), 'Modal watermark live preview must use translate(-50%, -50%) center pivot');
});

// -----------------------------------------------------------------------------
// Area 8: Full Story Callout Resizing Controls
// -----------------------------------------------------------------------------
runTest('Area 8: DynamicFrameGeneratorModal.tsx provides callout resizing controls', () => {
  const content = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(content.includes("कॉलआउट साइज़ व पोज़ीशन (Real-time Resizing)"), 'Must have Callout Resizing Controls section');
  assert(content.includes("चौड़ाई (Width)"), 'Must have Callout Width slider');
  assert(content.includes("ऊंचाई (Height)"), 'Must have Callout Height slider');
});

// -----------------------------------------------------------------------------
// Area 9: Location Badge Dynamic Width & Space Preservation
// -----------------------------------------------------------------------------
runTest('Area 9: CardPreview.tsx location badge has no fixed 84px minWidth', () => {
  const content = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(!content.includes("minWidth: '84px'"), 'Must remove minWidth 84px from location badge');
});

runTest('Area 9: locationUtils.ts & server.ts preserve canonical space in Madhya Pradesh & Uttar Pradesh', () => {
  const utilsContent = fs.readFileSync('src/lib/locationUtils.ts', 'utf8');
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  assert(utilsContent.includes("replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')"), 'locationUtils must preserve canonical space');
  assert(serverContent.includes("स्थान/स्पेस सहित"), 'server.ts editorial prompt must instruct space preservation');
});

// -----------------------------------------------------------------------------
// Area 10: Headline Typography
// -----------------------------------------------------------------------------
runTest('Area 10: Headline typography has default 48px and range up to 120px', () => {
  const editorContent = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  const exporterContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');

  assert(editorContent.includes("card.headlineFontSize || 48"), 'CardEditor must default headline font size to 48');
  assert(editorContent.includes('max="120"'), 'CardEditor slider must allow up to 120px');
  assert(appContent.includes("headlineFontSize: 48"), 'App.tsx initial state must default headline font size to 48');
  assert(exporterContent.includes('120px "${fam}"'), 'CanvasExporter must preload font weights up to 120px');
});

// -----------------------------------------------------------------------------
// Area 11: AI Editorial Rules
// -----------------------------------------------------------------------------
runTest('Area 11: aiCoreRules.ts defines 5-tier headline character limits and editorial guidelines', () => {
  const content = fs.readFileSync('src/lib/aiCoreRules.ts', 'utf8');
  assert(/min:\s*80,\s*max:\s*110/.test(content), 'Tier 1 must be 80-110');
  assert(/min:\s*100,\s*max:\s*130/.test(content), 'Tier 2 must be 100-130');
  assert(/min:\s*125,\s*max:\s*150/.test(content), 'Tier 3 must be 125-150');
  assert(/min:\s*130,\s*max:\s*160/.test(content), 'Tier 4 must be 130-160');
  assert(/min:\s*150,\s*max:\s*200/.test(content), 'Tier 5 must be 150-200');
  assert(content.includes("No ending punctuation (. or । or ?)"), 'Editorial rules must forbid ending punctuation');
});

// -----------------------------------------------------------------------------
// Area 12 & 13: Test Frame Workflow
// -----------------------------------------------------------------------------
runTest('Area 12 & 13: DynamicFrameGeneratorModal saves new frames to TEST_FRAMES without plan selector', () => {
  const content = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(content.includes("isTestFrame: true"), 'Must save as isTestFrame: true');
  assert(content.includes("approvalStatus: (initialFrame?.approvalStatus && initialFrame.approvalStatus !== 'PENDING_TEST') ? initialFrame.approvalStatus : 'PENDING_TEST'"), 'Must mark new frame as PENDING_TEST');
  assert(content.includes("designCategory: 'TEST_FRAMES'"), 'Must classify under TEST_FRAMES');
});

// -----------------------------------------------------------------------------
// Area 14: Master Admin Video Test Frames Tab
// -----------------------------------------------------------------------------
runTest('Area 14: AdminVideoTemplateControl.tsx provides dedicated Test Frames Tab with approval & plan controls', () => {
  const content = fs.readFileSync('src/components/AdminVideoTemplateControl.tsx', 'utf8');
  assert(content.includes("const [activeCategoryTab, setActiveCategoryTab] = useState<'published' | 'test_frames'>('published')"), 'Must have category tab state');
  assert(content.includes("handleApproveAndPublish"), 'Must provide handleApproveAndPublish');
  assert(content.includes("handleRejectFrame"), 'Must provide handleRejectFrame');
  assert(content.includes("handleDeleteFrame"), 'Must provide handleDeleteFrame');
  assert(content.includes("मेंबरशिप प्लान आवंटन"), 'Must provide subscription plan assignment');
});

// -----------------------------------------------------------------------------
// Area 15: Quick Video Mode
// -----------------------------------------------------------------------------
runTest('Area 15: VideoStudioWeb.tsx eliminates color filter options and defaults to unfiltered original', () => {
  const content = fs.readFileSync('src/components/VideoStudioWeb.tsx', 'utf8');
  assert(content.includes("videoColorFilter, setVideoColorFilter"), 'Must define videoColorFilter state');
  assert(content.includes("case 'original':\n      default:\n        return 'none';") || content.includes("return 'none';"), 'Must return none for original/unfiltered');
  assert(!content.includes("फ़िल्टर: कंट्रास्ट व ब्राइटनेस"), 'Must remove color filter UI section');
});

// -----------------------------------------------------------------------------
// Area 16: Strict Data Isolation
// -----------------------------------------------------------------------------
runTest('Area 16: App.tsx handleOpenStudioWithVideo does not corrupt Photo Studio card state', () => {
  const content = fs.readFileSync('src/App.tsx', 'utf8');
  const startIdx = content.indexOf('const handleOpenStudioWithVideo = async');
  const endIdx = content.indexOf('const handleOpenStudioWithEPaper =', startIdx);
  const fnBody = content.slice(startIdx, endIdx);
  assert(!fnBody.includes('setCard('), 'handleOpenStudioWithVideo must not mutate Photo Studio card state');
});

// -----------------------------------------------------------------------------
// Area 17: Production Safety Invariants
// -----------------------------------------------------------------------------
runTest('Area 17: Android Application ID invariant is preserved', () => {
  const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
  assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
});

console.log('================================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
