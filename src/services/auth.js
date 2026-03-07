import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
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

    // Block deactivated users
    if (userData && userData.isActive === false) {
        await firebaseSignOut(auth);
        const error = new Error('User is disabled');
        error.code = 'auth/user-disabled';
        throw error;
    }

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
    await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
    });
}

/**
 * Verify a password reset code is valid
 * @param {string} code - The oobCode from the reset email link
 * @returns {Promise<string>} The email address associated with the code
 */
export async function verifyResetCode(code) {
    return await verifyPasswordResetCode(auth, code);
}

/**
 * Confirm password reset with new password
 * @param {string} code - The oobCode from the reset email link
 * @param {string} newPassword - The new password
 * @returns {Promise<void>}
 */
export async function confirmReset(code, newPassword) {
    await confirmPasswordReset(auth, code, newPassword);
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
 * Subscribe to auth state changes.
 * Each call to the callback is guarded by a cancellation token so that
 * stale async results (from an in-flight getUserData) are silently dropped
 * when a newer auth event or a manual login supersedes them.
 *
 * @param {function} callback - receives { user, userData }
 * @param {function} getIsCancelled - returns true when this listener should stop dispatching
 * @returns {function} Unsubscribe function
 */
export function onAuthChange(callback, getIsCancelled) {
    // Sequence counter: each onAuthStateChanged event gets its own slot.
    // Only the latest slot may dispatch to the callback.
    let latestSeq = 0;

    return onAuthStateChanged(auth, async (user) => {
        // If the store has told us to stop (e.g. during manual login), skip entirely.
        if (getIsCancelled && getIsCancelled()) return;

        const mySeq = ++latestSeq;

        if (user) {
            let userData = null;
            try {
                userData = await getUserData(user.uid);
            } catch (err) {
                console.error('[Auth] getUserData failed, proceeding with null userData:', err);
            }
            // Drop stale results
            if (mySeq !== latestSeq) return;
            if (getIsCancelled && getIsCancelled()) return;
            callback({ user, userData });
        } else {
            if (mySeq !== latestSeq) return;
            if (getIsCancelled && getIsCancelled()) return;
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
