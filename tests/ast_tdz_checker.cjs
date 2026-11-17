const path = require('path');
const ts = require(path.join(__dirname, '../web_studio/node_modules/typescript'));
const fs = require('fs');

const files = [
  'src/components/HomeScreenWeb.tsx',
  'src/App.tsx',
  'src/components/CardEditor.tsx',
  'src/components/CardPreview.tsx',
  'src/lib/CanvasExporter.ts',
  'src/lib/dynamicFramesManager.ts',
  'src/components/NewsDetailModal.tsx',
  'src/components/FooterGraphic.tsx'
];

let totalIssues = 0;

for (const relFile of files) {
  const file = path.join(process.cwd(), relFile);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  
  function checkNode(node) {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const decls = new Map();
      
      function collectDecls(n) {
        if (ts.isVariableStatement(n)) {
          for (const d of n.declarationList.declarations) {
            if (ts.isIdentifier(d.name)) {
              decls.set(d.name.text, d.getStart(sourceFile));
            }
          }
        }
      }

      if (node.body && ts.isBlock(node.body)) {
        node.body.statements.forEach(collectDecls);

        function checkHooks(n) {
          if (ts.isCallExpression(n)) {
            const exprText = n.expression.getText(sourceFile);
            if (['useEffect', 'useMemo', 'useCallback', 'useLayoutEffect'].includes(exprText)) {
              const hookPos = n.getStart(sourceFile);
              if (n.arguments.length >= 2) {
                const depArg = n.arguments[1];
                if (ts.isArrayLiteralExpression(depArg)) {
                  for (const el of depArg.elements) {
                    let idName = null;
                    if (ts.isIdentifier(el)) idName = el.text;
                    else if (ts.isPropertyAccessExpression(el) && ts.isIdentifier(el.expression)) idName = el.expression.text;
                    
                    if (idName && decls.has(idName)) {
                      const declPos = decls.get(idName);
                      if (declPos > hookPos) {
                        const { line } = sourceFile.getLineAndCharacterOfPosition(hookPos);
                        const { line: declLine } = sourceFile.getLineAndCharacterOfPosition(declPos);
                        console.error(`[TDZ VIOLATION] in ${relFile}:${line + 1} - Hook '${exprText}' references '${idName}' which is declared later at line ${declLine + 1}`);
                        totalIssues++;
                      }
                    }
                  }
                }
              }
            }
          }
          ts.forEachChild(n, checkHooks);
        }
        
        node.body.statements.forEach(checkHooks);
      }
    }
    ts.forEachChild(node, checkNode);
  }

  checkNode(sourceFile);
}

console.log('AST TDZ Audit complete. Total issues found:', totalIssues);
if (totalIssues > 0) process.exit(1);
process.exit(0);
