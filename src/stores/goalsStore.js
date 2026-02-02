import { create } from 'zustand';
import {
    getCenterGoals,
    getGroupGoals,
    saveGoal,
    deleteGoal,
    reorderGoals
} from '../services/goals';

const useGoalsStore = create((set, get) => ({
    centerGoals: [],
    groupGoals: {},
    isLoading: false,
    error: null,

    // Fetch center goals
    fetchCenterGoals: async () => {
        set({ isLoading: true, error: null });
        try {
            const goals = await getCenterGoals();
            set({ centerGoals: goals, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch group goals
    fetchGroupGoals: async (groupId) => {
        set({ isLoading: true, error: null });
        try {
            const goals = await getGroupGoals(groupId);
            set(state => ({
                groupGoals: { ...state.groupGoals, [groupId]: goals },
                isLoading: false
            }));
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Add or update goal
    saveGoal: async (goalData) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveGoal(goalData);

            if (goalData.type === 'center') {
                set(state => {
                    const exists = state.centerGoals.find(g => g.id === saved.id);
                    const updatedGoals = exists
                        ? state.centerGoals.map(g => g.id === saved.id ? saved : g)
                        : [...state.centerGoals, saved];
                    return { centerGoals: updatedGoals, isLoading: false };
                });
            } else if (goalData.type === 'group' && goalData.groupId) {
                set(state => {
                    const groupGoals = state.groupGoals[goalData.groupId] || [];
                    const exists = groupGoals.find(g => g.id === saved.id);
                    const updatedGoals = exists
                        ? groupGoals.map(g => g.id === saved.id ? saved : g)
                        : [...groupGoals, saved];
                    return {
                        groupGoals: { ...state.groupGoals, [goalData.groupId]: updatedGoals },
                        isLoading: false
                    };
                });
            }

            return { success: true, goal: saved };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Delete goal
    deleteGoal: async (goalId, type, groupId) => {
        set({ isLoading: true, error: null });
        try {
            await deleteGoal(goalId);

            if (type === 'center') {
                set(state => ({
                    centerGoals: state.centerGoals.filter(g => g.id !== goalId),
                    isLoading: false
                }));
            } else if (type === 'group' && groupId) {
                set(state => ({
                    groupGoals: {
                        ...state.groupGoals,
                        [groupId]: (state.groupGoals[groupId] || []).filter(g => g.id !== goalId)
                    },
                    isLoading: false
                }));
            }

            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Reorder goals
    reorderGoals: async (goals, type, groupId) => {
        try {
            await reorderGoals(goals);

            if (type === 'center') {
                set({ centerGoals: goals });
            } else if (type === 'group' && groupId) {
                set(state => ({
                    groupGoals: { ...state.groupGoals, [groupId]: goals }
                }));
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Clear error
    clearError: () => set({ error: null })
}));

export default useGoalsStore;
