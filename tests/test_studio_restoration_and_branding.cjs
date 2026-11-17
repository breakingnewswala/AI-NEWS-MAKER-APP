/**
 * AI NEWS MAKER — Studio Restoration & Browser Title Branding Verification Suite
 *
 * Verifies:
 * - RotateCcw is properly imported from lucide-react in App.tsx & web_studio/App.tsx
 * - All JSX icons across the application exist in imports and in lucide-react
 * - Browser tab titles follow exact format: Page Name / AI News Maker
 * - No title duplication
 * - Zero TDZ violations across hooks
 * - 100% mirror parity between root and web_studio
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('--- STARTING STUDIO RESTORATION & BRANDING VERIFICATION ---');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// 1. Verify RotateCcw import in App.tsx and web_studio/src/App.tsx
runTest('App.tsx: RotateCcw imported from lucide-react in both mirrors', () => {
  const rootAppPath = path.join(process.cwd(), 'src', 'App.tsx');
  const webAppPath = path.join(process.cwd(), 'web_studio', 'src', 'App.tsx');
  assert(fs.existsSync(rootAppPath), 'src/App.tsx must exist');
  assert(fs.existsSync(webAppPath), 'web_studio/src/App.tsx must exist');

  const rootContent = fs.readFileSync(rootAppPath, 'utf8');
  const webContent = fs.readFileSync(webAppPath, 'utf8');

  // Check RotateCcw in import block
  const importMatch = rootContent.match(/import\s*\{[^}]*RotateCcw[^}]*\}\s*from\s*['"]lucide-react['"]/s);
  assert(importMatch, 'src/App.tsx must import RotateCcw from lucide-react');

  const webImportMatch = webContent.match(/import\s*\{[^}]*RotateCcw[^}]*\}\s*from\s*['"]lucide-react['"]/s);
  assert(webImportMatch, 'web_studio/src/App.tsx must import RotateCcw from lucide-react');

  // Verify RotateCcw is used in JSX without error
  assert(rootContent.includes('<RotateCcw'), 'src/App.tsx must contain <RotateCcw');
  assert(webContent.includes('<RotateCcw'), 'web_studio/src/App.tsx must contain <RotateCcw');
});

// 2. Full Lucide icon audit
runTest('Icon Audit: Zero missing lucide icon imports in any JSX component', () => {
  const output = execSync('node tests/audit_missing_icons.cjs', { encoding: 'utf8' });
  assert(output.includes('0 MISSING ICONS FOUND'), 'audit_missing_icons must find 0 missing icons');
  assert(output.includes('All JSX icons across all components are properly imported'), 'All JSX icons must be valid');
});

// 3. Verify Browser Tab Title Branding (Page Name / AI News Maker)
runTest('App.tsx: getTabMeta delivers exact "Page Name / AI News Maker" format', () => {
  const rootAppPath = path.join(process.cwd(), 'src', 'App.tsx');
  const content = fs.readFileSync(rootAppPath, 'utf8');

  const expectedTitles = [
    { tab: 'home', title: 'Home / AI News Maker' },
    { tab: 'videos', title: 'Video & Reels / AI News Maker' },
    { tab: 'studio', title: 'Studio / AI News Maker' },
    { tab: 'newsroom', title: 'Newsroom / AI News Maker' },
    { tab: 'epaper', title: 'E-Paper / AI News Maker' },
    { tab: 'profile', title: 'Profile / AI News Maker' },
    { tab: 'admin', title: 'Admin / AI News Maker' },
    { tab: 'terms', title: 'Terms & Conditions / AI News Maker' },
    { tab: 'privacy', title: 'Privacy Policy / AI News Maker' },
    { tab: 'refunds', title: 'Refund Policy / AI News Maker' },
    { tab: 'support', title: 'Support / AI News Maker' },
    { tab: 'delete-account', title: 'Account Deletion / AI News Maker' }
  ];

  expectedTitles.forEach(({ tab, title }) => {
    assert(
      content.includes(`title: '${title}'`),
      `getTabMeta must define title: '${title}' for tab ${tab}`
    );
  });

  // Ensure no duplicate branding
  assert(!content.includes('/ AI News Maker / AI News Maker'), 'No double suffix allowed');
});

// 4. Verify AST TDZ check
runTest('TDZ Audit: Zero hook dependency ordering violations', () => {
  const output = execSync('node tests/ast_tdz_checker.cjs', { encoding: 'utf8' });
  assert(output.includes('Total issues found: 0'), 'ast_tdz_checker must report 0 issues');
});

// 5. Verify 100% Mirror Parity
runTest('Mirror Parity: src/App.tsx and web_studio/src/App.tsx are 100% identical', () => {
  const rootAppPath = path.join(process.cwd(), 'src', 'App.tsx');
  const webAppPath = path.join(process.cwd(), 'web_studio', 'src', 'App.tsx');
  const rootContent = fs.readFileSync(rootAppPath, 'utf8');
  const webContent = fs.readFileSync(webAppPath, 'utf8');
  assert.strictEqual(rootContent, webContent, 'App.tsx must be byte-for-byte identical in root and web_studio');
});

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
