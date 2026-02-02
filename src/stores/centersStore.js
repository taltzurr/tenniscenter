import { create } from 'zustand';
import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';

const MOCK_CENTERS = [
    { id: 'center-1', name: 'מרכז הטניס תל אביב', address: 'שד\' רוקח 1, תל אביב' },
    { id: 'center-2', name: 'מרכז הטניס חיפה', address: 'דרך צרפת 1, חיפה' },
    { id: 'center-3', name: 'מרכז הטניס ירושלים', address: 'דרך אגודת ספורט בית"ר 1, ירושלים' },
    { id: 'center-4', name: 'מרכז הטניס אשקלון', address: 'שד\' עופר 1, אשקלון' },
    { id: 'center-5', name: 'מרכז הטניס באר שבע', address: 'דרך מצדה 1, באר שבע' },
];

const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    return !apiKey || apiKey === 'YOUR_API_KEY';
};

const useCentersStore = create((set, get) => ({
    centers: [],
    isLoading: false,
    error: null,
    isDemoMode: isDemoMode(),

    fetchCenters: async () => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            // Keep existing updates if present in memory, otherwise load mock
            if (get().centers.length === 0) {
                set({ centers: MOCK_CENTERS, isLoading: false });
            } else {
                set({ isLoading: false });
            }
            return;
        }

        try {
            const querySnapshot = await getDocs(collection(db, 'centers'));
            const centers = [];
            querySnapshot.forEach((doc) => {
                centers.push({ id: doc.id, ...doc.data() });
            });
            set({ centers, isLoading: false });
        } catch (error) {
            console.error('Error fetching centers:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    addCenter: async (centerData) => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const newCenter = {
                id: `center-${Date.now()}`,
                ...centerData
            };
            set(state => ({
                centers: [...state.centers, newCenter],
                isLoading: false
            }));
            return { success: true };
        }

        try {
            const docRef = await addDoc(collection(db, 'centers'), centerData);
            const newCenter = { id: docRef.id, ...centerData };
            set(state => ({
                centers: [...state.centers, newCenter],
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error adding center:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    updateCenter: async (id, updates) => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            set(state => ({
                centers: state.centers.map(center =>
                    center.id === id ? { ...center, ...updates } : center
                ),
                isLoading: false
            }));
            return { success: true };
        }

        try {
            const centerRef = doc(db, 'centers', id);
            await updateDoc(centerRef, updates);
            set(state => ({
                centers: state.centers.map(center =>
                    center.id === id ? { ...center, ...updates } : center
                ),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error updating center:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    deleteCenter: async (id) => {
        set({ isLoading: true, error: null });

        if (get().isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            set(state => ({
                centers: state.centers.filter(center => center.id !== id),
                isLoading: false
            }));
            return { success: true };
        }

        try {
            await deleteDoc(doc(db, 'centers', id));
            set(state => ({
                centers: state.centers.filter(center => center.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            console.error('Error deleting center:', error);
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
        }
    },

    getCenterName: (centerId) => {
        const center = get().centers.find(c => c.id === centerId);
        return center ? center.name : 'מרכז לא ידוע';
    },

    getSimpleCentersList: () => {
        return get().centers.map(c => ({ value: c.id, label: c.name }));
    }
}));

export default useCentersStore;
