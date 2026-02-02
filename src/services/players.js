import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'players';

/**
 * Get all players in a specific group
 * @param {string} groupId 
 * @returns {Promise<Array>} List of players
 */
export const getGroupPlayers = async (groupId) => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('groupIds', 'array-contains', groupId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching group players:', error);
        throw error;
    }
};

/**
 * Get a single player
 * @param {string} playerId 
 */
export const getPlayer = async (playerId) => {
    const docRef = doc(db, COLLECTION, playerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

/**
 * Create a new player
 * @param {Object} playerData 
 * @returns {Promise<Object>} Created player
 */
export const createPlayer = async (playerData) => {
    try {
        const data = {
            ...playerData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            active: true
        };
        const docRef = await addDoc(collection(db, COLLECTION), data);
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error('Error creating player:', error);
        throw error;
    }
};

/**
 * Update a player
 * @param {string} playerId 
 * @param {Object} updates 
 */
export const updatePlayer = async (playerId, updates) => {
    try {
        const docRef = doc(db, COLLECTION, playerId);
        const data = {
            ...updates,
            updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, data);
        return data;
    } catch (error) {
        console.error('Error updating player:', error);
        throw error;
    }
};

/**
 * Delete (or deactivate) a player
 * @param {string} playerId 
 */
export const deletePlayer = async (playerId) => {
    try {
        await deleteDoc(doc(db, COLLECTION, playerId));
    } catch (error) {
        console.error('Error deleting player:', error);
        throw error;
    }
};
