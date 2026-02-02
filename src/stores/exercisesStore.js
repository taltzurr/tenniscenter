import { create } from 'zustand';
import {
    getExercises,
    getExercise,
    createExercise,
    updateExercise,
    deleteExercise
} from '../services/exercises';

const useExercisesStore = create((set, get) => ({
    exercises: [],
    currentExercise: null,
    isLoading: false,
    error: null,
    filters: {
        category: null,
        difficulty: null,
        ageGroup: null,
        search: ''
    },

    // Fetch exercises with current filters
    fetchExercises: async () => {
        set({ isLoading: true, error: null });
        try {
            const { filters } = get();
            const exercises = await getExercises(filters);
            set({ exercises, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch single exercise
    fetchExercise: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const exercise = await getExercise(id);
            set({ currentExercise: exercise, isLoading: false });
            return exercise;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    // Add new exercise
    addExercise: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const newExercise = await createExercise(data);
            set(state => ({
                exercises: [newExercise, ...state.exercises],
                isLoading: false
            }));
            return newExercise;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // Edit exercise
    editExercise: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await updateExercise(id, data);
            set(state => ({
                exercises: state.exercises.map(ex =>
                    ex.id === id ? { ...ex, ...data } : ex
                ),
                currentExercise: state.currentExercise?.id === id
                    ? { ...state.currentExercise, ...data }
                    : state.currentExercise,
                isLoading: false
            }));
            return updated;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // Remove exercise
    removeExercise: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteExercise(id);
            set(state => ({
                exercises: state.exercises.filter(ex => ex.id !== id),
                isLoading: false
            }));
            return true;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // Update filters
    setFilters: (newFilters) => {
        set(state => ({
            filters: { ...state.filters, ...newFilters }
        }));
    },

    // Clear filters
    clearFilters: () => {
        set({
            filters: {
                category: null,
                difficulty: null,
                ageGroup: null,
                search: ''
            }
        });
    },

    // Clear current exercise
    clearCurrentExercise: () => {
        set({ currentExercise: null });
    }
}));

export default useExercisesStore;
