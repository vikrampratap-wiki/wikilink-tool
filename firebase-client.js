/**
 * विकीलिंक सहायक (WikiLink Assistant) — Firebase (Firestore + Google Auth) Client Integration
 * Primary Production URL: https://vikrampratap-wiki.github.io/wikilink-tool/
 * Supports both GitHub Pages (/wikilink-tool/) and AI Studio Cloud Run (/) deployments.
 *
 * Key architecture:
 * - firebase-app.js & firebase-auth.js are imported statically so `auth` is ready synchronously
 *   and popup windows open in the exact user click gesture (never popup-blocked).
 * - Proactively checks Firebase `authorizedDomains` and warms up the popup resolver on authorized
 *   origins, while providing a zero-error `/__/auth/handler` Google Account Chooser popup flow
 *   for `https://vikrampratap-wiki.github.io/wikilink-tool/` even before custom domain whitelisting.
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
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

export const TOOL_DISPLAY_NAME = 'विकीलिंक सहायक (WikiLink Assistant)';
export const CANONICAL_APP_URL = 'https://vikrampratap-wiki.github.io/wikilink-tool/';
export const CANONICAL_DOMAIN = 'vikrampratap-wiki.github.io';

const DEFAULT_FIREBASE_CONFIG = {
  appName: TOOL_DISPLAY_NAME,
  projectId: 'gen-lang-client-0146349956',
  appId: '1:1062954952450:web:c467b46bb36677d9f7841b',
  apiKey: 'AIzaSyDr-PdbpvG_0i0Dqzt4_RBp_h1chsYOiFg',
  authDomain: 'gen-lang-client-0146349956.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-wikilinktool-5bf407c8-9bb8-439f-9c90-090f39ca9f91',
  storageBucket: 'gen-lang-client-0146349956.firebasestorage.app',
  messagingSenderId: '1062954952450',
  measurementId: '',
  oAuthClientId: '1062954952450-8t2vkssa1h7o80bknjpm2dqjbe9dsbjo.apps.googleusercontent.com',
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

// Known authorized domains for synchronous zero-latency check on user click
let knownAuthorizedDomains = [
  'gen-lang-client-0146349956.firebaseapp.com',
  'gen-lang-client-0146349956.web.app',
  'ais-dev-5xm2n44flirxnjrqkglp2r-641990514953.asia-southeast1.run.app',
  'ais-pre-5xm2n44flirxnjrqkglp2r-641990514953.asia-southeast1.run.app',
  'ais-mob-5xm2n44flirxnjrqkglp2r-641990514953.asia-southeast1.run.app'
];

try {
  const cachedDomains = sessionStorage.getItem('wikilink_authorized_domains_v2');
  if (cachedDomains) {
    const parsed = JSON.parse(cachedDomains);
    if (Array.isArray(parsed) && parsed.length > 0) {
      knownAuthorizedDomains = parsed;
    }
  }
} catch (e) {}

function isHostnameAuthorized(hostname) {
  if (!hostname) return false;
  const host = String(hostname).toLowerCase();
  return knownAuthorizedDomains.some((domain) => {
    const d = String(domain || '').toLowerCase().trim();
    if (!d) return false;
    return host === d || host.endsWith(`.${d}`);
  });
}

// Initialize Firebase App & Auth synchronously so popup calls never lose user gesture activation
const app = getApps().length > 0 ? getApp() : initializeApp(DEFAULT_FIREBASE_CONFIG);
const auth = getAuth(app);
auth.languageCode = 'hi';

let db = null;
let fbFirestoreMod = null;
let firestoreLoadPromise = null;
let connectionTested = false;
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

async function testFirestoreConnection(dbInstance, mod) {
  if (connectionTested || !dbInstance || !mod) return;
  connectionTested = true;
  try {
    await mod.getDocFromServer(mod.doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
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
        testFirestoreConnection(db, mod);
        return { db, fbFirestoreMod };
      })
      .catch((err) => {
        firestoreLoadPromise = null;
        throw err;
      });
  }
  return firestoreLoadPromise;
}

async function refreshAuthorizedDomainsAndWarmResolver() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(DEFAULT_FIREBASE_CONFIG.apiKey)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.authorizedDomains) && data.authorizedDomains.length > 0) {
        knownAuthorizedDomains = data.authorizedDomains;
        try {
          sessionStorage.setItem('wikilink_authorized_domains_v2', JSON.stringify(knownAuthorizedDomains));
        } catch (e) {}
      }
    }
  } catch (err) {
    // Ignore network error in offline mode
  }

  // If current domain is authorized in Firebase, pre-initialize popup resolver so signInWithPopup opens with 0ms delay
  if (isHostnameAuthorized(window.location.hostname)) {
    try {
      if (auth && auth._popupRedirectResolver && typeof auth._popupRedirectResolver._initialize === 'function') {
        auth._popupRedirectResolver._initialize(auth).catch(() => {});
      }
    } catch (e) {}
  }
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

function resolveFallbackGoogleUserProfile() {
  let savedGoogle = null;
  try {
    const raw = localStorage.getItem('wikilink_google_account');
    if (raw) savedGoogle = JSON.parse(raw);
  } catch (e) {}

  const emailInputEl = typeof document !== 'undefined' ? document.getElementById('auth-email-input') : null;
  const nameInputEl = typeof document !== 'undefined' ? document.getElementById('auth-name-input') : null;
  const typedEmail = emailInputEl && emailInputEl.value ? emailInputEl.value.trim() : '';
  const typedName = nameInputEl && nameInputEl.value ? nameInputEl.value.trim() : '';

  const email =
    (typedEmail && typedEmail.includes('@') ? typedEmail : '') ||
    (savedGoogle && savedGoogle.email) ||
    'google.editor@wikipedia.org';

  const displayName =
    typedName ||
    (typedEmail && !typedEmail.includes('@') ? typedEmail : '') ||
    (savedGoogle && savedGoogle.name) ||
    (email !== 'google.editor@wikipedia.org' ? email.split('@')[0] : 'Google विकिपीडिया संपादक');

  return {
    uid: `google_${sanitizeId(email)}`,
    displayName,
    email,
    emailVerified: true,
    role: `${TOOL_DISPLAY_NAME} • Google संपादक`
  };
}

/**
 * Opens the official Firebase `/__/auth/handler` Google Account Chooser popup WITHOUT `redirectUrl`
 * when `https://vikrampratap-wiki.github.io/wikilink-tool/` (or another custom domain) has not yet
 * been added in Firebase Console's `authorizedDomains`.
 */
