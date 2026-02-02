import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'comments';

/**
 * Get comments for a specific entity (training, exercise, group, etc.)
 */
export const getComments = async (entityType, entityId) => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('entityType', '==', entityType),
            where('entityId', '==', entityId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
};

/**
 * Get all comments by a user
 */
export const getUserComments = async (userId) => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching user comments:', error);
        return [];
    }
};

/**
 * Add a new comment
 */
/**
 * Add a new comment
 * @param {Object} data - { text, authorId, authorName, entityType, entityId }
 */
export const addComment = async (data) => {
    try {
        if (!data.text || typeof data.text !== 'string' || !data.text.trim()) {
            throw new Error('Comment text is required');
        }
        if (!data.authorId) throw new Error('Author ID is required');
        if (!data.entityType || !data.entityId) throw new Error('Entity binding is required');

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            text: data.text.trim(),
            createdAt: serverTimestamp()
        });
        return {
            id: docRef.id,
            ...data,
            createdAt: new Date()
        };
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

/**
 * Update a comment
 */
export const updateComment = async (id, text) => {
    try {
        if (!text || typeof text !== 'string' || !text.trim()) {
            throw new Error('Comment text cannot be empty');
        }

        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            text: text.trim(),
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating comment:', error);
        throw error;
    }
};

/**
 * Delete a comment
 */
export const deleteComment = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

// Entity types
export const ENTITY_TYPES = {
    TRAINING: 'training',
    EXERCISE: 'exercise',
    GROUP: 'group',
    PLAYER: 'player',
    MONTHLY_PLAN: 'monthlyPlan'
};
