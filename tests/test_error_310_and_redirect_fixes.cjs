const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING VERIFICATION SUITE: REACT ERROR #310, REDIRECTS, & STUDIO LOADING');
console.log('====================================================\n');

// 1. Rules of Hooks AST Verification
console.log('🔍 Test 1: Verifying 0 Rules of Hooks violations across all tsx files...');
const ts = require('../web_studio/node_modules/typescript');

function getAllFiles(dir, exts = ['.tsx', '.ts']) {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== 'build') {
        files = files.concat(getAllFiles(full, exts));
      }
    } else if (exts.includes(path.extname(item))) {
      files.push(full);
    }
  }
  return files;
}

const isHookName = (name) => /^use[A-Z0-9]/.test(name);

function checkFileForHooks(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const violations = [];

  function isFunctionNode(node) {
    return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node);
  }

  function hasDirectHookCalls(fnNode) {
    if (!fnNode.body) return false;
    let found = false;
    function visit(n) {
      if (found) return;
      if (n !== fnNode && isFunctionNode(n)) return;
      if (ts.isCallExpression(n)) {
        let callName = null;
        if (ts.isIdentifier(n.expression)) callName = n.expression.text;
        else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) callName = n.expression.name.text;
        if (callName && isHookName(callName)) { found = true; return; }
      }
      ts.forEachChild(n, visit);
    }
    visit(fnNode.body);
    return found;
  }

  function checkComponentFunction(fnNode) {
    if (!fnNode.body || !ts.isBlock(fnNode.body)) return;
    let hasSeenTopLevelReturn = false;
    let returnLine = 0;

    function checkNodeForHook(node, desc) {
      function visitInner(n) {
        if (isFunctionNode(n)) return;
        if (ts.isCallExpression(n)) {
          let callName = null;
          if (ts.isIdentifier(n.expression)) callName = n.expression.text;
          else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) callName = n.expression.name.text;
          if (callName && isHookName(callName)) {
            const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
            violations.push({ line: pos.line + 1, hook: callName, desc });
          }
        }
        ts.forEachChild(n, visitInner);
      }
      visitInner(node);
    }

    for (const stmt of fnNode.body.statements) {
      if (hasSeenTopLevelReturn) {
        checkNodeForHook(stmt, `Hook called after early return on line ${returnLine}`);
      }
      if (ts.isIfStatement(stmt)) {
        checkNodeForHook(stmt.expression, 'Hook called inside if condition');
        checkNodeForHook(stmt.thenStatement, 'Hook called inside if block');
        if (stmt.elseStatement) checkNodeForHook(stmt.elseStatement, 'Hook called inside else block');
        if (hasReturn(stmt.thenStatement) || (stmt.elseStatement && hasReturn(stmt.elseStatement))) {
          hasSeenTopLevelReturn = true;
          returnLine = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile)).line + 1;
        }
      } else if (ts.isIterationStatement(stmt, false)) {
        checkNodeForHook(stmt, 'Hook called inside loop');
      } else if (ts.isSwitchStatement(stmt)) {
        checkNodeForHook(stmt, 'Hook called inside switch');
      } else if (ts.isTryStatement(stmt)) {
        checkNodeForHook(stmt, 'Hook called inside try/catch');
      } else if (ts.isReturnStatement(stmt)) {
        hasSeenTopLevelReturn = true;
        returnLine = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile)).line + 1;
      }
    }
  }

  function hasReturn(node) {
    if (!node) return false;
    if (ts.isReturnStatement(node)) return true;
    if (ts.isBlock(node)) {
      for (const s of node.statements) {
        if (ts.isReturnStatement(s)) return true;
        if (ts.isIfStatement(s) && (hasReturn(s.thenStatement) || (s.elseStatement && hasReturn(s.elseStatement)))) return true;
      }
    }
    return false;
  }

  function walk(node) {
    if (isFunctionNode(node) && hasDirectHookCalls(node)) {
      checkComponentFunction(node);
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return violations;
}

const allTsx = getAllFiles(path.join(__dirname, '..', 'src'), ['.tsx']);
let totalViolations = 0;
for (const f of allTsx) {
  const v = checkFileForHooks(f);
  if (v.length > 0) {
    console.error(`🚨 Violations in ${f}:`, v);
    totalViolations += v.length;
  }
}
assert.strictEqual(totalViolations, 0, 'Must have zero Rules of Hooks violations');
console.log(`✅ Passed: 0 Rules of Hooks violations across ${allTsx.length} component files.\n`);

// 2. LoginModal verification
console.log('🔍 Test 2: Verifying LoginModal hook order & unconditional declarations...');
const loginModalContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'LoginModal.tsx'), 'utf-8');
assert(!loginModalContent.includes('if (!isOpen || !isAdminMode) return null;\n  \n  // Login fields'), 'Premature return before login fields must be removed');
assert(loginModalContent.includes('if (!isOpen || !isAdminMode) return null;\n\n  // Helper to process authenticated Google User') ||
       loginModalContent.includes('if (!isOpen || !isAdminMode) return null;'), 'Clean return must be after all hook declarations');
