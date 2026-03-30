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
    writeBatch,
    limit,
    orderBy
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'trainings';

/**
 * Get trainings for a specific coach
 */
export const getCoachTrainings = async (coachId, startDate, endDate, status) => {
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
    try {
        if (!startDate || !endDate) throw new Error('Start date and End date are required');

        let q = query(
            collection(db, COLLECTION),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate)),
            limit(1000)
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
    setDay,
    startOfWeek
} from 'date-fns';

/**
 * Create recurring trainings (Batch) - Advanced
 */
export const createRecurringTrainings = async (baseData, recurrence) => {
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
                        // Stay in same week, advance to next selected day
                        const diff = nextDayInWeek - currentDayIndex;
                        currentDate = addDays(currentDate, diff);
                    } else {
                        // No more selected days this week — jump interval weeks, pick first selected day
                        const currentSunday = startOfWeek(currentDate, { weekStartsOn: 0 });
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
        // Only flag truncation if the cap cut the series short (not when count-based endType matches exactly)
        const wasHardCapped = endType !== 'count' && trainings.length >= ABSOLUTE_MAX_COUNT;
        return {
            trainings,
            wasTruncated: wasHardCapped,
            actualCount: trainings.length
        };
    } catch (error) {
        console.error('Error creating recurring trainings:', error);
        throw error;
    }
};

export const fetchSeriesTrainings = async (recurrenceGroupId) => {
    const q = query(
        collection(db, 'trainings'),
        where('recurrenceGroupId', '==', recurrenceGroupId),
        orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() ? doc.data().date.toDate() : doc.data().date
    }));
};

export const updateSeriesTrainings = async (recurrenceGroupId, updates, scope = 'future') => {
    const seriesTrainings = await fetchSeriesTrainings(recurrenceGroupId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trainingsToUpdate = scope === 'all'
        ? seriesTrainings
        : seriesTrainings.filter(t => {
            const trainingDate = t.date instanceof Date ? t.date : new Date(t.date);
            return trainingDate > today;
        });

    if (trainingsToUpdate.length === 0) return { updated: 0 };

    const batch = writeBatch(db);
    trainingsToUpdate.forEach(training => {
        const ref = doc(db, 'trainings', training.id);
        batch.update(ref, { ...updates, updatedAt: Timestamp.now() });
    });

    await batch.commit();
    return { updated: trainingsToUpdate.length };
};

export const deleteSeriesTrainings = async (recurrenceGroupId, scope = 'future') => {
    const seriesTrainings = await fetchSeriesTrainings(recurrenceGroupId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trainingsToDelete = scope === 'all'
        ? seriesTrainings
        : seriesTrainings.filter(t => {
            const trainingDate = t.date instanceof Date ? t.date : new Date(t.date);
            return trainingDate > today;
        });

    if (trainingsToDelete.length === 0) return { deleted: 0 };

    const batch = writeBatch(db);
    trainingsToDelete.forEach(training => {
        const ref = doc(db, 'trainings', training.id);
        batch.delete(ref);
    });

    await batch.commit();
    return { deleted: trainingsToDelete.length, deletedIds: trainingsToDelete.map(t => t.id) };
};

/**
 * Update a training
 */
export const updateTraining = async (id, data) => {
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
    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return true;
    } catch (error) {
        console.error('Error deleting training:', error);
        throw error;
    }
};
