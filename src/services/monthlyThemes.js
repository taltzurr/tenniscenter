import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'monthlyThemes';

/**
 * Get monthly theme for a specific month and year
 * @param {string} centerId - The center ID (optional if we strictly enforce center context later, but good for data model)
 * @param {number} year 
 * @param {number} month 
 */
export const getMonthlyTheme = async (year, month) => {
    try {
        // Note: Currently assuming single center or global scope. 
        // If multi-center, we would add where('centerId', '==', centerId)
        const q = query(
            collection(db, COLLECTION),
            where('year', '==', year),
            where('month', '==', month),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        };
    } catch (error) {
        console.error('Error fetching monthly theme:', error);
        return null;
    }
};

/**
 * Save or update monthly theme
 * @param {object} data - { year, month, goalsByType: {}, goals: [], values: [] }
 */
export const saveMonthlyTheme = async (data) => {
    try {
        const { year, month } = data;
        const existing = await getMonthlyTheme(year, month);

        if (existing) {
            // Update - use set WITHOUT merge so deleted fields are actually removed
            const docRef = doc(db, COLLECTION, existing.id);
            await setDoc(docRef, {
                ...data,
                createdAt: existing.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: existing.id, ...data };
        } else {
            // Create New
            // Use a composite ID for easier direct access if needed, e.g., "2024-5"
            // But let's stick to auto-id or query based for consistency with other services unless query perf is crucial.
            const docRef = doc(collection(db, COLLECTION));
            await setDoc(docRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: docRef.id, ...data };
        }
    } catch (error) {
        console.error('Error saving monthly theme:', error);
        throw error;
    }
};

export const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];
