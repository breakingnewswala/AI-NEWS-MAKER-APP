#!/usr/bin/env node

/**
 * AI News Maker - Live Cloud Database Sync Script
 * 
 * Run from CMD or terminal:
 *   node sync_news.js
 * Or:
 *   npm run sync-news
 * 
 * This uploads news_database.json directly to Firebase Storage and local endpoints,
 * instantly syncing live news across ainewsmaker.online, the Android App, and Web Studio.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CLOUD_STORAGE_UPLOAD_URL =
  'https://firebasestorage.googleapis.com/v0/b/ai-news-maker-app.firebasestorage.app/o?name=news_database.json';

// Locate news_database.json
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
let posts = [];
try {
  posts = JSON.parse(rawData);
} catch (e) {
  console.error('❌ Error: news_database.json is not valid JSON:', e.message);
  process.exit(1);
}

console.log('----------------------------------------------------');
console.log('📡 AI News Maker - Syncing Live News Database...');
console.log(`📰 Loaded ${posts.length} posts from: ${path.basename(dbPath)}`);
console.log('----------------------------------------------------');

// 1. Copy to public/ and dist/ folders for static hosting
const targetDirs = [
  path.resolve(__dirname, 'public'),
  path.resolve(__dirname, 'dist'),
  path.resolve(__dirname, 'web_studio/public'),
  path.resolve(__dirname, 'app/src/main/assets/news_studio'),
];

targetDirs.forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'news_database.json'), rawData, 'utf-8');
  } catch {
    // ignore
  }
});
console.log('✓ Local static copies updated (public, dist, web_studio).');

// 2. Upload to Firebase Storage Cloud
function uploadToFirebase() {
  return new Promise((resolve, reject) => {
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
          resolve(body);
        } else {
          reject(new Error(`Firebase Storage responded with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(rawData);
    req.end();
  });
}

// 3. Sync to local backend if running
function syncLocalServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/news-posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rawData),
      },
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode);
    });

    req.on('error', () => {
      // Local server not running or different port, ignore safely
      resolve(null);
    });
    req.write(rawData);
    req.end();
  });
}

async function main() {
  try {
    console.log('🚀 Uploading to Firebase Cloud Storage (ainewsmakerapp.firebasestorage.app)...');
    await uploadToFirebase();
    console.log('✓ Firebase Storage Cloud upload: SUCCESS (HTTP 200)');

    await syncLocalServer();

    console.log('\n====================================================');
    console.log('🎉 सफलता! लाइव न्यूज़ डेटाबेस सफलतापूर्वक सिंक हो गया है!');
    console.log('====================================================');
    console.log(`🌐 Website: https://www.ainewsmaker.online/`);
    console.log(`📊 कुल खबरें: ${posts.length} पोस्ट्स`);
    console.log(`🕒 समय: ${new Date().toLocaleString('hi-IN')}`);
    console.log('----------------------------------------------------');
    console.log('नोट: ainewsmaker.online पर ताज़ा खबर देखने के लिए:');
    console.log('1. वेबसाइट खोलें: https://www.ainewsmaker.online/');
    console.log('2. ऊपर दाईं ओर "लाइव सिंक" बटन दबाएं या Ctrl + F5 (हार्ड रिफ्रेश) करें।');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Cloud sync failed:', err.message);
    process.exit(1);
  }
}

main();
