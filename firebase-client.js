/**
 * WikiLink Assistant - Firebase (Firestore + Google Auth) Client Integration
 * Connects the application to the provisioned Cloud Firestore database and Firebase Authentication.
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write'
};

const ALLOWED_SKINS = [
  'wikimedia-classic',
  'anime-sakura',
  'anime-mecha',
  'anime-shinkai',
  'anime-forest',
  'anime-royal'
];

let app = null;
let db = null;
let auth = null;
let unsubscribeLogsSnapshot = null;

function sanitizeId(rawId) {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function clampString(val, maxLen, fallback = '') {
  const str = String(val ?? fallback).trim();
  if (!str && fallback) return fallback.slice(0, maxLen);
  return str.slice(0, maxLen);
}

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

async function ensureUserProfileInFirestore(user) {
  if (!db || !user || !user.uid) return null;
  const uid = sanitizeId(user.uid);
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let existingSnap = null;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const savedLocalSkin = localStorage.getItem('wikilink_skin_v3') || 'wikimedia-classic';
  const validSkin = ALLOWED_SKINS.includes(savedLocalSkin) ? savedLocalSkin : 'wikimedia-classic';
  const displayName = clampString(
    user.displayName || (user.email ? user.email.split('@')[0] : 'Wikipedia Editor'),
    100,
    'Wikipedia Editor'
  );
  const email = clampString(user.email || 'editor@wikipedia.org', 254, 'editor@wikipedia.org');

  if (!existingSnap || !existingSnap.exists()) {
    try {
      const batch = writeBatch(db);
      batch.set(userRef, {
        uid,
        displayName,
        role: 'editor',
        preferredSkin: validSkin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      if (user.emailVerified && email.length >= 3) {
        batch.set(privateRef, {
          uid,
          email,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      return { uid, displayName, role: 'editor', preferredSkin: validSkin, email };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else {
    const data = existingSnap.data();
    return {
      uid,
      displayName: data.displayName || displayName,
      role: data.role || 'editor',
      preferredSkin: ALLOWED_SKINS.includes(data.preferredSkin) ? data.preferredSkin : 'wikimedia-classic',
      email
    };
  }
  return null;
}

function subscribeToUserActivityLogs(uid, onLogsUpdated) {
  if (unsubscribeLogsSnapshot) {
    unsubscribeLogsSnapshot();
    unsubscribeLogsSnapshot = null;
  }
  if (!db || !uid) return;

  const cleanUid = sanitizeId(uid);
  const logsPath = `users/${cleanUid}/activityLogs`;
  const logsQuery = query(
    collection(db, 'users', cleanUid, 'activityLogs'),
    where('ownerId', '==', cleanUid)
  );

  unsubscribeLogsSnapshot = onSnapshot(
    logsQuery,
    (snapshot) => {
      const logs = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        logs.push({
          id: d.logId || docSnap.id,
          logId: d.logId || docSnap.id,
          timestamp: d.timestampDisplay || new Date().toLocaleString('hi-IN'),
          action: d.action || 'तार्किक विश्लेषण',
          title: d.title || 'अशीर्षक लेख',
          lang: d.lang || 'hi',
          newLinks: Number(d.newLinks) || 0,
          contaminationsFixed: Number(d.contaminationsFixed) || 0,
          note: d.note || '',
          wikitext: d.wikitext || '',
          createdAtMillis: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now()
        });
      });

      logs.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      if (typeof onLogsUpdated === 'function') {
        onLogsUpdated(logs);
      }
      window.dispatchEvent(new CustomEvent('wikilink:firebase-logs', { detail: { logs } }));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, logsPath);
    }
  );
}

async function saveActivityLogToFirestore(entry) {
  if (!db || !auth || !auth.currentUser) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;

  const uid = sanitizeId(user.uid);
  const logId = sanitizeId(entry.id || `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const docPath = `users/${uid}/activityLogs/${logId}`;

  const payload = {
    logId,
    ownerId: uid,
    action: clampString(entry.action || 'तार्किक विश्लेषण', 120, 'तार्किक विश्लेषण'),
    title: clampString(entry.title || 'अशीर्षक लेख', 300, 'अशीर्षक लेख'),
    lang: clampString(entry.lang || 'hi', 16, 'hi'),
    newLinks: Math.max(0, Math.min(10000, Math.round(Number(entry.newLinks) || 0))),
    contaminationsFixed: Math.max(0, Math.min(10000, Math.round(Number(entry.contaminationsFixed) || 0))),
    note: String(entry.note || '').slice(0, 500),
    wikitext: String(entry.wikitext || '').slice(0, 50000),
    timestampDisplay: clampString(entry.timestamp || new Date().toLocaleString('hi-IN'), 100, 'अभी'),
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'users', uid, 'activityLogs', logId), payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
  return false;
}

async function clearUserActivityLogsInFirestore(logIds = []) {
  if (!db || !auth || !auth.currentUser) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;

  const uid = sanitizeId(user.uid);
  for (const rawId of logIds) {
    const logId = sanitizeId(rawId);
    const docPath = `users/${uid}/activityLogs/${logId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'activityLogs', logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
  return true;
}

async function updatePreferredSkinInFirestore(skinId) {
  if (!db || !auth || !auth.currentUser) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;
  if (!ALLOWED_SKINS.includes(skinId)) return false;

  const uid = sanitizeId(user.uid);
  const userPath = `users/${uid}`;
  const displayName = clampString(
    user.displayName || (user.email ? user.email.split('@')[0] : 'Wikipedia Editor'),
    100,
    'Wikipedia Editor'
  );

  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName,
      preferredSkin: skinId,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
  return false;
}

async function signInWithGooglePopup() {
  if (!auth) throw new Error('Firebase Auth अभी लोड हो रहा है, कृपया एक क्षण प्रतीक्षा करें।');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

async function signOutFirebaseUser() {
  if (unsubscribeLogsSnapshot) {
    unsubscribeLogsSnapshot();
    unsubscribeLogsSnapshot = null;
  }
  if (auth && auth.currentUser) {
    await signOut(auth);
  }
}

async function bootFirebaseIntegration() {
  try {
    const res = await fetch('/firebase-applet-config.json');
    if (!res.ok) {
      console.warn('firebase-applet-config.json not found');
      return;
    }
    const firebaseConfig = await res.json();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);

    // Validate Firestore connection on boot
    await testConnection();

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = null;
        if (firebaseUser.emailVerified) {
          try {
            profile = await ensureUserProfileInFirestore(firebaseUser);
          } catch (err) {
            console.warn('Profile sync warning:', err);
          }
          subscribeToUserActivityLogs(firebaseUser.uid);
        }

        const userDetail = {
          uid: firebaseUser.uid,
          name: profile?.displayName || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'विकिपीडिया संपादक'),
          email: firebaseUser.email || 'editor@wikipedia.org',
          emailVerified: firebaseUser.emailVerified,
          role: 'Firebase क्लाउड संपादक',
          preferredSkin: profile?.preferredSkin || null,
          isFirebaseUser: true
        };

        window.dispatchEvent(new CustomEvent('wikilink:firebase-auth', { detail: { user: userDetail } }));
      } else {
        if (unsubscribeLogsSnapshot) {
          unsubscribeLogsSnapshot();
          unsubscribeLogsSnapshot = null;
        }
        window.dispatchEvent(new CustomEvent('wikilink:firebase-auth', { detail: { user: null } }));
      }
    });

    window.WikiFirebase = {
      isReady: true,
      getCurrentUser: () => auth?.currentUser || null,
      signInWithGooglePopup,
      signOutFirebaseUser,
      saveActivityLogToFirestore,
      clearUserActivityLogsInFirestore,
      updatePreferredSkinInFirestore,
      handleFirestoreError,
      OperationType
    };

    window.dispatchEvent(new CustomEvent('wikilink:firebase-ready'));
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
}

bootFirebaseIntegration();
