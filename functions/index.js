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
/**
 * generatePasswordResetLink — generates a password reset link without sending an email.
 * Used for internal systems where email delivery is unreliable.
 *
 * Input: { email: string }
 * Returns: { link: string }
 */
exports.generatePasswordResetLink = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerRole = await getCallerRole(request.auth.uid);
    if (!ALLOWED_ROLES.includes(callerRole)) {
        throw new HttpsError('permission-denied', 'Only supervisors and center managers can generate reset links');
    }

    const { email, isWelcome } = request.data;
    if (!email) {
        throw new HttpsError('invalid-argument', 'email is required');
    }

    try {
        const actionCodeSettings = isWelcome
            ? { url: 'https://tennis-training-app-gemini.web.app/welcome' }
            : undefined;
        const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
        return { link };
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'משתמש לא נמצא');
        }
        throw new HttpsError('internal', err.message);
    }
});

/**
 * updateUserAuth — updates Firebase Auth user profile fields.
 * Keeps Auth in sync with Firestore after edits (displayName, disabled status).
 *
 * Input: { uid: string, displayName?: string, disabled?: boolean }
 * Returns: { success: true }
 */
exports.updateUserAuth = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerRole = await getCallerRole(request.auth.uid);
    if (!ALLOWED_ROLES.includes(callerRole)) {
        throw new HttpsError('permission-denied', 'Only supervisors and center managers can update users');
    }

    const { uid, displayName, disabled } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'uid is required');
    }

    try {
        const updatePayload = {};
        if (displayName !== undefined) updatePayload.displayName = displayName;
        if (disabled !== undefined) updatePayload.disabled = disabled;

        if (Object.keys(updatePayload).length > 0) {
            await admin.auth().updateUser(uid, updatePayload);
        }
        return { success: true };
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            return { success: true }; // User doesn't exist in Auth, nothing to update
        }
        throw new HttpsError('internal', err.message);
    }
});

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
        if (err.code === 'auth/user-not-found') {
            return { success: true };
        }
        throw new HttpsError('internal', err.message);
    }
});

/**
 * deleteUserByEmail — deletes a Firebase Auth account by email.
 * Used to clean up orphaned Auth accounts (e.g., Firestore doc was deleted
 * but Auth account remained).
 *
 * Input: { email: string }
 * Returns: { success: true }
 */
exports.deleteUserByEmail = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerRole = await getCallerRole(request.auth.uid);
    if (!ALLOWED_ROLES.includes(callerRole)) {
        throw new HttpsError('permission-denied', 'Only supervisors and center managers can delete users');
    }

    const { email } = request.data;
    if (!email) {
        throw new HttpsError('invalid-argument', 'email is required');
    }

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(userRecord.uid);
        return { success: true };
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            return { success: true };
        }
        throw new HttpsError('internal', err.message);
    }
});
