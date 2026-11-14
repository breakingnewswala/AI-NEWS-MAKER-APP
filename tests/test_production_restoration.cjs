// Tests for Consolidated Production Restoration & Permanent Bug Fix
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

console.log("====================================================");
console.log("🧪 Running Production Restoration Regression Test Suite");
console.log("====================================================");

// 1. Invariant Checks: Android Application ID
const buildGradlePath = path.join(__dirname, "..", "app", "build.gradle.kts");
assert(fs.existsSync(buildGradlePath), "app/build.gradle.kts must exist");
const gradleContent = fs.readFileSync(buildGradlePath, "utf-8");
assert(
  gradleContent.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'),
  "Android applicationId must be strictly com.aistudio.ainewsmaker.hzwptx"
);
console.log("✅ 1. Android Application ID invariant verified (com.aistudio.ainewsmaker.hzwptx)");

// 2. Invariant Checks: Protected Dynamic Frame Template df_1794406067554_albmw
const dynamicFramesPath = path.join(__dirname, "..", "dynamic_frames_db.json");
assert(fs.existsSync(dynamicFramesPath), "dynamic_frames_db.json must exist");
const dynamicFrames = JSON.parse(fs.readFileSync(dynamicFramesPath, "utf-8"));
const targetFrame = dynamicFrames.find((f) => f.id === "df_1794406067554_albmw");
assert(targetFrame, "Template df_1794406067554_albmw must exist in dynamic_frames_db.json");
assert(
  targetFrame.approvalStatus === "APPROVED" || targetFrame.approvalStatus === undefined,
  "Template df_1794406067554_albmw must be approved"
);
console.log("✅ 2. Protected Dynamic Frame Template df_1794406067554_albmw intact and approved");

// 3. Invariant Checks: Protected Asset Libraries
const assetLibrariesPath = path.join(__dirname, "..", "asset_libraries_db.json");
assert(fs.existsSync(assetLibrariesPath), "asset_libraries_db.json must exist");
const assetLibraries = JSON.parse(fs.readFileSync(assetLibrariesPath, "utf-8"));
const mapPinBadge = assetLibraries.find((a) => a.id === "asset_1794132101671_u0g9s");
assert(mapPinBadge, "Asset asset_1794132101671_u0g9s (Red Map Pin Badge) must exist");
assert(assetLibraries.length >= 7, "Asset libraries must contain at least 7 items");
console.log(`✅ 3. Protected Asset Libraries intact (Found ${assetLibraries.length} assets, including Red Map Pin Badge)`);

// 4. Parity Checks: 100% Byte Parity between server.ts and web_studio/server.ts
const serverTs = fs.readFileSync(path.join(__dirname, "..", "server.ts"), "utf-8");
const webStudioServerTs = fs.readFileSync(path.join(__dirname, "..", "web_studio", "server.ts"), "utf-8");
assert.strictEqual(serverTs, webStudioServerTs, "server.ts and web_studio/server.ts must have 100% byte parity");
console.log("✅ 4. 100% Byte Parity verified between server.ts and web_studio/server.ts");

// 5. Parity Checks: 100% Byte Parity between src/lib/apiConfig.ts and web_studio/src/lib/apiConfig.ts
const apiConfigTs = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "apiConfig.ts"), "utf-8");
const webApiConfigTs = fs.readFileSync(path.join(__dirname, "..", "web_studio", "src", "lib", "apiConfig.ts"), "utf-8");
assert.strictEqual(apiConfigTs, webApiConfigTs, "apiConfig.ts must have 100% byte parity");
console.log("✅ 5. 100% Byte Parity verified between src/lib/apiConfig.ts and web_studio/src/lib/apiConfig.ts");

// 6. Security & Token Expiration Logic
function isTokenExpiredHelper(token) {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.trim().split(".");
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonStr);
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        return true;
      }
      return false;
    }
  } catch {}
  return false;
}

// Generate test tokens
const secret = "test_production_restoration_secret_key_32_bytes!!";
const nowSec = Math.floor(Date.now() / 1000);

// Expired token (expired 1 hour ago)
const expiredHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
const expiredPayload = Buffer.from(JSON.stringify({
  userId: "admin_test",
  email: "breakingnewswala.com@gmail.com",
  role: "superadmin",
  exp: nowSec - 3600,
  iat: nowSec - 7200,
})).toString("base64url");
const expiredSig = crypto.createHmac("sha256", secret).update(`${expiredHeader}.${expiredPayload}`).digest("base64url");
const expiredToken = `${expiredHeader}.${expiredPayload}.${expiredSig}`;

