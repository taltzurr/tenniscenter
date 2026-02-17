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
    serverTimestamp,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'trainings';

// Demo mode helpers
const isDemoMode = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const demoUser = localStorage.getItem('demoUser');
    return !apiKey || apiKey === 'YOUR_API_KEY' || demoUser !== null;
};

const STORAGE_KEY = 'tennis_mock_trainings';

const getMockTrainings = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored, (key, value) => {
        if (key === 'date' || key === 'createdAt' || key === 'updatedAt') {
            return value ? new Date(value) : value;
        }
        return value;
    }) : [];
};

const saveMockTrainings = (trainings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trainings));
};

/**
 * Get trainings for a specific coach
 */
export const getCoachTrainings = async (coachId, startDate, endDate, status) => {
    if (isDemoMode()) {
        let trainings = getMockTrainings().filter(t => t.coachId === coachId);
        if (startDate) trainings = trainings.filter(t => new Date(t.date) >= startDate);
        if (endDate) trainings = trainings.filter(t => new Date(t.date) <= endDate);
        if (status) trainings = trainings.filter(t => t.status === status);
        return trainings.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    try {
        let q = query(
            collection(db, COLLECTION),
            where('coachId', '==', coachId)
        );

        if (startDate) {
            q = query(q, where('date', '>=', Timestamp.fromDate(startDate)));
        }
        if (endDate) {
            q = query(q, where('date', '<=', Timestamp.fromDate(endDate)));
        }
        if (status) {
            q = query(q, where('status', '==', status));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate()
        })).sort((a, b) => a.date - b.date);
    } catch (error) {
        console.error('Error fetching trainings:', error);
        throw error;
    }
};

/**
 * Get ALL trainings for the organization (for Manager Analytics)
 */
