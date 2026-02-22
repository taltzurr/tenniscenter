import { create } from 'zustand';
import {
    getCoachTrainings,
    createTraining,
    updateTraining,
    deleteTraining
} from '../services/trainings';

const useTrainingsStore = create((set, get) => ({
    trainings: [],
    selectedTraining: null,
    isLoading: false,
    error: null,

    // Fetch trainings
    fetchTrainings: async (coachId, startDate, endDate, status) => {
        set({ isLoading: true, error: null });
        try {
            const trainings = await getCoachTrainings(coachId, startDate, endDate, status);
            set({ trainings, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch single training (for direct access/refresh)
    fetchTraining: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const { getTraining } = await import('../services/trainings');
            const training = await getTraining(id);
            if (training) {
                set(state => ({
                    // Update or add to the list
                    trainings: state.trainings.some(t => t.id === id)
                        ? state.trainings.map(t => t.id === id ? training : t)
                        : [...state.trainings, training],
                    selectedTraining: training,
                    isLoading: false
                }));
            } else {
                set({ error: 'Training not found', isLoading: false });
            }
            return training;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },


    // Fetch all trainings for a list of coach IDs (for center manager read-only view)
    fetchCenterTrainings: async (coachIds, startDate, endDate) => {
        if (!coachIds || coachIds.length === 0) {
            set({ trainings: [], isLoading: false });
            return;
        }
        set({ isLoading: true, error: null });
        try {
            const { getOrganizationTrainings } = await import('../services/trainings');
            const all = await getOrganizationTrainings(startDate, endDate);
            const filtered = all.filter(t => coachIds.includes(t.coachId));
            set({ trainings: filtered, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Add training
    addTraining: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const newTraining = await createTraining(data);
            set(state => ({
                trainings: [...state.trainings, newTraining].sort((a, b) => a.date - b.date),
                isLoading: false
            }));
            return { success: true, training: newTraining };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Update training
    editTraining: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await updateTraining(id, data);
            set(state => ({
                trainings: state.trainings.map(t => t.id === id ? { ...t, ...updated, date: data.date || t.date } : t),
                selectedTraining: state.selectedTraining?.id === id
                    ? { ...state.selectedTraining, ...updated, date: data.date || state.selectedTraining.date }
                    : state.selectedTraining,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Delete training
    removeTraining: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteTraining(id);
            set(state => ({
                trainings: state.trainings.filter(t => t.id !== id),
                selectedTraining: state.selectedTraining?.id === id ? null : state.selectedTraining,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Select training
    setSelectedTraining: (training) => set({ selectedTraining: training }),

    // Get trainings for a specific date (helper)
    getTrainingsByDate: (date) => {
        const { trainings } = get();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return trainings.filter(t => t.date >= startOfDay && t.date <= endOfDay);
    }
}));

export default useTrainingsStore;