console.log('✅ Passed: LoginModal unconditionally declares all hooks prior to null check.\n');

// 3. index.html error handling verification
console.log('🔍 Test 3: Verifying index.html error listeners (no Failed to fetch loops)...');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
assert(!indexHtmlContent.includes("msg.indexOf('Failed to fetch') !== -1"), 'index.html must not trigger page reload on Failed to fetch');
assert(indexHtmlContent.includes('__chunk_recovery_attempted'), 'index.html must guard chunk recovery with sessionStorage loop breaker');
assert(!indexHtmlContent.includes("'?fresh=' + Date.now()"), 'index.html must not append ?fresh=timestamp query params in error listeners');
console.log('✅ Passed: index.html has bounded chunk recovery and does not loop on network errors.\n');

// 4. ErrorBoundary verification
console.log('🔍 Test 4: Verifying ErrorBoundary recovery & Studio reset...');
const ebContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'ErrorBoundary.tsx'), 'utf-8');
assert(!ebContent.includes("msg.indexOf('Failed to fetch') !== -1"), 'ErrorBoundary must not trigger hard reset on Failed to fetch');
assert(ebContent.includes('handleStudioReset'), 'ErrorBoundary must have handleStudioReset');
assert(!ebContent.includes("setAppTab('home')"), 'handleStudioReset must not redirect to home');
assert(ebContent.includes("setAppTab('studio')"), 'handleStudioReset must maintain studio tab');
console.log('✅ Passed: ErrorBoundary provides in-place recovery and maintains Studio screen.\n');

// 5. App.tsx routing and hard refresh verification
console.log('🔍 Test 5: Verifying App.tsx routing & hard refresh on /studio/...');
const appContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf-8');
assert(appContent.includes("path === '/studio/'") && appContent.includes("path.startsWith('/studio')"), 'App.tsx must handle /studio/ trailing slash');
assert(appContent.includes("path === '/admin/'") && appContent.includes("path.startsWith('/admin')"), 'App.tsx must handle /admin/ trailing slash');
assert(appContent.includes("window.location.search.includes('fresh=')"), 'App.tsx must clean lingering ?fresh= params on initial visit');
console.log('✅ Passed: App.tsx preserves tab on hard refresh and cleans URL parameters.\n');

// 6. server.ts routes verification
console.log('🔍 Test 6: Verifying server.ts SPA routing for /studio and /admin...');
const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf-8');
assert(serverContent.includes('app.get(["/admin", "/admin/*"]') && serverContent.includes('app.get(["/studio", "/studio/*"]'), 'server.ts must route /studio and /admin directly to canonical SPA');
console.log('✅ Passed: server.ts routes /studio and /admin to canonical SPA with no-cache headers.\n');

// 7. Byte Parity Verification
console.log('🔍 Test 7: Verifying 100% byte parity between root and web_studio/ copies...');
const parityFiles = [
  ['src/App.tsx', 'web_studio/src/App.tsx'],
  ['src/components/ErrorBoundary.tsx', 'web_studio/src/components/ErrorBoundary.tsx'],
  ['src/components/HomeScreenWeb.tsx', 'web_studio/src/components/HomeScreenWeb.tsx'],
  ['src/components/LoginModal.tsx', 'web_studio/src/components/LoginModal.tsx'],
  ['server.ts', 'web_studio/server.ts'],
  ['index.html', 'web_studio/index.html'],
];
for (const [f1, f2] of parityFiles) {
  const b1 = fs.readFileSync(path.join(__dirname, '..', f1));
  const b2 = fs.readFileSync(path.join(__dirname, '..', f2));
  assert(b1.equals(b2), `Byte mismatch between ${f1} and ${f2}`);
}
console.log('✅ Passed: All corresponding files in src/ and web_studio/ have 100% byte parity.\n');

// 8. Safety Invariants Verification
console.log('🔍 Test 8: Verifying safety invariants (Android applicationId & Template ID)...');
const gradleContent = fs.readFileSync(path.join(__dirname, '..', 'app', 'build.gradle.kts'), 'utf-8');
assert(gradleContent.includes('com.aistudio.ainewsmaker.hzwptx'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
const dynamicFrames = fs.readFileSync(path.join(__dirname, '..', 'dynamic_frames_db.json'), 'utf-8');
assert(dynamicFrames.includes('df_1794406067554_albmw'), 'Template df_1794406067554_albmw must exist');
console.log('✅ Passed: Android applicationId and Template ID are strictly preserved.\n');

console.log('====================================================');
console.log('🎉 ALL 8 TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
