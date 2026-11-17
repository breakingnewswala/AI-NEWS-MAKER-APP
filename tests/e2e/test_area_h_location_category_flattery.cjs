/**
 * Area H: Location, Categories, Flattery Sanitization & Prompts Test Suite
 * Requirement: R2 (Editorial Engine: Location, Categories, Flattery Removal, Prompts)
 */

const {
  assert,
  createTestRunner,
  cleanLocationField,
  detectDistrictAndState,
  formatDistrictWithState,
  cleanCategoryField,
  STANDARD_HINDI_CATEGORIES,
  sanitizeFlattery,
  createLocalNewsFallback,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area H: Location, Categories, Flattery Sanitization & Prompts');

// -------------------------------------------------------------
// Tier 1: Location Normalization & Blank Undetermined Fallback
// -------------------------------------------------------------
runner.test('H1: Normalizes Hindi location into standard "जिला, राज्य" format', () => {
  assert.strictEqual(cleanLocationField('ग्वालियर'), 'ग्वालियर, मध्य प्रदेश');
  assert.strictEqual(cleanLocationField('भोपाल'), 'भोपाल, मध्य प्रदेश');
  assert.strictEqual(cleanLocationField('इंदौर'), 'इंदौर, मध्य प्रदेश');
  assert.strictEqual(cleanLocationField('लखनऊ'), 'लखनऊ, उत्तर प्रदेश');
  assert.strictEqual(cleanLocationField('जयपुर'), 'जयपुर, राजस्थान');
});

runner.test('H2: Leaves location blank "" when undetermined or generic desk label', () => {
  assert.strictEqual(cleanLocationField(''), '');
  assert.strictEqual(cleanLocationField('विशेष डेस्क'), '');
  assert.strictEqual(cleanLocationField('न्यूज़ डेस्क'), '');
  assert.strictEqual(cleanLocationField('ब्यूरो डेस्क'), '');
  assert.strictEqual(cleanLocationField('विशेष कवरेज'), '');
});

// -------------------------------------------------------------
// Tier 2: 14 Standard Hindi Categories & 'अन्य' Fallback
// -------------------------------------------------------------
runner.test('H3: Exactly 14 standard Hindi categories are defined', () => {
  const expectedCategories = [
    'राजनीति',
    'प्रशासन',
    'अपराध',
    'दुर्घटना',
    'विकास',
    'शिक्षा',
    'स्वास्थ्य',
    'जनआंदोलन',
    'रोजगार',
    'कृषि',
    'मौसम',
    'व्यापार',
    'खेल',
    'अन्य',
  ];

  assert.strictEqual(STANDARD_HINDI_CATEGORIES.length, 14, 'Must have exactly 14 categories');
  for (const cat of expectedCategories) {
    assert.ok(STANDARD_HINDI_CATEGORIES.includes(cat), `Category '${cat}' must be in standard categories`);
  }
});

runner.test('H4: cleanCategoryField maps standard categories and falls back strictly to "अन्य"', () => {
  assert.strictEqual(cleanCategoryField('राजनीति'), 'राजनीति');
  assert.strictEqual(cleanCategoryField('अपराध'), 'अपराध');
  assert.strictEqual(cleanCategoryField('मौसम'), 'मौसम');
  assert.strictEqual(cleanCategoryField('खेल'), 'खेल');

  // Unrecognized, empty or foreign category falls back to 'अन्य'
  assert.strictEqual(cleanCategoryField(''), 'अन्य');
  assert.strictEqual(cleanCategoryField('random_category'), 'अन्य');
  assert.strictEqual(cleanCategoryField('अज्ञात'), 'अन्य');
});

// -------------------------------------------------------------
// Tier 3: Boundary-Aware Flattery & Honorifics Sanitization
// -------------------------------------------------------------
runner.test('H5: Strips PR honorifics (माननीय, श्री, श्रीमती, महोदय, जी) while preserving proper nouns', () => {
  // Test stripping of pure honorifics
  const textWithHonorifics = 'माननीय मुख्यमंत्री श्री शिवराज सिंह चौहान जी ने कार्यक्रम का शुभारंभ किया और महोदय ने बधाई दी।';
  const sanitized = sanitizeFlattery(textWithHonorifics);

  assert.ok(!sanitized.includes('माननीय'), 'माननीय must be removed');
  assert.ok(!sanitized.includes('श्री शिवराज'), 'श्री before name must be removed');
  assert.ok(!sanitized.includes('चौहान जी'), 'Trailing जी must be removed');
  assert.ok(!sanitized.includes('महोदय'), 'महोदय must be removed');

  // CRITICAL INTEGRITY CHECK: Never corrupt proper nouns!
  const properNouns = 'श्रीनगर में शीत लहर, श्रीवास्तव जींद पहुंचे और संजीव ने श्रीराम मंदिर में दर्शन किए';
  const preserved = sanitizeFlattery(properNouns);

  assert.ok(preserved.includes('श्रीनगर'), 'श्रीनगर must be preserved');
  assert.ok(preserved.includes('श्रीवास्तव'), 'श्रीवास्तव must be preserved');
  assert.ok(preserved.includes('जींद'), 'जींद must be preserved');
  assert.ok(preserved.includes('संजीव'), 'संजीव must be preserved');
  assert.ok(preserved.includes('श्रीराम'), 'श्रीराम must be preserved');
});

// -------------------------------------------------------------
// Tier 4: Speaker Verification and Journalistic Image Prompts
// -------------------------------------------------------------
runner.test('H6: Speaker name and title left empty if unconfirmed in input article', () => {
  const genericArticle = 'भोपाल में कल से भारी बारिश की चेतावनी जारी की गई है। नगर निगम ने सभी नालों की सफाई के निर्देश दिए हैं।';
  const fallback = createLocalNewsFallback(genericArticle);

  assert.strictEqual(fallback.speakerName, '', 'Speaker name must be empty if unconfirmed');
  assert.strictEqual(fallback.speakerTitle, '', 'Speaker title must be empty if unconfirmed');
});

runner.test('H7: Image prompt is in English, journalistic documentary realism, no text/watermark', () => {
  const article = 'इंदौर में स्वच्छता अभियान के तहत नए वेस्ट-टू-एनर्जी प्लांट का उद्घाटन किया गया।';
  const fallback = createLocalNewsFallback(article);

  assert.ok(fallback.suggestedImagePrompt, 'Must generate suggestedImagePrompt');
  assert.ok(
    fallback.suggestedImagePrompt.includes('Journalistic news press photo') ||
    fallback.suggestedImagePrompt.toLowerCase().includes('realistic news photography') ||
    fallback.suggestedImagePrompt.toLowerCase().includes('documentary'),
    'Prompt contains English journalistic directives'
  );
  assert.ok(
    !fallback.suggestedImagePrompt.toLowerCase().includes('logo') &&
    !fallback.suggestedImagePrompt.toLowerCase().includes('watermark') &&
    !fallback.suggestedImagePrompt.toLowerCase().includes('banner'),
    'Prompt contains no logos or watermarks'
  );
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
