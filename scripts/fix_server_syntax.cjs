const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/server.ts');
let code = fs.readFileSync(serverPath, 'utf8');

// Find the broken insertion
const brokenPart = `  const serverInstance = 
// ==========================================
// LOGO CHANGE REQUESTS API
// ==========================================`;

if (code.includes(brokenPart)) {
  // Extract the logo endpoints block
  const startLogo = code.indexOf('// ==========================================\n// LOGO CHANGE REQUESTS API');
  const endLogo = code.indexOf('app.listen(PORT, "0.0.0.0"', startLogo);
  const logoBlock = code.slice(startLogo, endLogo);

  // Restore line 15784
  code = code.slice(0, code.indexOf('  const serverInstance = \n//')) + '  const serverInstance = app.listen(PORT, "0.0.0.0", () => {\n' + code.slice(endLogo + 'app.listen(PORT, "0.0.0.0", () => {\n'.length);

  // Put logoBlock right BEFORE startServer() function definition
  const startServerIdx = code.indexOf('async function startServer()');
  if (startServerIdx !== -1) {
    code = code.slice(0, startServerIdx) + logoBlock + '\n\n' + code.slice(startServerIdx);
    console.log('✅ Cleanly placed logo change requests endpoints before startServer()');
  }
}

fs.writeFileSync(serverPath, code, 'utf8');
console.log('Fixed server.ts');
