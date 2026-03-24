import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'exerciseRequests';

// Request statuses
export const REQUEST_STATUSES = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    IN_PROGRESS: 'in_progress'
};

export const STATUS_LABELS = {
    pending: 'ממתין לאישור',
    approved: 'אושר',
    rejected: 'נדחה',
    in_progress: 'בתהליך יצירה'
};

/**
 * Get all exercise requests for a coach
 */
export const getMyRequests = async (coachId) => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('requestedBy', '==', coachId),
            orderBy('createdAt', 'desc'),
            limit(500)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching my requests:', error);
        return [];
    }
};

/**
 * Get all pending requests (for supervisors/admins)
 */
export const getAllRequests = async (status = null) => {
    try {
        let q = query(
            collection(db, COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(500)
        );

        if (status) {
            q = query(
                collection(db, COLLECTION),
                where('status', '==', status),
                orderBy('createdAt', 'desc'),
                limit(500)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching all requests:', error);
        return [];
    }
};

/**
 * Get a single request by ID
 */
export const getRequest = async (id) => {
    try {
        const docRef = doc(db, COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching request:', error);
        return null;
    }
};

/**
 * Create a new exercise request
 */
export const createRequest = async (data) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            status: REQUEST_STATUSES.PENDING,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...data, status: REQUEST_STATUSES.PENDING };
    } catch (error) {
        console.error('Error creating request:', error);
        throw error;
    }
};

/**
 * Update request status
 */
export const updateRequestStatus = async (id, status, notes = '') => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            status,
            statusNotes: notes,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating request:', error);
        throw error;
    }
};

/**
 * Link request to created exercise
 */
export const linkToExercise = async (requestId, exerciseId) => {
    try {
        const docRef = doc(db, COLLECTION, requestId);
        await updateDoc(docRef, {
            status: REQUEST_STATUSES.APPROVED,
            linkedExerciseId: exerciseId,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error linking request:', error);
        throw error;
    }
};
