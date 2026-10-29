const fs = require('fs');
const path = require('path');

const vidFile = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/web_studio/src/components/VideosScreenWeb.tsx');
const lines = fs.readFileSync(vidFile, 'utf8').split('\n');

for (let j = 30; j < 65; j++) {
  console.log(`${j + 1}: ${lines[j]}`);
}
