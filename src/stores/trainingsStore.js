import { create } from 'zustand';
import {
    getCoachTrainings,
    createTraining,
    updateTraining,
    deleteTraining,
    fetchSeriesTrainings,
    updateSeriesTrainings,
    deleteSeriesTrainings
} from '../services/trainings';

const useTrainingsStore = create((set, get) => ({
    trainings: [],
    selectedTraining: null,
    isLoading: false,
    error: null,
    seriesTrainings: [],
    seriesLoading: false,

    // Fetch trainings
    fetchTrainings: async (coachId, startDate, endDate, status) => {
        set({ isLoading: true, error: null });
        try {
            const trainings = await getCoachTrainings(coachId, startDate, endDate, status);
            set({ trainings, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
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
    },

    fetchSeries: async (recurrenceGroupId) => {
        set({ seriesLoading: true });
        try {
            const seriesTrainings = await fetchSeriesTrainings(recurrenceGroupId);
            set({ seriesTrainings, seriesLoading: false });
            return seriesTrainings;
        } catch (error) {
            console.error('Error fetching series:', error);
            set({ seriesLoading: false, error: error.message });
            return [];
        }
    },

    updateSeries: async (recurrenceGroupId, updates, scope) => {
        try {
            const result = await updateSeriesTrainings(recurrenceGroupId, updates, scope);
            // Refresh series list only (main trainings list requires coachId/date params — caller refreshes as needed)
            const { fetchSeries } = get();
            await fetchSeries(recurrenceGroupId);
            // Update local trainings array for any that were modified
            const { trainings } = get();
            const updatedIds = new Set((await fetchSeriesTrainings(recurrenceGroupId)).map(t => t.id));
            set({ trainings: trainings.map(t => updatedIds.has(t.id) ? { ...t, ...updates } : t) });
            return result;
        } catch (error) {
            console.error('Error updating series:', error);
            set({ error: error.message });
            return { updated: 0, error: error.message };
        }
    },

    deleteSeries: async (recurrenceGroupId, scope) => {
        try {
            const result = await deleteSeriesTrainings(recurrenceGroupId, scope);
            // Remove deleted trainings from local state
            const { trainings } = get();
            const deletedIds = new Set(result.deletedIds || []);
            set({ trainings: trainings.filter(t => !deletedIds.has(t.id)), seriesTrainings: [] });
            return result;
        } catch (error) {
            console.error('Error deleting series:', error);
            set({ error: error.message });
            return { deleted: 0, error: error.message };
        }
    },

    clearSeries: () => set({ seriesTrainings: [], seriesLoading: false }),
}));

export default useTrainingsStore;
