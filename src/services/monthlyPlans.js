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

/**
 * Get monthly plan for a specific month and group
 */
export const getMonthlyPlan = async (groupId, year, month) => {
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
    try {
        // Check if plan already exists
        const existing = await getMonthlyPlan(data.groupId, data.year, data.month);

        if (existing) {
            // Update existing
            const docRef = doc(db, COLLECTION, existing.id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return { id: existing.id, ...data };
        } else {
            // Create new
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
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            status: PLAN_STATUS.SUBMITTED,
            updatedAt: serverTimestamp()
        });

        // Notify Supervisor
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
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            status: PLAN_STATUS.APPROVED,
            managerFeedback: '', // Clear any previous feedback
            updatedAt: serverTimestamp()
        });

        // Notify Coach (handled by notifyGroup logic if we had user mappings, but here we likely need a direct generic notify or rely on "My Plans" updates)
        // For now, let's assume we notify the coach if we have a way. 
        // Since we don't have direct "notifyUser" by ID easily without looking up their auth ID from somewhere if it's not stored on the plan...
        // Actually, the plan has `coachId`. But `notifyRole` is not relevant.
        // We need a `notifyUser` if we wanted to be precise.
        // For MVP, we'll skip direct notification to coach OR assume he sees it on dashboard.

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
