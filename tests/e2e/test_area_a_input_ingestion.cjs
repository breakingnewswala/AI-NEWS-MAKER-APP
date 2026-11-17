/**
 * Area A: Input Ingestion & Type Classification Test Suite
 * Requirement: R1 (Input Ingestion and Full Article Scraping Engine)
 * Tests 4 types: news_url, raw_script, press_release, voice_command
 * Includes: Tier 1 (Coverage), Tier 2 (Boundary/Edge), Tier 3 (Combo), Tier 4 (Real-world HTTP integration)
 */

const {
  assert,
  createTestRunner,
  identifyInputType,
  startTestServer,
  postJson,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area A: Input Ingestion & Type Classification');

// -------------------------------------------------------------
// Tier 1: Core Type Classification Coverage
// -------------------------------------------------------------
runner.test('A1: Identifies standard HTTPS News URL', () => {
  const input = 'https://hindi.news18.com/news/madhya-pradesh/bhopal-metro-route-update-891234.html';
  const result = identifyInputType(input);
  assert.strictEqual(result, 'news_url', `Expected news_url for standard HTTPS URL, got ${result}`);
});

runner.test('A2: Identifies standard HTTP News URL and www subdomain', () => {
  const input1 = 'http://dainikbhaskar.com/national/delhi-pollution-aqi-record-high.html';
  const input2 = 'www.amarujala.com/uttar-pradesh/lucknow-weather-forecast.html';
  assert.strictEqual(identifyInputType(input1), 'news_url');
  assert.strictEqual(identifyInputType(input2), 'news_url');
});

runner.test('A3: Identifies raw reporter script / news text', () => {
  const input = 'ग्वालियर में भारी बारिश के कारण शहर के कई निचले इलाकों में जलभराव हो गया है। नगर निगम की टीमें जल निकासी के लिए लगातार काम कर रही हैं। स्थानीय प्रशासन ने अलर्ट जारी किया है।';
  const result = identifyInputType(input);
  assert.strictEqual(result, 'raw_script', `Expected raw_script for news text, got ${result}`);
});

runner.test('A4: Identifies Hindi press release / official statement', () => {
  const input = 'प्रेस विज्ञप्ति: मध्यप्रदेश शासन, जनसंपर्क विभाग। राज्य में औद्योगिक निवेश को बढ़ावा देने हेतु नई नीति को कैबिनेट की मंजूरी दी गई है। आदेश तत्काल प्रभाव से लागू होगा।';
  const result = identifyInputType(input);
  assert.strictEqual(result, 'press_release', `Expected press_release for press note text, got ${result}`);
});

runner.test('A5: Identifies Hindi voice command transcribed to text', () => {
  const input = 'ग्वालियर के महाराज बाड़ा पर हुए अग्निकांड पर तुरंत एक समाचार कार्ड और हेडलाइन बनाओ';
  const result = identifyInputType(input);
  assert.strictEqual(result, 'voice_command', `Expected voice_command for spoken action cue, got ${result}`);
});

// -------------------------------------------------------------
// Tier 2: Boundary & Edge Conditions
// -------------------------------------------------------------
runner.test('A6: Identifies URL with leading/trailing whitespace & mixed case protocol', () => {
  const input = '   HTTPS://Ndtv.In/India-News/Parliament-Budget-Session-Live-Updates-102938   ';
  const result = identifyInputType(input);
  assert.strictEqual(result, 'news_url', `Expected news_url for spaced URL, got ${result}`);
});

runner.test('A7: Identifies English Press Release and Official Memorandum keywords', () => {
  const input1 = 'FOR IMMEDIATE RELEASE: Ministry of Finance announces new tax compliance guidelines for fiscal year 2026.';
  const input2 = 'Official statement: The company reports 25% revenue growth in Q3.';
  assert.strictEqual(identifyInputType(input1), 'press_release');
  assert.strictEqual(identifyInputType(input2), 'press_release');
});

runner.test('A8: Explicit metadata hint takes priority for voice input', () => {
  const input = 'इंदौर में स्वच्छता अभियान का तीसरा चरण शुरू';
  const resultVoice = identifyInputType(input, undefined, { isVoice: true });
  assert.strictEqual(resultVoice, 'voice_command', 'Metadata isVoice:true must resolve to voice_command');

  const resultPress = identifyInputType(input, undefined, { isPressRelease: true });
  assert.strictEqual(resultPress, 'press_release', 'Metadata isPressRelease:true must resolve to press_release');
});

runner.test('A9: Identifies spoken cue variations (बना दीजिए, तैयार करो, लिखो, generate)', () => {
  assert.strictEqual(identifyInputType('इस खबर पर पाँच अच्छी हेडलाइन बना दीजिए'), 'voice_command');
  assert.strictEqual(identifyInputType('कृपया आज की मुख्य खबर की स्टोरी तैयार करो'), 'voice_command');
  assert.strictEqual(identifyInputType('generate a news card for this accident'), 'voice_command');
  assert.strictEqual(identifyInputType('write 5 headlines for budget speech'), 'voice_command');
});

runner.test('A10: Long narrative mentioning URL in paragraph is treated as raw_script', () => {
  const input = 'आज सुबह एक अजीब घटना सामने आई जिसमें लोगों ने https://example.com पर जाकर जानकारी देखी लेकिन हकीकत में प्रशासन ने कोई नई गाइडलाइन जारी नहीं की थी। सभी नागरिक सतर्क रहें।';
  const result = identifyInputType(input);
  assert.strictEqual(result, 'raw_script', `Embedded URL inside article text must be raw_script unless passed as linkUrl, got ${result}`);
});

// -------------------------------------------------------------
// Tier 3: Pairwise & Link Parameter Precedence
// -------------------------------------------------------------
runner.test('A11: Link parameter takes precedence as news_url over narrative comment', () => {
  const text = 'कृपया इस महत्वपूर्ण लिंक का समाचार बनाइए';
  const link = 'https://navbharattimes.indiatimes.com/state/madhya-pradesh/bhopal/story.html';
  const result = identifyInputType(text, link);
  assert.strictEqual(result, 'news_url', 'Explicit linkUrl parameter must classify as news_url');
});

// -------------------------------------------------------------
// Tier 4: Real-World HTTP Endpoint Verification
// -------------------------------------------------------------
runner.test('A12: HTTP endpoint /api/process-news-command accepts raw_script and processes it', async () => {
  const serverInstance = await startTestServer();
  try {
    const rawArticle = 'भोपाल में आयोजित राज्य स्तरीय विज्ञान मेले में प्रदेश भर के 500 से अधिक बाल वैज्ञानिकों ने अपने नवाचार मॉडल प्रदर्शित किए। मुख्यमंत्री ने उत्कृष्ट मॉडलों को पुरस्कृत किया और युवा वैज्ञानिकों को हर संभव सहायता का आश्वासन दिया।';
    const res = await postJson(serverInstance.baseUrl, '/api/process-news-command', {
      input: rawArticle,
      title: 'भोपाल में राज्य स्तरीय बाल विज्ञान मेला आयोजित',
      summary: 'भोपाल में आयोजित राज्य स्तरीय विज्ञान मेले में प्रदेश भर के 500 से अधिक बाल वैज्ञानिकों ने अपने नवाचार मॉडल प्रदर्शित किए।',
      requestedAiProvider: 'gemini',
    });

    assert.ok(res.status === 200 || res.status === 201, `Expected HTTP 200/201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data.headlineOptions), 'headlineOptions must be array');
    assert.ok(res.data.data.headlineOptions.length >= 5, 'Must return at least 5 headlines');
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
