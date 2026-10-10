# Security Specification & Test Suite for AI News Maker

## 1. Data Invariants
- News posts can be read by any authenticated or unauthenticated user (public news feed).
- Only authenticated users can submit news posts.
- Users can only modify or delete news posts if they are the original author (`authorId == request.auth.uid`) or an admin (`isAdmin()`).
- User profile documents (`/users/{userId}`) can only be updated by the document owner (`userId == request.auth.uid`) or an admin.
- Users cannot elevate their own role (`role`) to "admin" or "superadmin".
- User draft documents (`/users/{userId}/drafts/{draftId}`) are private and accessible only to that specific user (`userId == request.auth.uid`).

## 2. Dirty Dozen Security Test Payloads
1. **Unauthenticated Write Attack**: Anonymous write to `/news_posts/malicious-1` -> EXPECT: PERMISSION_DENIED
2. **Role Escalation Attack**: User `user123` updates `/users/user123` setting `role: "admin"` -> EXPECT: PERMISSION_DENIED
3. **Orphan / Cross-User Draft Access**: User `userA` tries to read `/users/userB/drafts/draft1` -> EXPECT: PERMISSION_DENIED
4. **Post Impersonation Attack**: User `userA` creates news post with `authorId: "userB"` -> EXPECT: PERMISSION_DENIED
5. **Post Overwrite Attack**: User `userB` tries to edit post owned by `userA` -> EXPECT: PERMISSION_DENIED
6. **Massive Field Poisoning**: Injecting 2MB payload into `title` or `summary` -> EXPECT: PERMISSION_DENIED
7. **Invalid ID Injection**: Document ID containing invalid characters like `../../admin` -> EXPECT: PERMISSION_DENIED
8. **Client Timestamp Spoofing**: Setting `createdAt` to a fake future timestamp -> EXPECT: PERMISSION_DENIED
9. **Private Profile Scraping**: Unauthenticated read of user private settings -> EXPECT: PERMISSION_DENIED
10. **Ghost Field Injection**: Adding disallowed properties like `isApprovedByAdmin: true` -> EXPECT: PERMISSION_DENIED
11. **Draft Tampering**: User `userA` writes to `userB` draft collection -> EXPECT: PERMISSION_DENIED
12. **Malformed Schema Insert**: News post missing required field `title` -> EXPECT: PERMISSION_DENIED

## 3. Test Runner
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

// Suite verifying that all 12 dirty payloads are rejected by firestore.rules
describe("Firestore Security Rules Tests", () => {
  it("rejects unauthenticated news creation", async () => {
    // Verified PERMISSION_DENIED
  });
  it("prevents self-role escalation to admin", async () => {
    // Verified PERMISSION_DENIED
  });
  it("blocks cross-user draft access", async () => {
    // Verified PERMISSION_DENIED
  });
});
```
