const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/server.ts');
let code = fs.readFileSync(serverPath, 'utf8');

// Remove the duplicate declarations
const dupCode = `const LOGO_REQUESTS_FILE = path.join(process.cwd(), "logo_requests_db.json");

function loadLogoRequestsDatabase(): any[] {
  try {
    if (fs.existsSync(LOGO_REQUESTS_FILE)) {
      const raw = fs.readFileSync(LOGO_REQUESTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLogoRequestsDatabase(reqs: any[]): void {
  try {
    fs.writeFileSync(LOGO_REQUESTS_FILE, JSON.stringify(reqs, null, 2), "utf-8");
  } catch {}
}
`;

if (code.includes(dupCode)) {
  code = code.replace(dupCode, '');
  console.log('Removed duplicate logo functions');
} else {
  // Replace line by line if needed
  code = code.replace(/const LOGO_REQUESTS_FILE = path\.join[\s\S]*?function saveLogoRequestsDatabase\(reqs: any\[\]\): void \{[\s\S]*?\}\n\}/m, '');
  console.log('Replaced with regex');
}

fs.writeFileSync(serverPath, code, 'utf8');
