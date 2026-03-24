import { create } from 'zustand';
import {
    getAllGoalDefinitions,
    getAllValueDefinitions,
    saveGoalDefinition,
    deleteGoalDefinition,
    getMonthlyAssignment,
    saveMonthlyAssignment as saveMonthlyAssignmentService
} from '../services/goals';

const useGoalsStore = create((set, get) => ({
    goals: [],              // all goal definitions
    values: [],             // all value definitions
    currentAssignment: null, // { goalIds: [], valueIds: [] } for selected month
    isLoading: false,
    error: null,

    // Fetch all goal definitions
    fetchGoals: async () => {
        set({ isLoading: true, error: null });
        try {
            const goals = await getAllGoalDefinitions();
            set({ goals, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch all value definitions
    fetchValues: async () => {
        set({ isLoading: true, error: null });
        try {
            const values = await getAllValueDefinitions();
            set({ values, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch monthly assignment for a given year/month
    fetchMonthlyAssignment: async (year, month) => {
        set({ isLoading: true, error: null });
        try {
            const assignment = await getMonthlyAssignment(year, month);
            set({ currentAssignment: assignment, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Save monthly assignment
    saveMonthlyAssignment: async (year, month, goalIds, valueIds) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveMonthlyAssignmentService(year, month, goalIds, valueIds);
            set({
                currentAssignment: saved,
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Save a goal definition (add or edit)
    saveGoal: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveGoalDefinition({ ...data, type: 'goal' });
            set(state => {
                const exists = state.goals.find(g => g.id === saved.id);
                const updatedGoals = exists
                    ? state.goals.map(g => g.id === saved.id ? saved : g)
                    : [saved, ...state.goals];
                return { goals: updatedGoals, isLoading: false };
            });
            return { success: true, goal: saved };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Delete a goal definition
    deleteGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteGoalDefinition(id);
            set(state => ({
                goals: state.goals.filter(g => g.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Save a value definition (add or edit)
    saveValue: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveGoalDefinition({ ...data, type: 'value' });
            set(state => {
                const exists = state.values.find(v => v.id === saved.id);
                const updatedValues = exists
                    ? state.values.map(v => v.id === saved.id ? saved : v)
                    : [saved, ...state.values];
                return { values: updatedValues, isLoading: false };
            });
            return { success: true, value: saved };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Delete a value definition
    deleteValue: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteGoalDefinition(id);
            set(state => ({
                values: state.values.filter(v => v.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Clear error
    clearError: () => set({ error: null })
}));

export default useGoalsStore;