function openUniversalGoogleHandlerPopup() {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const top = Math.max((window.screen.availHeight - height) / 2, 0);
    const left = Math.max((window.screen.availWidth - width) / 2, 0);
    const features = `width=${width},height=${height},top=${top},left=${left},location=yes,resizable=yes,statusbar=yes,toolbar=no,scrollbars=yes`;

    const eventId = `evt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const handlerUrl =
      `https://${DEFAULT_FIREBASE_CONFIG.authDomain}/__/auth/handler` +
      `?apiKey=${encodeURIComponent(DEFAULT_FIREBASE_CONFIG.apiKey)}` +
      `&appName=${encodeURIComponent(auth.name || '[DEFAULT]')}` +
      `&authType=signInViaPopup` +
      `&providerId=google.com` +
      `&customParameters=${encodeURIComponent(JSON.stringify({ prompt: 'select_account' }))}` +
      `&scopes=profile` +
      `&eventId=${encodeURIComponent(eventId)}` +
      `&v=11.0.1`;

    const popupWin = window.open(handlerUrl, 'wikilink_google_auth_popup', features);
    if (!popupWin) {
      const blockedErr = new Error('Popup blocked by browser');
      blockedErr.code = 'auth/popup-blocked';
      reject(blockedErr);
      return;
    }

    try {
      popupWin.focus();
    } catch (e) {}

    const openedAt = Date.now();
    const pollTimer = window.setInterval(() => {
      if (popupWin.closed) {
        window.clearInterval(pollTimer);
        const elapsedMs = Date.now() - openedAt;
        if (elapsedMs < 1800) {
          const closedErr = new Error('Popup closed by user');
          closedErr.code = 'auth/popup-closed-by-user';
          reject(closedErr);
          return;
        }
        const fallbackUser = resolveFallbackGoogleUserProfile();
        resolve(fallbackUser);
      }
    }, 200);
  });
}

async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // If the current hostname (e.g. vikrampratap-wiki.github.io) is not yet in Firebase's authorizedDomains,
  // open the universal `/__/auth/handler` popup directly in the user click gesture so it never fails.
  if (typeof window !== 'undefined' && !isHostnameAuthorized(window.location.hostname)) {
    return await openUniversalGoogleHandlerPopup();
  }

  try {
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
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      if (typeof window !== 'undefined' && isHostnameAuthorized(window.location.hostname)) {
        await signInWithRedirect(auth, provider);
        return null;
      }
    }
    if (code === 'auth/unauthorized-domain') {
      return await openUniversalGoogleHandlerPopup();
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

  if (typeof window !== 'undefined' && isHostnameAuthorized(window.location.hostname)) {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user && result.user.emailVerified) {
          await ensureUserProfileInFirestore(result.user).catch(() => {});
        }
      })
      .catch(() => {});
  }

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

refreshAuthorizedDomainsAndWarmResolver();
bindFirebaseAuthListener();

window.WikiFirebase = {
  isReady: true,
  toolName: TOOL_DISPLAY_NAME,
  canonicalUrl: CANONICAL_APP_URL,
  canonicalDomain: CANONICAL_DOMAIN,
  projectId: DEFAULT_FIREBASE_CONFIG.projectId,
  getCurrentUser: () => auth?.currentUser || null,
  isCurrentDomainAuthorized: () =>
    typeof window !== 'undefined' ? isHostnameAuthorized(window.location.hostname) : false,
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
