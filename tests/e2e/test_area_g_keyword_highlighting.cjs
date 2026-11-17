/**
 * Area G: Keyword Highlighting ([yellow]...[/yellow]) Test Suite
 * Requirement: R2 (Keyword Highlighting in Headlines)
 * Invariant: Selecting headline wraps 2–4 key words/phrases in [yellow]...[/yellow]
 *            WITHOUT altering wording, character order, or spelling.
 */

const {
  assert,
  createTestRunner,
  formatHeadlineWithKeywords,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area G: Keyword Highlighting ([yellow]...[/yellow])');

// -------------------------------------------------------------
// Tier 1 & 2: Tag Integrity & Zero Mutation Invariant
// -------------------------------------------------------------
runner.test('G1: Stripping [yellow] tags strictly recovers the identical raw headline text', () => {
  const testHeadlines = [
    'भोपाल में भारी बारिश के बाद शहर के कई क्षेत्रों में पानी भरा, राहत दल तैनात',
    'इंदौर बना देश का पहला 7 स्टार कचरा मुक्त शहर, स्वच्छता में रचा नया इतिहास',
    'उज्जैन महाकाल लोक में उमड़ा 5 लाख श्रद्धालुओं का जनसैलाब, सुरक्षा के कड़े प्रबंध',
    'रीवा अल्ट्रा मेगा सोलर पावर प्रोजेक्ट से हर वर्ष होगी 15 लाख टन कार्बन उत्सर्जन में कमी',
    'ग्वालियर किले पर तीन दिवसीय तानसेन संगीत समारोह का गरिमामय शुभारंभ',
  ];

  for (const raw of testHeadlines) {
    const res = formatHeadlineWithKeywords(raw);
    assert.ok(res.formattedHeadline, 'Produces formatted headline');

    // Strip [yellow] and [/yellow] tags
    const stripped = res.formattedHeadline.replace(/\[\/?yellow\]/g, '');
    assert.strictEqual(
      stripped,
      raw,
      `Wording or spelling was altered! Expected '${raw}', got '${stripped}'`
    );
  }
});

runner.test('G2: Highlights between 2 and 4 key words or phrases', () => {
  const headline = 'भोपाल में 1500 करोड़ रुपये के सेमीकंडक्टर क्लस्टर को कैबिनेट की मंजूरी, 10000 युवाओं को मिलेगा रोजगार';
  const res = formatHeadlineWithKeywords(headline);

  const yellowOpenMatches = res.formattedHeadline.match(/\[yellow\]/g) || [];
  const yellowCloseMatches = res.formattedHeadline.match(/\[\/yellow\]/g) || [];

  assert.strictEqual(yellowOpenMatches.length, yellowCloseMatches.length, 'Every [yellow] must have matching [/yellow]');
  assert.ok(
    yellowOpenMatches.length >= 2 && yellowOpenMatches.length <= 4,
    `Expected 2 to 4 highlights, got ${yellowOpenMatches.length}: ${res.formattedHeadline}`
  );
});

runner.test('G3: Never wraps Hindi stopwords in [yellow] tags', () => {
  const stopwords = ['के', 'की', 'का', 'में', 'पर', 'से', 'को', 'ने', 'है', 'हैं', 'और', 'या', 'भी', 'तो', 'था', 'थी', 'थे'];
  const headline = 'ग्वालियर में भारी बारिश के कारण शहर के कई इलाकों में और सड़कों पर पानी भर गया है';
  const res = formatHeadlineWithKeywords(headline);

  const highlightedWords = (res.formattedHeadline.match(/\[yellow\]([^\[]+)\[\/yellow\]/g) || [])
    .map((m) => m.replace(/\[\/?yellow\]/g, '').trim());

  assert.ok(
    highlightedWords.length >= 2,
    `Must highlight between 2 and 4 keywords to validate stopwords, got ${highlightedWords.length}`
  );

  for (const hw of highlightedWords) {
    assert.ok(
      !stopwords.includes(hw),
      `Stopword '${hw}' must not be highlighted! Highlighted list: ${JSON.stringify(highlightedWords)}`
    );
  }
});

runner.test('G4: Prioritizes existing highlighted words when provided', () => {
  const headline = 'इंदौर स्वच्छता सर्वेक्षण में फिर बना नंबर एक, मुख्यमंत्री ने दी बधाई';
  const existing = ['स्वच्छता', 'नंबर'];

  const res = formatHeadlineWithKeywords(headline, existing);
  assert.ok(res.formattedHeadline.includes('[yellow]स्वच्छता[/yellow]'), 'Pre-existing keyword स्वच्छता highlighted');
  assert.ok(res.formattedHeadline.includes('[yellow]नंबर[/yellow]'), 'Pre-existing keyword नंबर highlighted');
});

runner.test('G5: Gracefully handles already tagged or empty headlines', () => {
  assert.strictEqual(formatHeadlineWithKeywords('').formattedHeadline, '');

  const alreadyTagged = '[yellow]भोपाल[/yellow] में [yellow]मेट्रो[/yellow] का नया रूट';
  const res = formatHeadlineWithKeywords(alreadyTagged);
  const stripped = res.formattedHeadline.replace(/\[\/?yellow\]/g, '');
  assert.strictEqual(stripped, 'भोपाल में मेट्रो का नया रूट', 'Cleanly handles re-tagging without nesting');
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
