import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const GOALS_COLLECTION = 'goals';
const ASSIGNMENTS_COLLECTION = 'monthlyAssignments';

// Value categories
export const VALUE_CATEGORIES = {
    RESPECT: { id: 'respect', label: 'כבוד' },
    EFFORT: { id: 'effort', label: 'מאמץ' },
    TEAMWORK: { id: 'teamwork', label: 'עבודת צוות' },
    DISCIPLINE: { id: 'discipline', label: 'משמעת' },
    ENJOYMENT: { id: 'enjoyment', label: 'הנאה' },
    SPORTSMANSHIP: { id: 'sportsmanship', label: 'ספורטיביות' },
    PERSEVERANCE: { id: 'perseverance', label: 'התמדה' }
};

// Goal categories
export const GOAL_CATEGORIES = {
    TECHNICAL: { id: 'technical', label: 'טכני', icon: 'Target' },
    TACTICAL: { id: 'tactical', label: 'טקטי', icon: 'Puzzle' },
    PHYSICAL: { id: 'physical', label: 'פיזי', icon: 'Dumbbell' },
    MENTAL: { id: 'mental', label: 'מנטלי', icon: 'Brain' },
    VALUES: { id: 'values', label: 'ערכים', icon: 'Heart' }
};

// ==========================================
// Goal / Value DEFINITIONS (goals collection)
// ==========================================

/**
 * Get all goal definitions (type='goal')
 */
export const getAllGoalDefinitions = async () => {
    try {
        const q = query(
            collection(db, GOALS_COLLECTION),
            where('type', '==', 'goal'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('Error fetching goal definitions:', error);
        return [];
    }
};

/**
 * Get all value definitions (type='value')
 */
export const getAllValueDefinitions = async () => {
    try {
        const q = query(
            collection(db, GOALS_COLLECTION),
            where('type', '==', 'value'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('Error fetching value definitions:', error);
        return [];
    }
};

/**
 * Save a goal or value definition (create or update)
 */
export const saveGoalDefinition = async (data) => {
    try {
        const id = data.id || doc(collection(db, GOALS_COLLECTION)).id;
        const docRef = doc(db, GOALS_COLLECTION, id);
        await setDoc(docRef, {
            ...data,
            id,
            updatedAt: serverTimestamp(),
            createdAt: data.createdAt || serverTimestamp()
        }, { merge: true });
        return { id, ...data };
    } catch (error) {
        console.error('Error saving goal definition:', error);
        throw error;
    }
};

/**
 * Delete a goal or value definition
 */
export const deleteGoalDefinition = async (id) => {
    try {
        await deleteDoc(doc(db, GOALS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting goal definition:', error);
        throw error;
    }
};

// ==========================================
// Monthly Assignments (monthlyAssignments collection)
// ==========================================

/**
 * Get monthly assignment for a specific year/month
 * Document ID format: {year}_{month}
 */
export const getMonthlyAssignment = async (year, month) => {
    try {
        const docId = `${year}_${month}`;
        const docRef = doc(db, ASSIGNMENTS_COLLECTION, docId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching monthly assignment:', error);
        return null;
    }
};

/**
 * Save monthly assignment (create or update)
 */
export const saveMonthlyAssignment = async (year, month, goalsByType, valueIds) => {
    try {
        const docId = `${year}_${month}`;
        const docRef = doc(db, ASSIGNMENTS_COLLECTION, docId);

        // Compute flat goalIds for backward compatibility (union of all goal IDs across types)
        const allGoalIds = new Set();
        if (goalsByType && typeof goalsByType === 'object') {
            Object.values(goalsByType).forEach(ids => {
                (ids || []).forEach(id => allGoalIds.add(id));
            });
        }

        const data = {
            year,
            month,
            goalsByType: goalsByType || {},
            goalIds: [...allGoalIds],
            valueIds: valueIds || [],
            updatedAt: serverTimestamp()
        };

        // Check if it exists to preserve createdAt
        const existing = await getDoc(docRef);
        if (!existing.exists()) {
            data.createdAt = serverTimestamp();
        }

        await setDoc(docRef, data, { merge: true });
        return { id: docId, ...data };
    } catch (error) {
        console.error('Error saving monthly assignment:', error);
        throw error;
    }
};
