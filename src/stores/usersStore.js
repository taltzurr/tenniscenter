import { create } from 'zustand';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../services/firebase';
import firebaseConfig from '../config/firebase';
import { resetPassword, sendWelcomeEmail } from '../services/auth';
import { ROLES } from '../config/constants';

const useUsersStore = create((set, get) => ({
    users: [],
    isLoading: false,
    error: null,

    fetchUsers: async () => {
        set({ isLoading: true, error: null });

        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            set({ users, isLoading: false });
        } catch (error) {
            console.error('Error fetching users:', error);
            set({ error: error.message, isLoading: false });
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

        // Sync managedCenterId for center managers
        if (processedData.role === ROLES.CENTER_MANAGER && processedData.centerIds.length > 0) {
            processedData.managedCenterId = processedData.centerIds[0];
        }
        // Remove legacy single centerId if present in processedData to keep it clean
        delete processedData.centerId;

        try {
            const { onboardingMethod, initialPassword, ...profileData } = processedData;

            // Determine password for the new Auth account
            const password = onboardingMethod === 'invitation'
                ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + '!A1'
                : initialPassword;

            // Create Firebase Auth account using a secondary app instance so the admin's
            // session is not affected (Firebase signs you in when you create a user).
            const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
            const secondaryAuth = getAuth(secondaryApp);
            let uid;
            try {
                const credential = await createUserWithEmailAndPassword(secondaryAuth, profileData.email, password);
                uid = credential.user.uid;
            } finally {
                await secondarySignOut(secondaryAuth).catch(() => {});
                await deleteApp(secondaryApp).catch(() => {});
            }

            // Create matching Firestore document using the real Auth UID
            await setDoc(doc(db, 'users', uid), profileData);
            const newUser = { id: uid, ...profileData };

            // If invitation flow, send a welcome email so the user can set their own password
            if (onboardingMethod === 'invitation') {
                await sendWelcomeEmail(profileData.email);
            }

            set(state => ({
                users: [...state.users, newUser],
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error adding user:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    updateUser: async (uid, updates) => {
        set({ isLoading: true, error: null });

        try {
            const userRef = doc(db, 'users', uid);

            // Sync managedCenterId for center managers if role or center is updated
            const processedUpdates = { ...updates };
            // Remove transient form fields that shouldn't be stored
            delete processedUpdates.centerId;
            delete processedUpdates.onboardingMethod;
            delete processedUpdates.initialPassword;
            if (processedUpdates.role === ROLES.CENTER_MANAGER && processedUpdates.centerIds && processedUpdates.centerIds.length > 0) {
                processedUpdates.managedCenterId = processedUpdates.centerIds[0];
            }

            await updateDoc(userRef, processedUpdates);
            set(state => ({
                users: state.users.map(user =>
                    user.id === uid ? { ...user, ...processedUpdates } : user
                ),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error updating user:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    generateResetLink: async (email) => {
        try {
            const fn = httpsCallable(getFunctions(), 'generatePasswordResetLink');
            const result = await fn({ email });
            return { success: true, link: result.data.link };
        } catch (error) {
            console.error('Error generating reset link:', error);
            return { success: false, error: error.message };
        }
    },

    resendInvitation: async (email) => {
        try {
            await sendWelcomeEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Error resending invitation:', error);
            return { success: false, error: error.message };
        }
    },

    deleteUser: async (uid) => {
        set({ isLoading: true, error: null });

        try {
            // Delete Firestore document (Firebase Auth account cleanup requires Admin SDK /
            // Cloud Functions with Blaze plan — handled separately when available)
            await deleteDoc(doc(db, 'users', uid));
            set(state => ({
                users: state.users.filter(user => user.id !== uid),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    }
}));

export default useUsersStore;
