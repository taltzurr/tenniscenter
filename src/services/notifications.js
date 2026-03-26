import { db } from './firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { getGroupPlayers } from './players';

const COLLECTION = 'notifications';

export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

export const subscribeToNotifications = (userId, callback) => {
    if (!userId) return () => { };

    const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notifications);
    }, (error) => {
        console.error('[Notifications] Subscription error:', error);
        callback([]);
    });
};

export const markAsRead = async (id) => {
    await updateDoc(doc(db, COLLECTION, id), { isRead: true });
};

export const markAllAsRead = async (userId) => {
    const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
};

export const createNotification = async (notification) => {
    await addDoc(collection(db, COLLECTION), {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp()
    });
};

export const deleteNotification = async (id) => {
    await deleteDoc(doc(db, COLLECTION, id));
};

export const notifyGroup = async (groupId, notification) => {
    try {
        const players = await getGroupPlayers(groupId);
        if (players.length === 0) return;

        const batch = writeBatch(db);
        players.forEach(player => {
            const docRef = doc(collection(db, COLLECTION));
            batch.set(docRef, {
                ...notification,
                playerId: player.id,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
    } catch (error) {
        console.error('Error notifying group:', error);
    }
};

/**
 * Notify all users with a specific role
 */
export const notifyRole = async (role, notification) => {
    try {
        const q = query(
            collection(db, 'users'),
            where('role', '==', role)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(userDoc => {
            const docRef = doc(collection(db, COLLECTION));
            batch.set(docRef, {
                ...notification,
                userId: userDoc.id,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
    } catch (error) {
        console.error(`Error notifying role ${role}:`, error);
    }
};

/**
 * Notify center managers of a specific center
 */
export const notifyCenterManagers = async (centerId, notification) => {
    try {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'centerManager'),
            where('centerIds', 'array-contains', centerId)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(userDoc => {
            const docRef = doc(collection(db, COLLECTION));
            batch.set(docRef, {
                ...notification,
                userId: userDoc.id,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
    } catch (error) {
        console.error('Error notifying center managers:', error);
    }
};
