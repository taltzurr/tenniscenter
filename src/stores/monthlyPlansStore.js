import { create } from 'zustand';
import {
    getMonthlyPlan,
    getCoachMonthlyPlans,
    getGroupMonthlyPlans,
    saveMonthlyPlan,
    deleteMonthlyPlan,
    submitMonthlyPlan,
    approveMonthlyPlan,
    rejectMonthlyPlan,
    getPendingMonthlyPlans,
    getAllMonthlyPlans
} from '../services/monthlyPlans';

const useMonthlyPlansStore = create((set, get) => ({
    plans: [],
    currentPlan: null,
    isLoading: false,
    error: null,

    // Fetch plans for coach
    fetchCoachPlans: async (coachId, year = null) => {
        set({ isLoading: true, error: null });
        try {
            const plans = await getCoachMonthlyPlans(coachId, year);
            set({ plans, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Fetch all plans (Manager view)
    fetchAllPlans: async (year, month) => {
        set({ isLoading: true, error: null });
        try {
            const plans = await getAllMonthlyPlans(year, month);
            set({ plans, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Fetch plans for a group
    fetchGroupPlans: async (groupId) => {
        set({ isLoading: true, error: null });
        try {
            const plans = await getGroupMonthlyPlans(groupId);
            set({ plans, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Fetch single plan
    fetchPlan: async (groupId, year, month) => {
        set({ isLoading: true, error: null });
        try {
            const plan = await getMonthlyPlan(groupId, year, month);
            set({ currentPlan: plan, isLoading: false });
            return plan;
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return null;
        }
    },

    // Save plan
    savePlan: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveMonthlyPlan(data);
            set(state => {
                // Update or add to plans list
                const exists = state.plans.find(p => p.id === saved.id);
                const plans = exists
                    ? state.plans.map(p => p.id === saved.id ? saved : p)
                    : [saved, ...state.plans];
                return { plans, currentPlan: saved, isLoading: false };
            });
            return { success: true, plan: saved };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Delete plan
    removePlan: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteMonthlyPlan(id);
            set(state => ({
                plans: state.plans.filter(p => p.id !== id),
                currentPlan: state.currentPlan?.id === id ? null : state.currentPlan,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Clear current plan
    clearCurrentPlan: () => set({ currentPlan: null }),

    // Clear error
    clearError: () => set({ error: null }),

    // --- Submission & Review Actions ---

    // Submit plan
    submitPlan: async (id, groupName) => {
        set({ isLoading: true, error: null });
        try {
            await submitMonthlyPlan(id, groupName);
            set(state => ({
                currentPlan: state.currentPlan?.id === id ? { ...state.currentPlan, status: 'submitted' } : state.currentPlan,
                plans: state.plans.map(p => p.id === id ? { ...p, status: 'submitted' } : p),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Approve plan
    approvePlan: async (id, coachId, groupName) => {
        set({ isLoading: true, error: null });
        try {
            await approveMonthlyPlan(id, coachId, groupName);
            set(state => ({
                pendingPlans: state.pendingPlans ? state.pendingPlans.filter(p => p.id !== id) : [],
                plans: state.plans.map(p => p.id === id ? { ...p, status: 'approved' } : p),
                currentPlan: state.currentPlan?.id === id ? { ...state.currentPlan, status: 'approved' } : state.currentPlan,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Reject plan
    rejectPlan: async (id, feedback, groupName) => {
        set({ isLoading: true, error: null });
        try {
            await rejectMonthlyPlan(id, feedback, groupName);
            set(state => ({
                pendingPlans: state.pendingPlans ? state.pendingPlans.filter(p => p.id !== id) : [],
                plans: state.plans.map(p => p.id === id ? { ...p, status: 'rejected' } : p),
                currentPlan: state.currentPlan?.id === id ? { ...state.currentPlan, status: 'rejected' } : state.currentPlan,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Fetch pending plans
    pendingPlans: [],
    fetchPendingPlans: async () => {
        set({ isLoading: true, error: null });
        try {
            const plans = await getPendingMonthlyPlans();
            set({ pendingPlans: plans, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    }
}));

export default useMonthlyPlansStore;
