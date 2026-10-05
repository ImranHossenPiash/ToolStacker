import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
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
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

// Sync User Profile in Firestore
export async function syncUserProfile(user) {
  if (!user || !user.uid) return null;
  const userRef = doc(db, 'users', user.uid);
  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      const newProfile = {
        displayName: user.displayName || user.email?.split('@')[0] || 'ToolStacker User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    } else {
      await updateDoc(userRef, {
        displayName: user.displayName || existingSnap.data().displayName || 'ToolStacker User',
        photoURL: user.photoURL || existingSnap.data().photoURL || '',
        updatedAt: serverTimestamp()
      });
      return { ...existingSnap.data(), displayName: user.displayName || existingSnap.data().displayName };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
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
// If authenticated: Saves to Firestore subcollection /users/{userId}/savedItems/{itemId}
// If not authenticated: Saves to localStorage for guest persistence
export async function saveWorkItem({ type, title, content, summary = '', metadata = {} }) {
  const user = auth.currentUser;
  const itemId = 'work_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  
  if (user) {
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
      handleFirestoreError(error, OperationType.CREATE, itemPath);
    }
  } else {
    // Guest local storage
    const guestItems = getGuestSavedItems();
    const guestPayload = {
      id: itemId,
      userId: 'guest',
      type,
      title: title.trim().slice(0, 200),
      content: String(content).slice(0, 500000),
      summary: summary ? String(summary).slice(0, 500) : '',
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCloud: false
    };
    guestItems.unshift(guestPayload);
    // Keep max 50 local items
    localStorage.setItem('toolstacker_guest_saved_items', JSON.stringify(guestItems.slice(0, 50)));
    return guestPayload;
  }
}

// Fetch all saved works
export async function getSavedWorks() {
  const user = auth.currentUser;
  if (user) {
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
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  } else {
    return getGuestSavedItems();
  }
}

// Delete a saved work item
export async function deleteSavedWork(itemId) {
  const user = auth.currentUser;
  if (user) {
    const itemPath = `users/${user.uid}/savedItems/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedItems', itemId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, itemPath);
    }
  } else {
    const items = getGuestSavedItems().filter(item => item.id !== itemId);
    localStorage.setItem('toolstacker_guest_saved_items', JSON.stringify(items));
    return true;
  }
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
