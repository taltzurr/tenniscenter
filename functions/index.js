const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

const ALLOWED_ROLES = ['supervisor', 'centerManager'];

async function getCallerRole(uid) {
    const doc = await admin.firestore().collection('users').doc(uid).get();
    return doc.exists ? doc.data()?.role : null;
}

/**
 * createUser — creates a Firebase Auth account for a new user.
 * Called by the admin when adding a user from the Users management page.
 *
 * Input: { email: string, password: string, displayName: string }
 * Returns: { uid: string }
 */
exports.createUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerRole = await getCallerRole(request.auth.uid);
    if (!ALLOWED_ROLES.includes(callerRole)) {
        throw new HttpsError('permission-denied', 'Only supervisors and center managers can create users');
    }

    const { email, password, displayName } = request.data;

    if (!email || !password || !displayName) {
        throw new HttpsError('invalid-argument', 'email, password, and displayName are required');
    }

    try {
        const userRecord = await admin.auth().createUser({ email, password, displayName });
        return { uid: userRecord.uid };
    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'משתמש עם אימייל זה כבר קיים');
        }
        throw new HttpsError('internal', err.message);
    }
});

/**
 * deleteUser — deletes a Firebase Auth account.
 * Called alongside the Firestore document deletion.
 *
 * Input: { uid: string }
 * Returns: { success: true }
 */
exports.deleteUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerRole = await getCallerRole(request.auth.uid);
    if (!ALLOWED_ROLES.includes(callerRole)) {
        throw new HttpsError('permission-denied', 'Only supervisors and center managers can delete users');
    }

    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'uid is required');
    }

    try {
        await admin.auth().deleteUser(uid);
        return { success: true };
    } catch (err) {
        // If the Auth account doesn't exist, treat it as success (Firestore doc can still be deleted)
        if (err.code === 'auth/user-not-found') {
            return { success: true };
        }
        throw new HttpsError('internal', err.message);
    }
});
