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
 */
export const saveMonthlyOutstanding = async (data) => {
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
    try {
        await deleteDoc(doc(db, COLLECTION, docId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting monthly outstanding:', error);
        throw error;
    }
};
