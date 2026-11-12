/**
 * Automated Test Suite: Master Admin & Newsroom Improvements
 * 
 * Verifies:
 * 1. WhatsApp Live Inbox Location in Newsroom (above Section 1: Support Inbox)
 * 2. WhatsApp Live Inbox Removal from Control Room
 * 3. Single Unified Header for WhatsApp Live Inbox
 * 4. Responsive Master-Detail Design in WhatsAppLiveInbox
 * 5. Safe Scrolling (no window jumps, container scrollTop tracking)
 * 6. Quick Replies Collapsible Strip (inserts into composer, no auto-send)
 * 7. Blocked Account Guard (riturajtomarorchha@gmail.com stays blocked, no signup redirect)
 * 8. Username Independence from Google Email
 * 9. Custom Logo Persistence (never overwritten with placeholder)
 * 10. Primary Contact Display (no clunky text prefix, matching email style)
 * 11. WhatsApp Marketing Consent (default unchecked, exact Hindi copy, metadata persistence)
 * 12. Verified WhatsApp Number Auto-fill and Lock
 * 13. Web Push & Notification Manager Enhancements
 * 14. 100% Byte-for-Byte Parity between root and web_studio/
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ PASS [${totalTests}]: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL [${totalTests}]: ${description}`);
    console.error(`   Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('  TEST SUITE: MASTER ADMIN & NEWSROOM IMPROVEMENTS VERIFICATION  ');
console.log('================================================================\n');

// 1. WhatsApp Live Inbox Location in NewsroomScreenWeb.tsx
runTest('NewsroomScreenWeb.tsx imports and renders WhatsAppLiveInbox above Support Inbox for Master Admin only', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'NewsroomScreenWeb.tsx'), 'utf8');
  assert.ok(content.includes("import { WhatsAppLiveInbox } from './WhatsAppLiveInbox';"), 'Should import WhatsAppLiveInbox');
  assert.ok(content.includes('id="section-whatsapp-live-inbox"'), 'Should have section-whatsapp-live-inbox');
  assert.ok(content.includes('{isAdmin && ('), 'Should be guarded by isAdmin');
  assert.ok(content.includes('WhatsApp AI Command Center — Live Inbox'), 'Should have exact header title');
  
  // Verify order: WhatsApp Live Inbox appears before Section 1: Support Inbox
  const whatsappIdx = content.indexOf('id="section-whatsapp-live-inbox"');
  const supportIdx = content.indexOf('Section 1: Support Inbox');
  assert.ok(whatsappIdx > 0 && supportIdx > 0 && whatsappIdx < supportIdx, 'WhatsApp Live Inbox must be placed ABOVE Support Inbox');
});

// 2. WhatsApp Live Inbox Removal from Control Room
runTest('AdminPlansAndPackagesManager.tsx has removed the WhatsApp Live Inbox accordion section', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AdminPlansAndPackagesManager.tsx'), 'utf8');
  assert.ok(!content.includes("import { WhatsAppLiveInbox }"), 'Should NOT import WhatsAppLiveInbox in Control Room');
  assert.ok(!content.includes('id="section-whatsapp-inbox"'), 'Should NOT have section-whatsapp-inbox in Control Room');
  assert.ok(!content.includes('<WhatsAppLiveInbox'), 'Should NOT render WhatsAppLiveInbox in Control Room');
  assert.ok(content.includes('ai_news_open_newsroom_whatsapp_inbox'), 'Should dispatch redirect to newsroom inbox');
});

// 3. Single Unified Header in WhatsAppLiveInbox.tsx
runTest('WhatsAppLiveInbox.tsx features clean single header title without redundant inner titles', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'WhatsAppLiveInbox.tsx'), 'utf8');
  assert.ok(content.includes('WhatsApp AI Command Center — Live Inbox'), 'Must contain single clean title');
  assert.ok(!content.includes('WhatsApp AI कमांड सेंटर — लाइव सपोर्ट इनबॉक्स'), 'Should not contain duplicate old Hindi title');
});

// 4. Responsive Master-Detail Design in WhatsAppLiveInbox.tsx
runTest('WhatsAppLiveInbox.tsx supports responsive master-detail view with mobile Back button', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'WhatsAppLiveInbox.tsx'), 'utf8');
  assert.ok(content.includes("selectedConvId ? 'hidden md:flex' : 'flex'"), 'Left column must toggle hidden on mobile when conversation selected');
  assert.ok(content.includes("!selectedConvId ? 'hidden md:flex' : 'flex'"), 'Right column must toggle hidden on mobile when no conversation selected');
  assert.ok(content.includes('setSelectedConvId(null)'), 'Must provide back button that sets selectedConvId to null');
  assert.ok(content.includes('ArrowLeft'), 'Must render ArrowLeft icon for mobile back button');
});

// 5. Safe Scrolling (no window jumps, container scrollTop tracking)
runTest('WhatsAppLiveInbox.tsx utilizes container scrollTop and isNearBottomRef instead of scrollIntoView', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'WhatsAppLiveInbox.tsx'), 'utf8');
  assert.ok(content.includes('chatContainerRef'), 'Must use chatContainerRef');
  assert.ok(content.includes('isNearBottomRef'), 'Must track isNearBottomRef to avoid unwanted scrolling');
  assert.ok(content.includes('chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight'), 'Must scroll container scrollTop');
  assert.ok(!content.includes('messagesEndRef.current?.scrollIntoView'), 'Must not call scrollIntoView on polling messages');
});

// 6. Quick Replies Collapsible Strip
runTest('WhatsAppLiveInbox.tsx has collapsible quick replies strip that populates composer without auto-sending', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'WhatsAppLiveInbox.tsx'), 'utf8');
  assert.ok(content.includes('showQuickReplies'), 'Must have showQuickReplies state');
  assert.ok(content.includes('setReplyText('), 'Clicking template must set reply text in composer');
  assert.ok(content.includes('replyInputRef.current.focus()'), 'Must focus replyInputRef on template click');
});

// 7. Blocked Account Guard (riturajtomarorchha@gmail.com stays blocked)
runTest('AuthWelcomeScreen.tsx blocked account guard prevents routing blocked accounts to signup', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AuthWelcomeScreen.tsx'), 'utf8');
  assert.ok(content.includes('isAccountBlocked'), 'Must check isAccountBlocked');
  assert.ok(content.includes('user_account_blocked'), 'Must dispatch user_account_blocked event');
  assert.ok(content.includes('onLoginSuccess(blockedUser)'), 'Must call onLoginSuccess with blocked status');
  assert.ok(content.includes('isBlocked: true'), 'Must enforce isBlocked: true');
  
  // Verify clean direct login does not pass email prefix as name
  assert.ok(content.includes('await handleGoogleUserSuccess(clean);'), 'Direct email login must not pass email prefix as name');
});

// 8. Username Independence from Google Email
runTest('Username generation logic generates clean usernames independent of email address', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AuthWelcomeScreen.tsx'), 'utf8');
  assert.ok(content.includes('generateSafeUsernameFromName'), 'Must define generateSafeUsernameFromName');
  
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
  assert.ok(serverContent.includes('cleanGenerateUsername'), 'server.ts must have cleanGenerateUsername');
  assert.ok(serverContent.includes('base.replace(/@.*$/, \'\')'), 'Must strip email domain/at-sign from username');
});

// 9. Custom Logo Persistence
runTest('Logo persistence guards protect custom logos against default placeholder overwrite', () => {
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
  assert.ok(serverContent.includes('/assets/ai_news_maker_logo.png'), 'Must identify default logo');
  assert.ok(serverContent.includes('safeIncomingLogo'), 'Must preserve existing custom logo in server.ts');
  
  const authContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AuthWelcomeScreen.tsx'), 'utf8');
  assert.ok(authContent.includes('candidateLogo'), 'AuthWelcomeScreen must detect candidateLogo to preserve');
});

// 10. Primary Contact Display in ProfileScreenWeb.tsx
runTest('ProfileScreenWeb.tsx displays primary phone with Phone icon and verified badge without clunky prefix', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'ProfileScreenWeb.tsx'), 'utf8');
  assert.ok(!content.includes('<span>प्राइमरी WhatsApp: +91'), 'Should not contain old text prefix label');
  assert.ok(content.includes('Phone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0"'), 'Should render Phone icon');
  assert.ok(content.includes('सत्यापित / Locked'), 'Should render verified badge');
});

// 11. WhatsApp Marketing Consent Checkbox and Metadata
runTest('WhatsApp marketing consent is optional, unchecked by default, with exact Hindi text and metadata audit', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AuthWelcomeScreen.tsx'), 'utf8');
  assert.ok(authContent.includes('const [whatsappMarketingConsent, setWhatsappMarketingConsent] = useState<boolean>(false);'), 'Default value must be false');
  assert.ok(authContent.includes('हाँ, मैं AI NEWS MAKER / BREAKING NEWS WALA से WhatsApp पर समाचार अपडेट, मार्केटिंग और प्रमोशनल सामग्री प्राप्त करना चाहता/चाहती हूँ।'), 'Must match exact Hindi consent text');
  assert.ok(authContent.includes('whatsappMarketingConsentSource: \'signup_step2\''), 'Must record audit source');
  
  const profileContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'ProfileScreenWeb.tsx'), 'utf8');
  assert.ok(profileContent.includes('whatsappMarketingConsentSource: \'profile_settings\''), 'Profile settings must record source');
  
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
  assert.ok(serverContent.includes('whatsappMarketingConsent'), 'server.ts must accept and persist whatsappMarketingConsent');
  assert.ok(serverContent.includes('whatsappMarketingConsentAt'), 'server.ts must persist whatsappMarketingConsentAt');
});

// 12. Verified WhatsApp Number Auto-fill and Lock
runTest('Verified WhatsApp number is auto-filled and locked in profile setup', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AuthWelcomeScreen.tsx'), 'utf8');
  assert.ok(authContent.includes('existingVerifiedMobile'), 'Should detect existing verified mobile');
  assert.ok(authContent.includes('setIsWhatsappVerified(true)'), 'Should set isWhatsappVerified to true if already verified');
});

// 13. Web Push & Notification Manager Enhancements
runTest('Web Push Service Worker handlers and endpoints are fully wired', () => {
  const swContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  assert.ok(swContent.includes("addEventListener('push'") || swContent.includes('addEventListener("push"'), 'sw.js must handle push events');
  assert.ok(swContent.includes("addEventListener('notificationclick'") || swContent.includes('addEventListener("notificationclick"'), 'sw.js must handle notificationclick events');
  
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
  assert.ok(serverContent.includes('/api/notifications/subscribe'), 'server.ts must have /api/notifications/subscribe');
  assert.ok(serverContent.includes('/api/notifications/vapid-key'), 'server.ts must have /api/notifications/vapid-key');
  assert.ok(serverContent.includes('/api/notifications/broadcast'), 'server.ts must have /api/notifications/broadcast');
  
  const notifMgr = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'notificationManager.ts'), 'utf8');
  assert.ok(notifMgr.includes('registerWebPushSubscription'), 'notificationManager must export registerWebPushSubscription');
  assert.ok(notifMgr.includes('ai_news_notification_received'), 'notificationManager must dispatch ai_news_notification_received');
});

// 14. 100% Byte-for-Byte Parity Check
runTest('All 10 modified files have 100% byte-for-byte parity with web_studio/', () => {
  const files = [
    'public/sw.js',
    'server.ts',
    'src/App.tsx',
    'src/components/AdminPlansAndPackagesManager.tsx',
    'src/components/AuthWelcomeScreen.tsx',
    'src/components/NewsroomScreenWeb.tsx',
    'src/components/ProfileScreenWeb.tsx',
    'src/components/WhatsAppLiveInbox.tsx',
    'src/lib/notificationManager.ts',
    'src/types.ts',
  ];
  
  for (const f of files) {
    const rootPath = path.join(__dirname, '..', f);
    const studioPath = path.join(__dirname, '..', 'web_studio', f);
    assert.ok(fs.existsSync(rootPath), `Root file must exist: ${f}`);
    assert.ok(fs.existsSync(studioPath), `web_studio file must exist: ${f}`);
    const rootBuf = fs.readFileSync(rootPath);
    const studioBuf = fs.readFileSync(studioPath);
    assert.ok(rootBuf.equals(studioBuf), `Byte mismatch detected in: ${f}`);
  }
});

console.log('\n================================================================');
console.log(`  RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
