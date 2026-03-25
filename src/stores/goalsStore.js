import { create } from 'zustand';
import {
    getAllGoalDefinitions,
    getAllValueDefinitions,
    saveGoalDefinition,
    deleteGoalDefinition,
    getMonthlyAssignment,
    saveMonthlyAssignment as saveMonthlyAssignmentService
} from '../services/goals';
import { saveMonthlyTheme } from '../services/monthlyThemes';

const useGoalsStore = create((set, get) => ({
    goals: [],              // all goal definitions
    values: [],             // all value definitions
    currentAssignment: null, // { goalsByType: {}, goalIds: [], valueIds: [] } for selected month
    isLoading: false,
    error: null,

    // Fetch all goal definitions
    fetchGoals: async () => {
        set({ isLoading: true, error: null });
        try {
            const goals = await getAllGoalDefinitions();
            set({ goals, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Fetch all value definitions
    fetchValues: async () => {
        set({ isLoading: true, error: null });
        try {
            const values = await getAllValueDefinitions();
            set({ values, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Fetch monthly assignment for a given year/month
    fetchMonthlyAssignment: async (year, month) => {
        set({ isLoading: true, error: null });
        try {
            const assignment = await getMonthlyAssignment(year, month);
            set({ currentAssignment: assignment, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Save monthly assignment and sync to monthlyThemes for dashboard display
    saveMonthlyAssignment: async (year, month, goalsByType, valueIds) => {
        set({ isLoading: true, error: null });
        try {
            const saved = await saveMonthlyAssignmentService(year, month, goalsByType, valueIds);

            // Sync to monthlyThemes so dashboards (Coach/Manager) display the data
            const { goals: allGoals, values: allValues } = get();

            // Resolve goal titles per group type
            const resolvedGoalsByType = {};
            if (goalsByType && typeof goalsByType === 'object') {
                for (const [typeId, ids] of Object.entries(goalsByType)) {
                    resolvedGoalsByType[typeId] = (ids || [])
                        .map(id => allGoals.find(g => g.id === id)?.title)
                        .filter(Boolean);
                }
            }

            // Flat goals array for backward compatibility (unique titles)
            const allGoalTitles = [...new Set(
                Object.values(resolvedGoalsByType).flat()
            )];

            const resolvedValueTitles = (valueIds || [])
                .map(id => allValues.find(v => v.id === id)?.title)
                .filter(Boolean);

            try {
                await saveMonthlyTheme({
                    year,
                    month,
                    goalsByType: resolvedGoalsByType,
                    goals: allGoalTitles,
                    values: resolvedValueTitles
                });
            } catch (syncError) {
                console.error('Failed to sync to monthlyThemes:', syncError);
                // Don't fail the whole operation if sync fails
            }

            set({
                currentAssignment: saved,
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Clear error
    clearError: () => set({ error: null })
}));

export default useGoalsStore;
