import { create } from 'zustand';
import {
    getGroups,
    getAllGroups,
    getGroupsByCenter,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup
} from '../services/groups';

const useGroupsStore = create((set, get) => ({
    // State
    groups: [],
    selectedGroup: null,
    isLoading: false,
    error: null,

    // Fetch groups for current user
    fetchGroups: async (coachId, isSupervisor = false, centerId = null) => {
        set({ isLoading: true, error: null });
        try {
            let groups;
            if (isSupervisor) {
                groups = await getAllGroups();
            } else if (centerId) {
                groups = await getGroupsByCenter(centerId);
            } else {
                groups = await getGroups(coachId);
            }
            set({ groups, isLoading: false });
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
        }
    },

    // Fetch single group
    fetchGroup: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const group = await getGroup(id);
            set({ selectedGroup: group, isLoading: false });
            return group;
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return null;
        }
    },

    // Add new group
    addGroup: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const newGroup = await createGroup(data);
            set((state) => ({
                groups: [newGroup, ...state.groups],
                isLoading: false
            }));
            return { success: true, group: newGroup };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Update existing group
    editGroup: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updated = await updateGroup(id, data);
            set((state) => ({
                groups: state.groups.map(g => g.id === id ? { ...g, ...updated } : g),
                selectedGroup: state.selectedGroup?.id === id
                    ? { ...state.selectedGroup, ...updated }
                    : state.selectedGroup,
                isLoading: false,
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Remove group
    removeGroup: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteGroup(id);
            set((state) => ({
                groups: state.groups.filter(g => g.id !== id),
                selectedGroup: state.selectedGroup?.id === id ? null : state.selectedGroup,
                isLoading: false,
            }));
            return { success: true };
        } catch (error) {
            set({ error: 'שגיאה בביצוע הפעולה', isLoading: false });
            return { success: false, error: 'שגיאה בביצוע הפעולה' };
        }
    },

    // Clear selected group
    clearSelectedGroup: () => set({ selectedGroup: null }),

    // Clear error
    clearError: () => set({ error: null }),
}));

export default useGroupsStore;
