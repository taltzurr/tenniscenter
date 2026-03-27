const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const ALLOWED_ROLES = ['supervisor', 'centerManager'];

// SMTP credentials via environment variables
// Set via .env file in functions/ directory or Firebase Console
// For Microsoft 365 / Outlook: use the org email + app password
// For Gmail / Google Workspace: use email + app password
function getSmtpConfig() {
    const email = process.env.SMTP_EMAIL;
    const password = process.env.SMTP_PASSWORD;
    if (!email || !password) return null;
    // Auto-detect provider from email domain
    const host = process.env.SMTP_HOST || null;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : null;
    return { email, password, host, port };
}

function createTransporter(email, password, host, port) {
    // If explicit host/port provided, use them
    if (host) {
        return nodemailer.createTransport({
            host,
            port: port || 587,
            secure: port === 465,
            auth: { user: email, pass: password },
        });
    }
    // Auto-detect: Microsoft 365 for common org domains
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && !domain.includes('gmail') && !domain.includes('google')) {
        // Default to Microsoft 365 SMTP (covers outlook.com, hotmail, and org domains on M365)
        return nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: { user: email, pass: password },
            tls: { ciphers: 'SSLv3' },
        });
    }
    // Gmail / Google Workspace
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: email, pass: password },
    });
}

function getEmailTemplate(type, link, recipientName) {
    const name = recipientName || '';
    const greeting = name ? `שלום ${name},` : 'שלום,';

    const templates = {
        welcome: {
            subject: 'ברוכים הבאים למערכת ניהול הטניס - איגוד הטניס הישראלי',
            html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f9fd;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f9fd;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#1a4a6e 0%,#3d7db5 100%);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">מערכת ניהול אימוני טניס</h1>
    <p style="margin:8px 0 0;color:#b0dbf2;font-size:14px;">איגוד הטניס הישראלי</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 16px;color:#1a4a6e;font-size:20px;font-weight:700;">ברוכים הבאים!</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">${greeting}</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
      הוזמנת להצטרף למערכת ניהול אימוני הטניס של איגוד הטניס הישראלי.
      כדי להתחיל, לחץ על הכפתור למטה כדי להגדיר את הסיסמה שלך ולהיכנס למערכת.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 32px;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#3d7db5 0%,#1a4a6e 100%);color:#ffffff;font-size:16px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;">
        הגדרת סיסמה וכניסה למערכת
      </a>
    </td></tr></table>
    <div style="background:#f4f9fd;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        <strong style="color:#374151;">שים לב:</strong> הקישור תקף ל-24 שעות בלבד. אם פג תוקפו, פנה למנהל המערכת לקבלת קישור חדש.
      </p>
    </div>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
      אם לא ביקשת להצטרף למערכת, אפשר להתעלם מהודעה זו.
    </p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">איגוד הטניס הישראלי &copy; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
        },
        resetPassword: {
            subject: 'איפוס סיסמה - מערכת ניהול אימוני טניס',
            html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f9fd;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f9fd;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#1a4a6e 0%,#3d7db5 100%);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">מערכת ניהול אימוני טניס</h1>
    <p style="margin:8px 0 0;color:#b0dbf2;font-size:14px;">איגוד הטניס הישראלי</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 16px;color:#1a4a6e;font-size:20px;font-weight:700;">איפוס סיסמה</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">${greeting}</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
      קיבלנו בקשה לאיפוס הסיסמה שלך במערכת ניהול אימוני הטניס.
      לחץ על הכפתור למטה כדי לבחור סיסמה חדשה.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 32px;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#3d7db5 0%,#1a4a6e 100%);color:#ffffff;font-size:16px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;">
        איפוס סיסמה
      </a>
    </td></tr></table>
    <div style="background:#f4f9fd;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        <strong style="color:#374151;">שים לב:</strong> הקישור תקף ל-24 שעות בלבד. אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהודעה זו.
      </p>
    </div>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
      אם לא ביקשת לאפס את הסיסמה, הסיסמה הנוכחית שלך תישאר ללא שינוי.
    </p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">איגוד הטניס הישראלי &copy; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
        },
    };
    return templates[type];
}

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
 * sendCustomResetEmail — generates a password reset link and sends a professional HTML email.
 * Used for "forgot password" flow.
 *
 * Input: { email: string }
 * Returns: { success: true }
 */
exports.sendCustomResetEmail = onCall(async (request) => {
    const { email } = request.data;
    if (!email) {
        throw new HttpsError('invalid-argument', 'email is required');
    }

    const smtp = getSmtpConfig();
    if (!smtp) {
        throw new HttpsError('failed-precondition', 'SMTP not configured — use Firebase built-in email');
    }

    try {
        let displayName = '';
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            displayName = userRecord.displayName || '';
        } catch (_) { /* ok */ }

        const actionCodeSettings = { url: 'https://tennis-centers.web.app/reset-password' };
        const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
        const template = getEmailTemplate('resetPassword', link, displayName);

        const transporter = createTransporter(smtp.email, smtp.password, smtp.host, smtp.port);
        await transporter.sendMail({
            from: `"מערכת ניהול טניס - איגוד הטניס" <${smtp.email}>`,
            to: email,
            subject: template.subject,
            html: template.html,
        });
        return { success: true };
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'משתמש לא נמצא');
        }
        console.error('sendCustomResetEmail error:', err);
        throw new HttpsError('internal', err.message);
    }
});

/**
 * sendCustomWelcomeEmail — generates a welcome link and sends a professional HTML email.
 * Used for user invitation flow.
 *
 * Input: { email: string, displayName?: string }
 * Returns: { success: true }
 */
exports.sendCustomWelcomeEmail = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerRole = await getCallerRole(request.auth.uid);
    if (!ALLOWED_ROLES.includes(callerRole)) {
        throw new HttpsError('permission-denied', 'Only supervisors and center managers can send invitations');
    }

    const { email, displayName } = request.data;
    if (!email) {
        throw new HttpsError('invalid-argument', 'email is required');
    }

    const smtp = getSmtpConfig();
    if (!smtp) {
        throw new HttpsError('failed-precondition', 'SMTP not configured — use Firebase built-in email');
    }

    try {
        let name = displayName || '';
        if (!name) {
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                name = userRecord.displayName || '';
            } catch (_) { /* ok */ }
        }

        const actionCodeSettings = { url: 'https://tennis-centers.web.app/welcome' };
        const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
        const template = getEmailTemplate('welcome', link, name);

        const transporter = createTransporter(smtp.email, smtp.password, smtp.host, smtp.port);
        await transporter.sendMail({
            from: `"מערכת ניהול טניס - איגוד הטניס" <${smtp.email}>`,
            to: email,
            subject: template.subject,
            html: template.html,
        });
        return { success: true };
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'משתמש לא נמצא');
        }
        console.error('sendCustomWelcomeEmail error:', err);
        throw new HttpsError('internal', err.message);
    }
});

/**
 * generatePasswordResetLink — generates a password reset link without sending an email.
 * Used as fallback when email delivery is unreliable.
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
            ? { url: 'https://tennis-centers.web.app/welcome' }
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
