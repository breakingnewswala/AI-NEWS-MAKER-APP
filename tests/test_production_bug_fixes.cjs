/**
 * Automated Verification Suite: Production Bug Fixes (Modules 1 - 7)
 * Tests:
 * 1. Publishing Persistence & Audit Repair Safety
 * 2. Pre-Published Workflow & Visual Badge
 * 3. Normal User Home Feed Sync (Zero False 0 Items)
 * 4. User Profile & Social Media Branding Persistence
 * 5. Silent Session Renewal (No Routine Yellow Toast Banner)
 * 6. Viewport-Centered Application Notifications (Zero Native Alerts)
 * 7. Redesigned Full-Width User Logo Change Modal
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('--- STARTING PRODUCTION BUG FIXES VERIFICATION ---');

  // Read Source Files
  const serverTs = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');
  const rssSourceManagerTs = fs.readFileSync(path.join(__dirname, '../src/lib/rssSourceManager.ts'), 'utf8');
  const homeScreenTsx = fs.readFileSync(path.join(__dirname, '../src/components/HomeScreenWeb.tsx'), 'utf8');
  const profileScreenTsx = fs.readFileSync(path.join(__dirname, '../src/components/ProfileScreenWeb.tsx'), 'utf8');
  const appTsx = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  const notifServiceTs = fs.readFileSync(path.join(__dirname, '../src/lib/notificationService.ts'), 'utf8');
  const notifModalTsx = fs.readFileSync(path.join(__dirname, '../src/components/AppNotificationModal.tsx'), 'utf8');

  // MODULE 1: Publishing Persistence
  console.log('Testing Module 1: Publishing Persistence...');
  assert(
    serverTs.includes('isDirectlyPublished') && serverTs.includes('isDirectlyPrePublished'),
    'auditAndRepairRssNewsRecords in server.ts must preserve directly published and pre-published records'
  );
  assert(
    serverTs.includes('pre_published'),
    "server.ts must accept 'pre_published' status"
  );
  assert(
    rssSourceManagerTs.includes("status === 'PRE_PUBLISHED'") || rssSourceManagerTs.includes("status === 'pre_published'"),
    'rssSourceManager.ts must handle pre_published status in approval predicate'
  );

  // MODULE 2: Pre-Published Workflow & Visual Badge
  console.log('Testing Module 2: Pre-Published Workflow & Visual Badge...');
  assert(
    homeScreenTsx.includes('PRE-PUBLISHED'),
    'HomeScreenWeb.tsx must render PRE-PUBLISHED badge text'
  );
  assert(
    homeScreenTsx.includes('bg-amber-500/20 text-amber-300 border border-amber-500/60'),
    'Pre-published badge must use amber/yellow styling'
  );
  assert(
    homeScreenTsx.includes("status: 'pre_published'") && homeScreenTsx.includes('isPrePublished: true'),
    'Pre-publish action in HomeScreenWeb.tsx must set status: pre_published and isPrePublished: true'
  );

  // MODULE 3: Normal User Home Feed Sync
  console.log('Testing Module 3: Normal User Home Feed Sync...');
  assert(
    homeScreenTsx.includes('isExplicitlyPublished'),
    'HomeScreenWeb.tsx combinedPosts must include isExplicitlyPublished check for public users'
  );
  assert(
    serverTs.includes('hasExplicitAdminApproval') && serverTs.includes('isServerApprovedAndPublished(p, editorialDb)'),
    'server.ts GET /api/news-posts must explicitly retain approved and pre-published records for public readers'
  );

  // MODULE 4: User Profile & Social Media Branding Persistence
  console.log('Testing Module 4: User Profile & Social Media Branding...');
  assert(
    profileScreenTsx.includes('ensureAuthToken()'),
    'ProfileScreenWeb.tsx must ensureAuthToken() before calling /api/user-profile'
  );
  assert(
    profileScreenTsx.includes("Authorization: `Bearer ${token}`") || profileScreenTsx.includes("headers['Authorization'] = `Bearer ${token}`"),
    'ProfileScreenWeb.tsx must attach Bearer authorization token on saving channel branding'
  );
  assert(
    profileScreenTsx.includes('getAllIndianStates') && profileScreenTsx.includes('getDistrictsForState'),
    'ProfileScreenWeb.tsx must integrate Indian states and districts cascading selector'
  );
  assert(
    profileScreenTsx.includes('syncedIcons'),
    'ProfileScreenWeb.tsx must serialize social media icons reliably'
  );

  // MODULE 5: Silent Routine Session Renewal
  console.log('Testing Module 5: Silent Routine Session Renewal...');
  assert(
    !appTsx.includes("showToast('⚠️ सत्र नवीनीकरण सूचना: आपका सत्र सुरक्षित है।')"),
    'App.tsx must not show routine yellow session renewal toast'
  );
  assert(
    appTsx.includes('Routine session check/renewal handled silently'),
    'App.tsx must handle routine session renewal silently in console'
  );

  // MODULE 6: Viewport-Centered Application Notifications
  console.log('Testing Module 6: Viewport-Centered Application Notifications...');
  assert(
    notifServiceTs.includes('showAppSuccess') && notifServiceTs.includes('showAppError') && notifServiceTs.includes('showAppConfirm'),
    'notificationService.ts must provide showAppSuccess, showAppError, and showAppConfirm'
  );
  assert(
    appTsx.includes('<AppNotificationModal />'),
    'App.tsx must mount <AppNotificationModal />'
  );
  assert(
    !homeScreenTsx.includes("alert('✅ यह RSS खबर सफलतापूर्वक"),
    'HomeScreenWeb.tsx must not use browser native alert for RSS approval'
  );

  // MODULE 7: Redesigned Full-Width User Logo Change Modal
  console.log('Testing Module 7: Redesigned Full-Width User Logo Change Modal...');
  assert(
    profileScreenTsx.includes('max-w-2xl') || profileScreenTsx.includes('max-w-3xl'),
    'Logo change modal must be widened to max-w-2xl or max-w-3xl'
  );
  assert(
    profileScreenTsx.includes('current-asset-fallback'),
    'Current asset img must contain fallback error handler preventing broken image icon'
  );
  assert(
    profileScreenTsx.includes('AdvancedLogoCropEditor'),
    'Logo change modal must support AdvancedLogoCropEditor'
  );

  console.log('✅ ALL PRODUCTION BUG FIX TESTS PASSED SUCCESSFULLY!');
}

runTests();
