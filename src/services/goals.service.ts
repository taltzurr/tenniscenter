/**
 * Goals Service
 * Manages monthly goals by group type
 */

import { where, orderBy, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService, getCurrentMonth } from './base.service';
import type { Goal, CreateGoalData, UpdateData } from '../types';

class GoalsService extends BaseService<Goal, CreateGoalData, UpdateData<Goal>> {
  constructor() {
    super(COLLECTIONS.GOALS);
  }

  /**
   * Get goals for a specific month
   */
  async getByMonth(month: string): Promise<Goal[]> {
    return this.query(
      where('month', '==', month),
      orderBy('groupTypeName', 'asc')
    );
  }

  /**
   * Get current month goals
   */
  async getCurrentMonthGoals(): Promise<Goal[]> {
    return this.getByMonth(getCurrentMonth());
  }

  /**
   * Get goals by group type
   */
  async getByGroupType(groupTypeId: string): Promise<Goal[]> {
    return this.query(
      where('groupTypeId', '==', groupTypeId),
      orderBy('month', 'desc')
    );
  }

  /**
   * Get goal for specific group type and month
   */
  async getByGroupTypeAndMonth(groupTypeId: string, month: string): Promise<Goal | null> {
    const goals = await this.query(
      where('groupTypeId', '==', groupTypeId),
      where('month', '==', month)
    );
    return goals[0] || null;
  }

  /**
   * Create a new goal (supervisor only)
   */
  async createGoal(data: CreateGoalData, createdBy: string): Promise<Goal> {
    return this.create({
      ...data,
      isAchieved: false,
      createdBy,
    } as unknown as CreateGoalData);
  }

  /**
   * Mark goal as achieved
   */
  async markAchieved(goalId: string): Promise<Goal> {
    return this.update(goalId, {
      isAchieved: true,
      achievedAt: Timestamp.now(),
    });
  }

  /**
   * Mark goal as not achieved
   */
  async markNotAchieved(goalId: string): Promise<Goal> {
    return this.update(goalId, {
      isAchieved: false,
      achievedAt: undefined,
    });
  }

  /**
   * Get achievement statistics for a month
   */
  async getAchievementStats(month: string): Promise<{
    total: number;
    achieved: number;
    percentage: number;
  }> {
    const goals = await this.getByMonth(month);
    const achieved = goals.filter(g => g.isAchieved).length;

    return {
      total: goals.length,
      achieved,
      percentage: goals.length > 0 ? Math.round((achieved / goals.length) * 100) : 0,
    };
  }

  /**
   * Get goals history (last N months)
   */
  async getGoalsHistory(months: number = 6): Promise<Goal[]> {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startMonthStr = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`;

    return this.query(
      where('month', '>=', startMonthStr),
      orderBy('month', 'desc')
    );
  }
}

export const goalsService = new GoalsService();
