import { create } from 'zustand';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    limit,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut as secondarySignOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../services/firebase';
import firebaseConfig from '../config/firebase';
import { sendWelcomeEmail } from '../services/auth';
import { ROLES } from '../config/constants';

const useUsersStore = create((set, get) => ({
    users: [],
    isLoading: false,
    error: null,

    fetchUsers: async () => {
        set({ isLoading: true, error: null });

        try {
            const querySnapshot = await getDocs(query(collection(db, 'users'), limit(500)));
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            set({ users, isLoading: false });
        } catch (error) {
            console.error('Error fetching users:', error);
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    addUser: async (userData) => {
        set({ isLoading: true, error: null });

        // Ensure centerIds is an array
        const processedData = {
            ...userData,
            centerIds: Array.isArray(userData.centerIds) ? userData.centerIds : (userData.centerId ? [userData.centerId] : []),
            createdAt: new Date().toISOString(),
            isActive: true
        };

        // Center managers MUST be linked to a center
        if (processedData.role === ROLES.CENTER_MANAGER && processedData.centerIds.length === 0) {
            set({ error: 'מנהל מרכז חייב להיות משויך למרכז', isLoading: false });
            return { success: false, error: 'מנהל מרכז חייב להיות משויך למרכז' };
        }
        // Sync managedCenterId for center managers
        if (processedData.role === ROLES.CENTER_MANAGER && processedData.centerIds.length > 0) {
            processedData.managedCenterId = processedData.centerIds[0];
        }
        delete processedData.centerId;

        try {
            const { onboardingMethod, initialPassword, ...profileData } = processedData;

            const password = onboardingMethod === 'invitation'
                ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + '!A1'
                : initialPassword;

            // Try creating a new Auth account
            const createAuthAccount = async () => {
                const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
                const secondaryAuth = getAuth(secondaryApp);
                try {
                    const credential = await createUserWithEmailAndPassword(secondaryAuth, profileData.email, password);
                    if (profileData.displayName) {
                        await updateProfile(credential.user, { displayName: profileData.displayName }).catch(() => {});
                    }
                    return credential.user.uid;
                } finally {
                    await secondarySignOut(secondaryAuth).catch(() => {});
                    await deleteApp(secondaryApp).catch(() => {});
                }
            };

            let uid;
            try {
                uid = await createAuthAccount();
            } catch (authError) {
                if (authError.code === 'auth/email-already-in-use') {
                    // Check if this is an orphaned Auth account (deleted from UI but Auth remained)
                    // Look up the saved UID in deletedUsers collection
                    const orphanQuery = query(
                        collection(db, 'deletedUsers'),
                        where('email', '==', profileData.email)
                    );
                    const orphanSnap = await getDocs(orphanQuery);

                    if (!orphanSnap.empty) {
                        // Found orphan record — reuse the existing Auth account
                        uid = orphanSnap.docs[0].id;
                        // Clean up the orphan record
                        await deleteDoc(doc(db, 'deletedUsers', uid));
                    } else {
                        // No orphan record — try Cloud Function cleanup as fallback
                        try {
                            const cleanupFn = httpsCallable(getFunctions(), 'deleteUserByEmail');
                            await cleanupFn({ email: profileData.email });
                            uid = await createAuthAccount();
                        } catch {
                            throw authError;
                        }
                    }
                } else {
                    throw authError;
                }
            }

            // Create Firestore document with the Auth UID
            await setDoc(doc(db, 'users', uid), profileData);
            const newUser = { id: uid, ...profileData };

            // Send welcome email for invitation flow (non-blocking — user is already created)
            let emailSent = false;
            let welcomeLink = null;
            if (onboardingMethod === 'invitation') {
                try {
                    await sendWelcomeEmail(profileData.email, profileData.displayName);
                    emailSent = true;
                } catch (emailErr) {
                    console.warn('Welcome email failed (client-side):', emailErr.message);
                    // Try server-side fallback via Cloud Function
                    try {
                        const genLinkFn = httpsCallable(getFunctions(), 'generatePasswordResetLink');
                        const result = await genLinkFn({ email: profileData.email, isWelcome: true });
                        emailSent = 'link';
                        welcomeLink = result.data?.link || null;
                    } catch (cfErr) {
                        console.warn('Cloud Function link generation also failed:', cfErr.message);
                    }
                }
            }

            set(state => ({
                users: [...state.users, newUser],
                isLoading: false
            }));
            return { success: true, emailSent, welcomeLink };
        } catch (error) {
            console.error('Error adding user:', error);
            const friendlyMsg = error.code === 'auth/email-already-in-use'
                ? 'משתמש עם אימייל זה כבר קיים במערכת'
                : 'שגיאה בביצוע הפעולה';
            set({ error: friendlyMsg, isLoading: false });
            return { success: false, error: friendlyMsg };
        }
    },

    updateUser: async (uid, updates) => {
        set({ isLoading: true, error: null });

        try {
            const userRef = doc(db, 'users', uid);

            const processedUpdates = { ...updates };
            delete processedUpdates.centerId;
            delete processedUpdates.onboardingMethod;
            delete processedUpdates.initialPassword;
            // Center managers MUST be linked to a center
            if (processedUpdates.role === ROLES.CENTER_MANAGER && (!processedUpdates.centerIds || processedUpdates.centerIds.length === 0)) {
                set({ error: 'מנהל מרכז חייב להיות משויך למרכז', isLoading: false });
                return { success: false, error: 'מנהל מרכז חייב להיות משויך למרכז' };
            }
            if (processedUpdates.role === ROLES.CENTER_MANAGER && processedUpdates.centerIds && processedUpdates.centerIds.length > 0) {
                processedUpdates.managedCenterId = processedUpdates.centerIds[0];
            }

            // Update Firestore (source of truth)
            await updateDoc(userRef, processedUpdates);

            // Sync to Firebase Auth (best-effort)
            try {
                const authUpdates = {};
                if (processedUpdates.displayName) authUpdates.displayName = processedUpdates.displayName;
                if (processedUpdates.isActive === false) authUpdates.disabled = true;
                if (processedUpdates.isActive === true) authUpdates.disabled = false;

                if (Object.keys(authUpdates).length > 0) {
                    const fn = httpsCallable(getFunctions(), 'updateUserAuth');
                    await fn({ uid, ...authUpdates });
                }
            } catch (authSyncErr) {
                console.warn('Auth sync skipped (function may not be deployed):', authSyncErr.message);
            }

            set(state => ({
                users: state.users.map(user =>
                    user.id === uid ? { ...user, ...processedUpdates } : user
                ),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error updating user:', error);
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    resendInvitation: async (email, displayName) => {
        // Try Cloud Function email first (professional template)
        try {
            await sendWelcomeEmail(email, displayName);
            return { success: true, method: 'email' };
        } catch (emailErr) {
            console.warn('Client-side welcome email failed:', emailErr.message);
        }
        // Fallback: generate link via Cloud Function
        try {
            const genLinkFn = httpsCallable(getFunctions(), 'generatePasswordResetLink');
            const result = await genLinkFn({ email, isWelcome: true });
            return { success: true, method: 'link', link: result.data.link };
        } catch (cfErr) {
            console.error('Both email and link generation failed:', cfErr);
            return { success: false, error: 'שגיאה בשליחת ההזמנה. נסה שוב מאוחר יותר.' };
        }
    },

    deleteUser: async (uid) => {
        set({ isLoading: true, error: null });

        try {
            // Get user data BEFORE deleting so we can save email→UID mapping
            const currentUser = get().users.find(u => u.id === uid);

            // Save email→UID mapping in deletedUsers collection FIRST
            // This allows re-adding the same email later without Cloud Functions
            if (currentUser?.email) {
                await setDoc(doc(db, 'deletedUsers', uid), {
                    email: currentUser.email,
                    deletedAt: new Date().toISOString(),
                });
            }

            // Delete Firestore user document BEFORE Auth (source of truth for UI)
            await deleteDoc(doc(db, 'users', uid));

            // Try to delete Auth account via Cloud Function (best-effort)
            try {
                const fn = httpsCallable(getFunctions(), 'deleteUser');
                await fn({ uid });
                // Auth deleted successfully — remove the orphan record
                if (currentUser?.email) {
                    await deleteDoc(doc(db, 'deletedUsers', uid)).catch(() => {});
                }
            } catch (authErr) {
                // Cloud Function not deployed — orphan record stays for recovery on next add
                console.warn('Auth account not deleted (Cloud Functions not deployed). Orphan record saved for recovery.');
            }
            set(state => ({
                users: state.users.filter(user => user.id !== uid),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    }
}));

export default useUsersStore;
