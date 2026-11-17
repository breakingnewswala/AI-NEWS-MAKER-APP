/**
 * Master E2E Verification Test Runner for AI News Maker
 * Executes all 10 test areas (Tests A through J) per ORIGINAL_REQUEST.md & TEST_INFRA.md:
 *   - Area A: Input Ingestion & Type Classification
 *   - Area B: URL Fetching, SSRF & Body Extraction
 *   - Area C: Scraping Failure & Non-hallucination
 *   - Area D: 5-Tier Headline Generation & Limits
 *   - Area E: Headline Labels, Grapheme Counting & UI Counter
 *   - Area F: Headline Regeneration & Primary Preservation
 *   - Area G: Keyword Highlighting ([yellow]...[/yellow])
 *   - Area H: Location, Categories, Flattery Sanitization & Prompts
 *   - Area I: Caption Formats, Limits & Hashtags
 *   - Area J: Gemini Fallback Resiliency & Architecture Safety
 */

const { fork } = require('child_process');
const path = require('path');

const suites = [
  { id: 'Area A', name: 'Input Ingestion & Type Classification', file: 'test_area_a_input_ingestion.cjs' },
  { id: 'Area B', name: 'URL Fetching, SSRF & Body Extraction', file: 'test_area_b_url_ssrf.cjs' },
  { id: 'Area C', name: 'Scraping Failure & Non-hallucination', file: 'test_area_c_scraping_failure.cjs' },
  { id: 'Area D', name: '5-Tier Headline Generation & Limits', file: 'test_area_d_5tier_headlines.cjs' },
  { id: 'Area E', name: 'Headline Labels, Grapheme Counting & UI Counter', file: 'test_area_e_labels_grapheme_counter.cjs' },
  { id: 'Area F', name: 'Headline Regeneration & Primary Preservation', file: 'test_area_f_regeneration_preservation.cjs' },
  { id: 'Area G', name: 'Keyword Highlighting ([yellow]...[/yellow])', file: 'test_area_g_keyword_highlighting.cjs' },
  { id: 'Area H', name: 'Location, Categories, Flattery Sanitization & Prompts', file: 'test_area_h_location_category_flattery.cjs' },
  { id: 'Area I', name: 'Caption Formats, Limits & Hashtags', file: 'test_area_i_caption_hashtags.cjs' },
  { id: 'Area J', name: 'Gemini Fallback Resiliency & Architecture Safety', file: 'test_area_j_gemini_fallback_safety.cjs' },
];

function runSuiteInFork(suite) {
  return new Promise((resolve) => {
    const filePath = path.join(__dirname, suite.file);
    const start = Date.now();
    const cp = fork(filePath, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, NO_SERVER_START: 'true', NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    cp.stdout.on('data', (d) => {
      const text = d.toString();
      stdout += text;
      process.stdout.write(text);
    });

    cp.stderr.on('data', (d) => {
      const text = d.toString();
      stderr += text;
      process.stderr.write(text);
    });

    cp.on('exit', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      resolve({
        id: suite.id,
        name: suite.name,
        file: suite.file,
        code,
        duration,
        passed: code === 0,
        stdout,
        stderr,
      });
    });

    cp.on('error', (err) => {
      resolve({
        id: suite.id,
        name: suite.name,
        file: suite.file,
        code: 1,
        duration: '0',
        passed: false,
        stdout,
        stderr: stderr + '\n' + err.message,
      });
    });
  });
}

async function runAllSuites() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       AI NEWS MAKER — MASTER E2E VERIFICATION SUITE (TESTS A THROUGH J)      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const overallStartTime = Date.now();
  const results = [];

  for (let i = 0; i < suites.length; i++) {
    const suite = suites[i];
    console.log(`\n▶️  [${i + 1}/${suites.length}] Launching ${suite.id}: ${suite.name}...`);
    const result = await runSuiteInFork(suite);
    results.push(result);
  }

  const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('                          CONSOLIDATED TEST RESULTS                             ');
  console.log('═══════════════════════════════════════════════════════════════════════════════');

  for (const r of results) {
    const statusIcon = r.passed ? '✅ PASS' : '❌ FAIL';
    const paddedId = r.id.padEnd(8, ' ');
    const paddedName = r.name.padEnd(54, ' ');
    console.log(` ${statusIcon} | ${paddedId} | ${paddedName} | ${r.duration}s`);
  }

  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(` Total Suites : ${suites.length}`);
  console.log(` Passed       : ${totalPassed}`);
  console.log(` Failed       : ${totalFailed}`);
  console.log(` Pass Rate    : ${((totalPassed / suites.length) * 100).toFixed(1)}%`);
  console.log(` Total Time   : ${totalDuration}s`);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  if (totalFailed > 0) {
    console.error(`💥 FAILURE: ${totalFailed} suite(s) failed verification!`);
    process.exit(1);
  } else {
    console.log('🎉 SUCCESS: All 10 test areas passed verification with 100% compliance!');
    process.exit(0);
  }
}

runAllSuites();
