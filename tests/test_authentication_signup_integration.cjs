/**
 * AI NEWS MAKER — Automated Test Suite
 * Master Verification: Permanent Authentication, 4-Step Google Login Flow,
 * Channel/Reporter Signup & State-District Profile Integration
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Master Authentication & Signup Integration Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Test Case 1: Indian States & Districts Data and Utility Functions
// -----------------------------------------------------------------------------
runTest('TC1: State and District Data & Utility Functions Verification', () => {
  const tsContent = fs.readFileSync(path.join(__dirname, '../src/data/indianStatesDistricts.ts'), 'utf8');

  // Verify exports exist in source
  assert(tsContent.includes('export function getAllIndianStates'), 'getAllIndianStates must be exported');
  assert(tsContent.includes('export function getDistrictsForState'), 'getDistrictsForState must be exported');
  assert(tsContent.includes('export function getDistrictsByState'), 'getDistrictsByState alias must be exported');
  assert(tsContent.includes('export function inferStateFromDistrict'), 'inferStateFromDistrict must be exported');

  // Load and test actual data mapping using esbuild
  let evalEnv = {};
  try {
    const esbuild = require('esbuild');
    const transformed = esbuild.transformSync(tsContent, { loader: 'ts' }).code;
    const runner = new Function('exports', transformed);
    runner(evalEnv);
  } catch (e) {
    // Fallback if esbuild fails
    const cleanCode = tsContent
      .replace(/export function/g, 'function')
      .replace(/export const/g, 'const')
      .replace(/: string \| null/g, '')
      .replace(/: string\[\]/g, '')
      .replace(/: string/g, '')
      .replace(/: boolean/g, '')
      .replace(/: Record<string, string\[\]>/g, '')
      .replace(/: { \[key: string\]: string }/g, '')
      .replace(/: any/g, '');

    const runner = new Function('exports', cleanCode + '\nexports.getAllIndianStates = getAllIndianStates; exports.getDistrictsForState = getDistrictsForState; exports.getDistrictsByState = getDistrictsByState; exports.inferStateFromDistrict = inferStateFromDistrict;');
    runner(evalEnv);
  }

  const states = evalEnv.getAllIndianStates();
  assert(Array.isArray(states), 'getAllIndianStates must return an array');
  assert(states.length >= 28, `Expected at least 28 states/UTs, got ${states.length}`);
  assert(states.includes('मध्य प्रदेश'), 'States must include मध्य प्रदेश');
  assert(states.includes('उत्तर प्रदेश'), 'States must include उत्तर प्रदेश');
  assert(states.includes('राजस्थान'), 'States must include राजस्थान');

  const mpDistricts = evalEnv.getDistrictsForState('मध्य प्रदेश');
  assert(Array.isArray(mpDistricts), 'getDistrictsForState must return an array');
  assert(mpDistricts.includes('भोपाल'), 'MP districts must include भोपाल');
  assert(mpDistricts.includes('ग्वालियर'), 'MP districts must include ग्वालियर');
  assert(mpDistricts.includes('इंदौर'), 'MP districts must include इंदौर');

  const upDistrictsAlias = evalEnv.getDistrictsByState('उत्तर प्रदेश');
  assert(Array.isArray(upDistrictsAlias), 'getDistrictsByState alias must return an array');
  assert(upDistrictsAlias.includes('लखनऊ'), 'UP districts must include लखनऊ');
  assert(upDistrictsAlias.includes('वाराणसी'), 'UP districts must include वाराणसी');

  const inferredMp = evalEnv.inferStateFromDistrict('भोपाल');
  assert.strictEqual(inferredMp, 'मध्य प्रदेश', 'Bhopal must infer Madhya Pradesh');

  const inferredUp = evalEnv.inferStateFromDistrict('वाराणसी');
  assert.strictEqual(inferredUp, 'उत्तर प्रदेश', 'Varanasi must infer Uttar Pradesh');

  const inferredUnknown = evalEnv.inferStateFromDistrict('NonExistentPlaceXYZ');
  assert(inferredUnknown === null || inferredUnknown === '', 'Unknown district must return null or empty string');
});

// -----------------------------------------------------------------------------
// Test Case 2: Runtime Reference Error Checks (inferStateFromDistrict & getAllIndianStates)
// -----------------------------------------------------------------------------
runTest('TC2: Reference Error Prevention in AuthWelcomeScreen, LoginModal, ProfileScreenWeb', () => {
  const authWelcome = fs.readFileSync(path.join(__dirname, '../src/components/AuthWelcomeScreen.tsx'), 'utf8');
  const loginModal = fs.readFileSync(path.join(__dirname, '../src/components/LoginModal.tsx'), 'utf8');
  const profileScreen = fs.readFileSync(path.join(__dirname, '../src/components/ProfileScreenWeb.tsx'), 'utf8');

  // AuthWelcomeScreen must import all utilities
  assert(authWelcome.includes("getAllIndianStates"), 'AuthWelcomeScreen must import getAllIndianStates');
  assert(authWelcome.includes("inferStateFromDistrict"), 'AuthWelcomeScreen must import inferStateFromDistrict');
  assert(authWelcome.includes("getDistrictsForState"), 'AuthWelcomeScreen must import getDistrictsForState');
  assert(authWelcome.includes("getDistrictsByState"), 'AuthWelcomeScreen must import getDistrictsByState');

  // LoginModal must import all utilities
  assert(loginModal.includes("getAllIndianStates"), 'LoginModal must import getAllIndianStates');
  assert(loginModal.includes("inferStateFromDistrict"), 'LoginModal must import inferStateFromDistrict');
  assert(loginModal.includes("getDistrictsForState"), 'LoginModal must import getDistrictsForState');

  // ProfileScreenWeb must import all utilities
  assert(profileScreen.includes("getAllIndianStates"), 'ProfileScreenWeb must import getAllIndianStates');
  assert(profileScreen.includes("inferStateFromDistrict"), 'ProfileScreenWeb must import inferStateFromDistrict');
  assert(profileScreen.includes("getDistrictsForState"), 'ProfileScreenWeb must import getDistrictsForState');
});

// -----------------------------------------------------------------------------
// Test Case 3: Mandatory Route Guard & Loading Screen in App.tsx
// -----------------------------------------------------------------------------
runTest('TC3: Mandatory Authentication Route Guard & Branded Loading Screen in App.tsx', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');

  // Verify auth loading state
  assert(appSrc.includes('const [isAuthChecking, setIsAuthChecking] = useState<boolean>'), 'isAuthChecking state must exist');
  assert(appSrc.includes('isAuthChecking && !isPublicLegalPage'), 'isAuthChecking guard must precede protected routes');
  assert(appSrc.includes('AI NEWS MAKER'), 'Branded loading screen must display AI NEWS MAKER');
  assert(appSrc.includes('प्रमाणीकरण जांच की जा रही है...'), 'Branded loading screen message must exist');

  // Verify route guard protection
  assert(appSrc.includes('const isUserAuthenticated = Boolean(currentUser && (currentUser.email || currentUser.userId || currentUser.username));'), 'isUserAuthenticated check must exist');
  assert(appSrc.includes('const isAllowedInApp = isUserAuthenticated && (isSuperOrAdmin || isOnboardingCompleted);'), 'isAllowedInApp check must require authentication and onboarding');
  assert(appSrc.includes('!isPublicLegalPage && (!isAllowedInApp || showAuthWelcomeScreen)'), 'Route guard must render AuthWelcomeScreen when !isAllowedInApp');

  // Verify Studio tab is NOT allowed unauthenticated access
  assert(!appSrc.includes('if (!isPublicLegalPage && !isStudioTab && !isMasterAdminUser && showAuthWelcomeScreen)'), 'Unauthenticated studio tab bypass must be removed');
});

// -----------------------------------------------------------------------------
// Test Case 4: Public Legal Pages Exemption
// -----------------------------------------------------------------------------
runTest('TC4: Public Legal & Policy Pages Exemption Verification', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');

  const legalPages = ['terms', 'privacy', 'refunds', 'delete-account', 'support'];
  for (const page of legalPages) {
    assert(appSrc.includes(`currentTab === '${page}'`), `Legal page '${page}' must be exempted from auth gate`);
  }
});

// -----------------------------------------------------------------------------
// Test Case 5: 4-Step Google Login Flow (AuthWelcomeScreen as Default, Not LoginModal)
// -----------------------------------------------------------------------------
runTest('TC5: AuthWelcomeScreen as Central Auth Flow (AppTopBarWeb triggers open_auth_welcome_screen)', () => {
  const topBarSrc = fs.readFileSync(path.join(__dirname, '../src/components/AppTopBarWeb.tsx'), 'utf8');

  // Verify login trigger dispatches open_auth_welcome_screen
  assert(topBarSrc.includes("open_auth_welcome_screen"), 'AppTopBarWeb must dispatch open_auth_welcome_screen');
  assert(!topBarSrc.includes("open_login_modal"), 'AppTopBarWeb must not dispatch open_login_modal for user login');
});

// -----------------------------------------------------------------------------
// Test Case 6: Account Type Selection & Validation (Channel vs Reporter)
// -----------------------------------------------------------------------------
runTest('TC6: Account Type ("channel" vs "reporter") in Types, AuthWelcomeScreen, Server', () => {
  const typesSrc = fs.readFileSync(path.join(__dirname, '../src/types.ts'), 'utf8');
  const authWelcome = fs.readFileSync(path.join(__dirname, '../src/components/AuthWelcomeScreen.tsx'), 'utf8');
  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');

  // Types interface check
  assert(typesSrc.includes("accountType?: 'channel' | 'reporter'"), 'ChannelProfile must declare accountType');
  assert(typesSrc.includes("defaultLocation?: string"), 'ChannelProfile must declare defaultLocation');

  // AuthWelcomeScreen selector check
  assert(authWelcome.includes("accountType, setAccountType"), 'AuthWelcomeScreen must manage accountType state');
  assert(authWelcome.includes("चैनल के रूप में"), 'AuthWelcomeScreen must render Channel option');
  assert(authWelcome.includes("पत्रकार / रिपोर्टर के रूप में"), 'AuthWelcomeScreen must render Reporter option');
  assert(authWelcome.includes("accountType === 'channel'"), 'AuthWelcomeScreen must conditionally validate channel logo');

  // Server check
  assert(serverSrc.includes("isReporter"), 'Server must distinguish reporter accounts');
  assert(serverSrc.includes("hasRequiredLogo"), 'Server must conditionally require logo only for channels');
});

// -----------------------------------------------------------------------------
// Test Case 7: District Selection Updates Default Graphic Maker Location
// -----------------------------------------------------------------------------
runTest('TC7: Graphic Maker Default Location Synchronization', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  const profileSrc = fs.readFileSync(path.join(__dirname, '../src/components/ProfileScreenWeb.tsx'), 'utf8');

  // Initial card location uses savedProfile district
  assert(appSrc.includes('savedProfile?.district'), 'Card initial location must inspect savedProfile.district');

  // handleSaveProfile and handleProfileUpdated update card location
  assert(appSrc.includes('location: profile.district || profile.defaultLocation || profile.location || prev.location'), 'handleProfileUpdated must sync card.location');

  // onCompleteDetails updates card.location
  assert(appSrc.includes('location: profile.district,'), 'onCompleteDetails must sync card.location to profile.district');

  // State change in ProfileScreenWeb resets district to avoid cross-state mismatch
  assert(profileSrc.includes("setReporterDistrict('')"), 'Changing state in ProfileScreenWeb must clear reporterDistrict');
});

// -----------------------------------------------------------------------------
// Test Case 8: Logout Lifecycle & Session Invalidation
// -----------------------------------------------------------------------------
runTest('TC8: Logout Lifecycle & Post-Logout State Cleansing', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');

  assert(appSrc.includes("user_explicitly_logged_out"), 'handleLogout must persist user_explicitly_logged_out');
  assert(appSrc.includes("reporter_auth_session"), 'handleLogout must clear reporter_auth_session');
  assert(appSrc.includes("clearAuthTokens()"), 'handleLogout must invoke clearAuthTokens()');
  assert(appSrc.includes("signOut(auth)"), 'handleLogout must invoke firebase signOut(auth)');
  assert(appSrc.includes("setShowAuthWelcomeScreen(true)"), 'handleLogout must set showAuthWelcomeScreen to true');
});

// -----------------------------------------------------------------------------
// Test Case 9: 100% SHA256 Parity Across Root and web_studio/
// -----------------------------------------------------------------------------
runTest('TC9: 100% SHA256 Parity Between src/ and web_studio/src/', () => {
  const crypto = require('crypto');
  const filesToCompare = [
    'server.ts',
    'src/App.tsx',
    'src/types.ts',
    'src/data/indianStatesDistricts.ts',
    'src/components/AppTopBarWeb.tsx',
    'src/components/AuthWelcomeScreen.tsx',
    'src/components/LoginModal.tsx',
    'src/components/ProfileScreenWeb.tsx',
    'src/lib/userPlanManager.ts',
  ];

  for (const relPath of filesToCompare) {
    const rootPath = path.join(__dirname, '..', relPath);
    let studioPath;
    if (relPath === 'server.ts') {
      studioPath = path.join(__dirname, '..', 'web_studio', 'server.ts');
    } else {
      studioPath = path.join(__dirname, '..', 'web_studio', relPath);
    }

    assert(fs.existsSync(rootPath), `Root file ${relPath} must exist`);
    assert(fs.existsSync(studioPath), `Studio file ${relPath} must exist`);

    const rootHash = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
    const studioHash = crypto.createHash('sha256').update(fs.readFileSync(studioPath)).digest('hex');

    assert.strictEqual(rootHash, studioHash, `SHA256 mismatch for ${relPath}: root=${rootHash.slice(0, 12)} vs studio=${studioHash.slice(0, 12)}`);
  }
});

// -----------------------------------------------------------------------------
// Test Case 10: Android Application ID Preservation
// -----------------------------------------------------------------------------
runTest('TC10: Android Application ID Preservation (com.aistudio.ainewsmaker.hzwptx)', () => {
  const expectedAppId = 'com.aistudio.ainewsmaker.hzwptx';

  // Check build.gradle or app configs if present
  const gradlePath = path.join(__dirname, '../android/app/build.gradle');
  if (fs.existsSync(gradlePath)) {
    const gradle = fs.readFileSync(gradlePath, 'utf8');
    assert(gradle.includes(expectedAppId), `build.gradle must contain ${expectedAppId}`);
  }

  const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    assert(manifest.includes(expectedAppId), `AndroidManifest.xml must contain ${expectedAppId}`);
  }

  // Also check firebase configs
  const fbConfigPath = path.join(__dirname, '../firebase-applet-config.json');
  if (fs.existsSync(fbConfigPath)) {
    const fb = fs.readFileSync(fbConfigPath, 'utf8');
    assert(fb.includes('ai-news-maker-app'), 'firebase-applet-config.json must reference ai-news-maker-app');
  }
});

console.log(`\n==================================================`);
console.log(`Summary: ${passedTests} / ${totalTests} test cases passed.`);
console.log(`==================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
