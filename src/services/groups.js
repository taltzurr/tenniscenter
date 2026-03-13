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

const COLLECTION = 'groups';

/**
 * Get all groups for a coach
 * @param {string} coachId
 * @returns {Promise<Array>}
 */
export async function getGroups(coachId) {
    const q = query(
        collection(db, COLLECTION),
        where('coachId', '==', coachId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get all groups (for supervisors)
 * @returns {Promise<Array>}
 */
export async function getAllGroups() {
    const q = query(
        collection(db, COLLECTION),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get a single group by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getGroup(id) {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

/**
 * Create a new group
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createGroup(data) {
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return { id: docRef.id, ...data };
}

/**
 * Update a group
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateGroup(id, data) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });

    return { id, ...data };
}

/**
 * Delete a group (soft delete)
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteGroup(id) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Permanently delete a group
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function permanentlyDeleteGroup(id) {
    await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Get all groups for a specific center (for center managers)
 * @param {string} centerId
 * @returns {Promise<Array>}
 */
export async function getGroupsByCenter(centerId) {
    const q = query(
        collection(db, COLLECTION),
        where('centerId', '==', centerId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
