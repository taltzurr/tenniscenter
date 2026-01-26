/**
 * Trainings Service
 * Manages training sessions with recurring support
 */

import {
  where,
  orderBy,
  Timestamp,
  writeBatch,
  collection,
  doc
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { BaseService, dateToTimestamp } from './base.service';
import type {
  Training,
  CreateTrainingData,
  UpdateData,
  TrainingStatus,
  RecurringRule,
  DateRangeParams
} from '../types';

class TrainingsService extends BaseService<Training, CreateTrainingData, UpdateData<Training>> {
  constructor() {
    super(COLLECTIONS.TRAININGS);
  }

  /**
   * Get trainings by coach
   */
  async getByCoach(coachId: string): Promise<Training[]> {
    return this.query(
      where('coachId', '==', coachId),
      orderBy('date', 'desc')
    );
  }

  /**
   * Get trainings by coach for date range
   */
  async getByCoachAndDateRange(
    coachId: string,
    { startDate, endDate }: DateRangeParams
  ): Promise<Training[]> {
    return this.query(
      where('coachId', '==', coachId),
      where('date', '>=', dateToTimestamp(startDate)),
      where('date', '<=', dateToTimestamp(endDate)),
      orderBy('date', 'asc')
    );
  }

  /**
   * Get trainings by group
   */
  async getByGroup(groupId: string): Promise<Training[]> {
    return this.query(
      where('groupId', '==', groupId),
      orderBy('date', 'desc')
    );
  }

  /**
   * Get trainings by center
   */
  async getByCenter(centerId: string): Promise<Training[]> {
    return this.query(
      where('centerId', '==', centerId),
      orderBy('date', 'desc')
    );
  }

  /**
   * Get trainings by center for date range
   */
  async getByCenterAndDateRange(
    centerId: string,
    { startDate, endDate }: DateRangeParams
  ): Promise<Training[]> {
    return this.query(
      where('centerId', '==', centerId),
      where('date', '>=', dateToTimestamp(startDate)),
      where('date', '<=', dateToTimestamp(endDate)),
      orderBy('date', 'asc')
    );
  }

  /**
   * Get trainings for a specific date
   */
  async getByDate(coachId: string, date: Date): Promise<Training[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.query(
      where('coachId', '==', coachId),
      where('date', '>=', dateToTimestamp(startOfDay)),
      where('date', '<=', dateToTimestamp(endOfDay)),
      orderBy('date', 'asc')
    );
  }

  /**
   * Get trainings by status
   */
  async getByStatus(coachId: string, status: TrainingStatus): Promise<Training[]> {
    return this.query(
      where('coachId', '==', coachId),
      where('status', '==', status),
      orderBy('date', 'desc')
    );
  }

  /**
   * Get trainings for monthly plan
   */
  async getForMonthlyPlan(coachId: string, month: string): Promise<Training[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    return this.getByCoachAndDateRange(coachId, { startDate, endDate });
  }

  /**
   * Create a single training
   */
  async createTraining(data: CreateTrainingData): Promise<Training> {
    const trainingData = {
      ...data,
      date: dateToTimestamp(data.date),
      status: 'planned' as TrainingStatus,
      isRecurring: false,
    };

    return this.create(trainingData as unknown as CreateTrainingData);
  }

  /**
   * Create recurring trainings
   */
  async createRecurringTrainings(data: CreateTrainingData): Promise<Training[]> {
    if (!data.recurringRule) {
      throw new Error('Recurring rule is required');
    }

    const dates = this.generateRecurringDates(data.date, data.recurringRule);
    const recurringId = doc(collection(db, COLLECTIONS.TRAININGS)).id;

    const batch = writeBatch(db);
    const trainingRefs: string[] = [];

    const recurringRule: RecurringRule = {
      frequency: data.recurringRule.frequency,
      endType: data.recurringRule.endType,
      endCount: data.recurringRule.endCount,
      endDate: data.recurringRule.endDate
        ? dateToTimestamp(data.recurringRule.endDate)
        : undefined,
      exceptions: [],
    };

    for (const date of dates) {
      const trainingRef = doc(collection(db, COLLECTIONS.TRAININGS));
      trainingRefs.push(trainingRef.id);

      batch.set(trainingRef, {
        groupId: data.groupId,
        groupName: data.groupName,
        coachId: data.coachId,
        coachName: data.coachName,
        centerId: data.centerId,
        date: dateToTimestamp(date),
        startTime: data.startTime,
        endTime: data.endTime,
        periodType: data.periodType,
        gameState: data.gameState,
        gameComponent: data.gameComponent,
        topics: data.topics,
        details: data.details,
        exercises: data.exercises,
        status: 'planned',
        isRecurring: true,
        recurringId,
        recurringRule,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    // Fetch and return created trainings
    const createdTrainings: Training[] = [];
    for (const id of trainingRefs) {
      const training = await this.getById(id);
      if (training) {
        createdTrainings.push(training);
      }
    }

    return createdTrainings;
  }

  /**
   * Generate dates for recurring training
   */
  private generateRecurringDates(
    startDate: Date,
    rule: NonNullable<CreateTrainingData['recurringRule']>
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    let count = 0;
    const maxIterations = 365; // Safety limit

    const endDate = rule.endDate ? new Date(rule.endDate) : null;
    const endCount = rule.endCount || maxIterations;

    while (count < maxIterations) {
      // Check end conditions
      if (rule.endType === 'count' && count >= endCount) break;
      if (rule.endType === 'date' && endDate && current > endDate) break;

      dates.push(new Date(current));
      count++;

      // Increment based on frequency
      switch (rule.frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'biweekly':
          current.setDate(current.getDate() + 14);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }

  /**
   * Update training status
   */
  async updateStatus(trainingId: string, status: TrainingStatus): Promise<Training> {
    const updateData: Partial<Training> = { status };

    if (status === 'completed') {
      updateData.completedAt = Timestamp.now();
    }

    return this.update(trainingId, updateData);
  }

  /**
   * Mark training as completed
   */
  async markCompleted(trainingId: string): Promise<Training> {
    return this.updateStatus(trainingId, 'completed');
  }

  /**
   * Cancel training
   */
  async cancelTraining(trainingId: string): Promise<Training> {
    return this.updateStatus(trainingId, 'cancelled');
  }

  /**
   * Duplicate training to another date
   */
  async duplicate(trainingId: string, newDate: Date): Promise<Training> {
    const original = await this.getById(trainingId);

    if (!original) {
      throw new Error('Training not found');
    }

    const { id, createdAt, updatedAt, status, completedAt, isRecurring, recurringId, recurringRule, ...trainingData } = original;

    return this.create({
      ...trainingData,
      date: dateToTimestamp(newDate),
      status: 'planned',
      isRecurring: false,
    } as unknown as CreateTrainingData);
  }

  /**
   * Update single recurring instance
   */
  async updateSingleInstance(trainingId: string, data: UpdateData<Training>): Promise<Training> {
    const training = await this.getById(trainingId);

    if (!training) {
      throw new Error('Training not found');
    }

    // Remove from recurring series
    return this.update(trainingId, {
      ...data,
      isRecurring: false,
      recurringId: undefined,
      recurringRule: undefined,
    });
  }

  /**
   * Update all future recurring instances
   */
  async updateFutureInstances(
    trainingId: string,
    data: UpdateData<Training>
  ): Promise<Training[]> {
    const training = await this.getById(trainingId);

    if (!training || !training.recurringId) {
      throw new Error('Training not found or not recurring');
    }

    // Get all future trainings in the series
    const allInSeries = await this.query(
      where('recurringId', '==', training.recurringId),
      where('date', '>=', training.date),
      orderBy('date', 'asc')
    );

    const batch = writeBatch(db);

    for (const t of allInSeries) {
      const ref = doc(db, COLLECTIONS.TRAININGS, t.id);
      batch.update(ref, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    // Return updated trainings
    return this.query(
      where('recurringId', '==', training.recurringId),
      where('date', '>=', training.date),
      orderBy('date', 'asc')
    );
  }

  /**
   * Update all instances in recurring series
   */
  async updateAllInstances(
    trainingId: string,
    data: UpdateData<Training>
  ): Promise<Training[]> {
    const training = await this.getById(trainingId);

    if (!training || !training.recurringId) {
      throw new Error('Training not found or not recurring');
    }

    const allInSeries = await this.query(
      where('recurringId', '==', training.recurringId)
    );

    const batch = writeBatch(db);

    for (const t of allInSeries) {
      const ref = doc(db, COLLECTIONS.TRAININGS, t.id);
      batch.update(ref, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    return this.query(where('recurringId', '==', training.recurringId));
  }

  /**
   * Delete single recurring instance
   */
  async deleteSingleInstance(trainingId: string): Promise<void> {
    const training = await this.getById(trainingId);

    if (!training) {
      throw new Error('Training not found');
    }

    if (training.isRecurring && training.recurringId && training.recurringRule) {
      // Add to exceptions list in other instances
      const dateStr = training.date.toDate().toISOString().split('T')[0];
      const otherInstances = await this.query(
        where('recurringId', '==', training.recurringId)
      );

      const batch = writeBatch(db);

      for (const t of otherInstances) {
        if (t.id !== trainingId && t.recurringRule) {
          const ref = doc(db, COLLECTIONS.TRAININGS, t.id);
          batch.update(ref, {
            recurringRule: {
              ...t.recurringRule,
              exceptions: [...(t.recurringRule.exceptions || []), dateStr],
            },
            updatedAt: Timestamp.now(),
          });
        }
      }

      batch.delete(doc(db, COLLECTIONS.TRAININGS, trainingId));
      await batch.commit();
    } else {
      await this.delete(trainingId);
    }
  }

  /**
   * Check for time conflicts
   */
  async checkConflicts(
    coachId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeTrainingId?: string
  ): Promise<Training[]> {
    const trainings = await this.getByDate(coachId, date);

    return trainings.filter(t => {
      if (excludeTrainingId && t.id === excludeTrainingId) return false;
      if (t.status === 'cancelled') return false;

      // Check time overlap
      const tStart = this.timeToMinutes(t.startTime);
      const tEnd = this.timeToMinutes(t.endTime);
      const newStart = this.timeToMinutes(startTime);
      const newEnd = this.timeToMinutes(endTime);

      return (newStart < tEnd && newEnd > tStart);
    });
  }

  /**
   * Convert time string to minutes for comparison
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

export const trainingsService = new TrainingsService();
