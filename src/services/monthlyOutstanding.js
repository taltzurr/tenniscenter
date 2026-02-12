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

/**
 * Get all monthly outstanding entries for a specific month
 * @param {number} year 
 * @param {number} month (0-indexed)
 * @returns {Promise<Array>}
 */
export const getMonthlyOutstanding = async (year, month) => {
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
 * @param {number} year 
 * @param {number} month (0-indexed)
 * @param {string} centerId
 * @returns {Promise<Array>}
 */
export const getMonthlyOutstandingByCenter = async (year, month, centerId) => {
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
 * Upserts by year + month + type + centerId
 * @param {object} data - { year, month, type, centerId?, selectedId, selectedName, selectedBy, selectedByName }
 * @returns {Promise<object>}
 */
export const saveMonthlyOutstanding = async (data) => {
    try {
        const { year, month, type, centerId } = data;

        // Find existing entry with same year+month+type+centerId
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

        // Remove reason field - not needed per user request
        const { reason, ...cleanData } = data;

        if (!snapshot.empty) {
            // Update existing
            const existingDoc = snapshot.docs[0];
            await setDoc(doc(db, COLLECTION, existingDoc.id), {
                ...cleanData,
                updatedAt: serverTimestamp()
            }, { merge: true });
            return { id: existingDoc.id, ...cleanData };
        } else {
            // Create new
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
 * @param {string} docId 
 */
export const deleteMonthlyOutstanding = async (docId) => {
    try {
        await deleteDoc(doc(db, COLLECTION, docId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting monthly outstanding:', error);
        throw error;
    }
};
