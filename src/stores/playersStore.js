import { create } from 'zustand';
import {
    getGroupPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer
} from '../services/players';

// Mock Players for Demo Mode
const MOCK_PLAYERS = {
    'group-1': [
        { id: 'p1', displayName: 'רועי כהן', birthDate: '2010-05-15', phone: '050-1111111', parentName: 'אבא של רועי', parentPhone: '050-2222222', groupIds: ['group-1'] },
        { id: 'p2', displayName: 'נועה לוי', birthDate: '2010-08-20', phone: '050-3333333', parentName: 'אמא של נועה', parentPhone: '050-4444444', groupIds: ['group-1'] },
    ]
};

const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    return !apiKey || apiKey === 'YOUR_API_KEY';
};

const usePlayersStore = create((set, get) => ({
    // State
    players: [], // Currently displayed players (e.g., for selected group)
    isLoading: false,
    error: null,
    isDemoMode: isDemoMode(),

    // Actions
    fetchGroupPlayers: async (groupId) => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 400));
            set({
                players: MOCK_PLAYERS[groupId] || [],
                isLoading: false
            });
            return;
        }

        try {
            const players = await getGroupPlayers(groupId);
            set({ players, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    addPlayer: async (playerData) => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const newPlayer = {
                id: `demo-player-${Date.now()}`,
                ...playerData
            };

            // Add to mock storage usually needed for persistence in session
            // For now just update view state
            set((state) => ({
                players: [...state.players, newPlayer],
                isLoading: false
            }));

            return { success: true, player: newPlayer };
        }

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

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            set((state) => ({
                players: state.players.map(p => p.id === id ? { ...p, ...updates } : p),
                isLoading: false
            }));
            return { success: true };
        }

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

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            set((state) => ({
                players: state.players.filter(p => p.id !== id),
                isLoading: false
            }));
            return { success: true };
        }

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
