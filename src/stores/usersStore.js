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
import { db } from '../services/firebase';
import firebaseConfig from '../config/firebase';
import { resetPassword } from '../services/auth';
import { ROLES } from '../config/constants';

// Initial Mock Users
const MOCK_USERS = [
    {
        id: 'demo-coach-1',
        email: 'coach@demo.com',
        displayName: 'יוסי כהן',
        role: ROLES.COACH,
        centerIds: ['center-1'],
        phone: '050-1234567',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'demo-manager-1',
        email: 'manager@demo.com',
        displayName: 'דני לוי',
        role: ROLES.CENTER_MANAGER,
        centerIds: ['center-1'],
        phone: '052-7654321',
        isActive: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'demo-supervisor-1',
        email: 'supervisor@demo.com',
        displayName: 'מיכל אברהם',
        role: ROLES.SUPERVISOR,
        centerIds: [], // Supervisors might not be bound to a center or bound to all
        phone: '054-9876543',
        isActive: true,
        createdAt: new Date().toISOString()
    },
];

const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    return !apiKey || apiKey === 'YOUR_API_KEY';
};

const useUsersStore = create((set, get) => ({
    users: [],
    isLoading: false,
    error: null,
    isDemoMode: isDemoMode(),

    fetchUsers: async () => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 600));
            // In a real app we might want to persist changes in demo mode too, but for now reset to defaults is okay
            // or checking if we have local modifications could be added.
            // For simplicity, we just return MOCK_USERS.
            // A better approach for "Management" demo is to keep state in memory if we want to see immediate updates.
            if (get().users.length === 0) {
                set({ users: MOCK_USERS, isLoading: false });
            } else {
                set({ isLoading: false }); // Keep existing memory users
            }
            return;
        }

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

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const { onboardingMethod, initialPassword, ...profileData } = processedData;
            const newUser = {
                id: `demo-user-${Date.now()}`,
                ...profileData
            };
            set(state => ({
                users: [...state.users, newUser],
                isLoading: false
            }));
            return { success: true };
        }

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

            // If invitation flow, send a password-reset email so the user can set their own password
            if (onboardingMethod === 'invitation') {
                await resetPassword(profileData.email);
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

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            set(state => ({
                users: state.users.map(user =>
                    user.id === uid ? { ...user, ...updates } : user
                ),
                isLoading: false
            }));
            return { success: true };
        }

        try {
            const userRef = doc(db, 'users', uid);

            // Sync managedCenterId for center managers if role or center is updated
            const processedUpdates = { ...updates };
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

    resendInvitation: async (email) => {
        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true };
        }
        try {
            await resetPassword(email);
            return { success: true };
        } catch (error) {
            console.error('Error resending invitation:', error);
            return { success: false, error: error.message };
        }
    },

    deleteUser: async (uid) => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            set(state => ({
                users: state.users.filter(user => user.id !== uid),
                isLoading: false
            }));
            return { success: true };
        }

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
