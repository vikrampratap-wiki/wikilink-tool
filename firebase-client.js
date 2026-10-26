/**
 * विकीलिंक सहायक (WikiLink Assistant) — Firebase (Firestore + Google Auth) Client Integration
 * Supports both AI Studio Cloud Run (/) and GitHub Pages (/wikilink-tool/) deployments.
 *
 * Key architecture:
 * - firebase-app.js & firebase-auth.js are imported statically so `auth` is ready synchronously
 *   and `signInWithPopup(auth, provider)` executes in the exact user click gesture (never popup-blocked).
 * - firebase-firestore.js (~300 KB) is loaded on-demand when a user is authenticated or reading/writing logs,
 *   keeping initial Mobile PageSpeed Insights fast.
 */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

export const TOOL_DISPLAY_NAME = 'विकीलिंक सहायक (WikiLink Assistant)';

const DEFAULT_FIREBASE_CONFIG = {
  appName: TOOL_DISPLAY_NAME,
  projectId: 'gen-lang-client-0674523264',
  appId: '1:427939105273:web:f28b4dff0f837055675528',
  apiKey: 'AIzaSyB53REyQ8sajBSd9pAafMO3V7-fggJ36b4',
  authDomain: 'gen-lang-client-0674523264.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-wikilinktool-edb12aa5-8e5d-4788-a1e8-8cf16feeb5e1',
  storageBucket: 'gen-lang-client-0674523264.firebasestorage.app',
  messagingSenderId: '427939105273',
  measurementId: '',
  oAuthClientId: '427939105273-5cd0s50fupo14af8d7vegdm1kalhhi4q.apps.googleusercontent.com',
  recaptchaSiteKey: ''
};

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

// Initialize Firebase App & Auth synchronously so signInWithPopup never loses user gesture activation
const app = getApps().length > 0 ? getApp() : initializeApp(DEFAULT_FIREBASE_CONFIG);
const auth = getAuth(app);
auth.languageCode = 'hi';

let db = null;
let fbFirestoreMod = null;
let firestoreLoadPromise = null;
let unsubscribeLogsSnapshot = null;
let authListenerBound = false;
const profileEnsurePromises = new Map();

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

async function ensureFirestoreLoaded() {
  if (db && fbFirestoreMod) {
    return { db, fbFirestoreMod };
  }
  if (!firestoreLoadPromise) {
    firestoreLoadPromise = import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js')
      .then((mod) => {
        fbFirestoreMod = mod;
        if (!db) {
          db = mod.getFirestore(app, DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId);
        }
        return { db, fbFirestoreMod };
      })
      .catch((err) => {
        firestoreLoadPromise = null;
        throw err;
      });
  }
  return firestoreLoadPromise;
}

async function ensureUserProfileInFirestore(user) {
  if (!user || !user.uid) return null;
  await ensureFirestoreLoaded();
  if (!db || !fbFirestoreMod) return null;
  const uid = sanitizeId(user.uid);

  if (profileEnsurePromises.has(uid)) {
    return profileEnsurePromises.get(uid);
  }

  const { doc, getDoc, writeBatch, serverTimestamp } = fbFirestoreMod;

  const ensurePromise = (async () => {
    const userPath = `users/${uid}`;
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
  })();

  profileEnsurePromises.set(uid, ensurePromise);
  try {
    return await ensurePromise;
  } catch (err) {
    profileEnsurePromises.delete(uid);
    throw err;
  }
}

