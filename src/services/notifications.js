import { db } from './firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { getGroupPlayers } from './players';

const COLLECTION = 'notifications';

// Demo mode helpers
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const demoUser = localStorage.getItem('demoUser');
    return !apiKey || apiKey === 'YOUR_API_KEY' || demoUser !== null;
};

export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

export const subscribeToNotifications = (userId, callback) => {
    if (!userId) return () => { };

    if (isDemoMode()) {
        // In demo mode, just return empty notifications
        callback([]);
        return () => { };
    }

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
    if (isDemoMode()) return;
    await updateDoc(doc(db, COLLECTION, id), { isRead: true });
};

export const markAllAsRead = async (userId) => {
    if (isDemoMode()) return;
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
    if (isDemoMode()) return;
    await addDoc(collection(db, COLLECTION), {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp()
    });
};

export const deleteNotification = async (id) => {
    if (isDemoMode()) return;
    await deleteDoc(doc(db, COLLECTION, id));
};

export const notifyGroup = async (groupId, notification) => {
    if (isDemoMode()) return;
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
    if (isDemoMode()) return;
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
