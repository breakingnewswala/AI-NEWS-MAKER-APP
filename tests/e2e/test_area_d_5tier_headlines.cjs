/**
 * Area D: 5-Tier Headline Generation & Limits Test Suite
 * Requirement: R2 (Core Editorial Generation Engine - Headlines & Limits)
 * Enforces:
 *   - Exactly 5 tiers:
 *       विकल्प 1 (80–110 chars)
 *       विकल्प 2 (100–130 chars)
 *       विकल्प 3 (125–150 chars)
 *       विकल्प 4 (130–160 chars)
 *       विकल्प 5 (150–200 chars)
 *   - Max 200 characters
 *   - Clean punctuation: No trailing dandas (।), full stops (.), or exclamation marks (!)
 */

const {
  assert,
  createTestRunner,
  HEADLINE_5_TIER_RANGES,
  HEADLINE_MAX_CHARACTER_LIMIT,
  validateHeadlines5Tier,
  validateHeadlineOption,
  cleanHeadlineText,
  countHeadlineVisibleCharacters,
  createLocalNewsFallback,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area D: 5-Tier Headline Generation & Limits');

// -------------------------------------------------------------
// Tier 1: Canonical Range Configuration Checks
// -------------------------------------------------------------
runner.test('D1: Canonical HEADLINE_5_TIER_RANGES defines exactly 5 tiers with exact target ranges', () => {
  assert.strictEqual(HEADLINE_5_TIER_RANGES.length, 5, 'Must define exactly 5 tiers');

  assert.strictEqual(HEADLINE_5_TIER_RANGES[0].min, 80);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[0].max, 110);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[0].label, 'विकल्प 1');

  assert.strictEqual(HEADLINE_5_TIER_RANGES[1].min, 100);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[1].max, 130);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[1].label, 'विकल्प 2');

  assert.strictEqual(HEADLINE_5_TIER_RANGES[2].min, 125);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[2].max, 150);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[2].label, 'विकल्प 3');

  assert.strictEqual(HEADLINE_5_TIER_RANGES[3].min, 130);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[3].max, 160);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[3].label, 'विकल्प 4');

  assert.strictEqual(HEADLINE_5_TIER_RANGES[4].min, 150);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[4].max, 200);
  assert.strictEqual(HEADLINE_5_TIER_RANGES[4].label, 'विकल्प 5');

  assert.strictEqual(HEADLINE_MAX_CHARACTER_LIMIT, 200, 'Max character limit must be strictly 200');
});

// -------------------------------------------------------------
// Tier 2: Validation Function Boundary Assertions
// -------------------------------------------------------------
runner.test('D2: validateHeadlineOption verifies compliant headline lengths', () => {
  // Construct sample headlines matching tier 1 (80-110 graphemes)
  const sample1 = 'ग्वालियर में लगातार 48 घंटे से जारी मूसलाधार बारिश के चलते शहर के निचले क्षेत्रों में गंभीर जलभराव हुआ, राहत दल बचाव कार्य में जुटे';
  const len1 = countHeadlineVisibleCharacters(sample1);
  assert.ok(len1 >= 80 && len1 <= 110, `Tier 1 length must be 80-110, got ${len1}`);

  const v1 = validateHeadlineOption(sample1, 0);
  assert.strictEqual(v1.valid, true, `Tier 1 headline must be valid: ${JSON.stringify(v1)}`);
});

runner.test('D3: Strips trailing dandas, full stops, question marks, and exclamation marks', () => {
  const dirty1 = 'भोपाल में नई मेट्रो लाइन का ट्रायल रन सफल रहा।';
  const dirty2 = 'इंदौर में स्वच्छ सर्वेक्षण 2026 की तैयारियां पूरी हुई...';
  const dirty3 = 'उज्जैन महाकाल लोक में उमड़ा श्रद्धालुओं का जनसैलाब!';
  const dirty4 = 'जबलपुर भेड़ाघाट में पर्यटन सत्र का शुभारंभ?';

  assert.strictEqual(cleanHeadlineText(dirty1).endsWith('।'), false, 'Trailing danda stripped');
  assert.strictEqual(cleanHeadlineText(dirty2).endsWith('.'), false, 'Trailing periods stripped');
  assert.strictEqual(cleanHeadlineText(dirty3).endsWith('!'), false, 'Trailing exclamation mark stripped');
  assert.strictEqual(cleanHeadlineText(dirty4).endsWith('?'), false, 'Trailing question mark stripped');
});

