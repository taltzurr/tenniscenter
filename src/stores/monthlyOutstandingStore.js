import { create } from 'zustand';
import {
    getMonthlyOutstanding,
    getMonthlyOutstandingByCenter,
    saveMonthlyOutstanding,
    deleteMonthlyOutstanding
} from '../services/monthlyOutstanding';

const useMonthlyOutstandingStore = create((set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    /**
     * Fetch all outstanding entries for a given month
     */
    fetchOutstanding: async (year, month) => {
        set({ isLoading: true, error: null });
        try {
            const items = await getMonthlyOutstanding(year, month);
            set({ items, isLoading: false });
            return items;
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return [];
        }
    },

    /**
     * Fetch outstanding entries for a specific center
     */
    fetchOutstandingByCenter: async (year, month, centerId) => {
        set({ isLoading: true, error: null });
        try {
            const items = await getMonthlyOutstandingByCenter(year, month, centerId);
            set({ items, isLoading: false });
            return items;
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return [];
        }
    },

    /**
     * Save an outstanding entry (upserts)
     */
    saveOutstanding: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveMonthlyOutstanding(data);
            // Update local items list
            set(state => {
                const existingIndex = state.items.findIndex(
                    item => item.type === saved.type &&
                        item.centerId === saved.centerId
                );
                const newItems = [...state.items];
                if (existingIndex >= 0) {
                    newItems[existingIndex] = saved;
                } else {
                    newItems.push(saved);
                }
                return { items: newItems, isLoading: false };
            });
            return { success: true, data: saved };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    /**
     * Delete an outstanding entry
     */
    removeOutstanding: async (docId) => {
        set({ isLoading: true, error: null });
        try {
            await deleteMonthlyOutstanding(docId);
            set(state => ({
                items: state.items.filter(item => item.id !== docId),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    /**
     * Helper: get outstanding by type from current items
     */
    getByType: (type, centerId) => {
        const { items } = get();
        if (centerId) {
            return items.find(i => i.type === type && i.centerId === centerId) || null;
        }
        return items.find(i => i.type === type) || null;
    },

    clearError: () => set({ error: null })
}));

export default useMonthlyOutstandingStore;
