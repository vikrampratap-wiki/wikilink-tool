/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on UserProfile',
    path: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Vikram',
      role: 'editor',
      preferredSkin: 'wikimedia-classic',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
      isAdmin: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role on UserProfile',
    path: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Vikram',
      role: 'admin',
      preferredSkin: 'wikimedia-classic',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Identity Spoofing on UserProfile (uid mismatch)',
    path: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      uid: 'user_2',
      displayName: 'Vikram',
      role: 'editor',
      preferredSkin: 'wikimedia-classic',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Unverified Email Write Attempt',
    path: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: false },
    payload: {
      uid: 'user_1',
      displayName: 'Vikram',
      role: 'editor',
      preferredSkin: 'wikimedia-classic',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Cross-User PII Read on /users/user_1/private/info',
    path: '/users/user_1/private/info',
    operation: 'get',
    auth: { uid: 'user_2', email: 'u2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Forged Client Timestamp on create',
    path: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Vikram',
      role: 'editor',
      preferredSkin: 'wikimedia-classic',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Mutating Immutable createdAt on UserProfile update',
    path: '/users/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Vikram Updated',
      role: 'editor',
      preferredSkin: 'wikimedia-classic',
      createdAt: '__NEW_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Orphaned Subcollection Write on activityLogs',
    path: '/users/non_existent_user/activityLogs/log_1',
    operation: 'create',
    auth: { uid: 'non_existent_user', email: 'u1@example.com', email_verified: true },
    payload: {
      logId: 'log_1',
      ownerId: 'non_existent_user',
      action: 'analysis',
      title: 'भारत',
      lang: 'hi',
      newLinks: 4,
      contaminationsFixed: 1,
      note: 'test',
      wikitext: '[[भारत]]',
      timestampDisplay: 'now',
      createdAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Oversized String DoW Attack on ActivityLog.wikitext',
    path: '/users/user_1/activityLogs/log_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      logId: 'log_1',
      ownerId: 'user_1',
      action: 'analysis',
      title: 'भारत',
      lang: 'hi',
      newLinks: 4,
      contaminationsFixed: 1,
      note: 'test',
      wikitext: 'x'.repeat(60000),
      timestampDisplay: 'now',
      createdAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'ID Poisoning Attack on {logId}',
    path: '/users/user_1/activityLogs/invalid$id!@#',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      logId: 'invalid$id!@#',
      ownerId: 'user_1',
      action: 'analysis',
      title: 'भारत',
      lang: 'hi',
      newLinks: 4,
      contaminationsFixed: 1,
      note: 'test',
      wikitext: '[[भारत]]',
      timestampDisplay: 'now',
      createdAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Unauthorized Cross-User list Query on activityLogs',
    path: '/users/user_1/activityLogs',
    operation: 'list',
    auth: { uid: 'user_2', email: 'u2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Value Poisoning on UserProfile Update',
    path: '/users/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'u1@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Vikram',
      role: 'editor',
      preferredSkin: 'hacked-skin-value',
      createdAt: '__EXISTING_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__'
    },
    expectedResult: 'PERMISSION_DENIED'
  }
];
