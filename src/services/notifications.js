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
        // 1. Fetch all players in the group
        const players = await getGroupPlayers(groupId);

        if (players.length === 0) return;

        // 2. Create notification for each player (simulated by creating one for each player record found)
        // NOTE: In a real app with Auth, we would notify the *User* associated with the player/parent.
        // For now, assuming we might map player -> userId, or just storing it for reference.
        // Since we don't have mapped Users for players yet, this is still effectively a "system" notification record
        // that might not be seen unless a User claims a Player profile.
        // However, to fulfill the requirement, we will create the records.

        const batch = writeBatch(db);

        players.forEach(player => {
            // If player has a linked userId, notify them. 
            // Currently players are just profiles. 
            // We will skip actual notification creation if no userId is associated, 
            // OR create it with 'playerId' field so it can be fetched later.

            const docRef = doc(collection(db, COLLECTION));
            batch.set(docRef, {
                ...notification,
                playerId: player.id, // Target specific player profile
                // userId: player.userId || null, // If we had this
                isRead: false,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`Notified ${players.length} players in group ${groupId}`);
    } catch (error) {
        console.error('Error notifying group:', error);
    }
};

/**
 * Notify all users with a specific role
 * @param {string} role - The role to notify (e.g. 'supervisor')
 * @param {Object} notification - Notification object
 */
export const notifyRole = async (role, notification) => {
    try {
        // 1. Get all users with the specified role
        const q = query(
            collection(db, 'users'),
            where('role', '==', role)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`No users found with role: ${role}`);
            return;
        }

        // 2. Batch create notifications
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
        console.log(`Notified ${snapshot.size} users with role ${role}`);

    } catch (error) {
        console.error(`Error notifying role ${role}:`, error);
    }
};
