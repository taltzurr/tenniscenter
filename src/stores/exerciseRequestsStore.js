import { create } from 'zustand';
import {
    getMyRequests,
    getAllRequests,
    createRequest,
    updateRequestStatus
} from '../services/exerciseRequests';

const useExerciseRequestsStore = create((set, get) => ({
    requests: [],
    isLoading: false,
    error: null,

    // Fetch my requests (coach)
    fetchMyRequests: async (coachId) => {
        set({ isLoading: true, error: null });
        try {
            const requests = await getMyRequests(coachId);
            set({ requests, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch all requests (supervisor)
    fetchAllRequests: async (status = null) => {
        set({ isLoading: true, error: null });
        try {
            const requests = await getAllRequests(status);
            set({ requests, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Create new request
    addRequest: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const newRequest = await createRequest(data);
            set(state => ({
                requests: [newRequest, ...state.requests],
                isLoading: false
            }));
            return { success: true, request: newRequest };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Update request status
    updateStatus: async (id, status, notes = '') => {
        set({ isLoading: true, error: null });
        try {
            await updateRequestStatus(id, status, notes);
            set(state => ({
                requests: state.requests.map(r =>
                    r.id === id ? { ...r, status, statusNotes: notes } : r
                ),
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

export default useExerciseRequestsStore;
