const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CLOUD_STORAGE_UPLOAD_URL =
  'https://firebasestorage.googleapis.com/v0/b/ainewsmakerapp.firebasestorage.app/o?name=news_database.json';

let dbPath = path.resolve(__dirname, 'news_database.json');
if (!fs.existsSync(dbPath)) {
  const altPath = path.resolve(__dirname, 'web_studio/news_database.json');
  if (fs.existsSync(altPath)) {
    dbPath = altPath;
  }
}

if (!fs.existsSync(dbPath)) {
  console.error('❌ Error: news_database.json not found at:', dbPath);
  process.exit(1);
}

const rawData = fs.readFileSync(dbPath, 'utf-8');
let posts = JSON.parse(rawData);

console.log('📡 Syncing Live News Database to Firebase Cloud Storage...');
const url = new URL(CLOUD_STORAGE_UPLOAD_URL);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(rawData),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Success! Uploaded ' + posts.length + ' posts to Firebase Storage Cloud.');
      console.log('🌐 Live on: https://www.ainewsmaker.online/');
    } else {
      console.error('Upload failed with status ' + res.statusCode + ': ' + body);
    }
  });
});

req.on('error', (err) => console.error('Upload error:', err.message));
req.write(rawData);
req.end();
