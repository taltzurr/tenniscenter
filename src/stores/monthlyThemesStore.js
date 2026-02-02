import { create } from 'zustand';
import { getMonthlyTheme, saveMonthlyTheme } from '../services/monthlyThemes';

const useMonthlyThemesStore = create((set, get) => ({
    currentTheme: null, // Theme for the selected/current month
    isLoading: false,
    error: null,

    // Fetch theme for a specific month
    fetchTheme: async (year, month) => {
        set({ isLoading: true, error: null });
        try {
            const theme = await getMonthlyTheme(year, month);
            set({ currentTheme: theme, isLoading: false });
            return theme;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    // Save theme
    saveTheme: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveMonthlyTheme(data);
            set({ currentTheme: saved, isLoading: false });
            return { success: true, theme: saved };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    clearError: () => set({ error: null })
}));

export default useMonthlyThemesStore;
