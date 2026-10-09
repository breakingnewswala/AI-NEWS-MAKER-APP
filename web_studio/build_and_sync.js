import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🚀 Building AI News Maker (Web Studio + Assets)...');
console.log('====================================================');

// 1. Run web_studio build
console.log('📦 Step 1: Compiling web_studio frontend & server...');
execSync('npm run build', {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

// 2. Target directories to sync dist files to
const distDir = path.resolve(__dirname, 'dist');
const targets = [
  path.resolve(rootDir, 'public'),
  path.resolve(rootDir, 'dist'),
  path.resolve(rootDir, 'app/src/main/assets/news_studio'),
];

console.log('\n📂 Step 2: Copying build output to deployment targets...');
targets.forEach((target) => {
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    // Purge stale index-*.js and index-*.css bundles in target/assets before copying
    const targetAssets = path.join(target, 'assets');
    const distAssets = path.join(distDir, 'assets');
    if (fs.existsSync(targetAssets) && fs.existsSync(distAssets)) {
      const activeFiles = new Set(fs.readdirSync(distAssets));
      const targetFiles = fs.readdirSync(targetAssets);
      targetFiles.forEach((file) => {
        if ((file.startsWith('index-') && (file.endsWith('.js') || file.endsWith('.css'))) && !activeFiles.has(file)) {
          try { fs.unlinkSync(path.join(targetAssets, file)); } catch {}
        }
      });
    }

    fs.cpSync(distDir, target, {
      recursive: true,
      force: true,
      filter: (src) => !src.endsWith('.apk')
    });
    // Never allow an APK inside assets directory
    const assetApk = path.resolve(rootDir, 'app/src/main/assets/news_studio/app-release.apk');
    if (fs.existsSync(assetApk)) fs.unlinkSync(assetApk);
    console.log(` ✅ Updated: ${path.relative(rootDir, target)}`);
  } catch (err) {
    console.error(` ❌ Error copying to ${target}:`, err.message);
  }
});

// 3. Copy server.cjs to root
const rootServerCjs = path.resolve(rootDir, 'server.cjs');
const distServerCjs = path.resolve(distDir, 'server.cjs');
if (fs.existsSync(distServerCjs)) {
  try {
    fs.copyFileSync(distServerCjs, rootServerCjs);
    console.log(` ✅ Updated root server.cjs`);
  } catch (err) {
    console.log(` ⚠️ Could not update root server.cjs directly:`, err.message);
  }
}

// 4. Ensure latest news_database.json is everywhere
const dbPath = path.resolve(rootDir, 'news_database.json');
if (fs.existsSync(dbPath)) {
  const rawDb = fs.readFileSync(dbPath, 'utf-8');
  targets.forEach((target) => {
    try {
      fs.writeFileSync(path.join(target, 'news_database.json'), rawDb, 'utf-8');
    } catch {}
  });
  console.log(' ✅ Synchronized news_database.json across all bundles');

  // 5. Generate and synchronize RSS 2.0 Feed (rss.xml) from news_database.json
  try {
    const posts = JSON.parse(rawDb);
    if (Array.isArray(posts) && posts.length > 0) {
      const siteUrl = 'https://www.ainewsmaker.online';
      const itemsXml = posts.map((post) => {
        const pubDate = post.timestamp ? new Date(post.timestamp).toUTCString() : new Date().toUTCString();
        const link = post.sourceUrl && post.sourceUrl.startsWith('http') ? post.sourceUrl : `${siteUrl}/#home`;
        const safeCategory = (post.categoryName || post.category || 'ताज़ा समाचार').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeChannel = (post.sourceChannel || 'AI News Maker').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const enclosureTag = post.imageUrl ? `\n      <enclosure url="${post.imageUrl.replace(/&/g, '&amp;')}" length="0" type="image/jpeg" />` : '';

        return `    <item>
      <title><![CDATA[${post.title || ''}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${post.id || `post-${Date.now()}`}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.summary || ''}]]></description>
      <category>${safeCategory}</category>
      <source url="${link}">${safeChannel}</source>${enclosureTag}
    </item>`;
      }).join('\n');

      const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>AI News Maker - Live News Feed (लाइव समाचार)</title>
    <link>${siteUrl}/</link>
    <description>AI News Maker - रियल-टाइम ब्रेकिंग न्यूज़, वीडियो और ग्राफिक्स लाइव RSS फ़ीड</description>
    <language>hi</language>
    <copyright>© ${new Date().getFullYear()} AI News Maker</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

      targets.forEach((target) => {
        try {
          fs.writeFileSync(path.join(target, 'rss.xml'), rssContent, 'utf-8');
        } catch {}
      });
      // Also write directly to web_studio/dist
      fs.writeFileSync(path.join(distDir, 'rss.xml'), rssContent, 'utf-8');
      console.log(' ✅ Generated and synchronized rss.xml feed across all bundles');
    }
  } catch (rssErr) {
    console.warn(' ⚠️ Could not generate rss.xml:', rssErr.message);
  }
}

console.log('\n====================================================');
console.log('✨ Build & Sync complete! All changes are packaged.');
console.log('====================================================\n');
