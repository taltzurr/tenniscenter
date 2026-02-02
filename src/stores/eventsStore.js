import { create } from 'zustand';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/events';

const useEventsStore = create((set, get) => ({
    events: [],
    isLoading: false,
    error: null,

    // Fetch events
    // Fetch events (merges with existing)
    fetchEvents: async (year, month) => {
        set({ isLoading: true, error: null });
        try {
            const newEvents = await getEvents(year, month);
            set(state => {
                // Merge new events with existing ones to avoid overwriting (handling multi-month views)
                const eventMap = new Map(state.events.map(e => [e.id, e]));
                newEvents.forEach(e => eventMap.set(e.id, e));
                return {
                    events: Array.from(eventMap.values()),
                    isLoading: false
                };
            });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Add event
    addEvent: async (eventData) => {
        set({ isLoading: true, error: null });
        try {
            const newEvent = await createEvent(eventData);
            set(state => ({
                events: [...state.events, newEvent],
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Edit event
    editEvent: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await updateEvent(id, updates);
            set(state => ({
                events: state.events.map(e => e.id === id ? { ...e, ...updated } : e),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    // Remove event
    removeEvent: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteEvent(id);
            set(state => ({
                events: state.events.filter(e => e.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    }
}));

export default useEventsStore;
