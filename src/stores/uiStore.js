import { create } from 'zustand';

const useUIStore = create((set) => ({
    // Sidebar state
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    openSidebar: () => set({ isSidebarOpen: true }),

    // Modal state
    activeModal: null,
    modalData: null,
    openModal: (modalId, data = null) => set({ activeModal: modalId, modalData: data }),
    closeModal: () => set({ activeModal: null, modalData: null }),

    // Toast notifications
    toasts: [],
    addToast: (toast) =>
        set((state) => ({
            toasts: [...state.toasts, { id: Date.now(), ...toast }],
        })),
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),

    // Calendar view
    calendarView: 'week', // 'day' | 'week' | 'month'
    setCalendarView: (view) => set({ calendarView: view }),

    // Selected date
    selectedDate: new Date(),
    setSelectedDate: (date) => set({ selectedDate: date }),

    // Loading states
    globalLoading: false,
    setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));

export default useUIStore;
