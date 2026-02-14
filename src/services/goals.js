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

const COLLECTION = 'goals';

// Goal types
export const GOAL_TYPES = {
    CENTER: 'center',      // Center-wide goals
    GROUP: 'group',        // Group-specific goals
    SEASONAL: 'seasonal',  // Seasonal goals
    VALUE: 'value'         // Center values
};

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

/**
 * Get all center values
 */
export const getCenterValues = async () => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', GOAL_TYPES.VALUE),
            orderBy('order', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching center values:', error);
        return [];
    }
};

/**
 * Get all goals for a center
 */
export const getCenterGoals = async () => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', GOAL_TYPES.CENTER),
            orderBy('order', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching center goals:', error);
        return [];
    }
};

/**
 * Get goals for a specific group
 */
export const getGroupGoals = async (groupId) => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', GOAL_TYPES.GROUP),
            where('groupId', '==', groupId),
            orderBy('order', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching group goals:', error);
        return [];
    }
};

/**
 * Get seasonal goals
 */
export const getSeasonalGoals = async (season, year) => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', GOAL_TYPES.SEASONAL),
            where('season', '==', season),
            where('year', '==', year)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching seasonal goals:', error);
        return [];
    }
};

/**
 * Save a goal (create or update)
 */
export const saveGoal = async (goalData) => {
    try {
        const id = goalData.id || doc(collection(db, COLLECTION)).id;
        const docRef = doc(db, COLLECTION, id);

        await setDoc(docRef, {
            ...goalData,
            id,
            updatedAt: serverTimestamp(),
            createdAt: goalData.createdAt || serverTimestamp()
        }, { merge: true });

        return { id, ...goalData };
    } catch (error) {
        console.error('Error saving goal:', error);
        throw error;
    }
};

/**
 * Delete a goal
 */
export const deleteGoal = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting goal:', error);
        throw error;
    }
};

/**
 * Reorder goals
 */
export const reorderGoals = async (goals) => {
    try {
        const updates = goals.map((goal, index) =>
            setDoc(doc(db, COLLECTION, goal.id), { order: index }, { merge: true })
        );
        await Promise.all(updates);
        return { success: true };
    } catch (error) {
        console.error('Error reordering goals:', error);
        throw error;
    }
};

// Default center values
export const DEFAULT_VALUES = [
    { id: 'respect', title: 'כבוד', description: 'כבוד לעצמי, למאמנים, לשחקנים אחרים ולמגרש', icon: '🙏' },
    { id: 'effort', title: 'מאמץ', description: 'לתת את המקסימום בכל אימון', icon: '💪' },
    { id: 'teamwork', title: 'עבודת צוות', description: 'לעזור ולתמוך בחברי הקבוצה', icon: '🤝' },
    { id: 'discipline', title: 'משמעת', description: 'הגעה בזמן, הקשבה, ציות להוראות', icon: '⏰' },
    { id: 'enjoyment', title: 'הנאה', description: 'ליהנות מהמשחק והתהליך', icon: '😊' }
];
