/**
 * Coaches Service
 * Manages coach data
 */

import { where, orderBy, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService } from './base.service';
import type { Coach, CreateCoachData, UpdateData } from '../types';

class CoachesService extends BaseService<Coach, CreateCoachData, UpdateData<Coach>> {
  constructor() {
    super(COLLECTIONS.COACHES);
  }

  /**
   * Get all active coaches
   */
  async getActiveCoaches(): Promise<Coach[]> {
    return this.query(
      where('isActive', '==', true),
      where('isArchived', '==', false),
      orderBy('displayName', 'asc')
    );
  }

  /**
   * Get coaches by center
   */
  async getCoachesByCenter(centerId: string): Promise<Coach[]> {
    return this.query(
      where('centerIds', 'array-contains', centerId),
      where('isActive', '==', true),
      where('isArchived', '==', false),
      orderBy('displayName', 'asc')
    );
  }

  /**
   * Get archived coaches
   */
  async getArchivedCoaches(): Promise<Coach[]> {
    return this.query(
      where('isArchived', '==', true),
      orderBy('archivedAt', 'desc')
    );
  }

  /**
   * Create a new coach
   */
  async createCoach(data: CreateCoachData): Promise<Coach> {
    return this.createWithId(data.userId, {
      ...data,
      isActive: true,
      isArchived: false,
    } as CreateCoachData);
  }

  /**
   * Add coach to center
   */
  async addToCenter(coachId: string, centerId: string): Promise<Coach> {
    const coach = await this.getById(coachId);

    if (!coach) {
      throw new Error('Coach not found');
    }

    if (coach.centerIds.includes(centerId)) {
      return coach;
    }

    return this.update(coachId, {
      centerIds: [...coach.centerIds, centerId],
    });
  }

  /**
   * Remove coach from center
   */
  async removeFromCenter(coachId: string, centerId: string): Promise<Coach> {
    const coach = await this.getById(coachId);

    if (!coach) {
      throw new Error('Coach not found');
    }

    return this.update(coachId, {
      centerIds: coach.centerIds.filter(id => id !== centerId),
    });
  }

  /**
   * Archive coach (when they leave)
   */
  async archiveCoach(coachId: string): Promise<Coach> {
    return this.update(coachId, {
      isArchived: true,
      archivedAt: Timestamp.now(),
    });
  }

  /**
   * Restore archived coach
   */
  async restoreCoach(coachId: string): Promise<Coach> {
    return this.update(coachId, {
      isArchived: false,
      archivedAt: undefined,
    });
  }

  /**
   * Deactivate coach (soft delete)
   */
  async deactivateCoach(coachId: string): Promise<Coach> {
    return this.update(coachId, { isActive: false });
  }

  /**
   * Get coach by user ID
   */
  async getByUserId(userId: string): Promise<Coach | null> {
    return this.getById(userId);
  }
}

export const coachesService = new CoachesService();
