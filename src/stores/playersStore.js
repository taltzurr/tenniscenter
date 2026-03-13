import { create } from 'zustand';
import {
    getGroupPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer
} from '../services/players';

const usePlayersStore = create((set, get) => ({
    // State
    players: [], // Currently displayed players (e.g., for selected group)
    isLoading: false,
    error: null,

    // Actions
    fetchGroupPlayers: async (groupId) => {
        set({ isLoading: true, error: null });

        try {
            const players = await getGroupPlayers(groupId);
            set({ players, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    addPlayer: async (playerData) => {
        set({ isLoading: true, error: null });

        try {
            const newPlayer = await createPlayer(playerData);
            set((state) => ({
                players: [...state.players, newPlayer],
                isLoading: false
            }));
            return { success: true, player: newPlayer };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    updatePlayer: async (id, updates) => {
        set({ isLoading: true, error: null });

        try {
            await updatePlayer(id, updates);
            set((state) => ({
                players: state.players.map(p => p.id === id ? { ...p, ...updates } : p),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    deletePlayer: async (id) => {
        set({ isLoading: true, error: null });

        try {
            await deletePlayer(id);
            set((state) => ({
                players: state.players.filter(p => p.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    clearPlayers: () => set({ players: [], error: null })
}));

export default usePlayersStore;
