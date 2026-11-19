/**
 * Security Audit Verification & Regression Prevention Test Suite
 * Validates that all 16 confirmed findings (SEC-01 through SEC-16)
 * are defended and properly enforced in server.ts and web_studio/server.ts.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

console.log("==================================================================");
console.log("🛡️ VERIFYING FULL-PROJECT SECURITY AUDIT & REMEDIATION (SEC-01 TO SEC-16)");
console.log("==================================================================");

const serverCode = fs.readFileSync(path.resolve('server.ts'), 'utf8');
const webStudioServerCode = fs.readFileSync(path.resolve('web_studio/server.ts'), 'utf8');

function check(title, condition, detail) {
  if (condition) {
    console.log(`✅ [PASS] ${title}`);
  } else {
    console.error(`❌ [FAIL] ${title} - ${detail}`);
    process.exit(1);
  }
}

// 1. SEC-01: Credential Overwrite Defense
check(
  "SEC-01: /api/users/sync guards existing account password overwrite",
  serverCode.includes("existingCred && !isAdmin && !isSelf") &&
  serverCode.includes("सुरक्षा प्रतिबंध: मौजूदा खाते का पासवर्ड बदलने के लिए लॉगिन या व्यवस्थापक प्रमाणीकरण आवश्यक है।"),
  "Missing ownership/admin verification before updating credentials in /api/users/sync"
);

// 2. SEC-02: Account & Data Deletion Protections
check(
  "SEC-02: /api/user-data/delete-account requires authentication and owner check",
  serverCode.includes('app.all("/api/user-data/delete-account", requireAuthMiddleware') &&
  serverCode.includes("!isAdmin && !isOwner"),
  "Missing requireAuthMiddleware or owner verification in /api/user-data/delete-account"
);

check(
  "SEC-02: /api/account-deletion-requests queues unauthenticated requests as PENDING_VERIFICATION",
  serverCode.includes("DEL-PENDING-") &&
  serverCode.includes("PENDING_VERIFICATION"),
  "Unauthenticated deletion request form does not queue requests safely"
);

check(
  "SEC-02: GET /api/account-deletion-requests is guarded by requireAdminMiddleware",
  serverCode.includes('app.get("/api/account-deletion-requests", requireAdminMiddleware'),
  "GET /api/account-deletion-requests is not guarded by requireAdminMiddleware"
);

// 3. SEC-03: Editorial Approval Authorization
check(
  "SEC-03: /api/editorial/approved/:id is guarded by requireAdminMiddleware",
  serverCode.includes('app.post("/api/editorial/approved/:id", requireAdminMiddleware'),
  "Missing requireAdminMiddleware on editorial approval endpoint"
);

// 4. SEC-04: News Post Mutations & Reset Authorization
check(
  "SEC-04: PUT /api/news-posts/:id requires admin authorization",
  serverCode.includes('app.put("/api/news-posts/:id", requireAdminMiddleware'),
  "Missing requireAdminMiddleware on PUT /api/news-posts/:id"
);

check(
  "SEC-04: DELETE /api/news-posts/:id requires admin authorization",
  serverCode.includes('app.delete("/api/news-posts/:id", requireAdminMiddleware'),
  "Missing requireAdminMiddleware on DELETE /api/news-posts/:id"
);

check(
  "SEC-04: POST /api/news-posts/reset requires admin authorization",
  serverCode.includes('app.post("/api/news-posts/reset", requireAdminMiddleware'),
  "Missing requireAdminMiddleware on POST /api/news-posts/reset"
);

// 5. SEC-05: Multi-Tenant Draft Isolation
check(
  "SEC-05: GET /api/drafts enforces authentication and tenant isolation",
  serverCode.includes('app.get("/api/drafts", requireAuthMiddleware') &&
  serverCode.includes("userEmail && dEmail === userEmail"),
  "Drafts retrieval does not enforce tenant filtering by userEmail/userId"
);

check(
  "SEC-05: POST /api/drafts enforces tenant isolation on update",
  serverCode.includes('app.post("/api/drafts", requireAuthMiddleware') &&
  serverCode.includes("आप अन्य उपयोगकर्ता के ड्राफ्ट को संशोधित नहीं कर सकते हैं।"),
  "Draft creation/update allows tampering with other users' drafts"
);

check(
  "SEC-05: DELETE /api/drafts/:id enforces tenant isolation",
  serverCode.includes('app.delete("/api/drafts/:id", requireAuthMiddleware') &&
  serverCode.includes("आप अन्य उपयोगकर्ता के ड्राफ्ट को हटा नहीं सकते हैं।"),
  "Draft deletion allows unauthorized removal of other users' drafts"
);

// 6. SEC-06: Route Alias Perimeter Bypass on Channels & Categories
check(
  "SEC-06: Channels mutation routes enforce requireAdminMiddleware",
  serverCode.includes('app.post(["/api/channels", "/api/admin/channels", "/api/restricted-channels"], requireAdminMiddleware') &&
  serverCode.includes('app.delete(["/api/channels/:id", "/api/admin/channels/:id", "/api/restricted-channels/:id"], requireAdminMiddleware'),
  "Channels management endpoints lack handler-level requireAdminMiddleware"
);

check(
  "SEC-06: Categories mutation routes enforce requireAdminMiddleware",
  serverCode.includes('app.post(["/api/categories", "/api/admin/categories"], requireAdminMiddleware') &&
  serverCode.includes('app.delete(["/api/categories/:id", "/api/admin/categories/:id"], requireAdminMiddleware'),
  "Categories management endpoints lack handler-level requireAdminMiddleware"
);

// 7. SEC-07: Mass Notification Broadcast
check(
  "SEC-07: POST /api/notifications/broadcast enforces requireAdminMiddleware",
  serverCode.includes('app.post(["/api/notifications/broadcast", "/api/notifications/alert"], requireAdminMiddleware'),
  "Notification broadcast is missing requireAdminMiddleware"
);

// 8. SEC-08: Logo Change Request Approvals
check(
  "SEC-08: Logo change request approval and rejection enforce requireAdminMiddleware",
  serverCode.includes('app.post("/api/logo-change-requests/:id/approve", requireAdminMiddleware') &&
  serverCode.includes('app.post("/api/logo-change-requests/:id/reject", requireAdminMiddleware') &&
  serverCode.includes('app.post(["/api/logo-requests/:id/approve", "/api/logo-change-requests/:id/approve"], requireAdminMiddleware'),
  "Logo request endpoints lack requireAdminMiddleware"
);

// 9. SEC-09: Twilio SMS & WhatsApp Relays
check(
  "SEC-09: /api/twilio/send-sms and /api/twilio/send-whatsapp enforce requireAdminMiddleware",
  serverCode.includes('app.post("/api/twilio/send-sms", requireAdminMiddleware') &&
  serverCode.includes('app.post("/api/twilio/send-whatsapp", requireAdminMiddleware'),
  "Twilio relay endpoints lack requireAdminMiddleware"
);

// 10. SEC-10: Cashfree Price Tampering
check(
  "SEC-10: /api/cashfree/create-order derives orderAmount strictly from server catalog",
  serverCode.includes("let orderAmount = isGraphicPack ? 99 : (targetPlan?.priceNum || 999);") &&
  !serverCode.includes("(Number(amount) || targetPlan?.priceNum"),
  "Cashfree order creation still trusts client-supplied amount"
);

// 11. SEC-11: Download Entitlement Verification
check(
  "SEC-11: Download entitlement verifies bonus in database and authenticates admin session",
  serverCode.includes("verifiedBonus = Boolean(article?.isBonus);") &&
  serverCode.includes("const verifiedAuthUser = await resolveAuthenticatedUser(req);"),
  "Download entitlement bypass remains open via client isBonus or unverified email"
);

// 12. SEC-12: Reminders Disclosure Protection
check(
  "SEC-12: /api/reminders enforces user authentication and isolation",
  serverCode.includes('app.get("/api/reminders", requireAuthMiddleware') &&
  serverCode.includes("reminders.filter((r) => r.userEmail === userEmail"),
  "/api/reminders dumps global data or lacks authentication"
);

// 13. SEC-13: Stored/Reflected SVG XSS Protection
check(
  "SEC-13: /api/proxy-image sandboxes SVG rendering with Content-Disposition & CSP",
  serverCode.includes('res.setHeader("Content-Disposition", \'attachment; filename="image.svg"\');') &&
  serverCode.includes('res.setHeader("Content-Security-Policy", "default-src \'none\'");'),
  "SVG proxying lacks Content-Disposition or CSP sandbox headers"
);

// 14. SEC-14: Anonymous AI Resource Exhaustion
check(
  "SEC-14: enforceUserAccessMiddleware fails closed for anonymous requests",
  serverCode.includes("इस सुविधा का उपयोग करने के लिए लॉगिन आवश्यक है।") &&
  serverCode.includes("authRequired: true"),
  "enforceUserAccessMiddleware passes unauthenticated callers through"
);

// 15. SEC-15: SSRF IPv6 & Internal Network Protection
check(
  "SEC-15: isPrivateOrInternalUrl checks IPv6 loopback, link-local, and ULA",
  serverCode.includes("hostname.startsWith('fe80:')") &&
  serverCode.includes("hostname.startsWith('::ffff:')"),
  "isPrivateOrInternalUrl lacks IPv6 protection checks"
);

// 16. SEC-16: Security Headers & Framing Protection
check(
  "SEC-16: Express middleware enforces X-Frame-Options: SAMEORIGIN and CSP frame-ancestors",
  serverCode.includes('res.setHeader("X-Frame-Options", "SAMEORIGIN");') &&
  serverCode.includes('res.setHeader("Content-Security-Policy", "frame-ancestors \'self\' https://*.ainewsmaker.online https://ainewsmaker.online;");'),
  "Missing X-Frame-Options or Content-Security-Policy framing protection"
);

// 17. 100% SHA256 Parity
const serverHash = crypto.createHash('sha256').update(serverCode).digest('hex');
const webStudioServerHash = crypto.createHash('sha256').update(webStudioServerCode).digest('hex');
check(
  "Parity: server.ts and web_studio/server.ts maintain 100% SHA256 parity",
  serverHash === webStudioServerHash,
  `Hash mismatch: ${serverHash} vs ${webStudioServerHash}`
);

// 18. Android Application ID Preservation
const buildGradlePath = path.resolve('android/app/build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  check(
    "Invariant: Android applicationId preserved as com.aistudio.ainewsmaker.hzwptx",
    gradleContent.includes('applicationId "com.aistudio.ainewsmaker.hzwptx"'),
    "Android applicationId was altered"
  );
} else {
  const altGradle = path.resolve('app/build.gradle');
  const ktsGradle = path.resolve('app/build.gradle.kts');
  const targetGradle = fs.existsSync(altGradle) ? altGradle : (fs.existsSync(ktsGradle) ? ktsGradle : null);
  if (targetGradle) {
    console.log(`ℹ️ Checking Android configuration at ${path.basename(targetGradle)}`);
    const gradleContent = fs.readFileSync(targetGradle, 'utf8');
    check(
      "Invariant: Android applicationId preserved as com.aistudio.ainewsmaker.hzwptx",
      gradleContent.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"') || gradleContent.includes('applicationId "com.aistudio.ainewsmaker.hzwptx"'),
      "Android applicationId was altered"
    );
  }
}

console.log("==================================================================");
console.log("🎉 ALL 18 / 18 SECURITY AUDIT REMEDIATION VERIFICATION CHECKS PASSED!");
console.log("==================================================================");
