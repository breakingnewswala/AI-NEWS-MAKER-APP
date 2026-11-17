/**
 * Area J: Gemini Fallback Resiliency & Architecture Safety Test Suite
 * Requirement: R4 (Gemini Fallback Resiliency, 429/503 Fallback to createLocalNewsFallback, Data Protection Invariants)
 */

const fs = require('fs');
const path = require('path');
const {
  assert,
  createTestRunner,
  createLocalNewsFallback,
  startTestServer,
  postJson,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area J: Gemini Fallback Resiliency & Architecture Safety');

// -------------------------------------------------------------
// Tier 1: Fallback Resiliency & Interface Compliance
// -------------------------------------------------------------
runner.test('J1: createLocalNewsFallback returns complete unified AIAnalysisResult schema', () => {
  const sampleNews = `
    भोपाल: राज्य सरकार ने राजधानी में बढ़ते वायु प्रदूषण को नियंत्रित करने के लिए 100 नई इलेक्ट्रिक बसों को हरी झंडी दिखाई।
    परिवहन मंत्री ने बताया कि ये बसें प्रमुख औद्योगिक और आवासीय क्षेत्रों को जोड़ेंगी जिससे कार्बन उत्सर्जन में भारी कमी आएगी।
    नगर निगम ने चार्जिंग स्टेशनों का नेटवर्क भी तैयार कर लिया है।
  `;

  const fallback = createLocalNewsFallback(sampleNews, undefined, 3, undefined, 'BhopalExpress');

  // Verify full AIAnalysisResult schema contracts
  assert.ok(typeof fallback.headline === 'string' && fallback.headline.length > 0, 'headline is non-empty string');
  assert.ok(Array.isArray(fallback.headlineOptions) && fallback.headlineOptions.length === 5, 'headlineOptions has 5 options');
  assert.ok(Array.isArray(fallback.highlightWords), 'highlightWords is array');
  assert.ok(typeof fallback.formattedHeadline === 'string', 'formattedHeadline is string');
  assert.ok(typeof fallback.location === 'string', 'location is string');
  assert.ok(typeof fallback.summary === 'string', 'summary is string');
  assert.ok(typeof fallback.captionDetailed === 'string', 'captionDetailed is string');
  assert.ok(typeof fallback.captionBullets === 'string', 'captionBullets is string');
  assert.ok(typeof fallback.captionShort === 'string', 'captionShort is string');
  assert.ok(typeof fallback.anchorScript === 'string', 'anchorScript is string');
  assert.ok(Array.isArray(fallback.categories), 'categories is array');
  assert.ok(typeof fallback.category === 'string', 'category is string');
  assert.ok(typeof fallback.suggestedImagePrompt === 'string', 'suggestedImagePrompt is string');
  assert.strictEqual(fallback.isLocalFallback, true, 'isLocalFallback flag is strictly true');
  assert.strictEqual(fallback.speakerName, '', 'speakerName is empty string when unverified');
  assert.strictEqual(fallback.speakerTitle, '', 'speakerTitle is empty string when unverified');
});

runner.test('J2: Fallback draft is non-hallucinatory and grounded strictly in input text', () => {
  const verifiedFacts = 'उज्जैन में महाकाल लोक कॉरिडोर के दूसरे चरण का कार्य 90 प्रतिशत पूरा हो चुका है। संभागायुक्त ने निर्माण कार्यों की समीक्षा की।';
  const fallback = createLocalNewsFallback(verifiedFacts);

  // Assert output draws strictly from input facts without inventing external characters or events
  assert.ok(fallback.headline.includes('उज्जैन') || fallback.headline.includes('महाकाल'), 'Grounded in verified topic');
  assert.strictEqual(fallback.location, 'उज्जैन, मध्य प्रदेश', 'Accurately detected location from facts');
  assert.ok(!fallback.headline.includes('अमेरिका') && !fallback.headline.includes('क्रिकेट'), 'Zero irrelevant hallucination');
});

// -------------------------------------------------------------
// Tier 2: Real HTTP Endpoint Fallback Resiliency
// -------------------------------------------------------------
runner.test('J3: POST /api/process-news-command falls back cleanly to local fallback when invalid API key passed', async () => {
  const serverInstance = await startTestServer();
  try {
    const rawInput = 'इंदौर में देवी अहिल्याबाई होल्कर अंतरराष्ट्रीय हवाई अड्डे पर नए रनवे विस्तार परियोजना को पर्यावरण मंजूरी मिल गई है। इससे बड़े विमानों का संचालन सुगम होगा।';

    // Deliberately pass invalid API key to trigger immediate 400/403/429 authentication error on Gemini
    const res = await postJson(serverInstance.baseUrl, '/api/process-news-command', {
      input: rawInput,
      geminiApiKey: 'AIzaSy_INVALID_KEY_TO_TRIGGER_RESILIENT_FALLBACK_TESTING',
      requestedAiProvider: 'gemini',
    });

    // The endpoint must NOT crash with 500! It must recover and return 200 with local fallback!
    assert.strictEqual(res.status, 200, `Expected resilient 200 fallback response, got ${res.status}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.headline, 'Recovered headline produced via fallback');
    assert.strictEqual(res.data.data.isLocalFallback, true, 'Identified as local fallback draft');
    assert.ok(res.data.data.headlineOptions.length >= 5, 'Returned 5 options');
  } finally {
    await serverInstance.close();
  }
});

// -------------------------------------------------------------
// Tier 3: Data Protection Invariants (No Wiping of Databases/Assets)
// -------------------------------------------------------------
runner.test('J4: Data Protection: User accounts and master databases remain intact', () => {
  const userDbPath = path.resolve(__dirname, '../../users_master_database.json');
  assert.ok(fs.existsSync(userDbPath), 'users_master_database.json exists');
  const users = JSON.parse(fs.readFileSync(userDbPath, 'utf8'));
  assert.ok(Array.isArray(users) && users.length > 0, `Users database must not be wiped (found ${users.length} users)`);

  const profilesPath = path.resolve(__dirname, '../../user_profiles_db.json');
  if (fs.existsSync(profilesPath)) {
    const rawProfiles = fs.readFileSync(profilesPath, 'utf8').trim();
    if (rawProfiles) {
      const profiles = JSON.parse(rawProfiles);
      assert.ok(typeof profiles === 'object', 'Profiles database is valid object');
    }
  }
});

runner.test('J5: Data Protection: Production dynamic frames and tombstones remain intact', () => {
  const framesPath = path.resolve(__dirname, '../../dynamic_frames_db.json');
  assert.ok(fs.existsSync(framesPath), 'dynamic_frames_db.json exists');
  const frames = JSON.parse(fs.readFileSync(framesPath, 'utf8'));
  assert.ok(Array.isArray(frames) && frames.length > 0, 'Production frames database must not be empty');

  // Verify no test frames in production db
  const testFrames = frames.filter((f) => f.isTestFrame === true);
  assert.strictEqual(testFrames.length, 0, 'Zero test frames permitted in production frames db');

  // Verify tombstones exist
  const tombstonePath = path.resolve(__dirname, '../../deleted_frames_tombstone.json');
  assert.ok(fs.existsSync(tombstonePath), 'deleted_frames_tombstone.json exists');
  const tombstones = JSON.parse(fs.readFileSync(tombstonePath, 'utf8'));
  assert.ok(Array.isArray(tombstones) && tombstones.length > 0, 'Frame tombstones must not be empty');
});

runner.test('J6: Data Protection: Protected built-in asset libraries remain intact', () => {
  const assetDbPath = path.resolve(__dirname, '../../asset_libraries_db.json');
  assert.ok(fs.existsSync(assetDbPath), 'asset_libraries_db.json exists');
  const assets = JSON.parse(fs.readFileSync(assetDbPath, 'utf8'));

  const protectedAssets = [
    'asset_1794132101671_u0g9s',
    'callout_bully_forward_story',
    'footer_regular_gold',
  ];

  for (const assetId of protectedAssets) {
    const exists = assets.some((a) => a.id === assetId);
    assert.ok(exists, `Protected asset ${assetId} must remain present in asset_libraries_db.json`);
  }
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