async function subscribeToUserActivityLogs(uid, onLogsUpdated) {
  if (unsubscribeLogsSnapshot) {
    unsubscribeLogsSnapshot();
    unsubscribeLogsSnapshot = null;
  }
  if (!uid) return;
  await ensureFirestoreLoaded();
  if (!db || !fbFirestoreMod) return;

  const { collection, query, where, onSnapshot } = fbFirestoreMod;
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
        const idStr = String(d.logId || docSnap.id);
        logs.push({
          id: idStr,
          logId: idStr,
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
  if (!auth || !auth.currentUser) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;

  await ensureFirestoreLoaded();
  if (!db || !fbFirestoreMod) return false;

  const { doc, setDoc, serverTimestamp } = fbFirestoreMod;
  const uid = sanitizeId(user.uid);
  const logId = sanitizeId(entry.logId || entry.id || `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const docPath = `users/${uid}/activityLogs/${logId}`;

  await ensureUserProfileInFirestore(user);

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

async function deleteSingleActivityLogInFirestore(rawId) {
  if (!auth || !auth.currentUser || !rawId) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;

  await ensureFirestoreLoaded();
  if (!db || !fbFirestoreMod) return false;

  const { doc, deleteDoc } = fbFirestoreMod;
  const uid = sanitizeId(user.uid);
  const logId = sanitizeId(rawId);
  const docPath = `users/${uid}/activityLogs/${logId}`;
  await ensureUserProfileInFirestore(user);
  try {
    await deleteDoc(doc(db, 'users', uid, 'activityLogs', logId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
  return false;
}

async function clearUserActivityLogsInFirestore(logIds = []) {
  if (!auth || !auth.currentUser) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;

  await ensureFirestoreLoaded();
  if (!db || !fbFirestoreMod) return false;

  const { doc, deleteDoc } = fbFirestoreMod;
  const uid = sanitizeId(user.uid);
  await ensureUserProfileInFirestore(user);
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
  if (!auth || !auth.currentUser) return false;
  const user = auth.currentUser;
  if (!user.emailVerified) return false;
  if (!ALLOWED_SKINS.includes(skinId)) return false;

  await ensureFirestoreLoaded();
  if (!db || !fbFirestoreMod) return false;

  const { doc, updateDoc, serverTimestamp } = fbFirestoreMod;
  const uid = sanitizeId(user.uid);
  const userPath = `users/${uid}`;
  await ensureUserProfileInFirestore(user);
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

/**
 * Fallback using official Google Identity Services (accounts.google.com popup) + signInWithCredential
 * if Firebase's `/__/auth/handler` rejects a custom domain before it is added in Firebase Console.
 */
function signInViaGoogleIdentityServicesPopup() {
  return new Promise((resolve, reject) => {
    function launchGsiTokenPopup() {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(new Error('Google Identity Services unavailable'));
        return;
      }
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: DEFAULT_FIREBASE_CONFIG.oAuthClientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const cred = GoogleAuthProvider.credential(null, tokenResponse.access_token);
              const result = await signInWithCredential(auth, cred);
              if (result.user && result.user.emailVerified) {
                await ensureUserProfileInFirestore(result.user).catch(() => {});
              }
              resolve(result.user);
            } catch (credErr) {
              reject(credErr);
            }
          } else {
            reject(new Error(tokenResponse?.error || 'Google Sign-In cancelled'));
          }
        }
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    }

    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      launchGsiTokenPopup();
      return;
    }

    const existingScript = document.getElementById('google-gsi-client-script');
    if (existingScript) {
      existingScript.addEventListener('load', launchGsiTokenPopup, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = launchGsiTokenPopup;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // Synchronous call on user click so browser never blocks the Google Account Chooser popup
    const result = await signInWithPopup(auth, provider);
    if (result.user && result.user.emailVerified) {
      try {
        await ensureUserProfileInFirestore(result.user);
      } catch (err) {
        console.warn('Profile initialization on sign-in:', err);
      }
    }
    return result.user;
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    // If mobile browser blocks popups, redirect directly to official Google Account Chooser
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    // If domain is not yet in Firebase's authorizedDomains, open official Google Account Chooser via GSI + signInWithCredential
    if (code === 'auth/unauthorized-domain') {
      return await signInViaGoogleIdentityServicesPopup();
    }
    throw err;
  }
}

async function signOutFirebaseUser() {
  if (unsubscribeLogsSnapshot) {
    unsubscribeLogsSnapshot();
    unsubscribeLogsSnapshot = null;
  }
  profileEnsurePromises.clear();
  if (auth && auth.currentUser) {
    await signOut(auth);
  }
}

function bindFirebaseAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;

  // Handle redirect sign-in completion if signInWithRedirect was used on mobile
  getRedirectResult(auth)
    .then(async (result) => {
      if (result && result.user && result.user.emailVerified) {
        await ensureUserProfileInFirestore(result.user).catch(() => {});
      }
    })
    .catch(() => {});

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
        name:
          profile?.displayName ||
          firebaseUser.displayName ||
          (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'विकिपीडिया संपादक'),
        email: firebaseUser.email || 'editor@wikipedia.org',
        emailVerified: firebaseUser.emailVerified,
        role: `${TOOL_DISPLAY_NAME} • क्लाउड संपादक`,
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
}

// Preload GSI script on login.html so even if auth/unauthorized-domain occurs, Google's Account Chooser opens seamlessly
if (typeof window !== 'undefined' && window.location.pathname.includes('login')) {
  window.addEventListener('load', () => {
    if (!document.getElementById('google-gsi-client-script')) {
      const s = document.createElement('script');
      s.id = 'google-gsi-client-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      document.head.appendChild(s);
    }
  }, { once: true });
}

bindFirebaseAuthListener();

window.WikiFirebase = {
  isReady: true,
  toolName: TOOL_DISPLAY_NAME,
  getCurrentUser: () => auth?.currentUser || null,
  signInWithGooglePopup,
  signOutFirebaseUser,
  saveActivityLogToFirestore,
  deleteSingleActivityLogInFirestore,
  clearUserActivityLogsInFirestore,
  updatePreferredSkinInFirestore,
  handleFirestoreError,
  OperationType
};

window.dispatchEvent(new CustomEvent('wikilink:firebase-ready'));
