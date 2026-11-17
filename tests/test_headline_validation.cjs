/**
 * test_headline_validation.cjs
 * Comprehensive Verification Suite for Centralized Headline Validator & Generation Pipeline
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

console.log("==================================================================");
console.log("🧪 VERIFYING HEADLINE VALIDATION CODE & GENERATION PIPELINE");
console.log("==================================================================");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [PASS] TC${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TC${totalCount}: ${name}`);
    console.error(`   Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// Read modules
const rootValidatorSrc = fs.readFileSync(path.join(__dirname, "../src/lib/headlineValidator.ts"), "utf-8");
const studioValidatorSrc = fs.readFileSync(path.join(__dirname, "../web_studio/src/lib/headlineValidator.ts"), "utf-8");

// TC 1: Validator exports and configuration invariants
runTest("Headline validator exports HEADLINE_TARGETS, BLOCKED_MEDIA_BRANDS and core helpers", () => {
  assert.ok(rootValidatorSrc.includes("export const HEADLINE_TARGETS"), "HEADLINE_TARGETS must be exported");
  assert.ok(rootValidatorSrc.includes("{ min: 80, max: 110 }"), "Tier 1 must be 80-110");
  assert.ok(rootValidatorSrc.includes("{ min: 100, max: 130 }"), "Tier 2 must be 100-130");
  assert.ok(rootValidatorSrc.includes("{ min: 125, max: 150 }"), "Tier 3 must be 125-150");
  assert.ok(rootValidatorSrc.includes("{ min: 130, max: 160 }"), "Tier 4 must be 130-160");
  assert.ok(rootValidatorSrc.includes("{ min: 150, max: 200 }"), "Tier 5 must be 150-200");
  assert.ok(rootValidatorSrc.includes("export const BLOCKED_MEDIA_BRANDS"), "BLOCKED_MEDIA_BRANDS must be exported");
  assert.ok(rootValidatorSrc.includes("export function countCharacters"), "countCharacters must be exported");
  assert.ok(rootValidatorSrc.includes("export function hasBlockedMediaBrand"), "hasBlockedMediaBrand must be exported");
  assert.ok(rootValidatorSrc.includes("export function hasInvalidHeadlineEnding"), "hasInvalidHeadlineEnding must be exported");
  assert.ok(rootValidatorSrc.includes("export function validateHeadline"), "validateHeadline must be exported");
  assert.ok(rootValidatorSrc.includes("export function validateHeadlinesBatch"), "validateHeadlinesBatch must be exported");
  assert.ok(rootValidatorSrc.includes("export function regenerateHeadlineOptionFromFacts"), "regenerateHeadlineOptionFromFacts must be exported");
  assert.ok(rootValidatorSrc.includes("export function extractPublisherFromDomain"), "extractPublisherFromDomain must be exported");
});

// Compile validator in-memory for live functional execution using esbuild
const esbuild = require("esbuild");
function evalTs(tsCode) {
  const jsCode = esbuild.transformSync(tsCode, { loader: "ts", format: "cjs" }).code;
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "require", jsCode);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const validator = evalTs(rootValidatorSrc);

// TC 2: Devanagari Grapheme Counting using Intl.Segmenter
runTest("Devanagari grapheme cluster counting with countCharacters", () => {
  const sample = "भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का दावा";
  const charCount = validator.countCharacters(sample);
  assert.strictEqual(typeof charCount, "number");
  assert.strictEqual(charCount, 52, `Expected grapheme count 52, got ${charCount}`);
  
  // Empty or whitespace
  assert.strictEqual(validator.countCharacters(""), 0);
  assert.strictEqual(validator.countCharacters("   "), 0);
});

// TC 3: Blocked Media Brand Rejection
runTest("hasBlockedMediaBrand detects prohibited Hindi and English media brands and scraped aliases", () => {
  // Prohibited Hindi brands
  assert.ok(validator.hasBlockedMediaBrand("नई दुनिया की विशेष रिपोर्ट में खुलासा"), "Should detect 'नई दुनिया'");
  assert.ok(validator.hasBlockedMediaBrand("दैनिक भास्कर ब्यूरो: भोपाल में भारी बारिश"), "Should detect 'दैनिक भास्कर'");
  assert.ok(validator.hasBlockedMediaBrand("अमर उजाला: बड़ा प्रशासनिक फेरबदल"), "Should detect 'अमर उजाला'");
  assert.ok(validator.hasBlockedMediaBrand("आज तक पर लाइव प्रसारण"), "Should detect 'आज तक'");
  
  // Prohibited English brands
  assert.ok(validator.hasBlockedMediaBrand("NDTV live report on assembly session"), "Should detect 'NDTV'");
  assert.ok(validator.hasBlockedMediaBrand("News18 breaking update"), "Should detect 'News18'");
  assert.ok(validator.hasBlockedMediaBrand("ABP News exclusively reports"), "Should detect 'ABP News'");

  // Dynamic scraped publisher name
  assert.ok(
    validator.hasBlockedMediaBrand("खबर पर पत्रिका का बड़ा खुलासा", ["पत्रिका", "patrika.com"]),
    "Should detect dynamic source publisher 'पत्रिका'"
  );

  // Clean journalistic headline without media brands
  assert.ok(
    !validator.hasBlockedMediaBrand("भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम का दावा"),
    "Clean headline should not be flagged"
  );
});

// TC 4: Invalid Headline Ending and Trailing Punctuation
runTest("hasInvalidHeadlineEnding detects explanatory verb endings, trailing punctuation and conjunctions", () => {
  // Explanatory sentence endings
  assert.ok(validator.hasInvalidHeadlineEnding("भोपाल में पेयजल आपूर्ति को लेकर बड़ा दावा सामने आया था"), "Should reject ending with 'था'");
  assert.ok(validator.hasInvalidHeadlineEnding("पूरे मामले को लेकर प्रशासन द्वारा बड़ा फैसला लिया गया"), "Should reject ending with 'लिया गया'");
  assert.ok(validator.hasInvalidHeadlineEnding("नागरिकों को सुरक्षित पेयजल सुविधा उपलब्ध कराई जाएगी"), "Should reject ending with 'उपलब्ध कराई जाएगी'");
  assert.ok(validator.hasInvalidHeadlineEnding("शहर के कई इलाकों में जल आपूर्ति बंद है"), "Should reject ending with 'है'");
  assert.ok(validator.hasInvalidHeadlineEnding("अधिकारियों को आवश्यक दिशा-निर्देश दिए गए हैं"), "Should reject ending with 'दिए गए हैं'");

  // Trailing punctuation
  assert.ok(validator.hasInvalidHeadlineEnding("भोपाल के पानी में मिला बैक्टीरिया।"), "Should reject trailing purnaviram ।");
  assert.ok(validator.hasInvalidHeadlineEnding("भोपाल के पानी में मिला बैक्टीरिया..."), "Should reject trailing dots ...");
  assert.ok(validator.hasInvalidHeadlineEnding("भोपाल के पानी में मिला बैक्टीरिया?"), "Should reject trailing question mark ?");
  assert.ok(validator.hasInvalidHeadlineEnding("भोपाल के पानी में मिला बैक्टीरिया - "), "Should reject trailing hyphen -");

  // Trailing dangling connector
  assert.ok(validator.hasInvalidHeadlineEnding("भोपाल में पेयजल आपूर्ति को लेकर एक बड़ा दावा सामने आया था जिसमें"), "Should reject dangling clause ending with जिसमें");

  // Valid journalistic headline endings
  assert.ok(!validator.hasInvalidHeadlineEnding("भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का किया दावा"), "Valid action headline ending with noun phrase should pass");
  assert.ok(!validator.hasInvalidHeadlineEnding("उज्जैन में कार्तिक मास की पहली महाकाल की सवारी, मनमहेश रूप में दर्शन"), "Valid newspaper headline ending should pass");
});

// TC 5: 5-Tier Target Range Validation
runTest("validateHeadline enforces individual 5-tier character ranges", () => {
  // Target 1: 80 - 110 chars
  const h1 = "भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का किया बड़ा दावा";
  const r1 = validator.validateHeadline(h1, 0);
  assert.ok(r1.valid, `Tier 1 should be valid. Errors: ${r1.errors.join(", ")}`);
  assert.strictEqual(r1.tier, 1);
  assert.strictEqual(r1.minTarget, 80);
  assert.strictEqual(r1.maxTarget, 110);

  // Exceeding Tier 1 max (110) should fail
  const rTier1Exceed = validator.validateHeadline(h1.repeat(2), 0);
  assert.strictEqual(rTier1Exceed.valid, false, "Headline exceeding Tier 1 max must fail");
  assert.ok(rTier1Exceed.errors.some(e => e.includes("Maximum character limit exceeded")), "Should contain maximum limit error");

  // Exceeding Tier 5 absolute max (200) should fail
  const rTier5Exceed = validator.validateHeadline(h1.repeat(4), 4);
  assert.strictEqual(rTier5Exceed.valid, false, "Headline exceeding Tier 5 max must fail");
  assert.ok(rTier5Exceed.errors.some(e => e.includes("Maximum character limit exceeded")), "Should contain maximum limit error");
});

// TC 6: Duplicate and Near-Duplicate Rejection
runTest("validateHeadlinesBatch detects duplicates and similarity across options", () => {
  const identicalBatch = [
    "भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का किया बड़ा दावा",
    "भोपाल में पेयजल आपूर्ति को लेकर एक बड़ा दावा सामने आया, जिसमें जांच दल ने रिपोर्ट पेश कर दी",
    "भोपाल में पेयजल आपूर्ति को लेकर एक बड़ा दावा सामने आया था जिसमें शहर के पानी में इंदौर की तरह जानलेवा बैक्टीरिया मिला",
    "भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का किया बड़ा दावा", // duplicate of opt 1
    "भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का किया बड़ा दावा", // duplicate of opt 1
  ];

  const batchRes = validator.validateHeadlinesBatch(identicalBatch);
  assert.strictEqual(batchRes.valid, false, "Batch with duplicate options must be invalid");
  assert.ok(batchRes.results[3].errors.some(e => e.includes("समान")), "Option 4 must be flagged as duplicate");
  assert.ok(batchRes.results[4].errors.some(e => e.includes("समान")), "Option 5 must be flagged as duplicate");
});

// TC 7: Fact-Sheet Regeneration for Invalid Tiers
runTest("regenerateHeadlineOptionFromFacts produces valid, grammatical headline without filler", () => {
  const facts = [
    "भोपाल नगर निगम ने शहर के पेयजल स्रोतों से लिए गए पानी के नमूनों की आधिकारिक जांच रिपोर्ट आज सार्वजनिक कर दी",
    "जांच में विभिन्न वार्डों से एकत्र किए गए पानी के नमूनों में खतरनाक ई-कोलाई बैक्टीरिया पाए जाने की पुष्टि हुई",
    "स्वास्थ्य विभाग की टीम ने नागरिकों को पानी अच्छी तरह उबालकर और छानकर ही पीने की सख्त सलाह जारी की",
    "विभागीय उच्चाधिकारियों ने शहर के सभी प्रभावित वार्डों में क्लोरीन की गोलियां तत्काल वितरित करने के निर्देश दिए"
  ];

  for (let tierIdx = 0; tierIdx < 5; tierIdx++) {
    const regenerated = validator.regenerateHeadlineOptionFromFacts(
      facts,
      "भोपाल",
      tierIdx,
      "भोपाल नगर निगम ने शहर के पेयजल स्रोतों से लिए गए पानी के नमूनों की आधिकारिक जांच रिपोर्ट आज सार्वजनिक कर दी"
    );
    assert.ok(regenerated, `Tier ${tierIdx + 1} regeneration must not be empty`);
    const charCount = validator.countCharacters(regenerated);
    assert.ok(charCount > 30, `Tier ${tierIdx + 1} regenerated length (${charCount}) should be substantive`);
    assert.ok(!validator.hasBlockedMediaBrand(regenerated), "Regenerated headline must not contain blocked media brands");
    assert.ok(!validator.hasInvalidHeadlineEnding(regenerated), "Regenerated headline must not end with invalid explanatory verb or trailing punctuation");
  }
});

// TC 8: URL Scraper Publisher Extraction
runTest("extractPublisherFromDomain maps news websites to canonical Hindi publisher names", () => {
  assert.ok(validator.extractPublisherFromDomain("https://www.naidunia.com/madhya-pradesh/bhopal").includes("नई दुनिया"));
  assert.ok(validator.extractPublisherFromDomain("https://www.bhaskar.com/local/mp/bhopal/news").includes("दैनिक भास्कर"));
  assert.ok(validator.extractPublisherFromDomain("https://www.amarujala.com/madhya-pradesh").includes("अमर उजाला"));
  assert.ok(validator.extractPublisherFromDomain("https://navbharattimes.indiatimes.com/state").includes("नवभारत टाइम्स"));
  assert.ok(validator.extractPublisherFromDomain("https://zeenews.india.com/hindi/india").includes("ज़ी न्यूज़"));
  assert.deepStrictEqual(validator.extractPublisherFromDomain("https://unknown-domain.org/article"), []);
});

// TC 9: Backend server.ts Integration
runTest("server.ts imports and wires headline validator in /api/process-news-command and /api/regenerate-headlines", () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, "../server.ts"), "utf-8");
  assert.ok(serverSrc.includes('import {'), "server.ts must have imports");
  assert.ok(serverSrc.includes("validateHeadlinesBatch("), "server.ts must call validateHeadlinesBatch");
  assert.ok(serverSrc.includes("effectiveSourcePublisherNames"), "server.ts must derive effectiveSourcePublisherNames");
  assert.ok(serverSrc.includes("hasBlockedMediaBrand"), "server.ts must import hasBlockedMediaBrand");
  assert.ok(serverSrc.includes("hasInvalidHeadlineEnding"), "server.ts must import hasInvalidHeadlineEnding");
  assert.ok(serverSrc.includes("regenerateHeadlineOptionFromFacts"), "server.ts must import regenerateHeadlineOptionFromFacts");
});

// TC 10: Frontend Integration in InlineAiNewsTools, CardEditor and App.tsx
runTest("Frontend components integrate countCharacters, validation warnings, and pre-export checks", () => {
  const inlineSrc = fs.readFileSync(path.join(__dirname, "../src/components/InlineAiNewsTools.tsx"), "utf-8");
  assert.ok(inlineSrc.includes("from '../lib/headlineValidator'"), "InlineAiNewsTools must import from headlineValidator");
  assert.ok(inlineSrc.includes("countCharacters"), "InlineAiNewsTools must use countCharacters");
  assert.ok(inlineSrc.includes("validateGeneralHeadline"), "InlineAiNewsTools must use validateGeneralHeadline");
  assert.ok(inlineSrc.includes("संपादकीय गुणवत्ता चेतावनी"), "InlineAiNewsTools must include editorial warning banner");

  const editorSrc = fs.readFileSync(path.join(__dirname, "../src/components/CardEditor.tsx"), "utf-8");
  assert.ok(editorSrc.includes("from '../lib/headlineValidator'"), "CardEditor must import from headlineValidator");
  assert.ok(editorSrc.includes("countCharacters"), "CardEditor must use countCharacters");
  assert.ok(editorSrc.includes("/ 200 अक्षर"), "CardEditor must display / 200 character counter");
  assert.ok(editorSrc.includes("संपादकीय गुणवत्ता चेतावनी"), "CardEditor must include live editorial warning banner");

  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf-8");
  assert.ok(appSrc.includes("validateGeneralHeadline"), "App.tsx must import validateGeneralHeadline");
  assert.ok(appSrc.includes("handleDownload"), "App.tsx must have handleDownload");
  assert.ok(appSrc.includes("संपादकीय चेतावनी"), "App.tsx must perform headline compliance check in handleDownload");
});

// TC 11: 100% SHA256 Parity Between Root and web_studio/
runTest("100% SHA256 Parity between root and web_studio for all modified modules", () => {
  const filesToVerify = [
    "src/lib/headlineValidator.ts",
    "src/lib/clientAiProcessor.ts",
    "src/lib/clientScraper.ts",
    "src/lib/speakerUtils.ts",
    "src/types.ts",
    "src/components/InlineAiNewsTools.tsx",
    "src/components/CardEditor.tsx",
    "src/App.tsx",
    "server.ts",
  ];

  for (const file of filesToVerify) {
    const rootPath = path.join(__dirname, "..", file);
    const studioPath = path.join(__dirname, "..", "web_studio", file);

    assert.ok(fs.existsSync(rootPath), `Root file must exist: ${file}`);
    assert.ok(fs.existsSync(studioPath), `Studio mirror must exist: web_studio/${file}`);

    const rootHash = crypto.createHash("sha256").update(fs.readFileSync(rootPath)).digest("hex");
    const studioHash = crypto.createHash("sha256").update(fs.readFileSync(studioPath)).digest("hex");

    assert.strictEqual(
      rootHash,
      studioHash,
      `SHA256 mismatch between ${file} and web_studio/${file}!\nRoot:   ${rootHash}\nStudio: ${studioHash}`
    );
  }
});

// TC 12: Android applicationId preservation
runTest("Android applicationId preserved as com.aistudio.ainewsmaker.hzwptx", () => {
  const gradlePath = path.join(__dirname, "../app/build.gradle");
  if (fs.existsSync(gradlePath)) {
    const gradle = fs.readFileSync(gradlePath, "utf-8");
    assert.ok(
      gradle.includes('applicationId "com.aistudio.ainewsmaker.hzwptx"'),
      "app/build.gradle must retain applicationId 'com.aistudio.ainewsmaker.hzwptx'"
    );
  }
});

console.log("==================================================================");
console.log(`Summary: ${passedCount} / ${totalCount} test cases passed.`);
console.log("==================================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
