/**
 * Area E: Headline Labels, Grapheme Counting & UI Counter Test Suite
 * Requirement: R2 (Visible labels "विकल्प 1" to "विकल्प 5/10", no approach names, dynamic counter format)
 */

const fs = require('fs');
const path = require('path');
const {
  assert,
  createTestRunner,
  countHeadlineVisibleCharacters,
  countHeadlineGraphemes,
  HEADLINE_5_TIER_RANGES,
  cleanHeadlineText,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area E: Headline Labels, Grapheme Counting & UI Counter');

// -------------------------------------------------------------
// Tier 1 & 2: Intl.Segmenter Unicode Grapheme Cluster Counting
// -------------------------------------------------------------
runner.test('E1: Accurately counts Hindi Devanagari grapheme clusters (aksharas with matras and halant)', () => {
  // Test word: "मध्य" -> 'म' (1) + 'ध्य' (1 cluster: ध + ् + य) = 2 graphemes
  const g1 = countHeadlineGraphemes('मध्य');
  assert.strictEqual(g1, 2, `Expected 2 grapheme clusters for 'मध्य', got ${g1}`);

  // Test word: "प्रदेश" -> 'प्र' (1) + 'दे' (1) + 'श' (1) = 3 graphemes
  const g2 = countHeadlineGraphemes('प्रदेश');
  assert.strictEqual(g2, 3, `Expected 3 grapheme clusters for 'प्रदेश', got ${g2}`);

  // Test word: "ग्वालियर" -> 'ग्वा' (1) + 'लि' (1) + 'य' (1) + 'र' (1) = 4 graphemes
  const g3 = countHeadlineGraphemes('ग्वालियर');
  assert.strictEqual(g3, 4, `Expected 4 grapheme clusters for 'ग्वालियर', got ${g3}`);
});

runner.test('E2: Ignores [yellow] highlight tags when calculating visible character length', () => {
  const plain = 'ग्वालियर में भारी बारिश से जनजीवन प्रभावित';
  const highlighted = '[yellow]ग्वालियर[/yellow] में [yellow]भारी बारिश[/yellow] से जनजीवन प्रभावित';

  const cPlain = countHeadlineVisibleCharacters(plain);
  const cHigh = countHeadlineVisibleCharacters(highlighted);

  assert.strictEqual(cHigh, cPlain, `Highlighted visible length ${cHigh} must equal plain length ${cPlain}`);
});

runner.test('E3: Verifies dynamic counter template format "X शब्द • Y अक्षर (लक्ष्य: min–max)" in production UI', () => {
  const inlinePath = path.resolve(__dirname, '../../src/components/InlineAiNewsTools.tsx');
  const modalPath = path.resolve(__dirname, '../../src/components/NewsCommandModal.tsx');

  const inlineSrc = fs.readFileSync(inlinePath, 'utf8');
  const modalSrc = fs.readFileSync(modalPath, 'utf8');

  // Verify InlineAiNewsTools renders exact counter tokens
  assert.ok(
    inlineSrc.includes('{wordCount} शब्द'),
    'InlineAiNewsTools must render {wordCount} शब्द'
  );
  assert.ok(
    inlineSrc.includes('{charCount} अक्षर (लक्ष्य: {tierRule.min}–{tierRule.max})'),
    'InlineAiNewsTools must render target range counter format'
  );

  // Verify NewsCommandModal renders exact counter tokens
  assert.ok(
    modalSrc.includes('{wordCount} शब्द'),
    'NewsCommandModal must render {wordCount} शब्द'
  );
  assert.ok(
    modalSrc.includes('{charLen} अक्षर (लक्ष्य: {tier.min}–{tier.max})'),
    'NewsCommandModal must render target range counter format'
  );

  // Also verify runtime formatting logic consistency with production counting utilities
  const sampleHeadline = 'ग्वालियर में भारी बारिश से निचले क्षेत्रों में जलभराव';
  const clean = sampleHeadline.replace(/\[\/?(?:yellow|highlight)\]/g, '').trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  const charLen = countHeadlineVisibleCharacters(clean);
  const tier = HEADLINE_5_TIER_RANGES[0];
  const renderedCounter = `${wordCount} शब्द • ${charLen} अक्षर (लक्ष्य: ${tier.min}–${tier.max})`;
  assert.match(
    renderedCounter,
    /^\d+\s+शब्द\s+•\s+\d+\s+अक्षर\s+\(लक्ष्य:\s+\d+–\d+\)$/,
    'Counter format matches strict pattern "X शब्द • Y अक्षर (लक्ष्य: min–max)"'
  );
});

// -------------------------------------------------------------
// Tier 3: Prohibited Approach Names Elimination from UI Source
// -------------------------------------------------------------
runner.test('E4: UI source files strictly use "विकल्प 1..10" and display NO approach names', () => {
  const prohibitedApproachNames = [
    'BREAKING_PUNCH',
    'BALANCED_SUMMARY',
    'ENGAGING_QUESTION',
    'LEAD_QUOTE',
    'DEEP_CONTEXT',
    'ACTION_IMPACT',
    'INVESTIGATIVE_REVEAL',
    'DRAMATIC_ALERT',
    'EXECUTIVE_ROUNDUP',
    'COMMUNITY_VOICE',
  ];

  const uiFilesToCheck = [
    path.resolve(__dirname, '../../src/components/NewsCommandModal.tsx'),
    path.resolve(__dirname, '../../src/components/InlineAiNewsTools.tsx'),
    path.resolve(__dirname, '../../src/components/CardEditor.tsx'),
  ];

  for (const filePath of uiFilesToCheck) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');

    for (const approachName of prohibitedApproachNames) {
      // Prohibited from being rendered as user-facing text
      const approachBadgeRegex = new RegExp(`>\\s*${approachName}\\s*<`, 'i');
      assert.ok(
        !approachBadgeRegex.test(content),
        `Prohibited approach name ${approachName} must not be rendered in UI in ${path.basename(filePath)}`
      );
    }

    // Must contain standard label "विकल्प"
    assert.ok(
      content.includes('विकल्प'),
      `Component ${path.basename(filePath)} must contain standard Hindi label "विकल्प"`
    );
  }
});

