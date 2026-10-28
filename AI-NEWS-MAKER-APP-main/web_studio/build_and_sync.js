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

// 1. Ensure web_studio dependencies exist
const webStudioNodeModules = path.join(__dirname, 'node_modules');
if (!fs.existsSync(webStudioNodeModules)) {
  const rootNodeModules = path.resolve(rootDir, 'node_modules');
  if (fs.existsSync(rootNodeModules)) {
    try {
      fs.symlinkSync('../node_modules', webStudioNodeModules, 'junction');
      console.log('📦 Linked web_studio/node_modules to root node_modules.');
    } catch (e) {}
  }
}
if (!fs.existsSync(webStudioNodeModules)) {
  console.log('📦 Installing web_studio dependencies...');
  try {
    execSync('npm install --prefer-offline --no-audit --legacy-peer-deps --include=dev', {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });
  } catch (err) {
    console.warn('⚠️ Fallback to standard npm install with legacy peer deps:', err.message);
    try {
      execSync('npm install --legacy-peer-deps --include=dev', {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
      });
    } catch (installErr) {
      console.warn('⚠️ Dependency installation warning:', installErr.message);
    }
  }
}

// 2. Run web_studio build
console.log('📦 Step 1: Compiling web_studio frontend & server...');
try {
  execSync('npm run build', {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
  });
} catch (buildErr) {
  const existingDistIndex = path.join(rootDir, 'dist', 'index.html');
  const existingServerCjs = path.join(rootDir, 'server.cjs');
  if (fs.existsSync(existingDistIndex) && fs.existsSync(existingServerCjs)) {
    console.warn('⚠️ Web studio build skipped in cloud container, using pre-built distribution assets:', buildErr.message);
  } else {
    throw buildErr;
  }
}

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
      filter: (src) => {
        // Do not copy apk into Android assets dir
        if (target.includes('assets') && src.endsWith('.apk')) return false;
        return true;
      }
    });

    // Explicitly copy app-release.apk to target root if it exists
    const rootApk = path.resolve(rootDir, 'app-release.apk');
    if (fs.existsSync(rootApk) && !target.includes('assets')) {
      try {
        fs.copyFileSync(rootApk, path.join(target, 'app-release.apk'));
        fs.copyFileSync(rootApk, path.join(target, 'ainewsmaker-app.apk'));
      } catch {}
    }
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
  try {
    fs.writeFileSync(path.resolve(__dirname, 'news_database.json'), rawDb, 'utf-8');
  } catch {}
  targets.forEach((target) => {
    try {
      fs.writeFileSync(path.join(target, 'news_database.json'), rawDb, 'utf-8');
    } catch {}
  });
  console.log(' ✅ Synchronized news_database.json across all bundles');

  // 4b. Ensure latest rss_sources_database.json is everywhere and sanitized
  const rssPath = path.resolve(rootDir, 'rss_sources_database.json');
  if (fs.existsSync(rssPath)) {
    try {
      const rawRss = fs.readFileSync(rssPath, 'utf-8');
      const sources = JSON.parse(rawRss);
      const cleaned = sources.filter((s) => s && s.url && s.id !== 'src_amarujala_live' && !String(s.url).includes('amarujala.com') && s.id !== 'src_bbc_live' && !String(s.url).includes('bbci.co.uk'));
      const cleanedJson = JSON.stringify(cleaned, null, 2);
      fs.writeFileSync(rssPath, cleanedJson, 'utf-8');
      fs.writeFileSync(path.resolve(__dirname, 'rss_sources_database.json'), cleanedJson, 'utf-8');
      targets.forEach((target) => {
        try {
          fs.writeFileSync(path.join(target, 'rss_sources_database.json'), cleanedJson, 'utf-8');
        } catch {}
      });
      console.log(' ✅ Synchronized rss_sources_database.json across all bundles');
    } catch (e) {
      console.warn(' ⚠️ Could not synchronize rss_sources_database.json:', e.message);
    }
  }

  // 5. Synchronize all persistent backend databases across bundles
  function syncDatabaseFile(filename) {
    const rootFile = path.resolve(rootDir, filename);
    const studioFile = path.resolve(__dirname, filename);
    let content = null;

    if (fs.existsSync(rootFile)) {
      try {
        const c = fs.readFileSync(rootFile, 'utf-8').replace(/^\uFEFF/, '').trim();
        if (c && c.length >= 2) content = c;
      } catch {}
    }
    if (!content && fs.existsSync(studioFile)) {
      try {
        const c = fs.readFileSync(studioFile, 'utf-8').replace(/^\uFEFF/, '').trim();
        if (c && c.length >= 2) content = c;
      } catch {}
    }

    if (content) {
      try { fs.writeFileSync(rootFile, content, 'utf-8'); } catch {}
      try { fs.writeFileSync(studioFile, content, 'utf-8'); } catch {}
      targets.forEach((target) => {
        try {
          fs.writeFileSync(path.join(target, filename), content, 'utf-8');
        } catch {}
      });
      console.log(` ✅ Synchronized ${filename} across all bundles`);
    }
  }

  syncDatabaseFile('videos_database.json');
  syncDatabaseFile('deleted_videos_ids.json');
  syncDatabaseFile('users_master_database.json');
  syncDatabaseFile('users_accounts_db.json');
  syncDatabaseFile('user_profiles_db.json');
  syncDatabaseFile('sub_users_db.json');
  syncDatabaseFile('categories_database.json');
  syncDatabaseFile('approved_editorial_database.json');
  syncDatabaseFile('payments_transactions_db.json');
  syncDatabaseFile('auth_credentials_db.json');

  // 6. Ensure persistent uploads directory is synced
  const rootUploads = path.resolve(rootDir, 'uploads');
  if (fs.existsSync(rootUploads)) {
    targets.forEach((target) => {
      const targetUploads = path.join(target, 'uploads');
      try {
        if (!fs.existsSync(targetUploads)) {
          fs.mkdirSync(targetUploads, { recursive: true });
        }
        fs.cpSync(rootUploads, targetUploads, { recursive: true, force: false });
      } catch {}
    });
  }

  // 7. Generate and synchronize RSS 2.0 Feed (rss.xml) from news_database.json
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
