import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'exercises';

/**
 * Get all exercises with optional filters
 * @param {Object} filters - { category, difficulty, ageGroup, search }
 */
export const getExercises = async (filters = {}) => {
    try {
        let q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));

        if (filters.category) {
            q = query(q, where('category', '==', filters.category));
        }
        if (filters.difficulty) {
            q = query(q, where('difficulty', '==', filters.difficulty));
        }

        const snapshot = await getDocs(q);
        let exercises = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Client-side filtering for search and ageGroup (to avoid complex indexes)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            exercises = exercises.filter(ex =>
                ex.title?.toLowerCase().includes(searchLower) ||
                ex.description?.toLowerCase().includes(searchLower) ||
                ex.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }
        if (filters.ageGroup) {
            exercises = exercises.filter(ex =>
                ex.ageGroups?.includes(filters.ageGroup)
            );
        }

        return exercises;
    } catch (error) {
        console.error('Error fetching exercises:', error);
        throw error;
    }
};

/**
 * Get a single exercise by ID
 */
export const getExercise = async (id) => {
    try {
        const docRef = doc(db, COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching exercise:', error);
        throw error;
    }
};

/**
 * Create a new exercise
 */
export const createExercise = async (data) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        const now = new Date();
        return {
            id: docRef.id,
            ...data,
            createdAt: now,
            updatedAt: now
        };
    } catch (error) {
        console.error('Error creating exercise:', error);
        throw error;
    }
};

/**
 * Update an exercise
 */
export const updateExercise = async (id, data) => {
    try {
        const docRef = doc(db, COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, updateData);
        return { id, ...data, updatedAt: new Date() };
    } catch (error) {
        console.error('Error updating exercise:', error);
        throw error;
    }
};

/**
 * Delete an exercise
 */
export const deleteExercise = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return true;
    } catch (error) {
        console.error('Error deleting exercise:', error);
        throw error;
    }
};

// Exercise categories (game situations / מצבי משחק)
export const EXERCISE_CATEGORIES = [
    { value: 'serving', label: 'שחקן מגיש', emoji: '🎾' },
    { value: 'returning', label: 'שחקן מחזיר', emoji: '↩️' },
    { value: 'two_behind', label: 'שניים מאחור', emoji: '👬' },
    { value: 'approaching', label: 'שחקן מתקרב', emoji: '⬅️' },
    { value: 'passing', label: 'שחקן מעביר', emoji: '↖️' },
    { value: 'practice_games', label: 'משחקי אימון', emoji: '🆚' },
];

// Age groups
export const AGE_GROUPS = [
    { value: '4-6', label: '4-6 שנים' },
    { value: '6-8', label: '6-8 שנים' },
    { value: '9-12', label: '9-12 שנים' },
    { value: '13-16', label: '13-16 שנים' },
    { value: '16+', label: '16+ שנים' },
];

// Exercise topics (נושא התרגיל)
export const EXERCISE_TOPICS = [
    { value: 'center_options', label: 'מרכז אפשרויות' },
    { value: 'practice_game', label: 'משחק אימון' },
    { value: 'direction', label: 'כיוון' },
    { value: 'stability', label: 'יציבות' },
    { value: 'depth', label: 'עומק' },
    { value: 'height', label: 'גובה' },
    { value: 'physical_warmup', label: 'חימום פיזי' },
    { value: 'agility', label: 'זריזות' },
    { value: 'power', label: 'עוצמה' },
    { value: 'spins', label: 'סיבוביות' },
    { value: 'ball_feel', label: 'רגש בכדור' },
    { value: 'game_skill', label: 'מיומנות משחק' },
];

// Game components (מרכיב משחק)
export const GAME_COMPONENTS = [
    { value: 'technical', label: 'טכני' },
    { value: 'physical', label: 'פיזי' },
    { value: 'tactical', label: 'טקטי' },
    { value: 'mental', label: 'מנטלי' },
    { value: 'cognitive', label: 'הכרתי' },
];

// Difficulty levels (play levels / רמות משחק)
export const DIFFICULTY_LEVELS = [
    { value: 'beginners', label: 'מתחילים', emoji: '🟢', color: '#4caf50' },
    { value: 'advanced', label: 'מתקדמים', emoji: '🟡', color: '#ff9800' },
    { value: 'very_advanced', label: 'מתקדמים מאוד', emoji: '🔴', color: '#f44336' },
    { value: 'all_levels', label: 'כל הרמות', emoji: '🌐', color: '#2196f3' },
];
