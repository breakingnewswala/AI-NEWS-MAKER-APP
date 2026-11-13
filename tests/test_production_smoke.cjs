const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function verifyProduction() {
  console.log('🌐 1. Testing Production Homepage: https://www.ainewsmaker.online ...');
  const home = await get('https://www.ainewsmaker.online');
  console.log('   Status:', home.status);
  console.log('   Has root element:', home.body.includes('id="root"'));
  console.log('   Content-Type:', home.headers['content-type']);
  if (home.status !== 200) throw new Error('Homepage status is not 200: ' + home.status);

  console.log('\n🌐 2. Testing Production Health API: https://www.ainewsmaker.online/api/health ...');
  const healthRes = await get('https://www.ainewsmaker.online/api/health');
  console.log('   /api/health Status:', healthRes.status);
  const health = JSON.parse(healthRes.body);
  console.log('   /api/health payload:', health);
  if (healthRes.status !== 200 || health.status !== 'ok') {
    throw new Error('/api/health verification failed: ' + healthRes.body);
  }

  console.log('\n🌐 3. Testing Production Plans API: https://www.ainewsmaker.online/api/plans ...');
  const plansRes = await get('https://www.ainewsmaker.online/api/plans');
  console.log('   /api/plans Status:', plansRes.status);
  const plans = JSON.parse(plansRes.body);
  console.log('   Available plans count:', Array.isArray(plans) ? plans.length : Object.keys(plans).length);
  if (plansRes.status !== 200) throw new Error('/api/plans failed');

  console.log('\n🌐 4. Testing Production Dynamic Frames API: https://www.ainewsmaker.online/api/dynamic-frames ...');
  const framesRes = await get('https://www.ainewsmaker.online/api/dynamic-frames');
  console.log('   Status:', framesRes.status);
  const framesData = JSON.parse(framesRes.body);
  const frames = Array.isArray(framesData) ? framesData : framesData.frames || [];
  console.log('   Total Public Published Frames:', frames.length);
  const prodFrame = frames.find(f => f.id === 'df_1794406067554_albmw');
  console.log('   Production Frame df_1794406067554_albmw present:', !!prodFrame);
  if (!prodFrame) {
    throw new Error('FAILED: Missing production frame df_1794406067554_albmw in production!');
  }
  console.log('   Production Frame Name:', prodFrame.name);
  console.log('   Publication Status:', prodFrame.publicationStatus);
  console.log('   Approval Status:', prodFrame.approvalStatus);
  if (prodFrame.publicationStatus !== 'published' || prodFrame.approvalStatus !== 'APPROVED') {
    throw new Error('FAILED: Production frame is not published/APPROVED in production!');
  }

  console.log('\n🌐 5. Testing Production News Posts API: https://www.ainewsmaker.online/api/news-posts ...');
  const newsRes = await get('https://www.ainewsmaker.online/api/news-posts');
  console.log('   Status:', newsRes.status);
  const newsData = JSON.parse(newsRes.body);
  const newsPosts = Array.isArray(newsData) ? newsData : newsData.posts || [];
  console.log('   Total News Posts:', newsPosts.length);
  if (newsRes.status !== 200 || newsPosts.length === 0) {
    throw new Error('FAILED: news posts endpoint failed or returned empty');
  }

  console.log('\n🌐 6. Testing Production RSS Feed & Devanagari UTF-8: https://www.ainewsmaker.online/rss.xml ...');
  const rssRes = await get('https://www.ainewsmaker.online/rss.xml');
  console.log('   Status:', rssRes.status);
  console.log('   Content-Type:', rssRes.headers['content-type']);
  const hasDevanagari = /[\u0900-\u097F]/.test(rssRes.body);
  console.log('   Contains genuine Devanagari text:', hasDevanagari ? 'YES ✅' : 'NO ❌');
  const hasMojibake = /â€|Ã|â€™|â€œ/.test(rssRes.body);
  console.log('   Contains mojibake / corrupted UTF-8:', hasMojibake ? 'YES ❌' : 'NO (Clean UTF-8) ✅');
  if (!hasDevanagari || hasMojibake) {
    throw new Error('FAILED: RSS feed does not have clean Devanagari UTF-8');
  }

  console.log('\n🎉 ALL PRODUCTION SMOKE TESTS PASSED 100%!');
}

verifyProduction().catch(e => {
  console.error('Production Verification Failed:', e);
  process.exit(1);
});
