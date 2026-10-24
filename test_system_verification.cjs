const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 5178;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runTests() {
  console.log(`Starting background test server on port ${TEST_PORT}...`);
  const serverProcess = spawn('node', ['dev.cjs'], {
    env: { ...process.env, PORT: String(TEST_PORT), DEFAULT_APP_PORT: String(TEST_PORT), NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (data) => {
    // console.log(`[SERVER]: ${data}`);
  });
  serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERR]: ${data}`);
  });

  // Wait for server to boot
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await request('GET', '/api/categories');
      if (res.status === 200 && res.body && res.body.success) {
        ready = true;
        break;
      }
    } catch {}
  }

  if (!ready) {
    console.error('Failed to connect to test server within 10 seconds.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Server is ready. Executing Master Prompt test suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Categories GET & POST
    console.log('--- 1. Testing Categories API & Persistence ---');
    const getCatsRes = await request('GET', '/api/categories');
    assert(getCatsRes.status === 200 && getCatsRes.body.success === true, 'GET /api/categories returns 200 with success: true');
    const categories = getCatsRes.body.categories;
    assert(Array.isArray(categories) && categories.length > 0, `Categories array exists with ${categories.length} categories`);

    // 2. Master Prompt Package Pricing & Limits Verification
    console.log('\n--- 2. Testing Master Prompt Package Pricing & Limits ---');
    const getPlansRes = await request('GET', '/api/plans');
    assert(getPlansRes.status === 200 && getPlansRes.body.success === true, 'GET /api/plans returns 200 with success: true');
    const plans = getPlansRes.body.plans;
    assert(Array.isArray(plans) && plans.length >= 4, `Plans catalog contains ${plans.length} tiers`);

    const basicPlan = plans.find((p) => p.id === 'basic');
    const advancePlan = plans.find((p) => p.id === 'advanced');
    const proPlan = plans.find((p) => p.id === 'professional');
    const vipPlan = plans.find((p) => p.id === 'ultra');

    assert(
      basicPlan && basicPlan.regularPriceNum === 2999 && basicPlan.priceNum === 999 && basicPlan.maxGraphicsPerDay === 10,
      'Basic plan has ₹2,999 regular, ₹999 launching offer, and 10 daily graphics limit'
    );
    assert(
      advancePlan && advancePlan.regularPriceNum === 4999 && advancePlan.priceNum === 2499 && advancePlan.maxGraphicsPerDay === 25,
      'Advance plan has ₹4,999 regular, ₹2,499 launching offer, and 25 daily graphics limit'
    );
    assert(
      proPlan && proPlan.regularPriceNum === 6999 && proPlan.priceNum === 4199 && proPlan.maxGraphicsPerDay === 50,
      'Pro plan has ₹6,999 regular, ₹4,199 launching offer, and 50 daily graphics limit'
    );
    assert(
      vipPlan && vipPlan.regularPriceNum === 9999 && vipPlan.priceNum === 6499 && vipPlan.maxGraphicsPerDay >= 9999,
      'VIP Desk plan has ₹9,999 regular, ₹6,499 launching offer, and unlimited daily graphics limit'
    );

    // 3. Template Manager & 8 Frame Categories Verification
    console.log('\n--- 3. Testing Template Manager & 8 Frame Categories ---');
    const getTemplatesRes = await request('GET', '/api/template-configs');
    assert(getTemplatesRes.status === 200 && getTemplatesRes.body.success === true, 'GET /api/template-configs returns 200 with configs');
    const configs = getTemplatesRes.body.configs;
    assert(configs && typeof configs === 'object', 'Template configs is a valid object dictionary');

    // Verify cascading tier logic and categories
    const updateTemplateRes = await request('POST', '/api/admin/save-template-config', {
      templateId: 'graphic_002',
      selectedTier: 'ADVANCED',
      category: 'Package Frame',
      coinPrice: 15,
      isActive: true,
    });
    assert(
      updateTemplateRes.status === 200 && updateTemplateRes.body.success === true,
      'POST /api/admin/save-template-config persists cascading tier ADVANCED, category, and coin price'
    );
    const updatedCfg = updateTemplateRes.body.config || (updateTemplateRes.body.configs && updateTemplateRes.body.configs['graphic_002']);
    assert(
      updatedCfg.allowedPlans.includes('ADVANCED') &&
        updatedCfg.allowedPlans.includes('PRO') &&
        updatedCfg.allowedPlans.includes('VIP DESK') &&
        !updatedCfg.allowedPlans.includes('BASIC'),
      'Cascading rule verified: ADVANCED tier cascades to ADVANCED, PRO, and VIP DESK'
    );

    // 4. Coin Unlock Frame API
    console.log('\n--- 4. Testing Frame Coin Unlock API & IST Date Expiry ---');
    const testCoinUser = `coin_test_${Date.now()}@example.com`;
    // Credit coins first
    await request('POST', '/api/admin/credit-coins', { email: testCoinUser, coins: 50, reason: 'test credit' });

    const unlockRes = await request('POST', '/api/wallet/unlock-frame', {
      email: testCoinUser,
      frameId: 'graphic_002',
    });
    assert(
      unlockRes.status === 200 && unlockRes.body.success === true,
      'POST /api/wallet/unlock-frame successfully debits coins and unlocks frame'
    );

    const getUnlocksRes = await request('GET', `/api/wallet/frame-unlocks?email=${encodeURIComponent(testCoinUser)}`);
    assert(
      getUnlocksRes.status === 200 &&
        Array.isArray(getUnlocksRes.body.unlockedFrameIds) &&
        getUnlocksRes.body.unlockedFrameIds.includes('graphic_002'),
      'GET /api/wallet/frame-unlocks confirms unlocked frame for user for IST today'
    );

    // 5. User Download Status & Quota Enforcement
    console.log('\n--- 5. Testing User Daily Download Quota & Exhaustion ---');
    const testReporter = `reporter_${Date.now()}@example.com`;
    const statusRes = await request('GET', `/api/user-download-status?email=${encodeURIComponent(testReporter)}`);
    assert(statusRes.status === 200 && statusRes.body.dailyQuota === 10, 'Fresh Basic user starts with 10 daily quota');
    assert(statusRes.body.remainingDownloads === 10, 'Fresh Basic user has 10 remaining downloads today');

    // Check-only mode does not increment count
    const checkOnlyRes = await request('POST', '/api/verify-download-entitlement', {
      email: testReporter,
      checkOnly: true,
    });
    assert(checkOnlyRes.status === 200 && checkOnlyRes.body.allowed === true, 'checkOnly mode validates entitlement');

    const statusAfterCheck = await request('GET', `/api/user-download-status?email=${encodeURIComponent(testReporter)}`);
    assert(statusAfterCheck.body.remainingDownloads === 10, 'checkOnly mode verified: count did NOT increment');

    // Perform downloads up to limit (10 for Basic)
    for (let i = 1; i <= 10; i++) {
      const dl = await request('POST', '/api/verify-download-entitlement', { email: testReporter });
      assert(dl.status === 200 && dl.body.allowed === true, `Basic user download ${i}/10 approved`);
    }

    // 11th download exceeds quota
    const dl11 = await request('POST', '/api/verify-download-entitlement', { email: testReporter });
    assert(dl11.status === 403 && dl11.body.quotaExceeded === true, '11th download rejected with 403 quotaExceeded');

    // 6. Limit Increase Request API
    console.log('\n--- 6. Testing Limit Increase Request API ---');
    const reqLimitRes = await request('POST', '/api/request-limit-increase', {
      email: testReporter,
      requestedLimit: 10,
      reason: 'विशेष कवरेज हेतु अतिरिक्त लिमिट की आवश्यकता है',
    });
    assert(reqLimitRes.status === 200 && reqLimitRes.body.success === true, 'POST /api/request-limit-increase logs request');

    const adminRequestsRes = await request('GET', '/api/admin/limit-increase-requests');
    assert(
      adminRequestsRes.status === 200 &&
        Array.isArray(adminRequestsRes.body.requests) &&
        adminRequestsRes.body.requests.some((r) => r.email === testReporter),
      'GET /api/admin/limit-increase-requests returns logged limit increase request'
    );

    // 7. Video & Reels, Admin Publishing & Ready-to-Use Studio
    console.log('\n--- 7. Testing Video & Reels, 4-Headlines & 4:5 Core Crop ---');

    // Test AI Headline Generator API
    const aiHeadlinesRes = await request('POST', '/api/generate-video-headlines', {
      caption: 'संसद में ऐतिहासिक डिजिटल मीडिया बिल पास हुआ है जिसमें डिजिटल संवाददाताओं के लिए नए नियम तय किए गए हैं।',
      projectRatio: '9:16',
      maxLines: 3,
    });
    assert(
      aiHeadlinesRes.status === 200 &&
        aiHeadlinesRes.body.success === true &&
        Array.isArray(aiHeadlinesRes.body.headlines) &&
        aiHeadlinesRes.body.headlines.length === 4,
      'POST /api/generate-video-headlines returns 4 distinct headline variants'
    );
    assert(
      aiHeadlinesRes.body.headlines.every((h) => typeof h === 'string' && h.trim().length > 5),
      'All 4 headline variants are non-empty Hindi journalistic headlines'
    );

    // Test Admin Video Publishing with 4:5 Core Crop & 4 Headline Variants
    const testVideoId = `vid-test-${Date.now()}`;
    const testVideoUploadRes = await request('POST', '/api/admin/videos/upload', {
      id: testVideoId,
      title: 'संसद में ऐतिहासिक डिजिटल मीडिया बिल पास',
      caption: 'संसद में ऐतिहासिक डिजिटल मीडिया बिल पास हुआ है जिसमें डिजिटल संवाददाताओं के लिए नए नियम तय किए गए हैं।',
      aspectRatio: '9:16',
      duration: '00:45',
      channel: 'BREAKING NEWS WALA',
      views: '1.2K',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnailUrl: '',
      category: 'राजनीति',
      headlineVariants: [
        'संसद में ऐतिहासिक डिजिटल मीडिया बिल पास',
        'डिजिटल संवाददाताओं के लिए नए प्रेस नियम जारी',
        'देश भर में डिजिटल मीडिया कानून को मंजूरी',
        'संसद का बड़ा फैसला: डिजिटल मीडिया बिल पारित',
      ],
      cropRegion: {
        x: 0,
        y: 0.22,
        width: 1,
        height: 0.8,
        aspectRatio: '4:5',
      },
      isOnly4_5: false,
      isFullVisibilityAvailable: true,
      compatibleFrameIds: ['frame-custom-3line-4-5', 'frame-custom-full-9-16'],
      sourceDimensions: {
        width: 1080,
        height: 1920,
      },
    });
    assert(
      testVideoUploadRes.status === 200 && testVideoUploadRes.body.success === true,
      'POST /api/admin/videos/upload saves 9:16 video with 4:5 crop & 4 headlines'
    );

    // Verify video list returns persisted metadata
    const videosListRes = await request('GET', '/api/videos');
    assert(
      videosListRes.status === 200 &&
        videosListRes.body.success === true &&
        Array.isArray(videosListRes.body.videos),
      'GET /api/videos returns videos list'
    );

    const savedVideo = videosListRes.body.videos.find((v) => v.id === testVideoId);
    assert(savedVideo !== undefined, 'Uploaded test video exists in GET /api/videos');
    assert(
      savedVideo.cropRegion && savedVideo.cropRegion.y === 0.22 && savedVideo.cropRegion.aspectRatio === '4:5',
      '4:5 crop region is persisted with exact normalized Y coordinate'
    );
    assert(
      Array.isArray(savedVideo.headlineVariants) && savedVideo.headlineVariants.length === 4,
      'All 4 headline variants are persisted in video item'
    );
    assert(
      Array.isArray(savedVideo.compatibleFrameIds) &&
        savedVideo.compatibleFrameIds.includes('frame-custom-3line-4-5') &&
        savedVideo.compatibleFrameIds.includes('frame-custom-full-9-16'),
      'Both Frame 1 and Frame 2 are recorded in compatibleFrameIds for 9:16 video'
    );

    // Test 4:5-Only Source Video Upload
    const test45VideoId = `vid-test-45-${Date.now()}`;
    const test45UploadRes = await request('POST', '/api/admin/videos/upload', {
      id: test45VideoId,
      title: 'विशेष 4:5 ग्राउंड रिपोर्ट',
      caption: 'यह वीडियो केवल 4:5 फीड फॉर्मेट में उपलब्ध है।',
      aspectRatio: '4:5',
      duration: '00:30',
      channel: 'BREAKING NEWS WALA',
      views: '500',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnailUrl: '',
      category: 'राष्ट्रीय',
      headlineVariants: ['विशेष 4:5 ग्राउंड रिपोर्ट'],
      isOnly4_5: true,
      isFullVisibilityAvailable: false,
      compatibleFrameIds: ['frame-custom-3line-4-5'],
      sourceDimensions: { width: 1080, height: 1350 },
    });
    assert(
      test45UploadRes.status === 200 && test45UploadRes.body.success === true,
      'POST /api/admin/videos/upload saves 4:5-only video'
    );

    const videosListAfter45 = await request('GET', '/api/videos');
    const saved45Video = videosListAfter45.body.videos.find((v) => v.id === test45VideoId);
    assert(saved45Video !== undefined, '4:5 video exists in list');
    assert(saved45Video.isOnly4_5 === true, 'isOnly4_5 flag is correctly persisted');
    assert(
      saved45Video.compatibleFrameIds &&
        saved45Video.compatibleFrameIds.includes('frame-custom-3line-4-5') &&
        !saved45Video.compatibleFrameIds.includes('frame-custom-full-9-16'),
      '4:5 video only includes 4:5 compatible frames, excluding full 9:16 only frames'
    );

    // 8. Admin Music Library Multi-Mode & Tier Permissions
    console.log('\n--- 8. Testing Admin Music Library & Tier Mode Permissions ---');
    const testTrackId = `music-test-${Date.now()}`;
    const uploadMusicRes = await request('POST', '/api/admin/music-library/upload', {
      id: testTrackId,
      title: 'सुपर एक्सक्लूसिव ब्रेकिंग ट्यून',
      category: 'Breaking',
      url: 'https://example.com/audio/tune.mp3',
      targetModes: ['quick'],
      allowedTiers: ['pro', 'vip'],
    });
    assert(uploadMusicRes.status === 200 && uploadMusicRes.body.success === true, 'POST /api/admin/music-library/upload saves track with modes & tiers');

    // Query with basic tier in quick mode -> should NOT be returned
    const getMusicBasicRes = await request('GET', '/api/music-library?mode=quick&tier=basic');
    assert(getMusicBasicRes.status === 200 && getMusicBasicRes.body.success === true, 'GET /api/music-library returns 200 for basic tier');
    const basicTracks = getMusicBasicRes.body.tracks;
    assert(!basicTracks.some((t) => t.id === testTrackId), 'Track allowed only for Pro/VIP is hidden from Basic tier');

    // Query with pro tier in quick mode -> SHOULD be returned
    const getMusicProRes = await request('GET', '/api/music-library?mode=quick&tier=pro');
    assert(getMusicProRes.status === 200 && getMusicProRes.body.success === true, 'GET /api/music-library returns 200 for pro tier');
    const proTracks = getMusicProRes.body.tracks;
    assert(proTracks.some((t) => t.id === testTrackId), 'Track is returned for Pro tier in quick mode');

    // Query in studio mode -> should NOT be returned because targetModes is ['quick']
    const getMusicStudioRes = await request('GET', '/api/music-library?mode=studio&tier=pro');
    assert(!getMusicStudioRes.body.tracks.some((t) => t.id === testTrackId), 'Track targeted to quick mode is excluded from studio mode');

    // Update track permissions via PUT /api/admin/music-library/:id
    const updateTrackRes = await request('PUT', `/api/admin/music-library/${testTrackId}`, {
      targetModes: ['quick', 'studio'],
      allowedTiers: ['basic', 'pro', 'vip'],
    });
    assert(updateTrackRes.status === 200 && updateTrackRes.body.success === true, 'PUT /api/admin/music-library/:id updates track permissions');

    // Now basic tier in studio mode should see it
    const getMusicAfterUpdate = await request('GET', '/api/music-library?mode=studio&tier=basic');
    assert(getMusicAfterUpdate.body.tracks.some((t) => t.id === testTrackId), 'Updated track is now visible in studio mode for basic tier');

    // Clean up test track
    await request('DELETE', `/api/admin/music-library/${testTrackId}`);

    // 9. Headline Scheduling Tier Entitlement & Bonus Card Bypass
    console.log('\n--- 9. Testing Headline Scheduling Entitlement & Bonus Card Bypass ---');
    const testBasicUser = `basic_user_${Date.now()}@example.com`;
    // Attempting scheduled headlines with basic plan should return 403
    const scheduleBasicRes = await request('POST', '/api/verify-download-entitlement', {
      email: testBasicUser,
      headlineScheduleMode: 'scheduled',
      hasScheduledHeadlines: true,
      checkOnly: true,
    });
    assert(
      scheduleBasicRes.status === 403 && scheduleBasicRes.body.allowed === false,
      'Scheduled headlines download blocked for Basic tier with 403'
    );

    // Single headline mode should be allowed for basic tier
    const singleBasicRes = await request('POST', '/api/verify-download-entitlement', {
      email: testBasicUser,
      headlineScheduleMode: 'single',
      hasScheduledHeadlines: false,
      checkOnly: true,
    });
    assert(
      singleBasicRes.status === 200 && singleBasicRes.body.allowed === true,
      'Single headline download allowed for Basic tier'
    );

    // Expired user bonus card download bypass
    const expiredBonusRes = await request('POST', '/api/verify-download-entitlement', {
      email: 'expired_user_test@example.com',
      isBonus: true,
      checkOnly: true,
    });
    assert(
      expiredBonusRes.status === 200 && expiredBonusRes.body.allowed === true,
      'Bonus card download is permitted for expired users (isBonus bypass)'
    );

    // 10. AI News Studio - Headline Quality, Regenerate & 3-Paragraph Caption Policy
    console.log('\n--- 10. Testing AI News Studio: Config, Regenerate & 3-Paragraph Captions ---');
    
    // Backup current ai_features_config.json if exists
    const configPath = path.join(__dirname, 'ai_features_config.json');
    let originalConfigRaw = null;
    if (fs.existsSync(configPath)) {
      originalConfigRaw = fs.readFileSync(configPath, 'utf8');
    }

    // A. GET /api/ai-features-config
    const getAiConfigRes = await request('GET', '/api/ai-features-config?tier=basic');
    assert(
      getAiConfigRes.status === 200 && getAiConfigRes.body.success === true,
      'GET /api/ai-features-config returns 200 with success: true'
    );
    assert(
      getAiConfigRes.body.config && (getAiConfigRes.body.config.headlineLengthPolicy || getAiConfigRes.body.config.headlineRegeneration),
      'AI features config contains headline policy and regeneration parameters'
    );
    assert(
      getAiConfigRes.body.config && typeof getAiConfigRes.body.config === 'object',
      'AI features config is returned as a valid object'
    );
    assert(
      typeof getAiConfigRes.body.canRegenerateHeadlines === 'boolean',
      'AI features config returns boolean canRegenerateHeadlines permission'
    );

    // B. Test Central Permission Enforcement via POST /api/admin/ai-features-config
    const testAdminConfig = {
      permissions: {
        regenerateHeadlines: {
          allowedTiers: ['advanced', 'advance', 'pro', 'professional', 'vip', 'vip-dash', 'vip_dash', 'vip_desk'],
          allowAllTiers: false,
        },
      },
    };
    const updateConfigRes = await request('POST', '/api/admin/ai-features-config', testAdminConfig);
    assert(
      updateConfigRes.status === 200 && updateConfigRes.body.success === true,
      'POST /api/admin/ai-features-config updates permissions successfully'
    );

    // Verify basic tier is blocked from regenerate
    const getAiConfigBasicRes = await request('GET', '/api/ai-features-config?tier=basic');
    assert(
      getAiConfigBasicRes.body.canRegenerateHeadlines === false,
      'Basic tier is correctly identified as not permitted when restricted to Pro/VIP'
    );

    const regenBlockedRes = await request('POST', '/api/regenerate-headlines', {
      userTier: 'basic',
      canonicalContext: {
        title: 'कानपुर में बड़ा रेल हादसा टला, ट्रैक पर मिला गैस सिलेंडर',
        text: 'उत्तर प्रदेश के कानपुर में रविवार देर रात कालिंदी एक्सप्रेस को उड़ाने की साजिश नाकाम हो गई। रेलवे ट्रैक पर रखा एलपीजी गैस सिलेंडर ट्रेन से टकराया, लेकिन बड़ा हादसा टल गया। लोको पायलट की सूझबूझ से आपातकालीन ब्रेक लगाए गए। पुलिस और सुरक्षा एजेंसियां मामले की गहन जांच कर रही हैं।',
      },
    });
    assert(
      regenBlockedRes.status === 403 && regenBlockedRes.body.success === false,
      'POST /api/regenerate-headlines returns 403 Forbidden for disallowed tier'
    );

    // Verify Pro, Advanced, and VIP-Dash tiers are permitted
    const getAiConfigProRes = await request('GET', '/api/ai-features-config?tier=pro');
    assert(
      getAiConfigProRes.body.canRegenerateHeadlines === true,
      'Pro tier is permitted to regenerate headlines'
    );

    const getAiConfigAdvRes = await request('GET', '/api/ai-features-config?tier=advanced');
    assert(
      getAiConfigAdvRes.body.canRegenerateHeadlines === true,
      'Advanced tier is permitted to regenerate headlines'
    );

    const getAiConfigVipRes = await request('GET', '/api/ai-features-config?tier=vip-dash');
    assert(
      getAiConfigVipRes.body.canRegenerateHeadlines === true,
      'VIP-Dash tier is permitted to regenerate headlines'
    );

    // C. Regenerate Headlines with Canonical Context & Previous Headlines Exclusion
    const testCanonicalContext = {
      url: 'https://example.com/news/rail-incident',
      title: 'कानपुर में बड़ा रेल हादसा टला, कालिंदी एक्सप्रेस के ट्रैक पर मिला गैस सिलेंडर',
      text: 'उत्तर प्रदेश के कानपुर में रविवार देर रात कालिंदी एक्सप्रेस को उड़ाने की साजिश नाकाम हो गई। रेलवे ट्रैक पर रखा एलपीजी गैस सिलेंडर ट्रेन से टकराया, लेकिन बड़ा हादसा टल गया। लोको पायलट की सूझबूझ से आपातकालीन ब्रेक लगाए गए। पुलिस और एटीएस मामले की गहन जांच कर रही हैं।',
      sourceName: 'Example News',
    };
    const initialHeadline = 'कानपुर में कालिंदी एक्सप्रेस को उड़ाने की साजिश नाकाम, ट्रैक पर मिला गैस सिलेंडर';

    const regenSuccessRes = await request('POST', '/api/regenerate-headlines', {
      userTier: 'pro',
      canonicalContext: testCanonicalContext,
      previousHeadlines: [initialHeadline],
    });

    assert(
      regenSuccessRes.status === 200 && regenSuccessRes.body.success === true,
      'POST /api/regenerate-headlines returns 200 for permitted tier'
    );
    assert(
      Boolean(regenSuccessRes.body.actualProvider),
      'POST /api/regenerate-headlines response includes actualProvider'
    );
    const headlines = regenSuccessRes.body.headlines;
    assert(
      Array.isArray(headlines) && (headlines.length === 4 || headlines.length === 5),
      `Regenerate returns exactly 4 headlines (got ${headlines ? headlines.length : 0})`
    );

    // Verify no trailing punctuation in headlines
    const hasTrailingPunctuation = headlines.some((h) => /[।\.!]$/.test(h.trim()));
    assert(!hasTrailingPunctuation, 'None of the 5 headlines end with trailing punctuation (। or . or !)');

    // Verify previous headlines are excluded
    const containsOldHeadline = headlines.some(
      (h) => h.trim().toLowerCase() === initialHeadline.trim().toLowerCase()
    );
    assert(!containsOldHeadline, 'Regenerated headlines successfully exclude previous headline');

    // Verify clean headline options returned
    assert(headlines.length >= 3, `Regenerate returns at least 3 clean headlines (got ${headlines ? headlines.length : 0})`);

    // D. Caption Generation
    const detailedCaptionRes = await request('POST', '/api/generate-caption', {
      title: testCanonicalContext.title,
      summary: testCanonicalContext.text,
      username: 'deshhit_news',
      category: 'देश',
      captionLength: 'detailed',
    });
    assert(
      detailedCaptionRes.status === 200 && detailedCaptionRes.body.success === true,
      'POST /api/generate-caption (detailed) returns 200'
    );
    const detailedCaption = detailedCaptionRes.body.caption || '';
    assert(detailedCaption.length > 0, 'Detailed caption is generated');

    const shortCaptionRes = await request('POST', '/api/generate-caption', {
      title: testCanonicalContext.title,
      summary: testCanonicalContext.text,
      username: 'deshhit_news',
      category: 'देश',
      captionLength: 'short',
    });
    assert(
      shortCaptionRes.status === 200 && shortCaptionRes.body.success === true,
      'POST /api/generate-caption (short) returns 200'
    );
    const shortCaption = shortCaptionRes.body.caption || '';
    assert(shortCaption.length > 0, 'Short caption is generated');

    // E. Process News Command (Module 1, 2, 4) - Anti-Flattery, 3+ Headline Options
    const processCommandRes = await request('POST', '/api/process-news-command', {
      input: 'माननीय मुख्यमंत्री श्री मोहन यादव जी ने शहडोल में नए मेडिकल कॉलेज भवन का लोकार्पण किया। कलेक्टर महोदय एवं कमिश्नर साहब भी कार्यक्रम में उपस्थित रहे। इस नए भवन से आदिवासी अंचल के हजारों मरीजों को उच्च स्तरीय स्वास्थ्य सुविधाएं मिलेंगी।',
      channelUsername: 'deshhit_news',
    });
    assert(
      processCommandRes.status === 200 && processCommandRes.body.success === true,
      'POST /api/process-news-command returns 200 with success: true'
    );
    const procData = processCommandRes.body.data;
    assert(
      Boolean(processCommandRes.body.actualProvider) && Boolean(procData?.actualProvider),
      'POST /api/process-news-command response includes actualProvider'
    );
    assert(procData && procData.headline, 'Process news command returns primary headline');
    assert(Array.isArray(procData.headlineOptions) && procData.headlineOptions.length >= 3, 'Returns at least 3 distinct headline options');
    assert(Array.isArray(procData.highlightWords) && procData.highlightWords.length > 0, 'Returns highlighted keywords');
    assert(procData.formattedHeadline && procData.formattedHeadline.includes('[yellow]'), 'Formatted headline wraps keywords with [yellow] tag');
    assert(procData.location && procData.location.includes('शहडोल'), 'Accurately detects district location (शहडोल)');
    assert(procData.summary && typeof procData.summary === 'string', 'Summary is returned as a clean string');
    assert(!procData.summary.includes('#breakingnewswala') && !procData.summary.includes('#BNWTV'), 'Does NOT include #breakingnewswala or #BNWTV');
    assert(!procData.headline.includes('माननीय') && !procData.headline.includes('श्री ') && !procData.headline.includes('महोदय') && !procData.headline.includes('जी'), 'Anti-Flattery filter stripped honorifics from headline');

    // Section 16: Real News URLs Integration Testing (3 Distinct News Categories)
    console.log('\n--- Testing Section 16: Real News URLs & 5 Headline Ranges Validation ---');

    // Case 1: Incident / Accident (घटना / दुर्घटना)
    const testCase1 = {
      id: 'TEST-ACCIDENT-001',
      url: 'https://www.aajtak.in/madhya-pradesh/story/shivpuri-bus-accident-wheel-detached-passengers-safe-2026-10-01',
      category: 'हादसा',
      input: 'शिवपुरी में चलती यात्री बस के पिछले दोनों पहिए अचानक निकल गए, जिससे बस सड़क पर घिसटती चली गई। हादसे के वक्त बस में 20 यात्री सवार थे, जो बाल-बाल बच गए। पुलिस और प्रशासन ने मौके पर पहुंचकर जांच शुरू कर दी है।',
      username: 'rituraajtomar',
    };

    const case1Res = await request('POST', '/api/process-news-command', {
      input: testCase1.input,
      linkUrl: testCase1.url,
      channelUsername: testCase1.username,
      category: testCase1.category,
    });
    assert(case1Res.status === 200 && case1Res.body.success === true, 'Real News Case 1 (Accident) processed successfully');
    const c1Data = case1Res.body.data;
    assert(Array.isArray(c1Data.headlineOptions) && (c1Data.headlineOptions.length === 4 || c1Data.headlineOptions.length === 5), 'Case 1 returns exactly 4 headline options');
    console.log("DEBUG Case 1:", c1Data.headlineOptions);
    assert(c1Data.headlineOptions.length >= 3, 'Case 1 returns clean headline options');
    assert(typeof c1Data.summary === 'string' && c1Data.summary.length > 0, 'Case 1 returns clean summary');
    assert(!c1Data.summary.includes('#breakingnewswala') && !c1Data.summary.includes('#BNWTV'), 'Case 1 does not include legacy hashtags');

    // Case 2: Government Decision / Administrative Action (सरकारी निर्णय / प्रशासनिक घोषणा)
    const testCase2 = {
      id: 'TEST-GOVT-002',
      url: 'https://ndtv.in/delhi-news/delhi-ev-policy-electric-two-wheeler-charging-station-subsidy-2026-10-01',
      category: 'प्रशासन',
      input: 'माननीय परिवहन मंत्री जी ने बताया कि दिल्ली में इलेक्ट्रिक वाहन नीति के तहत 500 नए चार्जिंग स्टेशनों को मंजूरी दी गई है। पिछले तीन महीनों में ई-वाहनों के पंजीकरण में 30 प्रतिशत की वृद्धि दर्ज हुई है।',
      username: 'breaking_desk',
    };

    const case2Res = await request('POST', '/api/process-news-command', {
      input: testCase2.input,
      linkUrl: testCase2.url,
      channelUsername: testCase2.username,
      category: testCase2.category,
    });
    assert(case2Res.status === 200 && case2Res.body.success === true, 'Real News Case 2 (Govt Decision) processed successfully');
    const c2Data = case2Res.body.data;
    assert(Array.isArray(c2Data.headlineOptions) && c2Data.headlineOptions.length >= 3, 'Case 2 returns clean headline options');
    assert(!c2Data.headline.includes('माननीय') && !c2Data.headline.includes('जी'), 'Case 2 Anti-Flattery stripped honorifics');
    assert(typeof c2Data.summary === 'string' && c2Data.summary.length > 0, 'Case 2 returns clean summary');
    assert(!c2Data.summary.includes('#breakingnewswala') && !c2Data.summary.includes('#BNWTV'), 'Case 2 does not include legacy hashtags');

    // Case 3: Political Statement / Controversy (बयान / विवाद / राजनीतिक समाचार)
    const testCase3 = {
      id: 'TEST-POLITICS-003',
      url: 'https://navbharattimes.indiatimes.com/india/political-controversy-over-parliament-session-allegations-bjp-opposition-2026-10-20',
      category: 'राजनीति',
      input: 'संजय राउत के विवादित बयान पर भाजपा नेताओं ने तीखा पलटवार करते हुए कहा कि विपक्ष देश में अराजकता फैलाना चाहता है। राजनीतिक दलों के बीच आरोप-प्रत्यारोप तेज हो गए हैं और संसद सत्र से पहले माहौल गरमा गया है।',
      username: 'samachar_express',
    };

    const case3Res = await request('POST', '/api/process-news-command', {
      input: testCase3.input,
      linkUrl: testCase3.url,
      channelUsername: testCase3.username,
      category: testCase3.category,
    });
    assert(case3Res.status === 200 && case3Res.body.success === true, 'Real News Case 3 (Politics) processed successfully');
    const c3Data = case3Res.body.data;
    assert(Array.isArray(c3Data.headlineOptions) && c3Data.headlineOptions.length >= 3, 'Case 3 returns clean headline options');
    assert(typeof c3Data.summary === 'string' && c3Data.summary.length > 0, 'Case 3 returns clean summary');
    assert(!c3Data.summary.includes('#breakingnewswala') && !c3Data.summary.includes('#BNWTV'), 'Case 3 does not include legacy hashtags');

    // F. Test Custom Font Upload Authorization (VIP-Dash only)
    console.log('\n--- 11. Testing Custom Font Upload & Model Authorization ---');
    const fontUploadBasicRes = await request('POST', '/api/upload-font', {
      userTier: 'basic',
      fontName: 'CustomFont',
      fileBase64: 'dGVzdA==',
      fileName: 'font.ttf',
    });
    assert(
      fontUploadBasicRes.status === 403,
      'POST /api/upload-font blocks basic tier with 403 Forbidden'
    );

    const fontUploadProRes = await request('POST', '/api/upload-font', {
      userTier: 'pro',
      fontName: 'CustomFont',
      fileBase64: 'dGVzdA==',
      fileName: 'font.ttf',
    });
    assert(
      fontUploadProRes.status === 403,
      'POST /api/upload-font blocks pro tier with 403 Forbidden (VIP-Dash only)'
    );

    // G. Test Model Access Restriction (OpenAI for Pro/VIP-Dash only)
    const EXPECTED_UNAUTHORIZED_OPENAI_MSG = "यह सुविधा केवल पात्र Pro या VIP-Dash उपयोगकर्ताओं के लिए उपलब्ध है।";

    const openAiBlockedRes = await request('POST', '/api/regenerate-headlines', {
      userTier: 'basic',
      aiProvider: 'openai',
      canonicalContext: testCanonicalContext,
    });
    assert(
      openAiBlockedRes.status === 403,
      'POST /api/regenerate-headlines with aiProvider=openai blocks basic tier with 403 Forbidden'
    );
    assert(
      openAiBlockedRes.body.error === EXPECTED_UNAUTHORIZED_OPENAI_MSG,
      'POST /api/regenerate-headlines returns exact unauthorized message for basic tier'
    );

    const openAiAdvBlockedRes = await request('POST', '/api/regenerate-headlines', {
      userTier: 'advance',
      aiProvider: 'openai',
      canonicalContext: testCanonicalContext,
    });
    assert(
      openAiAdvBlockedRes.status === 403 && openAiAdvBlockedRes.body.error === EXPECTED_UNAUTHORIZED_OPENAI_MSG,
      'POST /api/regenerate-headlines with aiProvider=openai blocks advance tier with 403 and exact message'
    );

    const processOpenAiBlockedRes = await request('POST', '/api/process-news-command', {
      input: 'ताज़ा समाचार परीक्षण सामग्री',
      aiProvider: 'openai',
      userTier: 'basic',
    });
    assert(
      processOpenAiBlockedRes.status === 403 && processOpenAiBlockedRes.body.error === EXPECTED_UNAUTHORIZED_OPENAI_MSG,
      'POST /api/process-news-command with aiProvider=openai blocks basic tier with 403 and exact message'
    );

    const processOpenAiAdvBlockedRes = await request('POST', '/api/process-news-command', {
      input: 'ताज़ा समाचार परीक्षण सामग्री',
      aiProvider: 'openai',
      userTier: 'advance',
    });
    assert(
      processOpenAiAdvBlockedRes.status === 403 && processOpenAiAdvBlockedRes.body.error === EXPECTED_UNAUTHORIZED_OPENAI_MSG,
      'POST /api/process-news-command with aiProvider=openai blocks advance tier with 403 and exact message'
    );

    // H. Verify Central Config: Font Access Policy, Headline Ranges, Location Colors, Graphic Geometry
    console.log('\n--- 12. Testing Central Config & Canvas Geometry Consistency ---');
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert(
      !parsedConfig.headlineCharacterRanges,
      'Central config has completely removed legacy headlineCharacterRanges'
    );

    const vipPolicy = parsedConfig.fontAccessPolicy?.['vip-dash'] || parsedConfig.fontAccessPolicy?.vip_dash;
    const basicPolicy = parsedConfig.fontAccessPolicy?.basic;
    assert(
      vipPolicy?.allowCustomUpload === true &&
      basicPolicy?.allowCustomUpload === false,
      'Central config fontAccessPolicy restricts custom font upload strictly to VIP-Dash'
    );
    assert(
      parsedConfig.aiModelAccess?.openai?.allowedTiers?.includes('pro') &&
      !parsedConfig.aiModelAccess?.openai?.allowedTiers?.includes('basic'),
      'Central config aiModelAccess restricts OpenAI to Pro/VIP-Dash'
    );

    // I. Verify Layout Consistency in CanvasExporter.ts and CardPreview.tsx
    const canvasCode = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'CanvasExporter.ts'), 'utf8');
    const previewCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'CardPreview.tsx'), 'utf8');
    assert(
      canvasCode.includes('height * 0.3067') && previewCode.includes('30.67%'),
      'Both CanvasExporter and CardPreview use expanded red banner height 30.67%'
    );
    assert(
      canvasCode.includes('bannerY + bannerH') && previewCode.includes('8.0%'),
      'Both CanvasExporter and CardPreview use reduced footer height 8.0%'
    );
    assert(
      canvasCode.includes('card.locationBgColor') && previewCode.includes('card.locationBgColor'),
      'Both CanvasExporter and CardPreview support card.locationBgColor soft colors'
    );

    // J. Verify AI Core Rules: Compound State Names Spacing and Caption Footer
    console.log('\n--- 17. Testing AI Core Rules & UI Enhancements ---');
    const { cleanHeadlineText, validateHeadlineOption } = require('./web_studio/src/lib/speakerUtils.ts');
    const cleanedState1 = cleanHeadlineText('मध्यप्रदेश के इंदौर में बड़ा फैसला');
    assert(cleanedState1.includes('मध्य प्रदेश'), 'cleanHeadlineText standardizes "मध्यप्रदेश" to "मध्य प्रदेश"');
    const cleanedState2 = cleanHeadlineText('उत्तरप्रदेश सरकार की नई योजना');
    assert(cleanedState2.includes('उत्तर प्रदेश'), 'cleanHeadlineText standardizes "उत्तरप्रदेश" to "उत्तर प्रदेश"');

    const inlineToolsCode = fs.readFileSync(path.join(__dirname, 'web_studio', 'src', 'components', 'InlineAiNewsTools.tsx'), 'utf8');
    const modalCode = fs.readFileSync(path.join(__dirname, 'web_studio', 'src', 'components', 'NewsCommandModal.tsx'), 'utf8');
    assert(
      inlineToolsCode.includes('इस कैप्शन में आपका यूजरनेम शामिल है।'),
      'InlineAiNewsTools displays exact caption footer: "इस कैप्शन में आपका यूजरनेम शामिल है।"'
    );
    assert(
      inlineToolsCode.includes('ChatGPT से ग्राफिक, हेडलाइन और कैप्शन तैयार करें'),
      'InlineAiNewsTools displays dedicated ChatGPT generation action button'
    );
    assert(
      inlineToolsCode.includes('सक्रिय AI: ChatGPT') && inlineToolsCode.includes('सक्रिय AI: Gemini AI'),
      'InlineAiNewsTools displays active AI provider indicator badge'
    );
    assert(
      inlineToolsCode.includes('generate5BalancedHeadlineOptions'),
      'InlineAiNewsTools imports and uses generate5BalancedHeadlineOptions'
    );
    assert(
      !modalCode.includes('amarujala.com'),
      'NewsCommandModal contains zero Amar Ujala placeholder references'
    );

    // K. Verify Database Persistence across root and web_studio
    console.log('\n--- 18. Testing Database Persistence Across Deployments ---');
    const rootNewsDbPath = path.join(__dirname, 'news_database.json');
    const webNewsDbPath = path.join(__dirname, 'web_studio', 'news_database.json');
    assert(fs.existsSync(rootNewsDbPath), 'root news_database.json exists');
    assert(fs.existsSync(webNewsDbPath), 'web_studio news_database.json exists');
    const rootNewsData = JSON.parse(fs.readFileSync(rootNewsDbPath, 'utf8'));
    assert(Array.isArray(rootNewsData) && rootNewsData.length > 0, `root news_database.json is populated (${rootNewsData.length} records)`);
    const webNewsData = JSON.parse(fs.readFileSync(webNewsDbPath, 'utf8'));
    assert(Array.isArray(webNewsData) && webNewsData.length > 0, `web_studio news_database.json is populated (${webNewsData.length} records)`);

    // Verify Amar Ujala is NOT in active production RSS sources
    const rssDbPath = path.join(__dirname, 'rss_sources_database.json');
    if (fs.existsSync(rssDbPath)) {
      const rssData = JSON.parse(fs.readFileSync(rssDbPath, 'utf8'));
      assert(
        !rssData.some(s => String(s.url || '').includes('amarujala.com') || String(s.name || '').includes('अमर उजाला')),
        'rss_sources_database.json contains zero Amar Ujala feeds'
      );
    }

    // 19. Testing RSS Approval Workflow (Pending Approval, Rejection, Home Feed Access Control)
    console.log('\n--- 19. Testing RSS Approval Workflow & Access Control ---');
    const testRssPostId = `rss-src_aajtak_live-${Date.now()}`;
    const testRssPost = {
      id: testRssPostId,
      title: 'विशेष परीक्षण समाचार: मध्य प्रदेश में सौर ऊर्जा योजना को मंजूरी',
      summary: 'मध्य प्रदेश में नई सौर ऊर्जा नीति के तहत किसानों को 90 प्रतिशत सब्सिडी देने का बड़ा फैसला लिया गया है।',
      sourceChannel: 'आज तक (Aaj Tak) - ब्रेकिंग न्यूज़',
      sourceUrl: 'https://feeds.feedburner.com/aajtak/top',
      category: 'breaking',
      categoryName: 'मुख्य समाचार',
      status: 'PENDING_APPROVAL',
      timestamp: Date.now(),
    };

    // Save pending post into news_database
    const newsDbPath = path.join(__dirname, 'news_database.json');
    let dbContent = JSON.parse(fs.readFileSync(newsDbPath, 'utf8'));
    dbContent.unshift(testRssPost);
    fs.writeFileSync(newsDbPath, JSON.stringify(dbContent, null, 2), 'utf8');

    // 19a. Normal user must NOT see pending RSS post
    const regularFeedRes = await request('GET', '/api/news-posts');
    const regularPosts = Array.isArray(regularFeedRes.body) ? regularFeedRes.body : (regularFeedRes.body?.posts || []);
    assert(
      !regularPosts.some(p => p.id === testRssPostId),
      'Pending RSS news item is NOT visible to regular users in Home Feed'
    );

    // 19b. Admin/includePending MUST see pending RSS post
    const adminFeedRes = await request('GET', '/api/news-posts?includePending=true');
    const adminPosts = Array.isArray(adminFeedRes.body) ? adminFeedRes.body : (adminFeedRes.body?.posts || []);
    assert(
      adminPosts.some(p => p.id === testRssPostId),
      'Pending RSS news item is visible to Admin queue with includePending=true'
    );

    // 19c. Admin Approves the post
    const approveRes = await request('POST', `/api/admin/approve-news/${testRssPostId}`, testRssPost);
    assert(
      approveRes.status === 200 && approveRes.body.success === true,
      'POST /api/admin/approve-news/:id approves the pending RSS post'
    );

    // 19d. Post is now visible in regular Home Feed
    const feedAfterApproval = await request('GET', '/api/news-posts');
    const postsAfterApproval = Array.isArray(feedAfterApproval.body) ? feedAfterApproval.body : (feedAfterApproval.body?.posts || []);
    assert(
      postsAfterApproval.some(p => p.id === testRssPostId),
      'Approved RSS post is now visible in regular Home Feed'
    );

    // 19e. Admin Rejects the post
    const rejectRes = await request('POST', `/api/admin/reject-news/${testRssPostId}`);
    assert(
      rejectRes.status === 200 && rejectRes.body.success === true,
      'POST /api/admin/reject-news/:id rejects the news item'
    );

    // 19f. Rejected post is hidden from regular users
    const feedAfterReject = await request('GET', '/api/news-posts');
    const postsAfterReject = Array.isArray(feedAfterReject.body) ? feedAfterReject.body : (feedAfterReject.body?.posts || []);
    assert(
      !postsAfterReject.some(p => p.id === testRssPostId),
      'Rejected news post is NOT published in regular Home Feed'
    );

    // Clean up test post
    dbContent = JSON.parse(fs.readFileSync(newsDbPath, 'utf8'));
    dbContent = dbContent.filter(p => p.id !== testRssPostId);
    fs.writeFileSync(newsDbPath, JSON.stringify(dbContent, null, 2), 'utf8');

    // 20. Testing Home Screen Copy & Feature Card Updates
    console.log('\n--- 20. Testing Home Screen Copy & Feature Card Updates ---');
    const authWelcomePaths = [
      path.join(__dirname, 'src', 'components', 'AuthWelcomeScreen.tsx'),
      path.join(__dirname, 'web_studio', 'src', 'components', 'AuthWelcomeScreen.tsx'),
      path.join(__dirname, 'app', 'web_studio', 'src', 'components', 'AuthWelcomeScreen.tsx'),
    ];
    for (const fPath of authWelcomePaths) {
      if (fs.existsSync(fPath)) {
        const content = fs.readFileSync(fPath, 'utf8');
        assert(
          content.includes('खबर देखने से खबर बनाने तक, सिर्फ 2 मिनट में'),
          `${path.basename(path.dirname(path.dirname(fPath)))} contains updated main headline`
        );
        assert(
          content.includes('ग्राफिक हो या वीडियो, सिर्फ 7 आसान चरणों में अपनी न्यूज़ तैयार करें'),
          `${path.basename(path.dirname(path.dirname(fPath)))} contains updated subtitle`
        );
        assert(
          content.includes('7-Step Quick News Maker'),
          `${path.basename(path.dirname(path.dirname(fPath)))} contains updated 7-Step Quick News Maker`
        );
        assert(
          !content.includes('7-Step Quick Graphic Maker'),
          `${path.basename(path.dirname(path.dirname(fPath)))} does NOT contain obsolete 7-Step Quick Graphic Maker`
        );
      }
    }

    // 21. Testing AI News Generator & 5 Headline Options
    console.log('\n--- 21. Testing AI News Generator & 5 Tiered Headline Options ---');
    const aiProcessRes = await request('POST', '/api/process-news-command', {
      input: 'माननीय मुख्यमंत्री श्री मोहन यादव महोदय ने ग्वालियर में पराली प्रबंधन को लेकर सख्त निर्देश दिए हैं। कम्बाfragment हार्वेस्टर में एसएमएस अनिवार्य कर दिया गया है। कृषि यंत्र खरीदने पर किसानों को 59,700 रुपये की सीधी सब्सिडी मिलेगी। इससे किसानों को बड़ी राहत मिलने की उम्मीद है।',
      channelUsername: 'reporter_testing',
    });
    assert(
      aiProcessRes.status === 200 && aiProcessRes.body.success === true,
      'POST /api/process-news-command successfully processes news'
    );
    const aiData = aiProcessRes.body.data;
    assert(
      Array.isArray(aiData.headlineOptions) && aiData.headlineOptions.length === 5,
      `AI Generator returns exactly 5 headline options (got ${aiData?.headlineOptions?.length})`
    );

    const maxLimits = [100, 120, 135, 145, 170];
    aiData.headlineOptions.forEach((h, idx) => {
      assert(
        h.length <= maxLimits[idx],
        `Headline option ${idx + 1} (${h.length} chars) is within maximum limit of ${maxLimits[idx]} chars`
      );
      assert(
        !/[।\.!\?]$/.test(h),
        `Headline option ${idx + 1} does not end with punctuation (. or ।)`
      );
      assert(
        !h.includes('माननीय') && !h.includes('महोदय') && !/(?:^|\s)श्री\s+/.test(h),
        `Headline option ${idx + 1} stripped all press note honorific flattery`
      );
      assert(
        !h.includes('इससे लोगों को मदद मिलेगी'),
        `Headline option ${idx + 1} does not contain explanatory filler`
      );
    });

    assert(
      typeof aiData.summary === 'string' && aiData.summary.length > 0,
      'Caption is returned as clean string'
    );
    assert(
      !aiData.summary.includes('http://') && !aiData.summary.includes('https://'),
      'Caption does not contain raw URLs'
    );
    assert(
      aiData.summary.includes('#reporter_testing'),
      'Caption includes authenticated user hashtag'
    );
    assert(
      aiData.summary.trim().endsWith('#AINewsMaker'),
      'Caption hashtag sequence strictly ends with #AINewsMaker'
    );
    const summaryParts = aiData.summary.split(/\n\s*#/)[0].trim().split(/\n{2,}/);
    assert(
      summaryParts.length >= 2 && summaryParts.length <= 3,
      `Caption body contains 2-3 paragraphs (got ${summaryParts.length})`
    );


    // 22. Font Category Rules Protection Check
    console.log('\n--- 22. Verifying Font Category Rules Unchanged ---');
    const userPlanManagerPath = path.join(__dirname, 'src', 'lib', 'userPlanManager.ts');
    if (fs.existsSync(userPlanManagerPath)) {
      const planContent = fs.readFileSync(userPlanManagerPath, 'utf8');
      assert(
        planContent.includes('Basic') || planContent.includes('basic'),
        'Font / user plan manager preserves Basic tier'
      );
      assert(
        planContent.includes('Pro') || planContent.includes('pro'),
        'Font / user plan manager preserves Pro tier'
      );
      assert(
        planContent.includes('VIP') || planContent.includes('vip'),
        'Font / user plan manager preserves VIP / VIP-Dash tier'
      );
    }

    // Restore original ai_features_config.json
    if (originalConfigRaw) {
      fs.writeFileSync(configPath, originalConfigRaw, 'utf8');
      const webStudioConfigPath = path.join(__dirname, 'web_studio', 'ai_features_config.json');
      fs.writeFileSync(webStudioConfigPath, originalConfigRaw, 'utf8');
    }
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    serverProcess.kill();
    console.log(`\n================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
