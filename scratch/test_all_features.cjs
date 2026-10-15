const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8089;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 Starting Master Verification Suite for AI News Maker');
  console.log('====================================================\n');

  // 1. Start Server on port 8089
  console.log(`[Step 1] Launching test server on port ${PORT}...`);
  const nodeModulesPath = path.resolve('web_studio/node_modules');
  const serverProc = spawn('node', ['server.cjs'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_PATH: nodeModulesPath,
      NODE_ENV: 'production',
    },
    stdio: 'pipe',
  });

  serverProc.stdout.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('running on')) {
      console.log('  -> ' + msg.trim());
    }
  });

  serverProc.stderr.on('data', (d) => {
    console.error('  [Server Err] ' + d.toString().trim());
  });

  // Wait for server to boot
  let online = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await request('GET', '/api/news-posts');
      if (res.status === 200) {
        online = true;
        break;
      }
    } catch {}
  }

  if (!online) {
    serverProc.kill();
    throw new Error('Test server failed to respond on port ' + PORT);
  }
  console.log('  ✅ Test server is active and responding.\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Super Admin Preservation
    // -------------------------------------------------------------------------
    console.log('[Test 1] Verifying Super Admin Accounts Preservation...');
    const usersMasterPath = path.resolve('users_master_database.json');
    const usersMaster = JSON.parse(fs.readFileSync(usersMasterPath, 'utf8'));
    
    const admin1 = usersMaster.find(u => u.email === 'admin.ainewsmaker@gmail.com');
    const admin2 = usersMaster.find(u => u.email === 'breakingnewswala.com@gmail.com');

    assert(admin1 !== undefined, 'admin.ainewsmaker@gmail.com exists in master users DB');
    assert(admin1.role === 'superadmin', 'admin.ainewsmaker@gmail.com has role superadmin');
    assert(admin1.tier === 'ultra' && admin1.planName === 'VIP DESK', 'admin.ainewsmaker@gmail.com has VIP DESK plan');

    assert(admin2 !== undefined, 'breakingnewswala.com@gmail.com exists in master users DB');
    assert(admin2.role === 'superadmin', 'breakingnewswala.com@gmail.com has role superadmin');
    assert(admin2.tier === 'ultra' && admin2.planName === 'VIP DESK', 'breakingnewswala.com@gmail.com has VIP DESK plan');

    // -------------------------------------------------------------------------
    // TEST 2: User Canonicalization & Duplicate Account Prevention
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing User Canonicalization & Duplicate Account Prevention...');
    // Create initial user with email & mobile
    const testEmail = 'autotest_' + Date.now() + '@example.com';
    const testPhone = '98' + String(Date.now()).slice(-8);

    const reg1 = await request('POST', '/api/admin/update-user', {
      userId: testEmail,
      updates: {
        name: 'Auto Test User',
        email: testEmail,
        mobileNumber: testPhone,
        role: 'user',
        tier: 'basic',
      },
    });
    assert(reg1.status === 200 && reg1.body.success, 'Registered user with canonical email & phone');

    // Fetch user profile
    const prof1 = await request('GET', `/api/user-profile?email=${encodeURIComponent(testEmail)}`);
    assert(prof1.status === 200 && prof1.body.profile.email === testEmail, 'Fetched profile by email');

    // Attempt login/lookup with 10-digit mobile number only
    const profPhone = await request('GET', `/api/user-profile?mobile=${encodeURIComponent(testPhone)}`);
    assert(profPhone.status === 200 && profPhone.body.profile.email === testEmail, '10-digit phone lookup resolved directly to canonical email account without duplicate creation');

    // Verify trial countdown preservation
    const sub1 = await request('GET', `/api/user-subscription?email=${encodeURIComponent(testEmail)}`);
    const subObj = sub1.body.subscription || sub1.body;
    assert(sub1.status === 200 && subObj.trialStartedAt > 0, 'Trial started date persisted correctly');
    assert(subObj.trialEndsAt > subObj.trialStartedAt, 'Trial ends date properly calculated for 7 days');

    // -------------------------------------------------------------------------
    // TEST 3: Bonus News Configuration
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Testing Bonus News Configuration...');
    const createPostRes = await request('POST', '/api/news-posts', {
      title: 'ऑटो टेस्ट ब्रेकिंग न्यूज़ ' + Date.now(),
      summary: 'यह स्वचालित सत्यापन हेतु परीक्षण समाचार है।',
      category: 'breaking',
      source: 'Auto Test',
      sourceUrl: 'https://breakingnewswala.com',
      imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800',
      timestamp: Date.now(),
      isBonus: false,
    });
    const targetPost = (createPostRes.body.posts && createPostRes.body.posts[0]) || createPostRes.body.post;
    const targetPostId = targetPost.id;
    console.log('  -> Target post id:', targetPostId);

    const bonusToggle = await request('POST', `/api/admin/news-posts/${encodeURIComponent(targetPostId)}/bonus`, {
      isBonus: true,
      rewardCoins: 25,
      adminEmail: 'admin.ainewsmaker@gmail.com',
    });
    if (bonusToggle.status !== 200) {
      console.error('  [BonusToggle Failed]', bonusToggle.status, bonusToggle.body);
    }
    assert(bonusToggle.status === 200 && bonusToggle.body.success, 'Successfully toggled bonus news with 25 coins');
    assert(bonusToggle.body.post.isBonus === true && bonusToggle.body.post.rewardCoins === 25, 'Post verified as bonus news with 25 reward coins');

    // -------------------------------------------------------------------------
    // TEST 4: Graphic Download Event & Wallet Eligibility
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing Graphic Download Event & Rewards Eligibility...');
    const dlEvent = await request('POST', '/api/rewards/download-event', {
      userEmail: testEmail,
      userId: testEmail,
      postId: targetPostId,
      postTitle: targetPost.title || 'Test Bonus News',
      rewardCoins: 25,
    });
    assert(dlEvent.status === 200 && dlEvent.body.success, 'Recorded download event for bonus news');

    // Check user wallet
    const wallet1 = await request('GET', `/api/user/wallet?email=${encodeURIComponent(testEmail)}`);
    assert(wallet1.status === 200 && wallet1.body.success, 'Fetched user wallet successfully');
    assert(wallet1.body.wallet.coinBalance === 0, 'Initial coin balance is 0');
    assert(Array.isArray(wallet1.body.eligibleDownloads) && wallet1.body.eligibleDownloads.length > 0, 'User has 1 eligible bonus download ready for claim');
    assert(wallet1.body.eligibleDownloads[0].postId === targetPostId, 'Eligible download matches target bonus post');

    // -------------------------------------------------------------------------
    // TEST 5: Screenshot Upload & Claim Submission (with Duplicate Prevention)
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Testing Screenshot Upload & Claim Submission...');
    // Dummy 1x1 base64 JPEG
    const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const upRes = await request('POST', '/api/rewards/upload-screenshot', {
      imageBase64: dummyBase64,
      mimeType: 'image/jpeg',
    });
    assert(upRes.status === 200 && upRes.body.success && upRes.body.url, 'Uploaded social media proof screenshot successfully');

    // Submit reward claim
    const claimRes = await request('POST', '/api/rewards/claim', {
      userId: testEmail,
      userEmail: testEmail,
      userName: 'Auto Test User',
      userMobile: testPhone,
      postId: targetPostId,
      postTitle: targetPost.title || 'Test Bonus News',
      rewardCoins: 25,
      screenshotUrl: upRes.body.url,
    });
    assert(claimRes.status === 200 && claimRes.body.success, 'Reward claim submitted successfully');
    const claimId = claimRes.body.claim.id;

    // Verify pending coins in user wallet
    const walletPending = await request('GET', `/api/user/wallet?email=${encodeURIComponent(testEmail)}`);
    assert(walletPending.body.wallet.pendingCoins === 25, 'Wallet pending coins increased to 25');
    assert(walletPending.body.eligibleDownloads.length === 0, 'Eligible download consumed from eligible list');

    // Duplicate Claim Attempt (MUST FAIL)
    const dupClaim = await request('POST', '/api/rewards/claim', {
      userId: testEmail,
      userEmail: testEmail,
      postId: targetPostId,
      rewardCoins: 25,
      screenshotUrl: upRes.body.url,
    });
    assert((dupClaim.status === 409 || dupClaim.status === 400) && !dupClaim.body.success, 'Duplicate reward claim rejected with status 409/400 Conflict');

    // -------------------------------------------------------------------------
    // TEST 6: Admin Claims Review, Approval & Idempotency
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Testing Admin Claims Review & Idempotent Approval...');
    const adminClaimsRes = await request('GET', '/api/admin/rewards/claims?adminEmail=admin.ainewsmaker@gmail.com');
    assert(adminClaimsRes.status === 200 && adminClaimsRes.body.success, 'Admin claims list fetched');
    assert(adminClaimsRes.body.stats.pendingClaims >= 1, 'Stats confirm at least 1 pending claim');

    // Approve Claim
    const approveRes = await request('POST', `/api/admin/rewards/claims/${claimId}/approve`, {
      adminEmail: 'admin.ainewsmaker@gmail.com',
    });
    assert(approveRes.status === 200 && approveRes.body.success, 'Claim approved by admin');
    assert(approveRes.body.claim.status === 'approved', 'Claim status updated to approved');

    // Verify coins in user wallet
    const walletApproved = await request('GET', `/api/user/wallet?email=${encodeURIComponent(testEmail)}`);
    assert(walletApproved.body.wallet.coinBalance === 25, 'User wallet balance credited with 25 coins');
    assert(walletApproved.body.wallet.pendingCoins === 0, 'Pending coins reset to 0');
    assert(walletApproved.body.wallet.totalEarnedCoins === 25, 'Total earned coins updated to 25');
    assert(walletApproved.body.transactions.length >= 1, 'Wallet transaction recorded in ledger');

    // Idempotent test: call approve second time, coins must NOT double
    const approveDup = await request('POST', `/api/admin/rewards/claims/${claimId}/approve`, {
      adminEmail: 'admin.ainewsmaker@gmail.com',
    });
    assert(approveDup.status === 200 && approveDup.body.claim.status === 'approved', 'Second approval returns success without error');
    const walletIdempotent = await request('GET', `/api/user/wallet?email=${encodeURIComponent(testEmail)}`);
    assert(walletIdempotent.body.wallet.coinBalance === 25, 'Coin balance remains exactly 25 (idempotent, no double credit)');

    // -------------------------------------------------------------------------
    // TEST 7: Rejection Workflow
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Testing Rejection Workflow...');
    // Create second post download & claim
    const createPostRes2 = await request('POST', '/api/news-posts', {
      title: 'ऑटो टेस्ट दूसरा बोनस न्यूज़ ' + Date.now(),
      summary: 'यह दूसरा परीक्षण समाचार है।',
      category: 'national',
      source: 'Auto Test',
      sourceUrl: 'https://breakingnewswala.com',
      imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800',
      timestamp: Date.now(),
      isBonus: false,
    });
    const targetPost2 = (createPostRes2.body.posts && createPostRes2.body.posts[0]) || createPostRes2.body.post;
    await request('POST', `/api/admin/news-posts/${encodeURIComponent(targetPost2.id)}/bonus`, {
      isBonus: true,
      rewardCoins: 10,
      adminEmail: 'admin.ainewsmaker@gmail.com',
    });
    await request('POST', '/api/rewards/download-event', {
      userEmail: testEmail,
      userId: testEmail,
      postId: targetPost2.id,
      postTitle: targetPost2.title,
      rewardCoins: 10,
    });
    const claimRes2 = await request('POST', '/api/rewards/claim', {
      userId: testEmail,
      userEmail: testEmail,
      postId: targetPost2.id,
      rewardCoins: 10,
      screenshotUrl: upRes.body.url,
    });
    const claimId2 = claimRes2.body.claim.id;

    // Reject claim
    const rejectRes = await request('POST', `/api/admin/rewards/claims/${claimId2}/reject`, {
      adminEmail: 'admin.ainewsmaker@gmail.com',
      reason: 'अस्पष्ट स्क्रीनशॉट',
    });
    assert(rejectRes.status === 200 && rejectRes.body.claim.status === 'rejected', 'Claim successfully rejected with reason');
    assert(rejectRes.body.claim.rejectionReason === 'अस्पष्ट स्क्रीनशॉट', 'Rejection reason saved in claim record');

    const walletAfterReject = await request('GET', `/api/user/wallet?email=${encodeURIComponent(testEmail)}`);
    assert(walletAfterReject.body.wallet.pendingCoins === 0, 'Pending coins decreased after rejection');
    assert(walletAfterReject.body.wallet.coinBalance === 25, 'Coin balance preserved at 25');

    // -------------------------------------------------------------------------
    // TEST 8: Code Architecture & Design Rules Consistency
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Checking Consistency & Requirements in Source Files...');
    const canvasExporterCode = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
    assert(canvasExporterCode.includes('342.24') || canvasExporterCode.includes('0.2852'), 'CanvasExporter enforces exact 28.52% red banner height (342.24px of 1200px)');
    assert(canvasExporterCode.includes('121.8') || canvasExporterCode.includes('0.1015'), 'CanvasExporter enforces exact 10.15% footer height (121.8px of 1200px)');
    assert(canvasExporterCode.includes('showTextGraphic: false'), 'Text graphic default is OFF (showTextGraphic: false)');
    assert(canvasExporterCode.includes('logoSizePercent'), 'CanvasExporter supports logo position and resize');

    const dateUtilsCode = fs.readFileSync('src/lib/dateUtils.ts', 'utf8');
    assert(dateUtilsCode.includes('formatFileNameDate'), 'dateUtils provides formatFileNameDate');
    assert(!dateUtilsCode.includes("replace(/:/g, '')"), 'Filename date formatting uses clean pattern without forbidden characters');

    const cardEditorCode = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
    assert(!cardEditorCode.includes('headlineAlignment'), 'Headline alignment selector removed from CardEditor');
    assert(cardEditorCode.includes('logoSizePercent'), 'CardEditor has logo size percent control');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
    console.log('====================================================\n');
  } finally {
    serverProc.kill();
  }
}

runAllTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
