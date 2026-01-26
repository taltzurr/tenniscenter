/**
 * Groups Service
 * Manages training groups
 */

import { where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService, dateToTimestamp } from './base.service';
import type { Group, CreateGroupData, UpdateData, CoachHistoryEntry } from '../types';

class GroupsService extends BaseService<Group, CreateGroupData, UpdateData<Group>> {
  constructor() {
    super(COLLECTIONS.GROUPS);
  }

  /**
   * Get all active groups
   */
  async getActiveGroups(): Promise<Group[]> {
    return this.query(
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
  }

  /**
   * Get groups by center
   */
  async getGroupsByCenter(centerId: string): Promise<Group[]> {
    return this.query(
      where('centerId', '==', centerId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
  }

  /**
   * Get groups by coach
   */
  async getGroupsByCoach(coachId: string): Promise<Group[]> {
    return this.query(
      where('coachId', '==', coachId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
  }

  /**
   * Get groups by type
   */
  async getGroupsByType(groupTypeId: string): Promise<Group[]> {
    return this.query(
      where('groupTypeId', '==', groupTypeId),
      where('isActive', '==', true)
    );
  }

  /**
   * Create a new group
   */
  async createGroup(data: CreateGroupData, coachName: string): Promise<Group> {
    const initialHistory: CoachHistoryEntry = {
      coachId: data.coachId,
      coachName: coachName,
      fromDate: Timestamp.now(),
    };

    return this.create({
      ...data,
      isActive: true,
      coachHistory: [initialHistory],
    } as unknown as CreateGroupData);
  }

  /**
   * Transfer group to another coach
   */
  async transferToCoach(
    groupId: string,
    newCoachId: string,
    newCoachName: string
  ): Promise<Group> {
    const group = await this.getById(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    // Close the current coach's history entry
    const updatedHistory = group.coachHistory.map((entry, index) => {
      if (index === group.coachHistory.length - 1 && !entry.toDate) {
        return {
          ...entry,
          toDate: Timestamp.now(),
        };
      }
      return entry;
    });

    // Add new coach to history
    const newHistoryEntry: CoachHistoryEntry = {
      coachId: newCoachId,
      coachName: newCoachName,
      fromDate: Timestamp.now(),
    };

    return this.update(groupId, {
      coachId: newCoachId,
      coachHistory: [...updatedHistory, newHistoryEntry],
    });
  }

  /**
   * Update group type
   */
  async updateGroupType(groupId: string, groupTypeId: string): Promise<Group> {
    return this.update(groupId, { groupTypeId });
  }

  /**
   * Update birth years
   */
  async updateBirthYears(
    groupId: string,
    birthYearLow: number,
    birthYearHigh: number
  ): Promise<Group> {
    return this.update(groupId, { birthYearLow, birthYearHigh });
  }

  /**
   * Deactivate group (soft delete)
   */
  async deactivateGroup(groupId: string): Promise<Group> {
    return this.update(groupId, { isActive: false });
  }

  /**
   * Get group coach history
   */
  async getCoachHistory(groupId: string): Promise<CoachHistoryEntry[]> {
    const group = await this.getById(groupId);
    return group?.coachHistory || [];
  }
}

export const groupsService = new GroupsService();
