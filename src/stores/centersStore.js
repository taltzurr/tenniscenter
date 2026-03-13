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

const useCentersStore = create((set, get) => ({
    centers: [],
    isLoading: false,
    error: null,

    fetchCenters: async () => {
        set({ isLoading: true, error: null });

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
