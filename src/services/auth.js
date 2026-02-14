import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Sign in with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object, userData: object}>}
 */
export async function signIn(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userData = await getUserData(userCredential.user.uid);
    return { user: userCredential.user, userData };
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut() {
    await firebaseSignOut(auth);
}

/**
 * Send password reset email
 * @param {string} email 
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
}

/**
 * Get user data from Firestore
 * @param {string} uid 
 * @returns {Promise<object|null>}
 */
export async function getUserData(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
}

/**
 * Version counter to discard stale async callbacks from onAuthStateChanged.
 * When login() completes, it bumps this counter so any in-flight listener
 * callbacks (which are still awaiting getUserData) will be discarded.
 */
let _authChangeVersion = 0;

/**
 * Bump the version counter to invalidate any pending onAuthStateChanged callbacks.
 * Call this after login completes to prevent the listener from overwriting
 * the state that login() just set.
 */
export function invalidatePendingAuthCallbacks() {
    _authChangeVersion++;
}

/**
 * Subscribe to auth state changes
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
        const myVersion = ++_authChangeVersion;
        if (user) {
            const userData = await getUserData(user.uid);
            // If the version changed while we were fetching, a newer event
            // (or a login() call) has taken over — discard this stale result
            if (myVersion !== _authChangeVersion) return;
            callback({ user, userData });
        } else {
            if (myVersion !== _authChangeVersion) return;
            callback({ user: null, userData: null });
        }
    });
}

/**
 * Update user data in Firestore
 * @param {string} uid 
 * @param {object} data 
 * @returns {Promise<void>}
 */
export async function updateUserData(uid, data) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}
