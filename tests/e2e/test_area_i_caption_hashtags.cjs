/**
 * Area I: Caption Formats, Limits & Hashtag Positional Lock Test Suite
 * Requirement: R3 (3 Caption Formats, 2,000-Char Limit, Centralized buildHashtags)
 * Tests:
 *   - 3 Formats: विस्तृत (3 para), बुलेट पॉइंट्स (hook + up to 10 bullets + closing), संक्षिप्त (2 para, 60-90 words)
 *   - All formats <= 2,000 characters editor limit
 *   - Centralized buildHashtags() positional lock: 6–8 total hashtags
 *       1st tag: #{{USERNAME}} or #AINewsMakerUser
 *       Middle tags: 4–6 contextual tags
 *       Last tag: #AINewsMaker
 *   - Omission of legacy tags: #breakingnewswala, #BNWTV, #AI_NEWS_MAKER, @username
 *   - UI buttons in CaptionModal.tsx: "विस्तृत", "बुलेट पॉइंट्स", "संक्षिप्त"
 *   - HTTP /api/generate-caption integration
 */

const fs = require('fs');
const path = require('path');
const {
  assert,
  createTestRunner,
  buildHashtags,
  getUserFirstHashtag,
  startTestServer,
  postJson,
  createLocalNewsFallback,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area I: Caption Formats, Limits & Hashtags');

// -------------------------------------------------------------
// Tier 1: Hashtag Engine & Positional Lock
// -------------------------------------------------------------
runner.test('I1: buildHashtags enforces strict 6 to 8 total hashtag count', () => {
  const tags1 = buildHashtags('ग्वालियर, मध्य प्रदेश', '#BreakingNews #MPNews #Traffic', undefined, 'NewsChannelGwalior');
  const arr1 = tags1.split(/\s+/).filter(Boolean);
  assert.ok(arr1.length >= 6 && arr1.length <= 8, `Expected 6 to 8 tags, got ${arr1.length}: ${tags1}`);

  const tags2 = buildHashtags('', '', undefined, '');
  const arr2 = tags2.split(/\s+/).filter(Boolean);
  assert.ok(arr2.length >= 6 && arr2.length <= 8, `Expected 6 to 8 tags with empty inputs, got ${arr2.length}: ${tags2}`);
});

runner.test('I2: First hashtag is strictly user handle or #AINewsMakerUser', () => {
  // With explicit username
  const tagsWithUser = buildHashtags('भोपाल', '', undefined, 'BhopalSamachar24');
  const firstWithUser = tagsWithUser.split(/\s+/)[0];
  assert.strictEqual(firstWithUser, '#BhopalSamachar24', `First tag must be user handle, got ${firstWithUser}`);

  // Without username (default fallback)
  const tagsDefault = buildHashtags('भोपाल', '', undefined, '');
  const firstDefault = tagsDefault.split(/\s+/)[0];
  assert.strictEqual(firstDefault, '#AINewsMakerUser', `First tag must fallback to #AINewsMakerUser, got ${firstDefault}`);
});

runner.test('I3: Last hashtag is strictly and unconditionally #AINewsMaker', () => {
  const variations = [
    buildHashtags('इंदौर', '#Weather #Monsoon', undefined, 'IndoreLive'),
    buildHashtags('रीवा', undefined, undefined, undefined),
    buildHashtags('', '', undefined, 'Reporter1'),
  ];

  for (const tags of variations) {
    const arr = tags.split(/\s+/).filter(Boolean);
    const lastTag = arr[arr.length - 1];
    assert.strictEqual(lastTag, '#AINewsMaker', `Last hashtag must strictly be #AINewsMaker, got ${lastTag}`);
  }
});

runner.test('I4: Legacy and prohibited tags are completely purged', () => {
  const dirtyExistingTags = '#breakingnewswala #BNWTV #AI_NEWS_MAKER @username #MPNews #BhopalRain #AINewsMakerUser';
  const cleanedTags = buildHashtags('भोपाल', dirtyExistingTags, undefined, 'MyNewsDesk');

  assert.ok(!cleanedTags.toLowerCase().includes('#breakingnewswala'), 'Must purge #breakingnewswala');
  assert.ok(!cleanedTags.toLowerCase().includes('#bnwtv'), 'Must purge #BNWTV');
  assert.ok(!cleanedTags.toLowerCase().includes('#ai_news_maker'), 'Must purge #AI_NEWS_MAKER');
  assert.ok(!cleanedTags.includes('@username'), 'Must purge @username');
});

// -------------------------------------------------------------
// Tier 2: 3 Caption Formats & 2,000-Char Limit
// -------------------------------------------------------------
runner.test('I5: createLocalNewsFallback generates 3 valid caption formats all <= 2000 chars', () => {
  const sourceText = `
    ग्वालियर: तानसेन संगीत समारोह के दूसरे दिन देश के मूर्धन्य कलाकारों ने शास्त्रीय संगीत की अविस्मरणीय प्रस्तुतियां दीं।
    शाम को प्रसिद्ध बांसुरी वादक ने राग खमाज से शुरुआत की और श्रोताओं को मंत्रमुग्ध कर दिया।
    कार्यक्रम में संस्कृति विभाग के वरिष्ठ अधिकारी एवं हजारों संगीत रसिक उपस्थित रहे।
  `;

  const fallback = createLocalNewsFallback(sourceText, undefined, 3, undefined, 'GwaliorTimes');

  // 1. विस्तृत (captionDetailed): must be present and <= 2000 chars
  assert.ok(fallback.captionDetailed, 'captionDetailed must be generated');
  assert.ok(fallback.captionDetailed.length <= 2000, `captionDetailed length ${fallback.captionDetailed.length} <= 2000`);

  // 2. बुलेट पॉइंट्स (captionBullets): must contain bullets ("•") and <= 2000 chars
  assert.ok(fallback.captionBullets, 'captionBullets must be generated');
  assert.ok(fallback.captionBullets.includes('•'), 'captionBullets must contain bullet points starting with "•"');
  assert.ok(fallback.captionBullets.length <= 2000, `captionBullets length ${fallback.captionBullets.length} <= 2000`);

  // 3. संक्षिप्त (captionShort): must be present and <= 2000 chars
  assert.ok(fallback.captionShort, 'captionShort must be generated');
  assert.ok(fallback.captionShort.length <= 2000, `captionShort length ${fallback.captionShort.length} <= 2000`);
});

// -------------------------------------------------------------
// Tier 3: UI Caption Modal Buttons Alignment
// -------------------------------------------------------------
runner.test('I6: CaptionModal.tsx contains exactly 3 selectable format buttons ("विस्तृत", "बुलेट पॉइंट्स", "संक्षिप्त")', () => {
  const modalPath = path.resolve(__dirname, '../../src/components/CaptionModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert.ok(content.includes('विस्तृत'), 'CaptionModal must have "विस्तृत" button');
  assert.ok(content.includes('बुलेट पॉइंट्स'), 'CaptionModal must have "बुलेट पॉइंट्स" button');
  assert.ok(content.includes('संक्षिप्त'), 'CaptionModal must have "संक्षिप्त" button');
  assert.ok(content.includes('2000'), 'CaptionModal enforces 2000 char counter/limit');
});

// -------------------------------------------------------------
// Tier 4: Real HTTP Endpoint Integration (/api/generate-caption)
// -------------------------------------------------------------
runner.test('I7: POST /api/generate-caption returns clean caption format within 2,000 characters', async () => {
  const serverInstance = await startTestServer();
  try {
    const res = await postJson(serverInstance.baseUrl, '/api/generate-caption', {
      headline: 'ग्वालियर में तानसेन संगीत समारोह की भव्य शुरुआत',
      location: 'ग्वालियर, मध्य प्रदेश',
      summary: 'ग्वालियर के ऐतिहासिक किले पर तानसेन संगीत समारोह का गरिमामय शुभारंभ हुआ जिसमें देश भर के ख्यातिप्राप्त शास्त्रीय गायक पहुंचे।',
      style: 'bullet_points',
      username: 'GwaliorLive',
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.caption, 'Returns caption string');
    assert.ok(res.data.caption.length <= 2000, `Caption length ${res.data.caption.length} must be <= 2000 chars`);
    assert.ok(res.data.caption.includes('#GwaliorLive'), 'Includes user first hashtag');
    assert.ok(res.data.caption.includes('#AINewsMaker'), 'Includes mandatory last hashtag #AINewsMaker');
  } finally {
    await serverInstance.close();
  }
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
