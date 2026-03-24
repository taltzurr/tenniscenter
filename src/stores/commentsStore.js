import { create } from 'zustand';
import {
    getComments,
    addComment,
    updateComment,
    deleteComment
} from '../services/comments';

const useCommentsStore = create((set, get) => ({
    comments: [],
    isLoading: false,
    error: null,

    // Fetch comments for entity
    fetchComments: async (entityType, entityId) => {
        set({ isLoading: true, error: null });
        try {
            const comments = await getComments(entityType, entityId);
            set({ comments, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Add comment
    add: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const newComment = await addComment(data);
            set(state => ({
                comments: [newComment, ...state.comments],
                isLoading: false
            }));
            return { success: true, comment: newComment };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Update comment
    update: async (id, text) => {
        set({ isLoading: true, error: null });
        try {
            await updateComment(id, text);
            set(state => ({
                comments: state.comments.map(c =>
                    c.id === id ? { ...c, text, updatedAt: new Date() } : c
                ),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Delete comment
    remove: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteComment(id);
            set(state => ({
                comments: state.comments.filter(c => c.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Clear comments
    clearComments: () => set({ comments: [] }),

    // Clear error
    clearError: () => set({ error: null })
}));

export default useCommentsStore;
