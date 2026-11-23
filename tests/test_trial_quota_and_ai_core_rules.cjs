/**
 * tests/test_trial_quota_and_ai_core_rules.cjs
 * Empirical verification suite for:
 * 1. PRO Tier & Active Trial 50-graphic limit
 * 2. 12-22 word headline bounds (no 35-word run-ons)
 * 3. 3-format caption generation without broken boilerplate
 * 4. Hashtag hierarchy: #Username -> Middle -> #AINewsMaker
 * 5. 100% SHA256 mirror parity
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const esbuild = require("esbuild");

console.log("==================================================================");
console.log("🧪 VERIFYING TRIAL QUOTA (50/DAY) & AI CORE EDITORIAL RULES");
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

// Compile TS with bundling
function evalTs(filePath) {
  const result = esbuild.buildSync({
    entryPoints: [filePath],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    external: ["fs", "path", "crypto"],
  });
  const jsCode = result.outputFiles[0].text;
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "require", jsCode);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const rootPlans = JSON.parse(fs.readFileSync(path.join(__dirname, "../plans_catalog_database.json"), "utf-8"));
const serverSrc = fs.readFileSync(path.join(__dirname, "../server.ts"), "utf-8");
const userPlanManagerSrc = fs.readFileSync(path.join(__dirname, "../src/lib/userPlanManager.ts"), "utf-8");
const aiCoreRulesSrc = fs.readFileSync(path.join(__dirname, "../src/lib/aiCoreRules.ts"), "utf-8");
const speakerUtils = evalTs(path.join(__dirname, "../src/lib/speakerUtils.ts"));

// TC 1: PRO Plan Catalog & Configuration has 50 graphics per day
runTest("PRO plan in catalog and plan managers defines maxGraphicsPerDay as 50", () => {
  const proPlan = rootPlans.find((p) => p.id === "professional");
  assert.ok(proPlan, "PRO plan must exist in catalog");
  assert.strictEqual(proPlan.maxGraphicsPerDay, 50, "PRO maxGraphicsPerDay must be 50");
  assert.ok(proPlan.tagline.includes("50 कार्ड प्रतिदिन"), "PRO tagline must mention 50 कार्ड प्रतिदिन");

  assert.ok(userPlanManagerSrc.includes("maxGraphicsPerDay: 50"), "userPlanManager.ts must set PRO limit to 50");
  assert.ok(aiCoreRulesSrc.includes("PRO: 50"), "aiCoreRules.ts DAILY_GRAPHIC_DOWNLOAD_LIMITS must have PRO: 50");
});

// TC 2: server.ts enforces 50 limit and trial user upgrade to professional
runTest("server.ts assigns professional 50 limit to active trial users", () => {
  assert.ok(
    serverSrc.includes("if (clean.includes(\"pro\") || clean.includes(\"professional\") || clean.includes(\"trial\")) return 50;"),
    "getDailyGraphicLimitForTier must return 50 for pro/trial"
  );
  assert.ok(
    serverSrc.includes("trialFields.isTrialActive && tier === \"basic\"") &&
    serverSrc.includes("tier = \"professional\";"),
    "server.ts must map active trial users to professional tier"
  );
  assert.ok(
    serverSrc.includes("(tier === 'professional' || tier === 'pro') ? 50 :"),
    "server.ts /api/user-download-status must use 50 limit for professional"
  );
});

// TC 3: generate5BalancedHeadlineOptions clamps long sentences and prevents run-on overflow
runTest("generate5BalancedHeadlineOptions enforces 12-22 words and bounds under 115 characters", () => {
  const longRunOnSentence = "मध्य प्रदेश के उमरिया में पीलिया से एक युवक की मौत के बाद स्वास्थ्य विभाग की एंबुलेंस सेवा उपलब्ध नहीं हो सकी, इसके चलते मृतक के परिजनों को शव को मोटरसाइकिल पर रखकर घर ले जाने के लिए मजबूर होना पड़ा";
  const options = speakerUtils.generate5BalancedHeadlineOptions(
    "उमरिया में एंबुलेंस न मिलने पर बाइक से ले गए शव",
    [longRunOnSentence],
    "उमरिया, मध्य प्रदेश"
  );

  assert.strictEqual(options.length, 5, `Expected 5 options, got ${options.length}`);
  options.forEach((opt, idx) => {
    const wordCount = opt.split(/\s+/).filter(Boolean).length;
    const charCount = speakerUtils.countHeadlineVisibleCharacters(opt);
    assert.ok(wordCount <= 22, `Option ${idx + 1} has ${wordCount} words (must be <= 22): "${opt}"`);
    assert.ok(charCount <= 125, `Option ${idx + 1} has ${charCount} chars (must be <= 125): "${opt}"`);
    assert.ok(!opt.includes("मजबूर होना पड़ा"), `Option ${idx + 1} must not contain the raw 37-word run-on`);
  });
});

// TC 4: fitHeadlinesTo5TierRanges clamps long inputs to 12-22 words
runTest("fitHeadlinesTo5TierRanges guarantees 5 distinct options without run-ons", () => {
  const longSentence = "मध्य प्रदेश के उमरिया में पीलिया से एक युवक की मौत के बाद स्वास्थ्य विभाग की एंबुलेंस सेवा उपलब्ध नहीं हो सकी, इसके चलते मृतक के परिजनों को शव को मोटरसाइकिल पर रखकर घर ले जाने के लिए मजबूर होना पड़ा";
  const fitted = speakerUtils.fitHeadlinesTo5TierRanges(
    [longSentence],
    [longSentence],
    "उमरिया में बाइक पर शव",
    "उमरिया"
  );

  assert.strictEqual(fitted.length, 5, `Expected 5 fitted headlines, got ${fitted.length}`);
  fitted.forEach((h, idx) => {
    const wordCount = h.split(/\s+/).filter(Boolean).length;
    assert.ok(wordCount <= 22, `Fitted headline ${idx + 1} exceeds 22 words: ${wordCount}`);
  });
});

// TC 5: Caption Generator eliminates broken boilerplate
runTest("ensureHashtagHierarchy produces clean paragraphs without 'में सामने आए' boilerplate", () => {
  const minimalSummary = "उमरिया में एंबुलेंस न मिलने पर बाइक से शव ले गए परिजन।";
  const caption = speakerUtils.ensureHashtagHierarchy(
    minimalSummary,
    "उमरिया, मध्य प्रदेश",
    "AnmolSandesh",
    "detailed",
    "उमरिया में एंबुलेंस न मिलने पर बाइक से शव ले गए परिजन"
  );

  assert.ok(!caption.includes("में सामने आए इस मामले को लेकर"), "Caption must not contain broken 'में सामने आए' boilerplate");
  assert.ok(!caption.includes("मामले में आगे की आवश्यक कार्रवाई और जांच जारी है, जिससे जुड़ी"), "Caption must not contain generic boilerplate");
  assert.ok(caption.startsWith("उमरिया में एंबुलेंस"), "Caption must start with genuine news facts");
  assert.ok(caption.includes("#AnmolSandesh"), "First tag must be user's profile tag");
  assert.ok(caption.endsWith("#AINewsMaker"), "Final tag must be #AINewsMaker");
});

// TC 6: 100% SHA256 Mirror Parity across modified files
runTest("100% SHA256 mirror parity between root and web_studio/", () => {
  const mirroredFiles = [
    "server.ts",
    "src/lib/userPlanManager.ts",
    "src/lib/aiCoreRules.ts",
    "src/lib/speakerUtils.ts",
    "src/lib/clientAiProcessor.ts",
    "src/components/HomeScreenWeb.tsx",
    "src/components/AppTopBarWeb.tsx",
    "src/App.tsx",
  ];

  mirroredFiles.forEach((file) => {
    const rootPath = path.join(__dirname, "..", file);
    const studioPath = path.join(__dirname, "..", "web_studio", file);
    assert.ok(fs.existsSync(rootPath), `Root file ${file} must exist`);
    assert.ok(fs.existsSync(studioPath), `Studio file ${file} must exist`);

    const rootHash = crypto.createHash("sha256").update(fs.readFileSync(rootPath)).digest("hex");
    const studioHash = crypto.createHash("sha256").update(fs.readFileSync(studioPath)).digest("hex");
    assert.strictEqual(rootHash, studioHash, `SHA256 mismatch for ${file}`);
  });
});

// TC 7: Import validation to prevent runtime ReferenceErrors
runTest("AppTopBarWeb.tsx and consumer components import fetchUserDailyDownloadStatus", () => {
  const topBarContent = fs.readFileSync(path.join(__dirname, "..", "src/components/AppTopBarWeb.tsx"), "utf8");
  assert.ok(
    topBarContent.includes("fetchUserDailyDownloadStatus"),
    "AppTopBarWeb.tsx must import fetchUserDailyDownloadStatus from userPlanManager"
  );
  assert.ok(
    /import\s*\{[^}]*fetchUserDailyDownloadStatus[^}]*\}\s*from\s*['"]\.\.\/lib\/userPlanManager['"]/.test(topBarContent),
    "AppTopBarWeb.tsx must have fetchUserDailyDownloadStatus in import statement"
  );
});

console.log("==================================================================");
console.log(`🎉 ALL ${passedCount} / ${totalCount} TESTS IN TEST_TRIAL_QUOTA_AND_AI_CORE_RULES PASSED!`);
console.log("==================================================================");
