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

// Mock data for demo mode
const MOCK_GROUPS = [
    {
        id: 'group-1',
        name: 'תחרותי בנים 14-16',
        centerId: 'center-1',
        coachId: 'demo-coach-1',
        groupTypeId: 'competitive-14-16',
        groupTypeName: 'תחרותי 14-16',
        birthYearFrom: 2010,
        birthYearTo: 2012,
        playerCount: 8,
        notes: 'קבוצה מתחרה באליפות המחוז',
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
    },
    {
        id: 'group-2',
        name: 'מתחילים א',
        centerId: 'center-1',
        coachId: 'demo-coach-1',
        groupTypeId: 'beginners',
        groupTypeName: 'מתחילים',
        birthYearFrom: 2015,
        birthYearTo: 2017,
        playerCount: 12,
        notes: '',
        isActive: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
    },
    {
        id: 'group-3',
        name: 'מתקדמים בנות',
        centerId: 'center-1',
        coachId: 'demo-coach-1',
        groupTypeId: 'intermediate',
        groupTypeName: 'מתקדמים',
        birthYearFrom: 2012,
        birthYearTo: 2014,
        playerCount: 6,
        notes: 'אימון יום שלישי וחמישי',
        isActive: true,
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10'),
    },
];

// Check if we're in demo mode
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const demoUser = localStorage.getItem('demoUser');
    // In demo mode if: no API key, placeholder API key, OR logged in as demo user
    return !apiKey || apiKey === 'YOUR_API_KEY' || demoUser !== null;
};

// Local storage key for mock data persistence
const STORAGE_KEY = 'tennis_mock_groups';

// Get mock groups from localStorage or use defaults
const getMockGroups = () => {
    if (typeof window === 'undefined') return MOCK_GROUPS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_GROUPS;
};

// Save mock groups to localStorage
const saveMockGroups = (groups) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
};

/**
 * Get all groups for a coach
 * @param {string} coachId 
 * @returns {Promise<Array>}
 */
export async function getGroups(coachId) {
    if (isDemoMode()) {
        const groups = getMockGroups();
        return groups.filter(g => g.coachId === coachId && g.isActive);
    }

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
    if (isDemoMode()) {
        return getMockGroups().filter(g => g.isActive);
    }

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
    if (isDemoMode()) {
        const groups = getMockGroups();
        return groups.find(g => g.id === id) || null;
    }

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
    if (isDemoMode()) {
        const groups = getMockGroups();
        const newGroup = {
            ...data,
            id: `group-${Date.now()}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        groups.unshift(newGroup);
        saveMockGroups(groups);
        return newGroup;
    }

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
    if (isDemoMode()) {
        const groups = getMockGroups();
        const index = groups.findIndex(g => g.id === id);
        if (index !== -1) {
            groups[index] = {
                ...groups[index],
                ...data,
                updatedAt: new Date()
            };
            saveMockGroups(groups);
            return groups[index];
        }
        throw new Error('Group not found');
    }

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
    if (isDemoMode()) {
        const groups = getMockGroups();
        const index = groups.findIndex(g => g.id === id);
        if (index !== -1) {
            groups[index].isActive = false;
            saveMockGroups(groups);
        }
        return;
    }

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
    if (isDemoMode()) {
        const groups = getMockGroups();
        const filtered = groups.filter(g => g.id !== id);
        saveMockGroups(filtered);
        return;
    }

    await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Get all groups for a specific center (for center managers)
 * @param {string} centerId
 * @returns {Promise<Array>}
 */
export async function getGroupsByCenter(centerId) {
    if (isDemoMode()) {
        return getMockGroups().filter(g => g.centerId === centerId && g.isActive);
    }

    const q = query(
        collection(db, COLLECTION),
        where('centerId', '==', centerId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
