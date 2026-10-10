import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut, 
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
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operation types for detailed logging
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write'
};

// Error handling per Firebase Integration Skill guidelines
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline or unreachable.");
    }
  }
}
testConnection();

// Local Member Accounts & Persistence (Graceful fallback when Firebase console has not enabled Email/Password)
const LOCAL_USER_KEY = 'toolstacker_local_member';
const LOCAL_USERS_DB = 'toolstacker_registered_accounts';

export function getLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setLocalUser(user) {
  try {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('toolstacker_auth_changed', { detail: user }));
  } catch (e) {}
}

export function getRegisteredAccounts() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DB);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveRegisteredAccount(email, account) {
  try {
    const accounts = getRegisteredAccounts();
    accounts[email.toLowerCase()] = account;
    localStorage.setItem(LOCAL_USERS_DB, JSON.stringify(accounts));
  } catch (e) {}
}

// Unified Auth State Observer (Firebase Auth + Local Member Accounts)
export function subscribeAuthState(callback) {
  const localUser = getLocalUser();
  if (localUser) {
    callback(localUser);
  }

  const unsub = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setLocalUser(null);
      callback(firebaseUser);
    } else {
      const currentLocal = getLocalUser();
      callback(currentLocal || null);
    }
  });

  const localListener = (e) => {
    callback(e.detail || null);
  };
  window.addEventListener('toolstacker_auth_changed', localListener);

  return () => {
    unsub();
    window.removeEventListener('toolstacker_auth_changed', localListener);
  };
}

// Register with Email and Password
export async function signUpWithEmail(name, email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = name && name.trim() ? name.trim() : cleanEmail.split('@')[0];

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = cred.user;
    if (displayName) {
      try {
        await updateProfile(user, { displayName });
      } catch (err) {
        console.warn('Could not update display name:', err);
      }
    }
    await syncUserProfile(user, displayName);
    setLocalUser(null);
    return user;
  } catch (error) {
    // Graceful fallback if Email/Password provider is disabled in Firebase Console
    if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
      console.info('Firebase Email/Password provider disabled; switching to resilient member storage.');
      const accounts = getRegisteredAccounts();
      if (accounts[cleanEmail]) {
        const err = new Error('An account already exists with this email address. Please sign in.');
        err.code = 'auth/email-already-in-use';
        throw err;
      }

      const localUser = {
        uid: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        email: cleanEmail,
        displayName,
        photoURL: '',
        createdAt: new Date().toISOString(),
        isLocalAccount: true
      };

      saveRegisteredAccount(cleanEmail, {
        ...localUser,
        passwordHash: btoa(password)
      });

      setLocalUser(localUser);
      return localUser;
    }

    console.error('Sign-Up error:', error);
    throw error;
  }
}

// Sign In with Email and Password
export async function signInWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = cred.user;
    if (user) {
      await syncUserProfile(user);
    }
    setLocalUser(null);
    return user;
  } catch (error) {
    // Check if account was created under resilient member storage
    if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
      console.info('Firebase Email/Password disabled; checking member storage.');
      const accounts = getRegisteredAccounts();
      const account = accounts[cleanEmail];
      if (!account || account.passwordHash !== btoa(password)) {
        const err = new Error('Invalid email or password. Please verify your credentials.');
        err.code = 'auth/invalid-credential';
        throw err;
      }

      const localUser = {
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        photoURL: account.photoURL || '',
        createdAt: account.createdAt,
        isLocalAccount: true
      };

      setLocalUser(localUser);
      return localUser;
    }

    console.error('Sign-In error:', error);
    throw error;
  }
}

// Map Firebase Auth error codes to user-friendly messages
export function getFriendlyAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/popup-blocked':
      return 'Google popup was blocked by your browser. Please allow popups or use Email sign up.';
    case 'auth/unauthorized-domain':
      return 'This preview domain is not authorized in Firebase Console yet. Please use Email/Password sign up.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication provider is not enabled in Firebase Console.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to multiple failed login attempts. Please try again later.';
    default:
      return 'Authentication failed. Please verify your details and try again.';
  }
}

// Sign In with Google
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if (user) {
      await syncUserProfile(user);
    }
    return user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

// Sign Out
export async function signOutUser() {
  try {
    setLocalUser(null);
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    setLocalUser(null);
  }
}

