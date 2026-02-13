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
import { PLAN_STATUS, ROLES } from '../config/constants';
import { notifyRole, NOTIFICATION_TYPES, notifyGroup } from './notifications';

const COLLECTION = 'monthlyPlans';

// Demo mode helpers
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const demoUser = localStorage.getItem('demoUser');
    return !apiKey || apiKey === 'YOUR_API_KEY' || demoUser !== null;
};

const STORAGE_KEY = 'tennis_mock_monthly_plans';

const getMockPlans = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored, (key, value) => {
        if (key === 'createdAt' || key === 'updatedAt') {
            return value ? new Date(value) : value;
        }
        return value;
    }) : [];
};

const saveMockPlans = (plans) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

/**
 * Get monthly plan for a specific month and group
 */
export const getMonthlyPlan = async (groupId, year, month) => {
    if (isDemoMode()) {
        const plans = getMockPlans();
        return plans.find(p => p.groupId === groupId && p.year === year && p.month === month) || null;
    }

    try {
        const q = query(
            collection(db, COLLECTION),
            where('groupId', '==', groupId),
            where('year', '==', year),
            where('month', '==', month)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        };
    } catch (error) {
        console.error('Error fetching monthly plan:', error);
        return null;
    }
};

/**
 * Get all monthly plans for a coach
 */
export const getCoachMonthlyPlans = async (coachId, year = null) => {
    if (isDemoMode()) {
        let plans = getMockPlans().filter(p => p.coachId === coachId);
        if (year) plans = plans.filter(p => p.year === year);
        return plans.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }

    try {
        let q = query(
            collection(db, COLLECTION),
            where('coachId', '==', coachId),
            orderBy('year', 'desc'),
            orderBy('month', 'desc')
        );

        const snapshot = await getDocs(q);
        let plans = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));

        if (year) {
            plans = plans.filter(p => p.year === year);
        }

        return plans;
    } catch (error) {
        console.error('Error fetching coach plans:', error);
        return [];
    }
};

/**
 * Get all monthly plans for a specific date (Admin/Manager view)
 */
export const getAllMonthlyPlans = async (year, month) => {
    if (isDemoMode()) {
        return getMockPlans().filter(p => p.year === year && p.month === month);
    }

    try {
        let q = query(
            collection(db, COLLECTION),
            where('year', '==', year),
            where('month', '==', month)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching all plans:', error);
        return [];
    }
};

/**
 * Get all monthly plans for a group
 */
export const getGroupMonthlyPlans = async (groupId) => {
    if (isDemoMode()) {
        return getMockPlans()
            .filter(p => p.groupId === groupId)
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }

    try {
        const q = query(
            collection(db, COLLECTION),
            where('groupId', '==', groupId),
            orderBy('year', 'desc'),
            orderBy('month', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching group plans:', error);
        return [];
    }
};

/**
 * Create or update a monthly plan
 */
export const saveMonthlyPlan = async (data) => {
    if (isDemoMode()) {
        const plans = getMockPlans();
        const existingIndex = plans.findIndex(
            p => p.groupId === data.groupId && p.year === data.year && p.month === data.month
        );

        if (existingIndex !== -1) {
            plans[existingIndex] = { ...plans[existingIndex], ...data, updatedAt: new Date() };
            saveMockPlans(plans);
            return plans[existingIndex];
        } else {
            const newPlan = {
                ...data,
                id: `plan-${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            plans.push(newPlan);
            saveMockPlans(plans);
            return newPlan;
        }
    }

    try {
        const existing = await getMonthlyPlan(data.groupId, data.year, data.month);

        if (existing) {
            const docRef = doc(db, COLLECTION, existing.id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return { id: existing.id, ...data };
        } else {
            const docRef = await addDoc(collection(db, COLLECTION), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: docRef.id, ...data };
        }
    } catch (error) {
        console.error('Error saving monthly plan:', error);
        throw error;
    }
};

/**
 * Delete a monthly plan
 */
export const deleteMonthlyPlan = async (id) => {
    if (isDemoMode()) {
        const plans = getMockPlans();
        saveMockPlans(plans.filter(p => p.id !== id));
        return { success: true };
    }

    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting monthly plan:', error);
        throw error;
    }
};

/**
 * Submit a monthly plan for approval
 */
export const submitMonthlyPlan = async (id, groupName) => {
    if (isDemoMode()) {
        const plans = getMockPlans();
        const index = plans.findIndex(p => p.id === id);
        if (index !== -1) {
            plans[index].status = PLAN_STATUS.SUBMITTED;
            plans[index].updatedAt = new Date();
            saveMockPlans(plans);
        }
        return { success: true };
    }

    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            status: PLAN_STATUS.SUBMITTED,
            updatedAt: serverTimestamp()
        });

        await notifyRole(ROLES.SUPERVISOR, {
            type: NOTIFICATION_TYPES.INFO,
            title: 'תכנית חודשית חדשה הוגשה',
            message: `תכנית חודשית לקבוצה ${groupName} הוגשה לאישור`,
            relatedEntityId: id,
            relatedEntityType: 'monthlyPlan'
        });

        return { success: true };
    } catch (error) {
        console.error('Error submitting plan:', error);
        throw error;
    }
};

/**
 * Approve a monthly plan
 */
export const approveMonthlyPlan = async (id, coachId, groupName) => {
    if (isDemoMode()) {
        const plans = getMockPlans();
        const index = plans.findIndex(p => p.id === id);
        if (index !== -1) {
            plans[index].status = PLAN_STATUS.APPROVED;
            plans[index].managerFeedback = '';
            plans[index].updatedAt = new Date();
            saveMockPlans(plans);
        }
        return { success: true };
    }

    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            status: PLAN_STATUS.APPROVED,
            managerFeedback: '',
            updatedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error approving plan:', error);
        throw error;
    }
};

/**
 * Reject a monthly plan
 */
export const rejectMonthlyPlan = async (id, feedback, groupName) => {
    if (isDemoMode()) {
        const plans = getMockPlans();
        const index = plans.findIndex(p => p.id === id);
        if (index !== -1) {
            plans[index].status = PLAN_STATUS.REJECTED;
            plans[index].managerFeedback = feedback;
            plans[index].updatedAt = new Date();
            saveMockPlans(plans);
        }
        return { success: true };
    }

    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            status: PLAN_STATUS.REJECTED,
            managerFeedback: feedback,
            updatedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error rejecting plan:', error);
        throw error;
    }
};

/**
 * Get all pending plans (for manager)
 */
export const getPendingMonthlyPlans = async () => {
    if (isDemoMode()) {
        return getMockPlans().filter(p => p.status === PLAN_STATUS.SUBMITTED);
    }

    try {
        const q = query(
            collection(db, COLLECTION),
            where('status', '==', PLAN_STATUS.SUBMITTED),
            orderBy('updatedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching pending plans:', error);
        return [];
    }
};

// Month names in Hebrew
export const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Week themes structure
export const WEEK_STRUCTURE = {
    week1: { label: 'שבוע 1', days: '1-7' },
    week2: { label: 'שבוע 2', days: '8-14' },
    week3: { label: 'שבוע 3', days: '15-21' },
    week4: { label: 'שבוע 4', days: '22-28' },
    week5: { label: 'שבוע 5', days: '29-31' }
};
