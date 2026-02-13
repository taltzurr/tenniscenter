import {
    collection,
    doc,
    getDocs,
    setDoc,
    query,
    where,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'monthlyOutstanding';

// Demo mode helpers
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const demoUser = localStorage.getItem('demoUser');
    return !apiKey || apiKey === 'YOUR_API_KEY' || demoUser !== null;
};

const STORAGE_KEY = 'tennis_mock_outstanding';

const getMockOutstanding = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored, (key, value) => {
        if (key === 'createdAt' || key === 'updatedAt') {
            return value ? new Date(value) : value;
        }
        return value;
    }) : [];
};

const saveMockOutstanding = (entries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

/**
 * Get all monthly outstanding entries for a specific month
 */
export const getMonthlyOutstanding = async (year, month) => {
    if (isDemoMode()) {
        return getMockOutstanding().filter(e => e.year === year && e.month === month);
    }

    try {
        const q = query(
            collection(db, COLLECTION),
            where('year', '==', year),
            where('month', '==', month)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching monthly outstanding:', error);
        return [];
    }
};

/**
 * Get monthly outstanding for a specific center
 */
export const getMonthlyOutstandingByCenter = async (year, month, centerId) => {
    if (isDemoMode()) {
        return getMockOutstanding().filter(
            e => e.year === year && e.month === month && e.centerId === centerId
        );
    }

    try {
        const q = query(
            collection(db, COLLECTION),
            where('year', '==', year),
            where('month', '==', month),
            where('centerId', '==', centerId)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching monthly outstanding by center:', error);
        return [];
    }
};

/**
 * Save or update a monthly outstanding entry
 */
export const saveMonthlyOutstanding = async (data) => {
    if (isDemoMode()) {
        const entries = getMockOutstanding();
        const { reason, ...cleanData } = data;
        const existingIndex = entries.findIndex(
            e => e.year === data.year && e.month === data.month && e.type === data.type &&
                (!data.centerId || e.centerId === data.centerId)
        );

        if (existingIndex !== -1) {
            entries[existingIndex] = { ...entries[existingIndex], ...cleanData, updatedAt: new Date() };
            saveMockOutstanding(entries);
            return entries[existingIndex];
        } else {
            const newEntry = {
                ...cleanData,
                id: `outstanding-${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            entries.push(newEntry);
            saveMockOutstanding(entries);
            return newEntry;
        }
    }

    try {
        const { year, month, type, centerId } = data;

        const conditions = [
            where('year', '==', year),
            where('month', '==', month),
            where('type', '==', type)
        ];

        if (centerId) {
            conditions.push(where('centerId', '==', centerId));
        }

        const q = query(collection(db, COLLECTION), ...conditions);
        const snapshot = await getDocs(q);

        const { reason, ...cleanData } = data;

        if (!snapshot.empty) {
            const existingDoc = snapshot.docs[0];
            await setDoc(doc(db, COLLECTION, existingDoc.id), {
                ...cleanData,
                updatedAt: serverTimestamp()
            }, { merge: true });
            return { id: existingDoc.id, ...cleanData };
        } else {
            const docRef = doc(collection(db, COLLECTION));
            await setDoc(docRef, {
                ...cleanData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: docRef.id, ...cleanData };
        }
    } catch (error) {
        console.error('Error saving monthly outstanding:', error);
        throw error;
    }
};

/**
 * Delete a monthly outstanding entry
 */
export const deleteMonthlyOutstanding = async (docId) => {
    if (isDemoMode()) {
        const entries = getMockOutstanding();
        saveMockOutstanding(entries.filter(e => e.id !== docId));
        return { success: true };
    }

    try {
        await deleteDoc(doc(db, COLLECTION, docId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting monthly outstanding:', error);
        throw error;
    }
};