export const getOrganizationTrainings = async (startDate, endDate) => {
    if (isDemoMode()) {
        let trainings = getMockTrainings();
        if (startDate) trainings = trainings.filter(t => new Date(t.date) >= startDate);
        if (endDate) trainings = trainings.filter(t => new Date(t.date) <= endDate);
        return trainings;
    }

    try {
        if (!startDate || !endDate) throw new Error('Start date and End date are required');

        let q = query(
            collection(db, COLLECTION),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching organization trainings:', error);
        throw error;
    }
};

/**
 * Get a single training
 */
export const getTraining = async (id) => {
    if (isDemoMode()) {
        return getMockTrainings().find(t => t.id === id) || null;
    }

    try {
        const docRef = doc(db, COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
                date: docSnap.data().date?.toDate()
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching training:', error);
        throw error;
    }
};

/**
 * Validates training data payload
 */
const validateTrainingData = (data) => {
    if (!data.date || !(data.date instanceof Date) || Number.isNaN(data.date.getTime())) {
        throw new Error('Invalid or missing date');
    }
    if (!data.coachId) throw new Error('Missing coachId');
    if (!data.groupId && !data.groupName) throw new Error('Missing group information');
};

/**
 * Create a new training
 */
export const createTraining = async (data) => {
    if (isDemoMode()) {
        validateTrainingData(data);
        const trainings = getMockTrainings();
        const newTraining = {
            ...data,
            id: `training-${Date.now()}`,
            status: data.status || 'planned',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        trainings.push(newTraining);
        saveMockTrainings(trainings);
        return newTraining;
    }

    try {
        validateTrainingData(data);

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            date: Timestamp.fromDate(data.date),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return {
            id: docRef.id,
            ...data
        };
    } catch (error) {
        console.error('Error creating training:', error);
        throw error;
    }
};

/**
 * Create recurring trainings (Batch)
 */
import {
    addDays,
    addWeeks,
    addMonths,
    addYears,
    isBefore,
    getDay,
    setDay
} from 'date-fns';

/**
 * Create recurring trainings (Batch) - Advanced
 */
export const createRecurringTrainings = async (baseData, recurrence) => {
    if (isDemoMode()) {
        const trainings = getMockTrainings();
        const created = [];
        const recurrenceGroupId = `recurrence-${Date.now()}`;
        let currentDate = new Date(baseData.date);
        const interval = recurrence.interval || 1;
        const freq = recurrence.frequency;
        const endType = recurrence.endType || 'date';
        let maxDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
        if (maxDate) maxDate.setHours(23, 59, 59, 999);
        const targetCount = endType === 'count' ? (recurrence.count || 13) : 100;
        let count = 0;

        while (count < targetCount) {
            if (endType === 'date' && maxDate && isBefore(maxDate, currentDate)) break;
            if (count >= 100) break;

            const newTraining = {
                ...baseData,
                id: `training-${Date.now()}-${count}`,
                date: new Date(currentDate),
                recurrenceGroupId,
                status: 'planned',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            trainings.push(newTraining);
            created.push(newTraining);
            count++;

            if (freq === 'DAILY') currentDate = addDays(currentDate, interval);
            else if (freq === 'WEEKLY') currentDate = addWeeks(currentDate, interval);
            else if (freq === 'MONTHLY') currentDate = addMonths(currentDate, interval);
            else if (freq === 'YEARLY') currentDate = addYears(currentDate, interval);
        }

        saveMockTrainings(trainings);
        return created;
    }

    try {
        const batch = writeBatch(db);
        const trainings = [];
        const collectionRef = collection(db, COLLECTION);
        const recurrenceGroupId = doc(collectionRef).id;
        let currentDate = new Date(baseData.date);
        const endType = recurrence.endType || 'date';
        let maxDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
        if (maxDate) maxDate.setHours(23, 59, 59, 999);
        const ABSOLUTE_MAX_COUNT = 100;
        const targetCount = endType === 'count' ? (recurrence.count || 13) : ABSOLUTE_MAX_COUNT;
        let count = 0;

        while (count < targetCount) {
            if (endType === 'date' && maxDate && isBefore(maxDate, currentDate)) break;

            const docRef = doc(collectionRef);
            const trainingData = {
                ...baseData,
                date: Timestamp.fromDate(new Date(currentDate)),
                recurrenceGroupId: recurrenceGroupId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            batch.set(docRef, trainingData);
            trainings.push({ id: docRef.id, ...trainingData });
            count++;

            if (count >= ABSOLUTE_MAX_COUNT) break;

            const interval = recurrence.interval || 1;
            const freq = recurrence.frequency;

            if (freq === 'DAILY') {
                currentDate = addDays(currentDate, interval);
            } else if (freq === 'WEEKLY') {
                if (recurrence.days && recurrence.days.length > 0) {
                    const DAYS_MAP = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
                    const selectedIndices = recurrence.days.map(d => DAYS_MAP[d]).sort((a, b) => a - b);
                    const currentDayIndex = getDay(currentDate);
                    const nextDayInWeek = selectedIndices.find(d => d > currentDayIndex);

                    if (nextDayInWeek !== undefined) {
                        const diff = nextDayInWeek - currentDayIndex;
                        currentDate = addDays(currentDate, diff);
                    } else {
                        const currentSunday = setDay(currentDate, 0);
                        const nextTargetSunday = addWeeks(currentSunday, interval);
                        currentDate = setDay(nextTargetSunday, selectedIndices[0]);
                    }
                } else {
                    currentDate = addWeeks(currentDate, interval);
                }
            } else if (freq === 'MONTHLY') {
                currentDate = addMonths(currentDate, interval);
            } else if (freq === 'YEARLY') {
                currentDate = addYears(currentDate, interval);
            }
        }

        await batch.commit();
        return trainings;
    } catch (error) {
        console.error('Error creating recurring trainings:', error);
        throw error;
    }
};

/**
 * Update a training
 */
export const updateTraining = async (id, data) => {
    if (isDemoMode()) {
        const trainings = getMockTrainings();
        const index = trainings.findIndex(t => t.id === id);
        if (index !== -1) {
            trainings[index] = { ...trainings[index], ...data, updatedAt: new Date() };
            saveMockTrainings(trainings);
            return trainings[index];
        }
        throw new Error('Training not found');
    }

    try {
        const docRef = doc(db, COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };

        if (data.date) {
            updateData.date = Timestamp.fromDate(data.date);
        }

        await updateDoc(docRef, updateData);
        return { id, ...updateData };
    } catch (error) {
        console.error('Error updating training:', error);
        throw error;
    }
};

/**
 * Delete a training
 */
export const deleteTraining = async (id) => {
    if (isDemoMode()) {
        const trainings = getMockTrainings();
        const filtered = trainings.filter(t => t.id !== id);
        saveMockTrainings(filtered);
        return true;
    }

    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return true;
    } catch (error) {
        console.error('Error deleting training:', error);
        throw error;
    }
};
