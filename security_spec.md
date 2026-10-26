# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default-Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Invariant**: All write operations require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`), and path `{userId}` must strictly match `request.auth.uid` as well as regex `^[a-zA-Z0-9_\-]+$` (`size <= 128`).
3. **PII Isolation Invariant**: User email addresses are isolated in `/users/{userId}/private/{infoId}` (where `infoId == 'info'`) and are readable and writable strictly by `request.auth.uid == userId`.
4. **Privilege Escalation Prevention**: Users cannot assign themselves an arbitrary role. `UserProfile.role` must strictly equal `'editor'` on creation and is immutable on update.
5. **Relational Master Gate Invariant**: Every `/users/{userId}/activityLogs/{logId}` document requires the parent `/users/{userId}` document to exist (`exists(/databases/$(database)/documents/users/$(userId))` or `existsAfter(...)`) and `incoming().ownerId == request.auth.uid && userId == request.auth.uid`.
6. **Temporal & Immutability Invariant**: `createdAt` must equal `request.time` on `create` and remain immutable on `update`. `updatedAt` must equal `request.time` on both `create` and `update`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on `UserProfile`**:
   `{ "uid": "user_1", "displayName": "Vikram", "role": "editor", "preferredSkin": "wikimedia-classic", "createdAt": "<SERVER_TIME>", "updatedAt": "<SERVER_TIME>", "isAdmin": true }` -> **REJECTED** by `hasOnly`.
2. **Self-Assigned Admin Role on `UserProfile`**:
   `{ "uid": "user_1", "displayName": "Vikram", "role": "admin", "preferredSkin": "wikimedia-classic", "createdAt": "<SERVER_TIME>", "updatedAt": "<SERVER_TIME>" }` -> **REJECTED** by `data.role == 'editor'`.
3. **Identity Spoofing on `UserProfile` (`uid` mismatch)**:
   Writing to `/users/user_1` with `uid: "user_2"` -> **REJECTED** by `data.uid == request.auth.uid && userId == request.auth.uid`.
4. **Unverified Email Write Attempt**:
   Authenticated token with `email_verified: false` writing to `/users/user_1` -> **REJECTED** by `isVerifiedUser()`.
5. **Cross-User PII Read on `/users/user_1/private/info`**:
   `user_2` attempting `get` on `/users/user_1/private/info` -> **REJECTED** by `isOwner(userId)`.
6. **Forged Client Timestamp on `create`**:
   Creating `/users/user_1` with `createdAt: Timestamp.fromMillis(1000)` instead of `request.time` -> **REJECTED** by `incoming().createdAt == request.time`.
7. **Mutating Immutable `createdAt` on `UserProfile` update**:
   Updating `/users/user_1` with a modified `createdAt` -> **REJECTED** by `affectedKeys().hasOnly(['displayName', 'preferredSkin', 'updatedAt'])` and `incoming().createdAt == existing().createdAt`.
8. **Orphaned Subcollection Write on `activityLogs`**:
   Creating `/users/user_1/activityLogs/log_1` when `/users/user_1` does not exist -> **REJECTED** by Master Gate `exists(/databases/$(database)/documents/users/$(userId))`.
9. **Oversized String DoW Attack on `ActivityLog.wikitext`**:
   Creating `/users/user_1/activityLogs/log_1` with a 60,000-character `wikitext` string -> **REJECTED** by `data.wikitext.size() <= 50000`.
10. **ID Poisoning Attack on `{logId}`**:
    Creating `/users/user_1/activityLogs/bad$id!@#` -> **REJECTED** by `isValidId(logId)`.
11. **Unauthorized Cross-User `list` Query on `activityLogs`**:
    `user_2` listing `/users/user_1/activityLogs` -> **REJECTED** by `isOwner(userId) && resource.data.ownerId == request.auth.uid`.
12. **Value Poisoning on `UserProfile` Update**:
    Updating `preferredSkin` to `"hacked-skin"` -> **REJECTED** by `isValidUserProfile(incoming())`.
