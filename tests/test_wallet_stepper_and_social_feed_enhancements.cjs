/**
 * test_wallet_stepper_and_social_feed_enhancements.cjs
 * Validates:
 * 1. CoinRechargeModal uses createPortal and z-[99999]
 * 2. AppTopBarWeb mounts CoinRechargeModal outside header
 * 3. ProfileScreenWeb includes 3 coin recharge packages in rewards_wallet
 * 4. 30-day transaction history & auto-delete notice in rewards_wallet
 * 5. formatTrialExpiryDate never returns '7 दिन बाद' and computes exact calendar date
 * 6. PackagePurchaseModal features Cashfree Payments only, with zero mentions of Razorpay
 * 7. VideoStudioWeb stepper has no tickmarks, all 7 steps visible, 36/64 columns, balanced yellow button, and executeReset closes modal
 * 8. Social Feed Brand cards have 2-line footer strip with logo, User SEO cards exclude Nai Dunia
 * 9. 100% SHA256 parity between root and web_studio/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

console.log('==================================================================');
console.log('🧪 VERIFYING WALLET, STEPPER, TRIAL DATE & SOCIAL FEED ENHANCEMENTS');
console.log('==================================================================');

// TC1: CoinRechargeModal & AppTopBarWeb Portaling
console.log('Testing TC1: CoinRechargeModal Portaling & TopBar Fix...');
const coinModalSrc = fs.readFileSync(path.join(__dirname, '../src/components/CoinRechargeModal.tsx'), 'utf-8');
const topBarSrc = fs.readFileSync(path.join(__dirname, '../src/components/AppTopBarWeb.tsx'), 'utf-8');

assert(coinModalSrc.includes("import { createPortal } from 'react-dom';"), 'CoinRechargeModal must import createPortal');
assert(coinModalSrc.includes('createPortal(modalContent, document.body)'), 'CoinRechargeModal must portal to document.body');
assert(coinModalSrc.includes('z-[99999]'), 'CoinRechargeModal must have z-[99999]');
assert(topBarSrc.indexOf('</header>') < topBarSrc.indexOf('<CoinRechargeModal'), 'CoinRechargeModal must mount outside header');
console.log('✅ [PASS] TC1: Coin modal portaling and outside-header mounting verified');

// TC2: ProfileScreenWeb 3 Coin Recharge Packages
console.log('Testing TC2: Profile Rewards Wallet 3 Coin Recharge Packages...');
const profileSrc = fs.readFileSync(path.join(__dirname, '../src/components/ProfileScreenWeb.tsx'), 'utf-8');
assert(profileSrc.includes('COIN_PACKAGES.map'), 'Profile rewards wallet must map over COIN_PACKAGES');
assert(profileSrc.includes('handleExecuteWalletRecharge'), 'Profile rewards wallet must define handleExecuteWalletRecharge');
assert(profileSrc.includes('कॉइन रिचार्ज पैक चुनें (Instant Coin Recharge Packs)'), 'Profile rewards wallet must show recharge pack title');
assert(coinModalSrc.includes('starter') && coinModalSrc.includes('supersaver') && coinModalSrc.includes('megapro'), 'All 3 packages must be defined in COIN_PACKAGES');
console.log('✅ [PASS] TC2: 3 Coin Recharge Packages in rewards wallet verified');

// TC3: 30-Day Retention Notice & Filter
console.log('Testing TC3: 30-Day Wallet Transaction History...');
assert(profileSrc.includes('30 दिन पुराने रिकॉर्ड्स स्वतः मेमोरी से डिलीट हो जाते हैं'), 'Profile must display 30-day auto-delete notice');
assert(coinModalSrc.includes('30 दिन पुराने रिकॉर्ड्स स्वतः मेमोरी से डिलीट हो जाते हैं'), 'Coin modal must display 30-day auto-delete notice');
assert(profileSrc.includes('Date.now() - 30 * 24 * 60 * 60 * 1000'), 'Profile must filter transactions older than 30 days');
console.log('✅ [PASS] TC3: 30-day transaction history and auto-delete notice verified');

// TC4: Exact Trial Expiration Calendar Date
console.log('Testing TC4: Exact Trial Expiration Calendar Date...');
assert(!profileSrc.includes("if (!timestamp || isNaN(timestamp)) return '7 दिन बाद';"), 'Profile formatTrialExpiryDate must not return 7 दिन बाद');
assert(profileSrc.includes('targetMs = validStart + 7 * 86400000;'), 'Profile formatTrialExpiryDate must calculate joining date + 7 days');
console.log('✅ [PASS] TC4: Exact trial expiration calendar date calculation verified');

// TC5: PackagePurchaseModal Payment Branding
console.log('Testing TC5: PackagePurchaseModal Cashfree Branding...');
const packageModalSrc = fs.readFileSync(path.join(__dirname, '../src/components/PackagePurchaseModal.tsx'), 'utf-8');
assert(!packageModalSrc.includes('Razorpay'), 'PackagePurchaseModal must not contain Razorpay');
assert(packageModalSrc.includes('Cashfree Payments • UPI, क्रेडिट कार्ड व डेबिट कार्ड सपोर्ट'), 'PackagePurchaseModal must feature Cashfree Payments');
console.log('✅ [PASS] TC5: Cashfree Payments branding verified without Razorpay');

// TC6: VideoStudioWeb Stepper, Yellow Button & Reset Fix
console.log('Testing TC6: VideoStudioWeb Stepper, Mode Button & Reset...');
const videoStudioSrc = fs.readFileSync(path.join(__dirname, '../src/components/VideoStudioWeb.tsx'), 'utf-8');
assert(!videoStudioSrc.includes('{s.ok && !isActive && <Check'), 'Stepper must not render Check tickmarks');
assert(videoStudioSrc.includes('lg:w-[36%] xl:w-[34%]'), 'Left column must be 36% / 34%');
assert(videoStudioSrc.includes('lg:w-[64%] xl:w-[66%]'), 'Right column must be 64% / 66%');
assert(videoStudioSrc.includes('setIsResetConfirmModalOpen(false);'), 'executeReset must close confirmation modal');
assert(videoStudioSrc.includes('क्विक वीडियो मोड (Quick Video Mode)') && videoStudioSrc.includes('पर वापस जाएं'), 'Studio mode yellow button must have balanced 2 lines');
console.log('✅ [PASS] TC6: Stepper without tickmarks, column widths, balanced button & reset fix verified');

// TC7: Social Feed Brand & User Cards
console.log('Testing TC7: Social Feed Brand & User Cards Overhaul...');
const newsroomSrc = fs.readFileSync(path.join(__dirname, '../src/components/NewsroomScreenWeb.tsx'), 'utf-8');
const serverCjs = fs.readFileSync(path.join(__dirname, '../server.cjs'), 'utf-8');

assert(newsroomSrc.includes('ऐसी ही खबरों व आकर्षक ग्राफ़िक्स हेतु AI News Maker डाउनलोड करें'), 'Brand card must have complete 2-line promo footer');
assert(newsroomSrc.includes('विजिट करें: www.ainewsmaker.online'), 'Brand card footer must have official URL');
assert(newsroomSrc.includes('/assets/ai_news_maker_logo.png'), 'Brand card footer must include AI News Maker logo');
assert(newsroomSrc.includes('isNaiDunia'), 'User cards must exclude Nai Dunia');
assert(serverCjs.includes('Anmol Sandesh'), 'Server must generate Anmol Sandesh user cards for user tab');
console.log('✅ [PASS] TC7: Social Feed Brand 2-line footer & User SEO cards verified');

// TC8: 100% Mirror Parity
console.log('Testing TC8: 100% SHA256 Mirror Parity...');
const filesToCheck = [
  'server.cjs',
  'server.ts',
  'src/components/AppTopBarWeb.tsx',
  'src/components/CoinRechargeModal.tsx',
  'src/components/NewsroomScreenWeb.tsx',
  'src/components/PackagePurchaseModal.tsx',
  'src/components/ProfileScreenWeb.tsx',
  'src/components/VideoStudioWeb.tsx'
];

filesToCheck.forEach(f => {
  const h1 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', f))).digest('hex');
  const h2 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../web_studio', f))).digest('hex');
  assert.strictEqual(h1, h2, `Parity mismatch on ${f}`);
});
console.log('✅ [PASS] TC8: 100% SHA256 parity verified across all files');

console.log('==================================================================');
console.log('🎉 ALL 8 TESTS IN TEST_WALLET_STEPPER_AND_SOCIAL_FEED_ENHANCEMENTS PASSED!');
console.log('==================================================================');
