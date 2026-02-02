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
 * Subscribe to auth state changes
 * @param {function} callback 
 * @returns {function} Unsubscribe function
 */
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userData = await getUserData(user.uid);
            callback({ user, userData });
        } else {
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
