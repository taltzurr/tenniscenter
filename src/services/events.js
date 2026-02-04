import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'events';

// Event Types
export const EVENT_TYPES = {
    HOLIDAY: 'holiday',    // Blue/Purple - General holiday
    COMPETITION: 'competition', // Red/Orange - Competition
    MEETING: 'meeting',    // Green - Staff meeting
    TRAINING: 'training',   // Gray - Special training/Workshop
    OTHER: 'other'
};

export const EVENT_LABELS = {
    [EVENT_TYPES.HOLIDAY]: 'חג/חופשה',
    [EVENT_TYPES.COMPETITION]: 'תחרות',
    [EVENT_TYPES.MEETING]: 'ישיבה/השתלמות',
    [EVENT_TYPES.TRAINING]: 'אימון מיוחד',
    [EVENT_TYPES.OTHER]: 'אחר'
};

export const EVENT_COLORS = {
    [EVENT_TYPES.HOLIDAY]: '#3B82F6', // Blue
    [EVENT_TYPES.COMPETITION]: '#EF4444', // Red
    [EVENT_TYPES.MEETING]: '#10B981', // Green
    [EVENT_TYPES.TRAINING]: '#8B5CF6', // Purple
    [EVENT_TYPES.OTHER]: '#6B7280'  // Gray
};

/**
 * Get events for a specific month (or range)
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {string} centerId - Optional center ID to filter events by center
 */
export const getEvents = async (year, month, centerId = null) => {
    try {
        let q;

        if (centerId) {
            // Get events for specific center
            q = query(
                collection(db, COLLECTION),
                where('year', '==', year),
                where('month', '==', month),
                where('centerId', '==', centerId)
            );
        } else {
            // Get all events (for supervisors)
            q = query(
                collection(db, COLLECTION),
                where('year', '==', year),
                where('month', '==', month)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startDate: doc.data().startDate?.toDate(),
            endDate: doc.data().endDate?.toDate(),
            createdAt: doc.data().createdAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
};

/**
 * Create a new event
 */
export const createEvent = async (eventData) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...eventData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...eventData };
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

/**
 * Update an event
 */
export const updateEvent = async (id, updates) => {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return { id, ...updates };
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};

/**
 * Delete an event
 */
export const deleteEvent = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
};
