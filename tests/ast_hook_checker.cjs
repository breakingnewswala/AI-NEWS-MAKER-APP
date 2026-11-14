const fs = require('fs');
const path = require('path');
const ts = require('../web_studio/node_modules/typescript');

function getAllFiles(dir, exts = ['.tsx', '.jsx', '.ts']) {
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

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const violations = [];

  function isFunctionNode(node) {
    return ts.isFunctionDeclaration(node) ||
           ts.isFunctionExpression(node) ||
           ts.isArrowFunction(node);
  }

  function getEnclosingFunctionName(node) {
    let curr = node;
    while (curr) {
      if (curr.name && curr.name.text) return curr.name.text;
      if (ts.isVariableDeclaration(curr) && curr.name && curr.name.text) {
        return curr.name.text;
      }
      if (ts.isPropertyAssignment(curr) && curr.name && curr.name.text) {
        return curr.name.text;
      }
      if (ts.isExportAssignment(curr)) {
        return 'defaultExport';
      }
      curr = curr.parent;
    }
    return 'anonymous';
  }

  // Check if a function body has any direct hook calls (not in nested functions)
  function hasDirectHookCalls(fnNode) {
    if (!fnNode.body) return false;
    let found = false;
    function visit(n) {
      if (found) return;
      if (n !== fnNode && isFunctionNode(n)) {
        // Do not descend into nested functions
        return;
      }
      if (ts.isCallExpression(n)) {
        let callName = null;
        if (ts.isIdentifier(n.expression)) {
          callName = n.expression.text;
        } else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) {
          callName = n.expression.name.text;
        }
        if (callName && isHookName(callName)) {
          found = true;
          return;
        }
      }
      ts.forEachChild(n, visit);
    }
    visit(fnNode.body);
    return found;
  }

  function checkComponentFunction(fnNode) {
    if (!fnNode.body || !ts.isBlock(fnNode.body)) return;
    const compName = getEnclosingFunctionName(fnNode);

    let hasSeenTopLevelReturn = false;
    let returnLine = 0;
    let returnSnippet = '';

    function checkNodeForHook(node, contextDesc) {
      function visitInner(n) {
        if (isFunctionNode(n)) return; // skip nested functions
        if (ts.isCallExpression(n)) {
          let callName = null;
          if (ts.isIdentifier(n.expression)) {
            callName = n.expression.text;
          } else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) {
            callName = n.expression.name.text;
          }
          if (callName && isHookName(callName)) {
            const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
            violations.push({
              file: filePath,
              component: compName,
              hook: callName,
              line: pos.line + 1,
              char: pos.character + 1,
              reason: contextDesc,
              code: n.getText(sourceFile).slice(0, 80)
            });
          }
        }
        ts.forEachChild(n, visitInner);
      }
      visitInner(node);
    }

    for (const stmt of fnNode.body.statements) {
      if (hasSeenTopLevelReturn) {
        checkNodeForHook(stmt, `Hook called after return on line ${returnLine}: "${returnSnippet.trim()}"`);
      }

      if (ts.isIfStatement(stmt)) {
        // Hooks inside condition or if branches
        checkNodeForHook(stmt.expression, 'Hook called inside if condition');
        checkNodeForHook(stmt.thenStatement, 'Hook called inside if block');
        if (stmt.elseStatement) {
          checkNodeForHook(stmt.elseStatement, 'Hook called inside else block');
        }

        // If the if statement has a return
        if (hasReturn(stmt.thenStatement) || (stmt.elseStatement && hasReturn(stmt.elseStatement))) {
          hasSeenTopLevelReturn = true;
          const pos = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile));
          returnLine = pos.line + 1;
          returnSnippet = stmt.getText(sourceFile).slice(0, 60);
        }
      } else if (ts.isIterationStatement(stmt, false)) {
        checkNodeForHook(stmt, 'Hook called inside loop');
      } else if (ts.isSwitchStatement(stmt)) {
        checkNodeForHook(stmt, 'Hook called inside switch statement');
      } else if (ts.isTryStatement(stmt)) {
        checkNodeForHook(stmt, 'Hook called inside try/catch');
      } else if (ts.isReturnStatement(stmt)) {
        hasSeenTopLevelReturn = true;
        const pos = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile));
        returnLine = pos.line + 1;
        returnSnippet = stmt.getText(sourceFile).slice(0, 60);
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
    if (isFunctionNode(node)) {
      if (hasDirectHookCalls(node)) {
        checkComponentFunction(node);
      }
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return violations;
}

const srcFiles = getAllFiles(path.join(__dirname, '..', 'src'), ['.tsx', '.ts']);
console.log(`Scanning ${srcFiles.length} files in src/ with enhanced TypeScript AST...`);

let allViolations = [];
for (const file of srcFiles) {
  const v = checkFile(file);
  if (v.length > 0) {
    allViolations = allViolations.concat(v);
  }
}

console.log(`\nFound ${allViolations.length} total Rules of Hooks violations:`);
for (const v of allViolations) {
  const relPath = path.relative(path.join(__dirname, '..'), v.file);
  console.log(`\n🚨 [${relPath}:${v.line}] in <${v.component}>: ${v.hook}`);
  console.log(`   Reason: ${v.reason}`);
  console.log(`   Snippet: ${v.code}`);
}
