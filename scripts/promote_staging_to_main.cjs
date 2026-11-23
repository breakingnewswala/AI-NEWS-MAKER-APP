#!/usr/bin/env node
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit' });
}

console.log('====================================================');
console.log('🚀 AI News Maker: Promoting Staging -> Main (Production)');
console.log('====================================================');

try {
  // 1. Ensure test suite passes
  console.log('\n🔍 Step 1: Running all 24 verification test suites...');
  run('npm test');

  // 2. Fetch and checkout staging
  console.log('\n📥 Step 2: Fetching latest git remote state...');
  run('git fetch origin');

  // 3. Switch to main
  console.log('\n🔀 Step 3: Checking out main branch...');
  run('git checkout main');
  run('git pull origin main');

  // 4. Merge staging into main
  console.log('\n🔄 Step 4: Merging staging into main...');
  run('git merge staging --no-edit');

  // 5. Run build to ensure bundle integrity
  console.log('\n📦 Step 5: Building production assets...');
  run('npm run build');

  // 6. Push to origin main
  console.log('\n🚀 Step 6: Pushing verified release to origin/main...');
  run('git push origin main');

  // 7. Return to staging and sync
  console.log('\n🔄 Step 7: Returning to staging branch...');
  run('git checkout staging');
  run('git merge main --no-edit');
  run('git push origin staging');

  console.log('\n====================================================');
  console.log('✨ SUCCESS: Staging promoted to Main and pushed to GitHub!');
  console.log('Ready for Firebase App Hosting rollout.');
  console.log('====================================================');
} catch (err) {
  console.error('\n❌ ERROR: Promotion failed! Rolling back to staging branch.', err.message);
  try {
    run('git checkout staging');
  } catch {}
  process.exit(1);
}
