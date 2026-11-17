const fs = require('fs');
const path = require('path');
const ts = require(path.join(__dirname, '../web_studio/node_modules/typescript'));
const lucide = require(path.join(__dirname, '../web_studio/node_modules/lucide-react'));

const lucideExports = new Set(Object.keys(lucide));

function getAllFiles(dir, exts = ['.tsx', '.ts']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const targetDirs = [
  path.join(process.cwd(), 'src'),
  path.join(process.cwd(), 'web_studio', 'src')
];

let totalErrors = 0;
const missingIconMap = new Map();

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = getAllFiles(dir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    // Collect all imported names and local declarations
    const declaredNames = new Set([
      'React', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
      'console', 'Array', 'Set', 'Map', 'Date', 'Math', 'JSON', 'String', 'Number', 'Boolean',
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'CustomEvent',
      'HTMLImageElement', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element'
    ]);

    // Track imports from lucide-react specifically
    const lucideImportsInFile = new Set();

    ts.forEachChild(sourceFile, function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.text;
        if (node.importClause) {
          if (node.importClause.name) {
            declaredNames.add(node.importClause.name.text);
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const elem of node.importClause.namedBindings.elements) {
                const name = elem.name.text;
                declaredNames.add(name);
                if (moduleSpecifier === 'lucide-react') {
                  lucideImportsInFile.add(name);
                }
              }
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              declaredNames.add(node.importClause.namedBindings.name.text);
            }
          }
        }
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            declaredNames.add(decl.name.text);
          }
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        declaredNames.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        declaredNames.add(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        declaredNames.add(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node)) {
        declaredNames.add(node.name.text);
      }
    });

    // Track all identifiers in scope
    function collectLocalDecls(node, scopeSet) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        scopeSet.add(node.name.text);
      }
      if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
        scopeSet.add(node.name.text);
      }
      if (ts.isFunctionDeclaration(node) && node.name) {
        scopeSet.add(node.name.text);
      }
      ts.forEachChild(node, child => collectLocalDecls(child, scopeSet));
    }

    const localNames = new Set(declaredNames);
    collectLocalDecls(sourceFile, localNames);

    // Now scan all JSX tags and identifier references
    function checkJsx(node) {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        // If it starts with uppercase letter and is not property access like React.Fragment
        if (/^[A-Z]/.test(tagName) && !tagName.includes('.')) {
          if (!localNames.has(tagName)) {
            // Check if it's a known Lucide icon!
            if (lucideExports.has(tagName)) {
              console.error(`[MISSING LUCIDE ICON] ${path.relative(process.cwd(), file)}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1} - <${tagName} /> used in JSX but not imported!`);
              totalErrors++;
              if (!missingIconMap.has(file)) missingIconMap.set(file, new Set());
              missingIconMap.get(file).add(tagName);
            }
          }
        }
      }
      ts.forEachChild(node, checkJsx);
    }

    checkJsx(sourceFile);
  }
}

console.log(`\n========================================`);
console.log(`LUCIDE ICON AUDIT: ${totalErrors} MISSING ICONS FOUND`);
console.log(`========================================\n`);

if (totalErrors > 0) {
  for (const [f, icons] of missingIconMap.entries()) {
    console.log(`${path.relative(process.cwd(), f)}: missing [${Array.from(icons).join(', ')}]`);
  }
  process.exit(1);
} else {
  console.log('✅ All JSX icons across all components are properly imported and exist in lucide-react.');
  process.exit(0);
}