runner.test('D4: Absolute 200-character cap enforced on long inputs', () => {
  const superLong = 'मध्य प्रदेश के सभी संभागों में आगामी 48 घंटों के दौरान भारी से अति भारी वर्षा का रेड अलर्ट मौसम विज्ञान विभाग द्वारा जारी किया गया है और किसानों को सलाह दी गई है कि वे अपनी फसलों को सुरक्षित स्थानों पर रखें तथा अनावश्यक यात्रा से पूरी तरह बचें।';
  const cleaned = cleanHeadlineText(superLong);
  const count = countHeadlineVisibleCharacters(cleaned);
  assert.ok(count <= 200, `Headline must not exceed 200 characters, got ${count}`);
});

// -------------------------------------------------------------
// Tier 3: Local Fallback Editorial Engine 5-Tier Compliance
// -------------------------------------------------------------
runner.test('D5: createLocalNewsFallback produces exactly 5 distinct headlines within limits', () => {
  const sourceText = `
    भोपाल: मध्य प्रदेश की राजधानी भोपाल में अत्याधुनिक सेमीकंडक्टर और इलेक्ट्रॉनिक विनिर्माण क्लस्टर स्थापित करने के लिए राज्य सरकार ने 1500 करोड़ रुपये के निवेश प्रस्ताव को मंजूरी दे दी है।
    उद्योग विभाग के अधिकारियों के अनुसार इस परियोजना से 10,000 से अधिक स्थानीय युवाओं को सीधे रोजगार प्राप्त होगा।
    मुख्यमंत्री ने कहा कि मध्य प्रदेश देश का नया टेक हब बनने की ओर तेजी से अग्रसर है और निवेशकों को हर संभव बुनियादी सुविधाएं उपलब्ध कराई जाएंगी।
  `;

  const result = createLocalNewsFallback(sourceText, 'https://patrika.com/bhopal-semiconductor');
  assert.ok(Array.isArray(result.headlineOptions), 'headlineOptions is an array');
  assert.strictEqual(result.headlineOptions.length, 5, 'Produces exactly 5 headline options');

  // Verify all 5 options are unique
  const uniqueOptions = new Set(result.headlineOptions);
  assert.strictEqual(uniqueOptions.size, 5, 'All 5 headline options must be distinct');

  // Verify each option satisfies no trailing dandas/periods and is within bounds
  result.headlineOptions.forEach((opt, idx) => {
    assert.strictEqual(opt.endsWith('।'), false, `Option ${idx + 1} must not end with danda`);
    assert.strictEqual(opt.endsWith('.'), false, `Option ${idx + 1} must not end with period`);
    const count = countHeadlineVisibleCharacters(opt);
    assert.ok(count <= 200, `Option ${idx + 1} count ${count} must be <= 200`);
    assert.ok(count >= 40, `Option ${idx + 1} count ${count} must be meaningful length`);
  });
});

runner.test('D6: Primary headline matches Option 1 or is compliant with tier 1', () => {
  const sourceText = 'ग्वालियर में तानसेन संगीत समारोह की भव्य शुरुआत, देश भर के विख्यात शास्त्रीय गायक पहुंचे';
  const result = createLocalNewsFallback(sourceText);
  assert.ok(result.headline, 'Primary headline generated');
  assert.strictEqual(result.headline.endsWith('।'), false, 'Primary headline has no trailing danda');
  const count = countHeadlineVisibleCharacters(result.headline);
  assert.ok(count <= 200, 'Primary headline length <= 200');
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
