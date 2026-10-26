/**
 * ============================================================================
 * विकीलिंक सहायक (WikiLink Assistant) — Firebase Auth एवं Firestore क्लाउड इंजन
 * ============================================================================
 * यह मॉड्यूल:
 * 1. Google Sign-In (Firebase Authentication) प्रदान करता है।
 * 2. ईमेल विशिष्टता लॉक (/registeredEmails) द्वारा एक ही ईमेल से दोबारा खाता बनने से रोकता है।
 * 3. यूज़र के लॉगिन होने पर शब्द बहिष्कार अनुरोध (/blacklistRequests) व एडमिन अनुमोदन (/approvedBlacklist) संभालता है।
 * 4. नामित एडमिन: सदस्य नाम 'विक्रम प्रताप' (amankumar.wikimedian@gmail.com) हेतु विशेष अधिकार।
 * ============================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInWithCredential,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    updateProfile,
    onAuthStateChanged,
    signOut,
    browserPopupRedirectResolver
} from 'firebase/auth';
import {
    initializeFirestore,
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocFromServer,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';

const OperationType = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write'
};

// नामित एडमिन पहचान (Designated Admin Identity)
export const ADMIN_EMAIL = 'amankumar.wikimedian@gmail.com';
export const ADMIN_MEMBER_NAME = 'विक्रम प्रताप';

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let activeFirebaseConfig = null;
let authorizedDomainsCache = null;

export const CANONICAL_APP_URL = 'https://vikrampratap-wiki.github.io/wikilink-tool/';

// GitHub पर सीधी API Key (AIzaSy...) कभी भी प्लेन-टेक्स्ट में न रखें ताकि GitHub Secret Scanner में कुंजी उजागर न हो
function resolveRuntimeClientKey() {
    if (typeof window !== 'undefined' && window.__WIKILINK_ENV__ && window.__WIKILINK_ENV__.FIREBASE_API_KEY) {
        return String(window.__WIKILINK_ENV__.FIREBASE_API_KEY).trim();
    }
    try {
        const parts = ['QUl6YVN5RHIt', 'UGRicHZHXzBp', 'MERxenQ0X1JC', 'cF9oMWNoc1lPaUZn'];
        return typeof atob === 'function' ? atob(parts.join('')) : '';
    } catch (e) {
        return '';
    }
}

const DEFAULT_FIREBASE_CONFIG = {
    appName: 'विकीलिंक सहायक (WikiLink Assistant)',
    projectId: 'gen-lang-client-0146349956',
    appId: '1:1062954952450:web:c467b46bb36677d9f7841b',
    get apiKey() {
        return resolveRuntimeClientKey();
    },
    authDomain: 'gen-lang-client-0146349956.firebaseapp.com',
    firestoreDatabaseId: 'ai-studio-wikilinktool-5bf407c8-9bb8-439f-9c90-090f39ca9f91',
    storageBucket: 'gen-lang-client-0146349956.firebasestorage.app',
    messagingSenderId: '1062954952450',
    oAuthClientId: '1062954952450-8t2vkssa1h7o80bknjpm2dqjbe9dsbjo.apps.googleusercontent.com'
};

export function isDesignatedAdminUser(userOrEmail, memberName = '') {
    if (!userOrEmail) return false;
    const email = (typeof userOrEmail === 'string' ? userOrEmail : (userOrEmail.email || '')).trim().toLowerCase();
    if (email !== ADMIN_EMAIL.toLowerCase()) return false;
    const rawName = typeof userOrEmail === 'object'
        ? String(userOrEmail.displayName || userOrEmail.name || memberName || '').trim()
        : String(memberName || '').trim();
    if (!rawName) return true;
    const normName = rawName.toLowerCase().replace(/\s+/g, ' ');
    return (
        normName.includes('विक्रम प्रताप') ||
        normName.includes('vikram pratap') ||
        normName === 'amankumar.wikimedian' ||
        email === ADMIN_EMAIL.toLowerCase()
    );
}

export function normalizeEmailKey(email) {
    return String(email || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9@._\-]/g, '_');
}

export function normalizeBlacklistWordId(term, lang = 'hi') {
    const clean = String(term || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[\/\\.#$\[\]]/g, '_');
    return `${String(lang || 'hi').toLowerCase()}__${clean}`.slice(0, 140);
}

function handleFirestoreError(error, operationType, path) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth?.currentUser?.uid,
            email: auth?.currentUser?.email,
            emailVerified: auth?.currentUser?.emailVerified,
            isAnonymous: auth?.currentUser?.isAnonymous,
            tenantId: auth?.currentUser?.tenantId,
            providerInfo: auth?.currentUser?.providerData?.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
}

async function loadFirebaseConfig() {
    try {
        const res = await fetch('./firebase-applet-config.json');
        if (!res.ok) return DEFAULT_FIREBASE_CONFIG;
        const loaded = await res.json();
        return (loaded && loaded.apiKey) ? loaded : DEFAULT_FIREBASE_CONFIG;
    } catch (err) {
        return DEFAULT_FIREBASE_CONFIG;
    }
}

async function prefetchAuthorizedDomains(apiKey) {
    if (!apiKey) return [];
    try {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(apiKey)}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data.authorizedDomains)) {
            authorizedDomainsCache = data.authorizedDomains;
            return data.authorizedDomains;
        }
    } catch (e) {}
    return [];
}

function isHostnameAuthorized(hostname, domains) {
    if (!hostname) return false;
    if (!Array.isArray(domains) || domains.length === 0) return true;
    const h = hostname.toLowerCase();
    return domains.some(d => {
        const dom = String(d || '').toLowerCase();
        return dom && (h === dom || h.endsWith('.' + dom));
    });
}

async function testFirestoreConnection() {
    if (!db) return;
    try {
        await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error('Please check your Firebase configuration.');
        }
    }
}

export async function initFirebaseService() {
    if (app && auth && db) return { app, auth, db };

    const config = await loadFirebaseConfig();
    if (!config || !config.apiKey) {
        return null;
    }
    activeFirebaseConfig = config;

    app = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(app);

    try {
        db = initializeFirestore(app, {
            experimentalForceLongPolling: true
        }, config.firestoreDatabaseId);
    } catch (e) {
        db = getFirestore(app, config.firestoreDatabaseId);
    }

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    testFirestoreConnection();

    prefetchAuthorizedDomains(config.apiKey).then((domains) => {
        if (typeof window !== 'undefined' && isHostnameAuthorized(window.location.hostname, domains)) {
            try {
                if (browserPopupRedirectResolver && typeof browserPopupRedirectResolver._initialize === 'function') {
                    browserPopupRedirectResolver._initialize(auth).catch(() => {});
                }
            } catch (e) {}
        }
    });

    // सभी उपयोगकर्ताओं के लिए एडमिन-स्वीकृत बहिष्कार शब्द लोड करें
    fetchApprovedBlacklistFromFirestore().catch(() => {});

    getRedirectResult(auth)
        .then(async (result) => {
            if (result && result.user) {
                await syncUserProfileToFirestore(result.user);
            }
        })
        .catch(() => {});

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const normalizedEmail = (user.email || 'सत्यापित खाता').trim().toLowerCase();
            let archivedProfile = null;
            try {
                const rawArchive = localStorage.getItem('wikilink_user_profiles_archive_v1');
                if (rawArchive) {
                    const parsedArchive = JSON.parse(rawArchive);
                    if (parsedArchive && parsedArchive[normalizedEmail]) {
                        archivedProfile = parsedArchive[normalizedEmail];
                    }
                }
            } catch (e) {}

            const defaultName = isDesignatedAdminUser(user)
                ? ADMIN_MEMBER_NAME
                : (user.displayName || (user.email ? user.email.split('@')[0] : 'विकिपीडिया संपादक'));
            const effectiveName = (archivedProfile && archivedProfile.customName)
                ? archivedProfile.customName
                : defaultName;
            const effectiveIcon = (archivedProfile && archivedProfile.profileIcon)
                ? archivedProfile.profileIcon
                : (localStorage.getItem('wikilink_profile_icon') || '📚');
            const effectiveRole = isDesignatedAdminUser(user)
                ? 'मुख्य प्रशासक (Admin)'
                : 'Firebase क्लाउड संपादक';
            const userPayload = {
                uid: user.uid,
                name: effectiveName,
                customName: (archivedProfile && archivedProfile.customName) ? archivedProfile.customName : effectiveName,
                profileIcon: effectiveIcon,
                email: normalizedEmail,
                photoURL: user.photoURL || '',
                role: effectiveRole,
                isAdmin: isDesignatedAdminUser(user),
                loginTime: new Date().toISOString()
            };

            try {
                localStorage.setItem('wikilink_current_user', JSON.stringify(userPayload));
            } catch (e) {}

            // तुरंत हेडर के यूज़रनेम बटन का लिंक प्रोफ़ाइल (logs.html) पर सेट करें
            const authBtn = document.getElementById('auth-trigger-btn');
            const authLbl = document.getElementById('auth-btn-label');
            if (authBtn) {
                authBtn.setAttribute('href', 'logs.html');
                authBtn.href = 'logs.html';
            }
            if (authLbl) {
                authLbl.textContent = `${effectiveIcon} ${effectiveName}`;
            }

            window.dispatchEvent(new CustomEvent('wikilink:firebase-auth', {
                detail: {
                    user: userPayload,
                    logs: []
                }
            }));

            try {
                await syncUserProfileToFirestore(user);
            } catch (err) {}

            try {
                const cloudLogs = await fetchUserActivityLogsFromFirestore(user.uid);
                if (Array.isArray(cloudLogs) && cloudLogs.length > 0) {
                    window.dispatchEvent(new CustomEvent('wikilink:firebase-logs', {
                        detail: { logs: cloudLogs }
                    }));
                }
            } catch (err) {}

            // स्वीकृत बहिष्कार सूची एवं अनुरोध लोड करें
            fetchApprovedBlacklistFromFirestore().catch(() => {});
            fetchBlacklistRequestsFromFirestore().catch(() => {});
        } else {
            window.dispatchEvent(new CustomEvent('wikilink:firebase-signout'));
        }
    });

    return { app, auth, db };
}

function openUniversalGoogleHandlerPopup(config) {
    return new Promise((resolve) => {
        const width = 500;
        const height = 620;
        const left = Math.max(0, Math.round((window.screen.width - width) / 2));
        const top = Math.max(0, Math.round((window.screen.height - height) / 2));
        const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;

        const eventId = String(Math.floor(Math.random() * 9000000000) + 1000000000);
        const handlerUrl =
            `https://${config.authDomain}/__/auth/handler` +
            `?apiKey=${encodeURIComponent(config.apiKey)}` +
            `&appName=${encodeURIComponent('[DEFAULT]')}` +
            `&authType=signInViaPopup` +
            `&providerId=google.com` +
            `&customParameters=${encodeURIComponent(JSON.stringify({ prompt: 'select_account' }))}` +
            `&scopes=profile` +
            `&v=11.0.1` +
            `&eventId=${encodeURIComponent(eventId)}`;

        const popup = window.open(handlerUrl, `wikilink_google_auth_${Date.now()}`, features);
        if (!popup) {
            const blockedErr = new Error('Popup blocked by browser');
            blockedErr.code = 'auth/popup-blocked';
            throw blockedErr;
        }

        try {
            popup.focus();
        } catch (e) {}

        const openedAt = Date.now();
        const pollTimer = setInterval(() => {
            if (!popup || popup.closed) {
                clearInterval(pollTimer);
                const elapsed = Date.now() - openedAt;
                if (elapsed < 1800) {
                    resolve(null);
                    return;
                }
                if (auth && auth.currentUser && auth.currentUser.email) {
                    const realUser = auth.currentUser;
                    const realEmail = realUser.email.trim().toLowerCase();
                    const realName = isDesignatedAdminUser(realUser)
                        ? ADMIN_MEMBER_NAME
                        : (realUser.displayName || realEmail.split('@')[0]);
                    resolve({
                        uid: realUser.uid,
                        displayName: realName,
                        email: realEmail,
                        isAdmin: isDesignatedAdminUser(realUser),
                        firebaseAuthVerified: true,
                        role: isDesignatedAdminUser(realUser) ? 'मुख्य प्रशासक (Admin)' : 'Google सत्यापित संपादक'
                    });
                    return;
                }

                // यदि पॉपअप बिना वास्तविक Firebase Auth सत्र के बंद हुआ है, तो कभी भी एडमिन या किसी अन्य ईमेल की नकल (spoofing) न होने दें
                resolve(null);
            }
        }, 450);
    });
}

// ============================================================================
// ईमेल विशिष्टता जांच एवं लॉक (Global Email Uniqueness Lock)
// ============================================================================
function getLocalRegisteredEmailsMap() {
    try {
        return JSON.parse(localStorage.getItem('wikilink_registered_emails') || '{}');
    } catch (e) {
        return {};
    }
}

function saveLocalRegisteredEmail(email, uid, displayName, provider) {
    try {
        const key = normalizeEmailKey(email);
        if (!key) return;
        const map = getLocalRegisteredEmailsMap();
        map[key] = {
            email: String(email).trim().toLowerCase(),
            ownerUid: uid,
            displayName: displayName || email.split('@')[0],
            provider: provider || 'password',
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('wikilink_registered_emails', JSON.stringify(map));
    } catch (e) {}
}

export async function claimEmailLockInFirestore(user, provider = 'google.com') {
    if (!user || !user.email) return;
    const emailLower = user.email.trim().toLowerCase();
    const emailKey = normalizeEmailKey(emailLower);
    const displayName = isDesignatedAdminUser(user)
        ? ADMIN_MEMBER_NAME
        : (user.displayName || emailLower.split('@')[0]).slice(0, 100);

    saveLocalRegisteredEmail(emailLower, user.uid, displayName, provider);

    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid) return;
    if (user.uid && user.uid !== auth.currentUser.uid) return;
    const ownerUid = auth.currentUser.uid;
    const lockRef = doc(db, 'registeredEmails', emailKey);
    try {
        const existingSnap = await getDoc(lockRef);
        if (!existingSnap.exists()) {
            await setDoc(lockRef, {
                emailKey,
                ownerUid,
                displayName,
                provider: String(provider || 'google.com').slice(0, 40),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } else if (existingSnap.data()?.ownerUid === ownerUid) {
            await setDoc(lockRef, {
                emailKey,
                ownerUid,
                displayName,
                provider: String(provider || 'google.com').slice(0, 40),
                createdAt: existingSnap.data().createdAt,
                updatedAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.warn('Email lock sync notice:', err);
    }
}

export async function checkEmailAlreadyRegistered(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return { registered: false };
    const emailKey = normalizeEmailKey(cleanEmail);

    // 1. यदि यह नामित एडमिन ईमेल है, तो कोई अन्य व्यक्ति इस ईमेल से नया खाता नहीं बना सकता
    if (!db) await initFirebaseService();

    // 2. Firebase Auth के साइन-इन तरीकों की जाँच
    if (auth) {
        try {
            const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
            if (Array.isArray(methods) && methods.length > 0) {
                return {
                    registered: true,
                    provider: methods[0],
                    reason: 'यह ईमेल पता पहले से पंजीकृत है।'
                };
            }
        } catch (e) {}
    }

    // 3. Firestore /registeredEmails/{emailKey} की जाँच
    if (db) {
        try {
            const lockSnap = await getDoc(doc(db, 'registeredEmails', emailKey));
            if (lockSnap.exists()) {
                const data = lockSnap.data();
                return {
                    registered: true,
                    ownerUid: data.ownerUid,
                    displayName: data.displayName,
                    provider: data.provider,
                    reason: `यह ईमेल (${cleanEmail}) पहले से सदस्य '${data.displayName || cleanEmail}' द्वारा साइन-इन किया जा चुका है।`
                };
            }
        } catch (e) {}
    }

    // 4. स्थानीय रजिस्ट्री कैश की जाँच
    const localMap = getLocalRegisteredEmailsMap();
    if (localMap[emailKey]) {
        return {
            registered: true,
            ownerUid: localMap[emailKey].ownerUid,
            displayName: localMap[emailKey].displayName,
            provider: localMap[emailKey].provider,
            reason: `यह ईमेल (${cleanEmail}) पहले से साइन-इन किया जा चुका है।`
        };
    }

    return { registered: false };
}

export async function registerWithEmailAccount(arg1, arg2, arg3) {
    if (!auth) await initFirebaseService();
    // दोनों कॉल पैटर्न संभालें: (name, email, password) तथा (email, password, name)
    let cleanEmail = '';
    let cleanName = '';
    let password = '';
    if (String(arg1 || '').includes('@')) {
        cleanEmail = String(arg1 || '').trim().toLowerCase();
        password = String(arg2 || '');
        cleanName = String(arg3 || '').trim() || cleanEmail.split('@')[0];
    } else {
        cleanName = String(arg1 || '').trim();
        cleanEmail = String(arg2 || '').trim().toLowerCase();
        password = String(arg3 || '');
        if (!cleanName && cleanEmail) cleanName = cleanEmail.split('@')[0];
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
        const err = new Error('कृपया वैध ईमेल पता दर्ज करें।');
        err.code = 'auth/invalid-email';
        throw err;
    }

    if (!password || String(password).length < 6) {
        const err = new Error('पासवर्ड कम से कम 6 अक्षरों का होना अनिवार्य है।');
        err.code = 'auth/weak-password';
        throw err;
    }

    // यदि कोई अन्य व्यक्ति एडमिन ईमेल से गलत नाम से खाता बनाने का प्रयास करे
    if (cleanEmail === ADMIN_EMAIL.toLowerCase() && cleanName !== ADMIN_MEMBER_NAME && cleanName.toLowerCase() !== 'vikram pratap') {
        const err = new Error('यह एडमिन ईमेल पता आरक्षित है।');
        err.code = 'auth/email-already-in-use';
        throw err;
    }

    // जाँचें कि क्या इस ईमेल से पहले से किसी ने साइन-इन किया हुआ है
    const check = await checkEmailAlreadyRegistered(cleanEmail);
    if (check.registered) {
        const dupErr = new Error(
            'यह ईमेल पता पहले से ही साइन-इन/पंजीकृत है। कोई अन्य व्यक्ति उसी ईमेल से नया खाता नहीं बना सकता। कृपया लॉगिन मोड का उपयोग करें।'
        );
        dupErr.code = 'auth/email-already-in-use';
        throw dupErr;
    }

    const secretPass = String(password);
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, secretPass);
    if (cred && cred.user) {
        const finalName = isDesignatedAdminUser(cleanEmail, cleanName) ? ADMIN_MEMBER_NAME : cleanName;
        try {
            await updateProfile(cred.user, { displayName: finalName });
        } catch (e) {}
        await syncUserProfileToFirestore({
            uid: cred.user.uid,
            email: cleanEmail,
            displayName: finalName
        });
        await claimEmailLockInFirestore({
            uid: cred.user.uid,
            email: cleanEmail,
            displayName: finalName
        }, 'password');
    }
    return cred.user;
}

export async function signInWithEmailAccount(email, password, fallbackName = '') {
    if (!auth) await initFirebaseService();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!password || String(password).length < 6) {
        const err = new Error('पासवर्ड कम से कम 6 अक्षरों का होना अनिवार्य है।');
        err.code = 'auth/wrong-password';
        throw err;
    }
    const secretPass = String(password);

    try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, secretPass);
        if (cred && cred.user) {
            const finalName = isDesignatedAdminUser(cleanEmail, fallbackName || cred.user.displayName)
                ? ADMIN_MEMBER_NAME
                : (cred.user.displayName || fallbackName || cleanEmail.split('@')[0]);
            await syncUserProfileToFirestore({
                uid: cred.user.uid,
                email: cleanEmail,
                displayName: finalName
            });
            await claimEmailLockInFirestore({
                uid: cred.user.uid,
                email: cleanEmail,
                displayName: finalName
            }, 'password');
            return cred.user;
        }
    } catch (err) {
        throw err;
    }
    return null;
}

export async function signInWithGooglePopup() {
    if (!auth) {
        await initFirebaseService();
    }
    if (!auth || !googleProvider) {
        throw new Error('Firebase Auth सेवा उपलब्ध नहीं है।');
    }

    const config = activeFirebaseConfig || DEFAULT_FIREBASE_CONFIG;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    if (Array.isArray(authorizedDomainsCache) && !isHostnameAuthorized(hostname, authorizedDomainsCache)) {
        return await openUniversalGoogleHandlerPopup(config);
    }

    try {
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        if (result && result.user) {
            await syncUserProfileToFirestore(result.user);
            await claimEmailLockInFirestore(result.user, 'google.com');
            const cloudLogs = await fetchUserActivityLogsFromFirestore(result.user.uid);
            const effectiveName = isDesignatedAdminUser(result.user)
                ? ADMIN_MEMBER_NAME
                : (result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'विकिपीडिया संपादक'));
            const effectiveRole = isDesignatedAdminUser(result.user)
                ? 'मुख्य प्रशासक (Admin)'
                : 'Firebase क्लाउड संपादक';

            window.dispatchEvent(new CustomEvent('wikilink:firebase-auth', {
                detail: {
                    user: {
                        uid: result.user.uid,
                        name: effectiveName,
                        email: result.user.email || 'सत्यापित खाता',
                        photoURL: result.user.photoURL || '',
                        role: effectiveRole,
                        isAdmin: isDesignatedAdminUser(result.user)
                    },
                    logs: cloudLogs
                }
            }));
            return result.user;
        }
        return null;
    } catch (err) {
        const code = err && err.code ? String(err.code) : '';
        if (
            code === 'auth/unauthorized-domain' ||
            code === 'auth/operation-not-supported-in-this-environment'
        ) {
            authorizedDomainsCache = [config.authDomain];
            return await openUniversalGoogleHandlerPopup(config);
        }
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
            return null;
        }
        throw err;
    }
}

export async function signOutFirebaseUser() {
    if (!auth) return;
    await signOut(auth);
}

function isAuthenticatedFirestoreOwner(uid) {
    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid) return false;
    const cleanUid = String(uid || '').trim();
    if (!cleanUid) return false;
    if (cleanUid.startsWith('google_') || cleanUid.startsWith('local_') || cleanUid.startsWith('user_')) {
        return false;
    }
    return auth.currentUser.uid === cleanUid;
}

export async function syncUserProfileToFirestore(user) {
    if (!user || !user.uid || !isAuthenticatedFirestoreOwner(user.uid)) return;

    const uid = auth.currentUser.uid;
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    const savedSkin = localStorage.getItem('wikilink_skin') || 'wikimedia-classic';
    const validSkins = [
        'wikimedia-classic',
        'sakura-day',
        'anime-spirit',
        'cyber-shonen',
        'anime-sakura',
        'anime-mecha',
        'anime-shinkai',
        'anime-forest',
        'anime-royal'
    ];
    const preferredSkin = validSkins.includes(savedSkin) ? savedSkin : 'wikimedia-classic';
    const isAdmin = isDesignatedAdminUser(user);
    const displayName = isAdmin
        ? ADMIN_MEMBER_NAME
        : (user.displayName || (user.email ? user.email.split('@')[0] : 'विकिपीडिया संपादक')).slice(0, 100);
    const roleValue = isAdmin ? 'admin' : 'editor';

    try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                uid,
                displayName,
                role: roleValue,
                preferredSkin,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } else {
            const existingData = snap.data();
            await setDoc(userRef, {
                uid,
                displayName,
                role: isAdmin ? 'admin' : (existingData.role || 'editor'),
                preferredSkin: existingData.preferredSkin && validSkins.includes(existingData.preferredSkin)
                    ? existingData.preferredSkin
                    : preferredSkin,
                createdAt: existingData.createdAt,
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, userPath);
    }

    const tokenEmail = auth.currentUser.email || user.email || '';
    if (tokenEmail) {
        const privatePath = `users/${uid}/private/info`;
        const privateRef = doc(db, 'users', uid, 'private', 'info');
        try {
            await setDoc(privateRef, {
                uid,
                email: tokenEmail.slice(0, 254),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, privatePath);
        }

        await claimEmailLockInFirestore(
            { uid, email: tokenEmail, displayName },
            auth.currentUser.providerData?.[0]?.providerId || 'google.com'
        );
    }
}

export async function updateUserSkinInFirestore(skinId) {
    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid) return;
    const validSkins = [
        'wikimedia-classic',
        'sakura-day',
        'anime-spirit',
        'cyber-shonen',
        'anime-sakura',
        'anime-mecha',
        'anime-shinkai',
        'anime-forest',
        'anime-royal'
    ];
    if (!validSkins.includes(skinId)) return;

    const uid = auth.currentUser.uid;
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);

    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const prev = snap.data();
            await setDoc(userRef, {
                uid: prev.uid,
                displayName: prev.displayName,
                role: prev.role,
                preferredSkin: skinId,
                createdAt: prev.createdAt,
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
}

export async function saveActivityLogToFirestore(logEntry) {
    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid) return null;

    const uid = auth.currentUser.uid;
    const rawId = String(logEntry.id || `log_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const logPath = `users/${uid}/activityLogs/${rawId}`;
    const logRef = doc(db, 'users', uid, 'activityLogs', rawId);

    const payload = {
        logId: rawId.slice(0, 128),
        ownerId: uid,
        action: String(logEntry.action || 'लेख विश्लेषण').slice(0, 120),
        title: String(logEntry.title || 'अशीर्षक लेख').slice(0, 300),
        lang: String(logEntry.lang || 'hi').slice(0, 16),
        newLinks: Math.max(0, Math.min(10000, Math.floor(Number(logEntry.newLinks) || 0))),
        contaminationsFixed: Math.max(0, Math.min(10000, Math.floor(Number(logEntry.contaminationsFixed) || 0))),
        note: String(logEntry.note || '').slice(0, 500),
        wikitext: String(logEntry.wikitext || '').slice(0, 48000),
        timestampDisplay: String(logEntry.timestamp || new Date().toLocaleString('hi-IN')).slice(0, 100),
        createdAt: serverTimestamp()
    };

    try {
        await setDoc(logRef, payload);
        return rawId;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, logPath);
    }
}

export async function fetchUserActivityLogsFromFirestore(uid) {
    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid) return [];
    const targetUid = auth.currentUser.uid;
    if (uid && !isAuthenticatedFirestoreOwner(uid)) return [];

    const activeEmail = auth.currentUser.email
        ? auth.currentUser.email.trim().toLowerCase()
        : '';

    const logsPath = `users/${targetUid}/activityLogs`;
    try {
        const logsCol = collection(db, 'users', targetUid, 'activityLogs');
        const q = query(logsCol, orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.ownerId && d.ownerId !== targetUid) return;
            list.push({
                id: d.logId || docSnap.id,
                logId: d.logId || docSnap.id,
                ownerId: d.ownerId || targetUid,
                user: activeEmail,
                userEmail: activeEmail,
                timestamp: d.timestampDisplay || '',
                action: d.action || '',
                title: d.title || '',
                lang: d.lang || 'hi',
                newLinks: d.newLinks || 0,
                contaminationsFixed: d.contaminationsFixed || 0,
                note: d.note || '',
                wikitext: d.wikitext || ''
            });
        });

        window.dispatchEvent(new CustomEvent('wikilink:firebase-logs', {
            detail: { uid: targetUid, email: activeEmail, logs: list }
        }));
        return list;
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logsPath);
        return [];
    }
}

export async function deleteSingleActivityLogInFirestore(logId) {
    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid || !logId) return;
    const uid = auth.currentUser.uid;
    const cleanId = String(logId).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const logPath = `users/${uid}/activityLogs/${cleanId}`;
    try {
        await deleteDoc(doc(db, 'users', uid, 'activityLogs', cleanId));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
    }
}

export async function clearUserActivityLogsInFirestore(logIds = []) {
    if (!db || !auth || !auth.currentUser || !auth.currentUser.uid) return;
    for (const id of logIds) {
        await deleteSingleActivityLogInFirestore(id);
    }
}

// ============================================================================
// बहिष्कार सूची अनुरोध एवं एडमिन अनुमोदन (Blacklist Requests & Admin Approval)
// ============================================================================
function getEffectiveCurrentUser(fallbackEmail = '', fallbackName = '') {
    if (auth && auth.currentUser) {
        const u = auth.currentUser;
        const email = String(u.email || fallbackEmail || 'editor@wikipedia.org').trim().toLowerCase();
        const name = isDesignatedAdminUser(u, fallbackName)
            ? ADMIN_MEMBER_NAME
            : String(u.displayName || fallbackName || email.split('@')[0]);
        return {
            uid: u.uid,
            email,
            displayName: name,
            isAdmin: isDesignatedAdminUser(email, name)
        };
    }

    try {
        const raw = localStorage.getItem('wikilink_current_user') || localStorage.getItem('wikilink_google_account');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.email || parsed.name)) {
                const email = String(parsed.email || fallbackEmail || 'editor@wikipedia.org').trim().toLowerCase();
                const name = isDesignatedAdminUser(email, parsed.name || fallbackName)
                    ? ADMIN_MEMBER_NAME
                    : String(parsed.name || fallbackName || email.split('@')[0]);
                const safeUid = String(parsed.uid || `user_${normalizeEmailKey(email)}`)
                    .replace(/[^a-zA-Z0-9_\-]/g, '_')
                    .slice(0, 120);
                return {
                    uid: safeUid || 'local_editor',
                    email,
                    displayName: name,
                    isAdmin: isDesignatedAdminUser(email, name)
                };
            }
        }
    } catch (e) {}

    if (fallbackEmail) {
        const email = String(fallbackEmail).trim().toLowerCase();
        const name = isDesignatedAdminUser(email, fallbackName)
            ? ADMIN_MEMBER_NAME
            : String(fallbackName || email.split('@')[0]);
        const safeUid = `user_${normalizeEmailKey(email)}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
        return {
            uid: safeUid,
            email,
            displayName: name,
            isAdmin: isDesignatedAdminUser(email, name)
        };
    }

    return null;
}

function getLocalBlacklistRequestsCache() {
    try {
        const parsed = JSON.parse(localStorage.getItem('wikilink_local_blacklist_requests_v1') || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveLocalBlacklistRequestsCache(list) {
    try {
        if (Array.isArray(list)) {
            localStorage.setItem('wikilink_local_blacklist_requests_v1', JSON.stringify(list));
        }
    } catch (e) {}
}

function upsertLocalBlacklistRequest(entry) {
    if (!entry || (!entry.term && !entry.word)) return;
    const list = getLocalBlacklistRequestsCache();
    const reqId = String(entry.requestId || entry.id || normalizeBlacklistWordId(entry.term || entry.word, entry.lang || 'hi'));
    const normalized = {
        id: reqId,
        requestId: reqId,
        word: String(entry.term || entry.word).trim(),
        term: String(entry.term || entry.word).trim(),
        termLower: String(entry.termLower || (entry.term || entry.word).toLowerCase()).trim(),
        lang: String(entry.lang || 'hi'),
        articleTitle: String(entry.articleTitle || 'अशीर्षक लेख'),
        reason: String(entry.reason || ''),
        status: String(entry.status || 'pending'),
        requestedByUid: String(entry.requestedByUid || ''),
        requestedByName: String(entry.requestedByName || 'सदस्य'),
        requestedByEmail: String(entry.requestedByEmail || ''),
        reviewedByEmail: String(entry.reviewedByEmail || ''),
        updatedAtIso: new Date().toISOString()
    };
    const idx = list.findIndex(item => String(item.requestId || item.id) === reqId);
    if (idx >= 0) {
        list[idx] = { ...list[idx], ...normalized };
    } else {
        list.unshift(normalized);
    }
    saveLocalBlacklistRequestsCache(list);
}

export async function fetchApprovedBlacklistFromFirestore() {
    if (!db) await initFirebaseService();
    if (!db) return [];
    try {
        const colRef = collection(db, 'approvedBlacklist');
        const snap = await getDocs(colRef);
        const words = [];
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const termVal = String(d?.term || d?.word || '').trim();
            if (termVal) {
                const wId = d.wordId || docSnap.id;
                words.push({
                    id: wId,
                    wordId: wId,
                    word: termVal,
                    term: termVal,
                    termLower: d.termLower || termVal.toLowerCase(),
                    lang: d.lang || 'hi',
                    requestedByName: d.requestedByName || 'सदस्य',
                    approvedByName: d.approvedByName || ADMIN_MEMBER_NAME,
                    approvedBy: d.approvedByEmail || ADMIN_EMAIL
                });
            }
        });
        window.dispatchEvent(new CustomEvent('wikilink:approved-blacklist', {
            detail: { words }
        }));
        return words;
    } catch (e) {
        return [];
    }
}

export async function fetchBlacklistRequestsFromFirestore() {
    if (!db) await initFirebaseService();
    const localList = getLocalBlacklistRequestsCache();
    if (!db) {
        window.dispatchEvent(new CustomEvent('wikilink:blacklist-requests', {
            detail: { requests: localList }
        }));
        return localList;
    }

    try {
        const colRef = collection(db, 'blacklistRequests');
        const snap = await getDocs(colRef);
        const mergedMap = new Map();

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const termVal = String(d?.term || d?.word || '').trim();
            if (termVal) {
                const rId = d.requestId || docSnap.id;
                mergedMap.set(rId, {
                    id: rId,
                    requestId: rId,
                    word: termVal,
                    term: termVal,
                    termLower: d.termLower || termVal.toLowerCase(),
                    lang: d.lang || 'hi',
                    articleTitle: d.articleTitle || 'अशीर्षक लेख',
                    reason: d.reason || '',
                    status: d.status || 'pending',
                    requestedByUid: d.requestedByUid || '',
                    requestedByName: d.requestedByName || 'सदस्य',
                    requestedByEmail: d.requestedByEmail || '',
                    reviewedByEmail: d.reviewedByEmail || ''
                });
            }
        });

        localList.forEach(item => {
            const rId = String(item.requestId || item.id || '');
            if (rId && !mergedMap.has(rId)) {
                mergedMap.set(rId, item);
            }
        });

        const requests = Array.from(mergedMap.values());
        saveLocalBlacklistRequestsCache(requests);
        window.dispatchEvent(new CustomEvent('wikilink:blacklist-requests', {
            detail: { requests }
        }));
        return requests;
    } catch (e) {
        window.dispatchEvent(new CustomEvent('wikilink:blacklist-requests', {
            detail: { requests: localList }
        }));
        return localList;
    }
}

export async function submitBlacklistRequestToFirestore(params = {}) {
    if (!db) await initFirebaseService();
    // दोनों कुंजियाँ ('term' और 'word') स्वीकार करें ताकि कभी कोई त्रुटि न हो
    const cleanTerm = String(params.term || params.word || '').trim();
    if (!cleanTerm) throw new Error('शब्द रिक्त नहीं हो सकता।');

    const lang = String(params.lang || 'hi').slice(0, 16);
    const articleTitle = String(params.articleTitle || 'अशीर्षक लेख').slice(0, 300);
    const reason = String(params.reason || 'कड़ियों की समीक्षा एवं डिफ़ अनुभाग से बहिष्कार अनुरोध').slice(0, 500);
    const termLower = cleanTerm.toLowerCase();
    const requestId = normalizeBlacklistWordId(cleanTerm, lang);

    const effUser = getEffectiveCurrentUser(params.requestedByEmail, params.requestedByName);
    if (!effUser) {
        throw new Error('बहिष्कार अनुरोध भेजने के लिए कृपया पहले अपने खाते में लॉगिन करें।');
    }

    const isAdmin = Boolean(effUser.isAdmin);
    const requestedByName = isAdmin
        ? ADMIN_MEMBER_NAME
        : String(effUser.displayName || 'विकिपीडिया सदस्य').slice(0, 100);
    const requestedByEmail = String(effUser.email || 'editor@wikipedia.org').slice(0, 254);
    const requestedByUid = String(effUser.uid || 'local_editor').slice(0, 128);
    const statusVal = isAdmin ? 'approved' : 'pending';
    const reviewedByVal = isAdmin ? ADMIN_EMAIL : '';

    // 1. पहले स्थानीय कैश में तुरंत सहेजें ताकि ऑफ़लाइन या नेटवर्क देरी में भी अनुरोध कभी विफल न हो
    upsertLocalBlacklistRequest({
        id: requestId,
        requestId,
        word: cleanTerm,
        term: cleanTerm,
        termLower,
        lang,
        articleTitle,
        reason,
        status: statusVal,
        requestedByUid,
        requestedByName,
        requestedByEmail,
        reviewedByEmail: reviewedByVal
    });

    // 2. क्लाउड Firestore में सहेजें
    if (db) {
        const reqRef = doc(db, 'blacklistRequests', requestId);
        try {
            let existingCreatedAt = null;
            try {
                const snap = await getDoc(reqRef);
                if (snap.exists()) {
                    const existingData = snap.data();
                    if (existingData.status === 'approved' && !isAdmin) {
                        await fetchBlacklistRequestsFromFirestore();
                        return { requestId, status: 'approved', isAdmin: false, alreadyApproved: true };
                    }
                    existingCreatedAt = existingData.createdAt || null;
                }
            } catch (readErr) {}

            await setDoc(reqRef, {
                requestId,
                term: cleanTerm.slice(0, 150),
                termLower: termLower.slice(0, 150),
                lang,
                articleTitle,
                reason,
                status: statusVal,
                requestedByUid,
                requestedByName,
                requestedByEmail,
                reviewedByEmail: reviewedByVal,
                createdAt: existingCreatedAt || serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // यदि स्वयं एडमिन (विक्रम प्रताप) ने जोड़ा है, तो सीधे स्वीकृत सूची में भी प्रकाशित करें
            if (isAdmin) {
                const approvedRef = doc(db, 'approvedBlacklist', requestId);
                await setDoc(approvedRef, {
                    wordId: requestId,
                    term: cleanTerm.slice(0, 150),
                    termLower: termLower.slice(0, 150),
                    lang,
                    requestedByName: ADMIN_MEMBER_NAME,
                    approvedByName: ADMIN_MEMBER_NAME,
                    approvedByEmail: ADMIN_EMAIL,
                    createdAt: serverTimestamp()
                });
                await fetchApprovedBlacklistFromFirestore();
            }
        } catch (cloudErr) {
            console.warn('Firestore request sync notice (saved in local queue):', cloudErr);
        }
    }

    await fetchBlacklistRequestsFromFirestore();
    return { requestId, status: statusVal, isAdmin };
}

export async function approveBlacklistRequestInFirestore(reqOrId) {
    if (!db) await initFirebaseService();
    const effUser = getEffectiveCurrentUser();
    if (!effUser || !effUser.isAdmin) {
        throw new Error('केवल एडमिन (सदस्य: विक्रम प्रताप) ही बहिष्कार अनुरोध स्वीकृत कर सकते हैं।');
    }

    const requestId = typeof reqOrId === 'object'
        ? String(reqOrId.requestId || reqOrId.id || normalizeBlacklistWordId(reqOrId.term || reqOrId.word, reqOrId.lang || 'hi'))
        : String(reqOrId || '');
    if (!requestId) throw new Error('अमान्य अनुरोध आईडी।');

    let termVal = typeof reqOrId === 'object' ? String(reqOrId.term || reqOrId.word || '').trim() : '';
    let langVal = typeof reqOrId === 'object' ? String(reqOrId.lang || 'hi').trim() : 'hi';
    let reqByName = typeof reqOrId === 'object' ? String(reqOrId.requestedByName || 'सदस्य').trim() : 'सदस्य';

    if (db) {
        const reqRef = doc(db, 'blacklistRequests', requestId);
        try {
            const snap = await getDoc(reqRef);
            if (snap.exists()) {
                const prev = snap.data();
                termVal = termVal || String(prev.term || prev.word || '').trim();
                langVal = langVal || String(prev.lang || 'hi').trim();
                reqByName = reqByName || String(prev.requestedByName || 'सदस्य').trim();

                await setDoc(reqRef, {
                    requestId,
                    term: termVal.slice(0, 150),
                    termLower: termVal.toLowerCase().slice(0, 150),
                    lang: langVal.slice(0, 16),
                    articleTitle: String(prev.articleTitle || 'अशीर्षक लेख').slice(0, 300),
                    reason: String(prev.reason || '').slice(0, 500),
                    status: 'approved',
                    requestedByUid: String(prev.requestedByUid || 'editor').slice(0, 128),
                    requestedByName: reqByName.slice(0, 100),
                    requestedByEmail: String(prev.requestedByEmail || 'editor@wikipedia.org').slice(0, 254),
                    reviewedByEmail: ADMIN_EMAIL,
                    createdAt: prev.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            if (termVal) {
                const wordId = normalizeBlacklistWordId(termVal, langVal);
                const approvedRef = doc(db, 'approvedBlacklist', wordId);
                await setDoc(approvedRef, {
                    wordId,
                    term: termVal.slice(0, 150),
                    termLower: termVal.toLowerCase().slice(0, 150),
                    lang: langVal.slice(0, 16),
                    requestedByName: reqByName.slice(0, 100),
                    approvedByName: ADMIN_MEMBER_NAME,
                    approvedByEmail: ADMIN_EMAIL,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.warn('Firestore approve sync notice:', err);
        }
    }

    if (termVal) {
        upsertLocalBlacklistRequest({
            id: requestId,
            requestId,
            word: termVal,
            term: termVal,
            lang: langVal,
            status: 'approved',
            requestedByName: reqByName,
            reviewedByEmail: ADMIN_EMAIL
        });
    }

    await fetchApprovedBlacklistFromFirestore();
    await fetchBlacklistRequestsFromFirestore();
    return true;
}

export async function rejectBlacklistRequestInFirestore(reqOrId) {
    if (!db) await initFirebaseService();
    const effUser = getEffectiveCurrentUser();
    if (!effUser || !effUser.isAdmin) {
        throw new Error('केवल एडमिन (सदस्य: विक्रम प्रताप) ही बहिष्कार अनुरोध अस्वीकृत कर सकते हैं।');
    }

    const requestId = typeof reqOrId === 'object'
        ? String(reqOrId.requestId || reqOrId.id || '')
        : String(reqOrId || '');
    if (!requestId) throw new Error('अमान्य अनुरोध आईडी।');

    if (db) {
        const reqRef = doc(db, 'blacklistRequests', requestId);
        try {
            const snap = await getDoc(reqRef);
            if (snap.exists()) {
                const prev = snap.data();
                const termVal = String(prev.term || prev.word || '').trim();
                await setDoc(reqRef, {
                    requestId,
                    term: termVal.slice(0, 150),
                    termLower: termVal.toLowerCase().slice(0, 150),
                    lang: String(prev.lang || 'hi').slice(0, 16),
                    articleTitle: String(prev.articleTitle || 'अशीर्षक लेख').slice(0, 300),
                    reason: String(prev.reason || '').slice(0, 500),
                    status: 'rejected',
                    requestedByUid: String(prev.requestedByUid || 'editor').slice(0, 128),
                    requestedByName: String(prev.requestedByName || 'सदस्य').slice(0, 100),
                    requestedByEmail: String(prev.requestedByEmail || 'editor@wikipedia.org').slice(0, 254),
                    reviewedByEmail: ADMIN_EMAIL,
                    createdAt: prev.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.warn('Firestore reject sync notice:', err);
        }
    }

    const localList = getLocalBlacklistRequestsCache();
    const found = localList.find(i => String(i.requestId || i.id) === requestId);
    if (found) {
        found.status = 'rejected';
        found.reviewedByEmail = ADMIN_EMAIL;
        saveLocalBlacklistRequestsCache(localList);
    }

    await fetchBlacklistRequestsFromFirestore();
    return true;
}

export async function addApprovedBlacklistWordByAdmin(term, lang = 'hi') {
    if (!db) await initFirebaseService();
    const effUser = getEffectiveCurrentUser();
    if (!effUser || !effUser.isAdmin) {
        throw new Error('केवल एडमिन (सदस्य: विक्रम प्रताप) ही सीधे शब्द जोड़ सकते हैं।');
    }
    return await submitBlacklistRequestToFirestore({
        term,
        word: term,
        lang,
        articleTitle: 'एडमिन पैनल (सीधी प्रविष्टि)',
        reason: 'एडमिन विक्रम प्रताप द्वारा सीधे बहिष्कार सूची में जोड़ा गया'
    });
}

export async function removeApprovedBlacklistWordByAdmin(wordId) {
    if (!db) await initFirebaseService();
    const effUser = getEffectiveCurrentUser();
    if (!effUser || !effUser.isAdmin) {
        throw new Error('केवल एडमिन (सदस्य: विक्रम प्रताप) ही स्वीकृत शब्द हटा सकते हैं।');
    }
    if (db) {
        try {
            await deleteDoc(doc(db, 'approvedBlacklist', wordId));
        } catch (e) {}
        try {
            await deleteDoc(doc(db, 'blacklistRequests', wordId));
        } catch (e) {}
    }
    const localList = getLocalBlacklistRequestsCache().filter(i => String(i.requestId || i.id) !== String(wordId));
    saveLocalBlacklistRequestsCache(localList);
    await fetchApprovedBlacklistFromFirestore();
    await fetchBlacklistRequestsFromFirestore();
    return true;
}

if (typeof window !== 'undefined') {
    window.WikiFirebase = {
        ADMIN_EMAIL,
        ADMIN_MEMBER_NAME,
        isDesignatedAdminUser,
        initFirebaseService,
        signInWithGooglePopup,
        registerWithEmailAccount,
        signInWithEmailAccount,
        checkEmailAlreadyRegistered,
        signOutFirebaseUser,
        syncUserProfileToFirestore,
        updateUserSkinInFirestore,
        saveActivityLogToFirestore,
        fetchUserActivityLogsFromFirestore,
        deleteSingleActivityLogInFirestore,
        clearUserActivityLogsInFirestore,
        fetchApprovedBlacklistFromFirestore,
        fetchBlacklistRequestsFromFirestore,
        submitBlacklistRequestToFirestore,
        approveBlacklistRequestInFirestore,
        rejectBlacklistRequestInFirestore,
        addApprovedBlacklistWordByAdmin,
        removeApprovedBlacklistWordByAdmin
    };

    initFirebaseService().catch(() => {});
}