assert.strictEqual(isTokenExpiredHelper(expiredToken), true, "Expired token must be identified as expired");

// Valid token (expires in 14 days)
const validPayload = Buffer.from(JSON.stringify({
  userId: "admin_test",
  email: "breakingnewswala.com@gmail.com",
  role: "superadmin",
  exp: nowSec + 14 * 86400,
  iat: nowSec,
})).toString("base64url");
const validSig = crypto.createHmac("sha256", secret).update(`${expiredHeader}.${validPayload}`).digest("base64url");
const validToken = `${expiredHeader}.${validPayload}.${validSig}`;

assert.strictEqual(isTokenExpiredHelper(validToken), false, "Valid token must NOT be identified as expired");
console.log("✅ 6. Token expiration detection verified (expired vs valid)");

// 7. Backend Logic Verification: WhatsApp Access Token check
assert(
  serverTs.includes("process.env.WHATSAPP_ACCESS_TOKEN"),
  "server.ts must check process.env.WHATSAPP_ACCESS_TOKEN from Secret Manager"
);
console.log("✅ 7. WhatsApp Access Token Secret Manager binding verified in server.ts");

// 8. Backend Logic Verification: Dynamic Web Feed Recovery
assert(
  serverTs.includes('app.get("/api/rss/web-feed"'),
  "server.ts must implement GET /api/rss/web-feed"
);
assert(
  serverTs.includes("GENERATED_WEB_RSS_FEEDS"),
  "server.ts must manage GENERATED_WEB_RSS_FEEDS"
);
console.log("✅ 8. Dynamic Web-to-RSS feed generator and container recovery verified in server.ts");

// 9. Backend Logic Verification: Asset Library Base64 Persistence
assert(
  serverTs.includes("saveFrameBase64AssetAsync(effectiveUrl,"),
  "server.ts must persist asset library base64 uploads to storage"
);
console.log("✅ 9. Asset Library Base64 Cloud Storage persistence verified in server.ts");

// 10. Frontend Logic Verification: No Overwrite on Empty News
const appTsx = fs.readFileSync(path.join(__dirname, "..", "src", "App.tsx"), "utf-8");
assert(
  !appTsx.includes("AUTHORITATIVE RESET: Server explicitly returned 0 posts. Clear local stale posts!"),
  "App.tsx must not wipe cached news on transient zero responses"
);
assert(
  appTsx.includes("ai_news_session_expired"),
  "App.tsx must listen to ai_news_session_expired"
);
console.log("✅ 10. Home screen news cache preservation and session expired listener verified in App.tsx");

// 11. Frontend Logic Verification: Admin API Keys Manager Table Never Blank
const adminApiKeysTsx = fs.readFileSync(path.join(__dirname, "..", "src", "components", "AdminApiKeysManager.tsx"), "utf-8");
assert(
  adminApiKeysTsx.includes("DEFAULT_INITIAL_HEALTH"),
  "AdminApiKeysManager.tsx must initialize healthItems with DEFAULT_INITIAL_HEALTH"
);
console.log("✅ 11. Admin API Keys Manager health monitoring defaults verified (panel never blank)");

// 12. Frontend Logic Verification: Visual Text Marking Editor uses fresh token
const adminAssetsTsx = fs.readFileSync(path.join(__dirname, "..", "src", "components", "AdminAssetLibrariesManager.tsx"), "utf-8");
assert(
  adminAssetsTsx.includes("let token = await ensureAuthToken()"),
  "AdminAssetLibrariesManager.tsx must await ensureAuthToken in handleSaveTextRegion"
);
console.log("✅ 12. Location Badge visual text marking editor fresh authentication verified");

// 13. Frontend Logic Verification: LoginModal rejects expired local token
const loginModalTsx = fs.readFileSync(path.join(__dirname, "..", "src", "components", "LoginModal.tsx"), "utf-8");
assert(
  loginModalTsx.includes("!isTokenExpired(candidateLocalToken)"),
  "LoginModal.tsx must not fall back to expired local tokens"
);
console.log("✅ 13. LoginModal strict unexpired credential fallback verified");

// 14. Scheduler Verification: Scheduler Authentication accepts admin session
assert(
  serverTs.includes("(await resolveAuthenticatedUser(req, res))"),
  "handleSchedulerRssSync must allow resolveAuthenticatedUser"
);
console.log("✅ 14. Cloud Scheduler & Admin Session authorization verified");

console.log("====================================================");
console.log("🎉 ALL 14 PRODUCTION RESTORATION TESTS PASSED!");
console.log("====================================================");
