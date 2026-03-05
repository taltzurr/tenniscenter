import { create } from 'zustand';
import { onAuthChange, signIn, signOut } from '../services/auth';

// Demo users for development (when Firebase is not configured)
const DEMO_USERS = {
    'coach@demo.com': {
        id: 'demo-coach-1',
        email: 'coach@demo.com',
        displayName: 'יוסי כהן',
        role: 'coach',
        centerIds: ['center-1'],
        isActive: true,
        _password: 'demo123',
    },
    'manager@demo.com': {
        id: 'demo-manager-1',
        email: 'manager@demo.com',
        displayName: 'דני לוי',
        role: 'centerManager',
        managedCenterId: 'center-1',
        isActive: true,
        _password: 'demo123',
    },
    'supervisor@demo.com': {
        id: 'demo-supervisor-1',
        email: 'supervisor@demo.com',
        displayName: 'מיכל אברהם',
        role: 'supervisor',
        isActive: true,
        _password: 'demo123',
    },
    'talbdika@demo.com': {
        id: 'demo-coach-yafo',
        email: 'talbdika@demo.com',
        displayName: 'טל בדיקה',
        role: 'coach',
        centerIds: ['center-yafo'],
        isActive: true,
        _password: '123456',
    },
};

// Check if we're in demo mode (Firebase not configured)
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';
    return (!apiKey || apiKey === 'YOUR_API_KEY') && !useEmulators;
};

const useAuthStore = create((set, get) => ({
    // State
    user: null,
    userData: null,
    isLoading: true,
    error: null,
    isDemoMode: isDemoMode(),

    // Internal flag: while true, the onAuthChange listener will not dispatch
    _isLoggingIn: false,

    // Actions
    initialize: () => {
        if (isDemoMode()) {
            const savedUser = localStorage.getItem('demoUser');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    set({ user: { uid: userData.id }, userData, isLoading: false });
                } catch {
                    localStorage.removeItem('demoUser');
                    set({ isLoading: false });
                }
            } else {
                set({ isLoading: false });
            }
            return () => {};
        }

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
        set({ isLoading: true, error: null, _isLoggingIn: true });

        if (isDemoMode()) {
            const demoUser = DEMO_USERS[email.toLowerCase()];
            if (demoUser && password === demoUser._password) {
                const { _password, ...userData } = demoUser;
                localStorage.setItem('demoUser', JSON.stringify(userData));
                set({ user: { uid: userData.id }, userData, isLoading: false, _isLoggingIn: false });
                return { success: true };
            }
            set({
                error: 'במצב Demo, השתמש באחד מהמשתמשים הבאים:\n• coach@demo.com\n• manager@demo.com\n• supervisor@demo.com\nסיסמה: demo123',
                isLoading: false,
                _isLoggingIn: false,
            });
            return { success: false, error: 'invalid-demo-credentials' };
        }

        try {
            const { user, userData } = await signIn(email, password);

            if (!userData) {
                // Auth succeeded but no Firestore document — create a minimal fallback
                // so the user isn't locked out forever, and log it clearly
                console.error('[Auth] No Firestore document for uid:', user.uid);
                throw new Error('no-user-document');
            }

            set({ user, userData, isLoading: false, _isLoggingIn: false });
            return { success: true };
        } catch (error) {
            console.error('[Auth] Login error:', error.code, error.message);
            set({ error: error.message, isLoading: false, _isLoggingIn: false });
            // Return the Firebase error code (e.g. 'auth/invalid-credential')
            // or a plain string so LoginPage can translate it to Hebrew
            return { success: false, error: error.code || error.message };
        }
    },

    logout: async () => {
        set({ isLoading: true });
        localStorage.removeItem('demoUser');

        if (isDemoMode()) {
            set({ user: null, userData: null, isLoading: false });
            return;
        }

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
            if (isDemoMode()) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { success: true };
            }
            const { resetPassword } = await import('../services/auth');
            await resetPassword(email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.code || error.message };
        }
    },

    clearError: () => set({ error: null }),

    updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const { user, userData } = get();
            if (!user) throw new Error('No user logged in');

            if (isDemoMode()) {
                const newUserData = { ...userData, ...data };
                if (data.settings && userData.settings) {
                    newUserData.settings = { ...userData.settings, ...data.settings };
                }
                if (localStorage.getItem('demoUser')) {
                    const currentStored = JSON.parse(localStorage.getItem('demoUser'));
                    if (currentStored.id === user.uid) {
                        localStorage.setItem('demoUser', JSON.stringify({
                            ...currentStored,
                            ...data,
                            settings: newUserData.settings || currentStored.settings,
                        }));
                    }
                }
                set({ userData: newUserData, isLoading: false });
                return { success: true };
            }

            const { updateUserData } = await import('../services/auth');
            await updateUserData(user.uid, data);
            set({ userData: { ...userData, ...data }, isLoading: false });
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
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
