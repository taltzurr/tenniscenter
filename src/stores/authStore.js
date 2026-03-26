import { create } from 'zustand';
import { onAuthChange, signIn, signOut } from '../services/auth';

const useAuthStore = create((set, get) => ({
    // State
    user: null,
    userData: null,
    isLoading: true,
    error: null,

    // Internal flag: while true, the onAuthChange listener will not dispatch
    _isLoggingIn: false,

    // Actions
    initialize: () => {
        // Pass a getter so the listener can check if login is in progress
        const getIsCancelled = () => get()._isLoggingIn;

        const unsubscribe = onAuthChange(({ user, userData }) => {
            const current = get();

            // While manual login is running, the listener must not interfere
            if (current._isLoggingIn) return;

            // Safety net: don't replace valid userData with null for the same user
            // (can happen transiently if Firestore is slow)
            if (
                user &&
                !userData &&
                current.user &&
                current.userData &&
                current.user.uid === user.uid
            ) {
                return;
            }

            set({ user, userData, isLoading: false });
        }, getIsCancelled);

        return unsubscribe;
    },

    login: async (email, password) => {
        // Do NOT set global isLoading — it causes App.jsx to unmount LoginPage
        // (same issue that was fixed for sendPasswordReset). LoginPage has its own
        // local loading state for the submit button.
        set({ error: null, _isLoggingIn: true });

        try {
            const { user, userData } = await signIn(email, password);

            if (!userData) {
                console.error('[Auth] No Firestore document for uid:', user.uid);
                throw new Error('no-user-document');
            }

            set({ user, userData, _isLoggingIn: false });
            return { success: true };
        } catch (error) {
            console.error('[Auth] Login error:', error.code, error.message);
            set({ error: error.message, _isLoggingIn: false });
            return { success: false, error: error.code || error.message };
        }
    },

    logout: async () => {
        set({ isLoading: true });

        try {
            await signOut();
            set({ user: null, userData: null, isLoading: false });
        } catch (error) {
            // Even if Firebase signout fails, clear local state
            set({ user: null, userData: null, error: error.message, isLoading: false });
        }
    },

    sendPasswordReset: async (email) => {
        // Do NOT touch global isLoading — it causes App.jsx to unmount all routes
        try {
            const { resetPassword } = await import('../services/auth');
            await resetPassword(email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.code || error.message };
        }
    },

    changePassword: async (currentPassword, newPassword) => {
        try {
            const { changePassword } = await import('../services/auth');
            await changePassword(currentPassword, newPassword);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.code || error.message };
        }
    },

    clearError: () => set({ error: null }),

    updateProfile: async (data) => {
        set({ error: null });
        try {
            const { user, userData } = get();
            if (!user) throw new Error('No user logged in');

            const { updateUserData } = await import('../services/auth');
            await updateUserData(user.uid, data);
            set({ userData: { ...userData, ...data } });
            return { success: true };
        } catch (error) {
            set({ error: error.message });
            return { success: false, error: error.code || error.message };
        }
    },

    // Computed getters
    isAuthenticated: () => get().user !== null,
    getRole: () => get().userData?.role || null,
    isSupervisor: () => get().userData?.role === 'supervisor',
    isCenterManager: () => get().userData?.role === 'centerManager',
    isCoach: () => get().userData?.role === 'coach',
}));

export default useAuthStore;
