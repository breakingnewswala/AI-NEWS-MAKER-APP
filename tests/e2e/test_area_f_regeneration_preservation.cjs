/**
 * Area F: Headline Regeneration & Primary Preservation Test Suite
 * Requirement: R2 (Headline Regeneration & Primary Preservation)
 * Tests:
 *   - Button label: "पाँच नई हेडलाइन बनाएं"
 *   - Disabled at 10 total options
 *   - Batch indicators: "5 / 10 विकल्प उपलब्ध" and "10 / 10 विकल्प उपलब्ध"
 *   - Selected primary headline preserved across regeneration
 *   - HTTP /api/regenerate-headlines endpoint integration
 */

const fs = require('fs');
const path = require('path');
const {
  assert,
  createTestRunner,
  startTestServer,
  postJson,
  formatHeadlineWithKeywords,
  preserveHeadlineStateOnRegeneration,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area F: Headline Regeneration & Primary Preservation');

// -------------------------------------------------------------
// Tier 1: UI Text & Indicator Alignment
// -------------------------------------------------------------
runner.test('F1: UI components contain exact button text "पाँच नई हेडलाइन बनाएं" and batch indicators', () => {
  const inlineAiPath = path.resolve(__dirname, '../../src/components/InlineAiNewsTools.tsx');
  const modalPath = path.resolve(__dirname, '../../src/components/NewsCommandModal.tsx');

  const inlineContent = fs.readFileSync(inlineAiPath, 'utf8');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  // Exact button label
  assert.ok(
    inlineContent.includes('पाँच नई हेडलाइन बनाएं') || modalContent.includes('पाँच नई हेडलाइन बनाएं'),
    'Must include exact regeneration button label "पाँच नई हेडलाइन बनाएं"'
  );

  // Batch indicators
  assert.ok(
    modalContent.includes('10 / 10 विकल्प उपलब्ध') && inlineContent.includes('/ 10 विकल्प उपलब्ध'),
    'Must include "/ 10 विकल्प उपलब्ध" batch indicator in UI components'
  );

  // Maximum cap of 10 enforced in UI
  assert.ok(
    inlineContent.includes('isMaxHeadlinesReached') && modalContent.includes('headlineOptions.length >= 10'),
    'Must disable regeneration at 10 options in both UI components'
  );
});

// -------------------------------------------------------------
// Tier 2: Preservation Logic Execution (API + State Transition)
// -------------------------------------------------------------
runner.test('F2: Preserves previously selected primary headline when regeneration occurs', async () => {
  const serverInstance = await startTestServer();
  try {
    // 1. Initial 5 headline options from editorial generation
    const initial5 = [
      'विकल्प 1: भोपाल में भारी बारिश से जनजीवन अस्त-व्यस्त, प्रशासन अलर्ट पर',
      'विकल्प 2: राजधानी में मूसलाधार बारिश का कहर, कई कॉलोनियों में जलभराव की स्थिति',
      'विकल्प 3: भोपाल जलभराव: नगर निगम की टीमें मैदान में, नागरिकों से सावधानी बरतने की अपील',
      'विकल्प 4: मध्य प्रदेश में मानसून की दस्तक के साथ ही राजधानी भोपाल में जमकर बरसे बादल',
      'विकल्प 5: भोपाल में 24 घंटे में रिकॉर्ड तोड़ बारिश दर्ज, मौसम विभाग ने जारी किया यलो अलर्ट',
    ];

    // 2. User selects Option 2 (index 1) and formats headline with keywords
    const selectedIndex = 1;
    const userSelectedHeadline = initial5[selectedIndex];
    const { formattedHeadline } = formatHeadlineWithKeywords(userSelectedHeadline);
    assert.ok(formattedHeadline.includes('[yellow]'), 'Formatted headline must contain [yellow] tags');

    // 3. User triggers regeneration via live HTTP endpoint
    const res = await postJson(serverInstance.baseUrl, '/api/regenerate-headlines', {
      canonicalContext: {
        title: userSelectedHeadline,
        content: 'भोपाल में भारी बारिश से जनजीवन प्रभावित हुआ है। कई कालोनियों में जलभराव हो गया है।',
        location: 'भोपाल, मध्य प्रदेश',
      },
      previousHeadlines: initial5,
      sourceHeadline: userSelectedHeadline,
      headlineCount: 5,
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.headlines) && res.data.headlines.length > 0, 'Server returns regenerated headlines');

    // 4. Server-level preservation contract verification
    assert.strictEqual(res.data.totalHeadlineOptions.length, 10, 'Server totalHeadlineOptions capped at 10');
    assert.strictEqual(
      res.data.totalHeadlineOptions[selectedIndex],
      userSelectedHeadline,
      'Server must retain existing selected headline in totalHeadlineOptions'
    );

    // 5. Execute production preservation state transition logic
    const preservedState = preserveHeadlineStateOnRegeneration({
      existingHeadlines: initial5,
      newHeadlines: res.data.headlines,
      selectedHeadline: userSelectedHeadline,
      selectedFormattedHeadline: formattedHeadline,
      selectedIndex,
    });

    // 6. Assertions verifying the preservation contract
    assert.strictEqual(preservedState.combinedHeadlines.length, 10, 'Combined headlines must be exactly 10');
    assert.strictEqual(
      preservedState.preservedHeadline,
      initial5[1],
      'Selected primary headline must NOT be replaced by new headlines'
    );
    assert.notStrictEqual(
      preservedState.preservedHeadline,
      res.data.headlines[0],
      'Preserved headline must NOT be overwritten by newly generated option 1'
    );
    assert.strictEqual(
      preservedState.preservedFormattedHeadline,
      formattedHeadline,
      'Formatted headline with [yellow] tags must be preserved identically'
    );
    assert.strictEqual(preservedState.preservedIndex, 1, 'Selection index remains pinned to user choice');
    assert.strictEqual(preservedState.isMaxReached, true, 'isMaxReached flag must be true at 10 headlines');
    assert.strictEqual(
      preservedState.combinedHeadlines[preservedState.preservedIndex],
      preservedState.preservedHeadline,
      'Preserved headline must match headline at preservedIndex in combined options'
    );
  } finally {
    await serverInstance.close();
  }
});

// -------------------------------------------------------------
// Tier 3: HTTP Endpoint Integration (/api/regenerate-headlines)
// -------------------------------------------------------------
runner.test('F3: POST /api/regenerate-headlines returns new headlines and caps at 10', async () => {
  const serverInstance = await startTestServer();
  try {
    const existing5 = [
      'ग्वालियर में तानसेन संगीत समारोह का गरिमामय शुभारंभ हुआ',
      'तानसेन समारोह 2026: देश भर के शीर्ष शास्त्रीय गायक पहुंचे',
      'ग्वालियर किले पर सुरों की महफिल, राग यमन की मनमोहक प्रस्तुति',
      'संगीत की नगरी ग्वालियर में तीन दिवसीय राष्ट्रीय उत्सव शुरू',
      'तानसेन समाधि स्थल पर शास्त्रीय संगीत का भव्य समागम आयोजित',
    ];

    const context = {
      title: 'ग्वालियर में तानसेन संगीत समारोह 2026',
      content: 'ग्वालियर में ऐतिहासिक तानसेन संगीत समारोह की शुरुआत हुई जिसमें देश भर के ख्यातिप्राप्त गायक और संगीतकार जुटे हैं।',
    };

    const res = await postJson(serverInstance.baseUrl, '/api/regenerate-headlines', {
      canonicalContext: context,
      previousHeadlines: existing5,
      headlineCount: 5,
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200 from regenerate endpoint, got ${res.status}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.headlines), 'Returns headlines array');
    assert.ok(res.data.headlines.length >= 1, 'Returns new headlines');
    assert.strictEqual(res.data.regenerationUsed, true, 'Flags regenerationUsed=true when reaching 10');
    assert.strictEqual(res.data.totalHeadlineOptions.length, 10, 'Total options is capped at 10');
  } finally {
    await serverInstance.close();
  }
});

runner.test('F4: POST /api/regenerate-headlines rejects request when already at 10 headlines', async () => {
  const serverInstance = await startTestServer();
  try {
    const existing10 = Array.from({ length: 10 }, (_, i) => `पुराना हेडलाइन विकल्प ${i + 1}`);

    const res = await postJson(serverInstance.baseUrl, '/api/regenerate-headlines', {
      canonicalContext: { title: 'परीक्षण शीर्षक' },
      previousHeadlines: existing10,
    });

    assert.strictEqual(res.status, 409, `Expected HTTP 409 Conflict when 10 headlines exist, got ${res.status}`);
    assert.strictEqual(res.data.alreadyUsed, true);
    assert.ok(res.data.error.includes('10'), 'Error message states 10 headline limit');
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
