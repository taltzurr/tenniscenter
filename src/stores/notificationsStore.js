import { create } from 'zustand';
import { subscribeToNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification } from '../services/notifications';

const useNotificationsStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
    unsubscribe: null,

    initialize: (userId) => {
        // Cleanup previous subscription if exists
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
        }

        const newUnsubscribe = subscribeToNotifications(userId, (notifications) => {
            const unreadCount = notifications.filter(n => !n.isRead).length;
            set({ notifications, unreadCount, isLoading: false });
        });
        set({ unsubscribe: newUnsubscribe });
    },

    cleanup: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null, notifications: [], unreadCount: 0 });
        }
    },

    markRead: async (id) => {
        await markAsRead(id);
    },

    markAllRead: async (userId) => {
        await markAllAsRead(userId);
    },

    removeNotification: async (id) => {
        await deleteNotification(id);
    },

    addNotification: async (notification) => {
        await createNotification(notification);
    }
}));

export default useNotificationsStore;