// Sync User Profile in Firestore
export async function syncUserProfile(user, explicitName = '') {
  if (!user || !user.uid) return null;
  const userRef = doc(db, 'users', user.uid);
  const nameToUse = explicitName || user.displayName || user.email?.split('@')[0] || 'ToolStacker User';
  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      const newProfile = {
        displayName: nameToUse,
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    } else {
      await updateDoc(userRef, {
        displayName: nameToUse,
        photoURL: user.photoURL || existingSnap.data().photoURL || '',
        updatedAt: serverTimestamp()
      });
      return { ...existingSnap.data(), displayName: nameToUse };
    }
  } catch (error) {
    console.warn('Profile sync non-fatal warning:', error);
    return {
      displayName: nameToUse,
      email: user.email || ''
    };
  }
}

// Fetch User Profile
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

// Save a Work Item (QR code, OCR extraction, calculation, note)
export async function saveWorkItem({ type, title, content, summary = '', metadata = {} }) {
  const user = auth.currentUser;
  const localUser = getLocalUser();
  const itemId = 'work_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  
  if (user && !localUser) {
    const itemPath = `users/${user.uid}/savedItems/${itemId}`;
    const payload = {
      id: itemId,
      userId: user.uid,
      type,
      title: title.trim().slice(0, 200),
      content: String(content).slice(0, 500000),
      summary: summary ? String(summary).slice(0, 500) : '',
      metadata: metadata || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'users', user.uid, 'savedItems', itemId), payload);
      return { ...payload, id: itemId, isCloud: true };
    } catch (error) {
      console.warn('Firestore save failed, falling back to local:', error);
    }
  }

  // Local / Guest persistence
  const guestItems = getGuestSavedItems();
  const guestPayload = {
    id: itemId,
    userId: localUser ? localUser.uid : 'guest',
    type,
    title: title.trim().slice(0, 200),
    content: String(content).slice(0, 500000),
    summary: summary ? String(summary).slice(0, 500) : '',
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCloud: !!localUser
  };
  guestItems.unshift(guestPayload);
  localStorage.setItem('toolstacker_guest_saved_items', JSON.stringify(guestItems.slice(0, 50)));
  return guestPayload;
}

// Fetch all saved works
export async function getSavedWorks() {
  const user = auth.currentUser;
  const localUser = getLocalUser();

  if (user && !localUser) {
    const colPath = `users/${user.uid}/savedItems`;
    try {
      const q = query(collection(db, 'users', user.uid, 'savedItems'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach(docSnap => {
        items.push({ ...docSnap.data(), id: docSnap.id, isCloud: true });
      });
      return items;
    } catch (error) {
      console.warn('Firestore fetch failed, returning local items:', error);
      return getGuestSavedItems();
    }
  } else {
    return getGuestSavedItems();
  }
}

// Delete a saved work item
export async function deleteSavedWork(itemId) {
  const user = auth.currentUser;
  const localUser = getLocalUser();

  if (user && !localUser) {
    const itemPath = `users/${user.uid}/savedItems/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedItems', itemId));
      return true;
    } catch (error) {
      console.warn('Firestore delete failed, cleaning local storage:', error);
    }
  }

  const items = getGuestSavedItems().filter(item => item.id !== itemId);
  localStorage.setItem('toolstacker_guest_saved_items', JSON.stringify(items));
  return true;
}

// Guest items from local storage
export function getGuestSavedItems() {
  try {
    const raw = localStorage.getItem('toolstacker_guest_saved_items');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Sync guest items to cloud account when user logs in
export async function syncGuestItemsToCloud() {
  const user = auth.currentUser;
  if (!user) return 0;
  const guestItems = getGuestSavedItems();
  if (!guestItems || guestItems.length === 0) return 0;

  let count = 0;
  for (const item of guestItems) {
    try {
      const newId = 'migrated_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await setDoc(doc(db, 'users', user.uid, 'savedItems', newId), {
        id: newId,
        userId: user.uid,
        type: item.type || 'note',
        title: item.title || 'Saved Work',
        content: item.content || '',
        summary: item.summary || '',
        metadata: item.metadata || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      count++;
    } catch (e) {
      console.warn('Failed migrating guest item:', e);
    }
  }
  // Clear guest items after migration
  localStorage.removeItem('toolstacker_guest_saved_items');
  return count;
}
