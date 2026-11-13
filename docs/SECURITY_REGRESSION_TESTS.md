# AI NEWS MAKER — SECURITY REGRESSION TESTS
## AUTOMATED VERIFICATION SUITE MANUAL

**Project:** AI NEWS MAKER / BREAKING NEWS WALA  
**Test Suite Script:** `test_phase2_security_remediation.cjs`  
**Execution Command:** `node test_phase2_security_remediation.cjs`  
**Latest Result:** **21/21 TESTS PASS (100% SUCCESS)**  
**Date:** 11 November 2026  

---

## 1. HOW TO RUN THE TEST SUITE

Ensure the project is built, then execute:
```bash
node test_phase2_security_remediation.cjs
```

The script automatically spawns an ephemeral test server on port 3891 with a dedicated 256-bit test secret, executes all 21 security assertions, and tears down the test instance upon completion.

---

## 2. ASSERTION CATALOG & EVIDENCE

### Group 1: Android Configuration Hardening
1. **Assertion 1.1:** `Android usesCleartextTraffic is set to false`
   - *Target:* `app/src/main/AndroidManifest.xml`
   - *Status:* PASS
2. **Assertion 1.2:** `Android WebView disables allowFileAccessFromFileURLs`
   - *Target:* `app/src/main/java/com/example/ui/screens/NewsroomScreen.kt`
   - *Status:* PASS
3. **Assertion 1.3:** `Android WebView disables allowUniversalAccessFromFileURLs`
   - *Target:* `app/src/main/java/com/example/ui/screens/NewsroomScreen.kt`
   - *Status:* PASS
4. **Assertion 1.4:** `Android WebView mixedContentMode is MIXED_CONTENT_NEVER_ALLOW`
   - *Target:* `app/src/main/java/com/example/ui/screens/NewsroomScreen.kt`
   - *Status:* PASS

### Group 2: P0 — Google Auth Bypass Elimination
5. **Assertion 2.1:** `Unauthenticated forged googleUid is rejected with 401 Unauthorized`
   - *Payload:* `{ identifier: "breakingnewswala.com@gmail.com", googleUid: "forged_mock_uid" }`
   - *Status:* PASS (HTTP 401)
6. **Assertion 2.2:** `Forged/tampered Firebase token is rejected with 401 Unauthorized`
   - *Payload:* `{ identifier: "breakingnewswala.com@gmail.com", firebaseToken: "tampered_jwt" }`
   - *Status:* PASS (HTTP 401)

### Group 3: P0 — Hardcoded Secret Token Forgery Rejection
7. **Assertion 3.1:** `Token signed with old hardcoded static secret is rejected (401/403)`
   - *Secret Tested:* `"ainewsmaker_prod_sec_token_***_2026"` (legacy static secret)
   - *Status:* PASS (HTTP 401/403)

### Group 4: P1 — Admin Header & Body Spoofing Rejection
8. **Assertion 4.1:** `GET /api/admin/notifications rejects spoofed x-admin-email header without valid JWT`
   - *Header:* `x-admin-email: admin.ainewsmaker@gmail.com`
   - *Status:* PASS (HTTP 401)
9. **Assertion 4.2:** `POST /api/admin/news/publish-rss rejects spoofed admin email without valid JWT`
   - *Body:* `{ email: "admin.ainewsmaker@gmail.com" }`
   - *Status:* PASS (HTTP 401)
10. **Assertion 4.3:** `Authenticated ordinary reporter receives 403 Forbidden on admin endpoints`
    - *Token:* Valid reporter JWT
    - *Status:* PASS (HTTP 403)
11. **Assertion 4.4:** `Authorized Master Admin successfully accesses admin notifications (200 OK)`
    - *Token:* Valid Master Admin JWT
    - *Status:* PASS (HTTP 200)

### Group 5: P1 — Logo Upload Ownership Enforcement
12. **Assertion 5.1:** `Unauthenticated POST /api/upload-logo returns 401 Unauthorized`
    - *Status:* PASS (HTTP 401)
13. **Assertion 5.2:** `Ordinary user attempting to update another user's logo receives 403 Forbidden`
    - *Target:* `email: "victim@example.com"` with reporter session
    - *Status:* PASS (HTTP 403)
14. **Assertion 5.3:** `Authenticated user can update their own channel logo (200 OK)`
    - *Status:* PASS (HTTP 200)

### Group 6: P2 — Font Upload Tier Escalation Prevention
15. **Assertion 6.1:** `Client parameter userTier: 'vip' cannot bypass font upload paywall (403 Forbidden)`
    - *Status:* PASS (HTTP 403)

### Group 7: P2 — Wallet IDOR Prevention
16. **Assertion 7.1:** `Unauthenticated GET /api/wallet/unlocked-items returns 401 Unauthorized`
    - *Status:* PASS (HTTP 401)
17. **Assertion 7.2:** `Non-admin cannot view another user's unlocked wallet items (403 Forbidden)`
    - *Status:* PASS (HTTP 403)
18. **Assertion 7.3:** `Unauthenticated GET /api/wallet/frame-unlocks returns 401 Unauthorized`
    - *Status:* PASS (HTTP 401)

### Group 8: P3 — PBKDF2 Password Hashing Upgrade & Compatibility
19. **Assertion 8.1:** `Modern hash uses 210,000 iterations and differs from 10,000 legacy hash`
    - *Status:* PASS (128-char hex, timing-safe equal)

### Group 9: Production Startup Fail-Closed Check
20. **Assertion 9.1:** `Server fails closed in production when SESSION_SECRET is missing or invalid`
    - *Condition:* `NODE_ENV=production` without `SESSION_SECRET`
    - *Status:* PASS (Process exits with FATAL SECURITY ERROR)

### Group 10: Credential Authentication
21. **Assertion 10.1:** `Admin login with incorrect password is rejected with 401 Unauthorized`
    - *Status:* PASS (HTTP 401)
