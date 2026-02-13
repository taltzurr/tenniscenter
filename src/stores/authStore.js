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
    'talzur07@gmail.com': {
        id: 'user-tal-tzur',
        email: 'talzur07@gmail.com',
        displayName: 'טל צור',
        role: 'supervisor',
        managedCenterId: 'center-yafo',
        isActive: true,
        _password: '123456',
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
// Note: When using Emulators, we use real Firebase Auth, not demo mode
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';
    // Demo mode only if no API key AND not using emulators
    return (!apiKey || apiKey === 'YOUR_API_KEY') && !useEmulators;
};

const useAuthStore = create((set, get) => ({
    // State
    user: null,
    userData: null,
    isLoading: true,
    error: null,
    isDemoMode: isDemoMode(),
    _isLoggingIn: false, // Prevents onAuthStateChanged from overwriting state mid-login

    // Actions
    initialize: () => {
        if (isDemoMode()) {
            // In demo mode, check localStorage for saved demo user
            const savedUser = localStorage.getItem('demoUser');
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                set({ user: { uid: userData.id }, userData, isLoading: false });
            } else {
                set({ isLoading: false });
            }
            return () => { }; // No unsubscribe needed
        }

        // Also check localStorage for demo user even in Firebase mode
        const savedDemoUser = localStorage.getItem('demoUser');
        if (savedDemoUser) {
            const userData = JSON.parse(savedDemoUser);
            set({ user: { uid: userData.id }, userData, isLoading: false });
            // Still subscribe but don't let it override demo user
        }

        const unsubscribe = onAuthChange(({ user, userData }) => {
            // Don't override state during an active login attempt
            if (get()._isLoggingIn) return;
            // Don't override demo user session
            if (!user && localStorage.getItem('demoUser')) return;
            set({ user, userData, isLoading: false });
        });
        return unsubscribe;
    },

    login: async (email, password) => {
        set({ isLoading: true, error: null, _isLoggingIn: true });

        // Always try demo users first (regardless of Firebase mode)
        const demoUser = DEMO_USERS[email.toLowerCase()];
        if (demoUser && password === demoUser._password) {
            // Strip _password before storing
            const { _password, ...userData } = demoUser;
            localStorage.setItem('demoUser', JSON.stringify(userData));
            set({
                user: { uid: userData.id },
                userData,
                isLoading: false,
                _isLoggingIn: false
            });
            return { success: true };
        }

        if (isDemoMode()) {
            // In strict demo mode (no Firebase), show help
            set({
                error: 'במצב Demo, השתמש באחד מהמשתמשים הבאים:\n• coach@demo.com\n• manager@demo.com\n• supervisor@demo.com\nסיסמה: demo123',
                isLoading: false,
                _isLoggingIn: false
            });
            return { success: false, error: 'invalid-demo-credentials' };
        }

        try {
            // Sign in with Firebase - this will trigger onAuthStateChanged
            const { user, userData } = await signIn(email, password);

            // Ensure userData exists before allowing navigation
            if (!userData) {
                throw new Error('לא נמצאו נתוני משתמש. אנא פנה למנהל המערכת.');
            }

            // Set the state with user and userData
            set({ user, userData, isLoading: false, _isLoggingIn: false });

            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false, _isLoggingIn: false });
            return { success: false, error: error.message };
        }
    },

    logout: async () => {
        set({ isLoading: true });

        // Always clear demo user
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
        set({ isLoading: true, error: null });
        try {
            if (isDemoMode()) {
                // Mock success in demo mode
                await new Promise(resolve => setTimeout(resolve, 1000));
                set({ isLoading: false });
                return { success: true };
            }

            const { resetPassword } = await import('../services/auth');
            await resetPassword(email);
            set({ isLoading: false });
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    clearError: () => set({ error: null }),

    updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const { user, userData } = get();
            if (!user) throw new Error('No user logged in');

            if (isDemoMode()) {
                // Mock success in demo mode
                const newUserData = { ...userData, ...data };
                // Also update settings deeply if needed, but for now simple merge
                if (data.settings && userData.settings) {
                    newUserData.settings = { ...userData.settings, ...data.settings };
                }

                // Persist to local storage if it's the current demo user
                if (localStorage.getItem('demoUser')) {
                    const currentStored = JSON.parse(localStorage.getItem('demoUser'));
                    if (currentStored.id === user.uid) {
                        localStorage.setItem('demoUser', JSON.stringify({ ...currentStored, ...data, settings: newUserData.settings || currentStored.settings }));
                    }
                }

                set({
                    userData: newUserData,
                    isLoading: false
                });
                return { success: true };
            }

            const { updateUserData } = await import('../services/auth');
            await updateUserData(user.uid, data);

            set({
                userData: { ...userData, ...data },
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
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