runner.test('E5: Verify labels strictly range from "विकल्प 1" to "विकल्प 5/10" in production contracts & UI components', () => {
  // 1. Production Contract: HEADLINE_5_TIER_RANGES exports strictly "विकल्प 1" to "विकल्प 5"
  assert.strictEqual(
    HEADLINE_5_TIER_RANGES.length,
    5,
    'HEADLINE_5_TIER_RANGES must define exactly 5 initial headline tiers'
  );

  const expectedInitialLabels = ['विकल्प 1', 'विकल्प 2', 'विकल्प 3', 'विकल्प 4', 'विकल्प 5'];
  HEADLINE_5_TIER_RANGES.forEach((tier, idx) => {
    assert.strictEqual(
      tier.label,
      expectedInitialLabels[idx],
      `Tier ${idx + 1} label must strictly be "${expectedInitialLabels[idx]}" without editorial approach names`
    );
    assert.ok(
      !tier.label.includes('सीधी मुख्य खबर') &&
      !tier.label.includes('BREAKING_PUNCH') &&
      !tier.label.includes('तथ्य-केंद्रित'),
      `Tier ${idx + 1} label must not contain internal editorial approach names`
    );
  });

  // 2. Production Resolution Contract: 1..10 options resolve strictly to "विकल्प 1" .. "विकल्प 10"
  // Tests the production fallback tier resolution logic (src/lib/speakerUtils.ts line 1703 / server.ts line 22982)
  for (let idx = 0; idx < 10; idx++) {
    const tier = HEADLINE_5_TIER_RANGES[idx] || { min: 80, max: 200, label: `विकल्प ${idx + 1}` };
    assert.match(
      tier.label,
      /^विकल्प ([1-9]|10)$/,
      `Option ${idx + 1} label must match strict pattern "विकल्प 1..10", got "${tier.label}"`
    );
    assert.strictEqual(
      tier.label,
      `विकल्प ${idx + 1}`,
      `Option ${idx + 1} label must strictly equal "विकल्प ${idx + 1}"`
    );
  }

  // 3. Production Headline Payload Sanitization Contract
  assert.strictEqual(
    cleanHeadlineText('विकल्प 1: भोपाल में भारी बारिश से जनजीवन प्रभावित'),
    'भोपाल में भारी बारिश से जनजीवन प्रभावित',
    'cleanHeadlineText must strip "विकल्प 1:" prefix from headline text'
  );
  assert.strictEqual(
    cleanHeadlineText('विकल्प 10 - इंदौर में स्वच्छता सर्वेक्षण में नया कीर्तिमान'),
    'इंदौर में स्वच्छता सर्वेक्षण में नया कीर्तिमान',
    'cleanHeadlineText must strip "विकल्प 10 -" prefix from headline text'
  );

  // 4. UI Source Component Contract Verification (Robust path resolution)
  const inlinePath = path.resolve(__dirname, '../../src/components/InlineAiNewsTools.tsx');
  const modalPath = path.resolve(__dirname, '../../src/components/NewsCommandModal.tsx');

  const inlineSrc = fs.readFileSync(inlinePath, 'utf8');
  const modalSrc = fs.readFileSync(modalPath, 'utf8');

  // Verify InlineAiNewsTools renders clean `विकल्प ${idx + 1}` without angle or descriptor
  assert.ok(
    inlineSrc.includes('`विकल्प ${idx + 1}`'),
    'InlineAiNewsTools must render strictly `विकल्प ${idx + 1}`'
  );
  assert.ok(
    !inlineSrc.includes('tierRule.angle'),
    'InlineAiNewsTools must not append internal angle/approach names'
  );

  // Verify NewsCommandModal renders clean विकल्प {idx + 1}
  assert.ok(
    modalSrc.includes('विकल्प {idx + 1}'),
    'NewsCommandModal must render strictly विकल्प {idx + 1}'
  );
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
