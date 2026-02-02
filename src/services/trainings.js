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

/**
 * Get trainings for a specific coach
 * @param {string} coachId
 * @param {Date} startDate (Optional)
 * @param {Date} endDate (Optional)
 * @param {string} status (Optional) - 'completed' | 'planned' | 'pending'
 */
export const getCoachTrainings = async (coachId, startDate, endDate, status) => {
    try {
        let q = query(
            collection(db, COLLECTION),
            where('coachId', '==', coachId)
            // Note: Compound queries with range filters require an index.
            // We'll sort via client-side if needed for simple prototype, 
            // or rely on index creation link in console.
        );

        if (startDate) {
            q = query(q, where('date', '>=', Timestamp.fromDate(startDate)));
        }
        if (endDate) {
            q = query(q, where('date', '<=', Timestamp.fromDate(endDate)));
        }
        if (status) {
            // Note: This might require a composite index (coachId + status + date)
            q = query(q, where('status', '==', status));
        }

        // Add sorting by date
        // q = query(q, orderBy('date', 'asc')); 

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Timestamp to Date for easier UI handling
            date: doc.data().date?.toDate()
        })).sort((a, b) => a.date - b.date); // Client-side sort to avoid index issues initially
    } catch (error) {
        console.error('Error fetching trainings:', error);
        throw error;
    }
};

/**
 * Get ALL trainings for the organization (for Manager Analytics)
 * @param {Date} startDate
 * @param {Date} endDate
 */
/**
 * Get ALL trainings for the organization (for Manager Analytics)
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const getOrganizationTrainings = async (startDate, endDate) => {
    try {
        if (!startDate || !endDate) throw new Error('Start date and End date are required');

        let q = query(
            collection(db, COLLECTION),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        );

        // Note: This query requires a composite index on 'date' if not already present,
        // but typically single field range queries are fine.

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
 * @param {Object} data 
 * @throws {Error} if validation fails
 */
const validateTrainingData = (data) => {
    if (!data.date || !(data.date instanceof Date) || Number.isNaN(data.date.getTime())) {
        throw new Error('Invalid or missing date');
    }
    if (!data.coachId) throw new Error('Missing coachId');
    if (!data.groupId && !data.groupName) throw new Error('Missing group information');
    // Add more validation as needed
};

/**
 * Create a new training
 * @param {Object} data
 * @returns {Promise<Object>} Created training
 */
export const createTraining = async (data) => {
    try {
        validateTrainingData(data); // Validate input

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            date: Timestamp.fromDate(data.date), // Ensure Date is stored as Timestamp
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
 * @param {Object} baseData - The training data to replicate
 * @param {Date} endDate - When to stop the recurrence
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
 * @param {Object} baseData - The training data to replicate
 * @param {Object} recurrence - { frequency, interval, days, endDate, endType, count }
 */
export const createRecurringTrainings = async (baseData, recurrence) => {
    try {
        const batch = writeBatch(db);
        const trainings = [];
        const collectionRef = collection(db, COLLECTION);

        // Generate recurrence ID for linking
        const recurrenceGroupId = doc(collectionRef).id;

        let currentDate = new Date(baseData.date);

        // Determine End Condition
        // Logic: specific date limit OR count limit
        const endType = recurrence.endType || 'date';
        let maxDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
        if (maxDate) maxDate.setHours(23, 59, 59, 999);

        // Safety cap: Never generate more than 100 events to avoid batch limits/infinite loops
        const ABSOLUTE_MAX_COUNT = 100;
        const targetCount = endType === 'count' ? (recurrence.count || 13) : ABSOLUTE_MAX_COUNT;

        let count = 0;

        // We will loop "targetCount" times, but break early if date exceeds maxDate
        // However, we need to handle "next occurrence" logic carefully.

        // Start loop
        // We might need to adjust start date logic depending on if "currentDate" itself counts
        // Usually, the first event is the one explicitly set.

        // Base case: Use a while loop with safety breaks
        while (count < targetCount) {
            // Date Check
            if (endType === 'date' && maxDate && isBefore(maxDate, currentDate)) {
                break;
            }

            // Add Event
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

            if (count >= ABSOLUTE_MAX_COUNT) break; // Safety break

            // Calculate Next Date
            const interval = recurrence.interval || 1;
            const freq = recurrence.frequency;

            if (freq === 'DAILY') {
                currentDate = addDays(currentDate, interval);
            } else if (freq === 'WEEKLY') {
                // Complex Weekly Logic with "Specific Days"
                if (recurrence.days && recurrence.days.length > 0) {
                    // Find next valid day in the list
                    // Current day index
                    // We need to support cases like "Mon, Wed"
                    // This simple logic below assumes standard weekly interval without specific days shift implementation for now
                    // To properly support "Mon, Wed" within same week, we need nested logic or "Next Valid Day" finder.

                    // For MVP of "Google Style", often it jumps to "Next occurrence based on interval".
                    // But if user selected "Mon, Wed", and starts on Mon, next is Wed (same week).

                    // Refined Logic for Multi-Day Weekly:
                    // 1. Get current day index.
                    // 2. Sort selected days indices (SU=0, MO=1...).
                    // 3. Find if there is a day in THIS week after today.
                    // 4. If yes, move to that day.
                    // 5. If no, move to FIRST day of (Current Week + Interval).

                    const DAYS_MAP = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
                    const selectedIndices = recurrence.days.map(d => DAYS_MAP[d]).sort((a, b) => a - b);
                    const currentDayIndex = getDay(currentDate);

                    const nextDayInWeek = selectedIndices.find(d => d > currentDayIndex);

                    if (nextDayInWeek !== undefined) {
                        // Move to next day in same week
                        const diff = nextDayInWeek - currentDayIndex;
                        currentDate = addDays(currentDate, diff);
                    } else {
                        // Move to next interval week, first selected day
                        // Start of next interval week
                        // Be careful relying on "addWeeks" directly if we are mid-week.
                        // Standard approach: Jump to (Week Start + Interval Weeks) + First Selected Day
                        // But we must respect the current date reference.

                        // Simplest Robust Logic:
                        // Keep adding 1 day until match, then check week interval? No, too slow.

                        // Jump to next week(s)
                        // Find the Sunday of the *next* valid week
                        const currentSunday = setDay(currentDate, 0);
                        const nextTargetSunday = addWeeks(currentSunday, interval);

                        // Set to first selected day of that week
                        currentDate = setDay(nextTargetSunday, selectedIndices[0]);

                        // Edge case: if setDay moves backwards (e.g. current is Wed, we want Mon of next week), setDay(nextWeek, 1) is correct.
                        // setDay(date, 1) on a Sunday returns the Monday of THAT week (tomorrow).
                        // setDay(date, 1) on a Saturday returns the Monday of THAT week (past).
                        // We used addWeeks, so we are safely in the future week.
                    }
                } else {
                    // Simple Weekly (Interval only)
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
