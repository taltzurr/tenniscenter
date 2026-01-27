/**
 * Monthly Plans Service
 * Manages coach monthly training plans
 */

import { where, orderBy, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService, getCurrentMonth } from './base.service';
import { trainingsService } from './trainings.service';
import type {
  MonthlyPlan,
  CreateMonthlyPlanData,
  UpdateData,
  MonthlyPlanStatus
} from '../types';

class MonthlyPlansService extends BaseService<
  MonthlyPlan,
  CreateMonthlyPlanData,
  UpdateData<MonthlyPlan>
> {
  constructor() {
    super(COLLECTIONS.MONTHLY_PLANS);
  }

  /**
   * Get monthly plan for coach and month
   */
  async getByCoachAndMonth(coachId: string, month: string): Promise<MonthlyPlan | null> {
    const plans = await this.query(
      where('coachId', '==', coachId),
      where('month', '==', month)
    );
    return plans[0] || null;
  }

  /**
   * Get all plans for a month (supervisor view)
   */
  async getByMonth(month: string): Promise<MonthlyPlan[]> {
    return this.query(
      where('month', '==', month),
      orderBy('centerName', 'asc')
    );
  }

  /**
   * Get plans by center and month
   */
  async getByCenterAndMonth(centerId: string, month: string): Promise<MonthlyPlan[]> {
    return this.query(
      where('centerId', '==', centerId),
      where('month', '==', month)
    );
  }

  /**
   * Get plans by status
   */
  async getByStatus(status: MonthlyPlanStatus, month?: string): Promise<MonthlyPlan[]> {
    const constraints = [
      where('status', '==', status),
      orderBy('submittedAt', 'desc')
    ];

    if (month) {
      constraints.unshift(where('month', '==', month));
    }

    return this.query(...constraints);
  }

  /**
   * Get submitted plans for current month
   */
  async getSubmittedForCurrentMonth(): Promise<MonthlyPlan[]> {
    return this.getByStatus('submitted', getCurrentMonth());
  }

  /**
   * Create or update monthly plan
   */
  async createOrUpdatePlan(data: CreateMonthlyPlanData): Promise<MonthlyPlan> {
    const existingPlan = await this.getByCoachAndMonth(data.coachId, data.month);

    if (existingPlan) {
      // Update existing plan
      const trainings = await trainingsService.getForMonthlyPlan(data.coachId, data.month);

      return this.update(existingPlan.id, {
        trainingIds: trainings.map(t => t.id),
        trainingCount: trainings.length,
      });
    }

    // Create new plan
    const trainings = await trainingsService.getForMonthlyPlan(data.coachId, data.month);

    return this.create({
      ...data,
      status: 'draft',
      trainingIds: trainings.map(t => t.id),
      trainingCount: trainings.length,
    } as unknown as CreateMonthlyPlanData);
  }

  /**
   * Submit monthly plan
   */
  async submitPlan(planId: string): Promise<MonthlyPlan> {
    const plan = await this.getById(planId);

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Refresh training list before submission
    const trainings = await trainingsService.getForMonthlyPlan(plan.coachId, plan.month);

    return this.update(planId, {
      status: 'submitted',
      submittedAt: Timestamp.now(),
      trainingIds: trainings.map(t => t.id),
      trainingCount: trainings.length,
    });
  }

  /**
   * Mark plan as reviewed
   */
  async markReviewed(planId: string): Promise<MonthlyPlan> {
    return this.update(planId, {
      status: 'reviewed',
    });
  }

  /**
   * Revert to draft (for corrections)
   */
  async revertToDraft(planId: string): Promise<MonthlyPlan> {
    return this.update(planId, {
      status: 'draft',
      submittedAt: undefined,
    });
  }

  /**
   * Get submission statistics for a month
   */
  async getSubmissionStats(month: string): Promise<{
    total: number;
    submitted: number;
    draft: number;
    reviewed: number;
  }> {
    const plans = await this.getByMonth(month);

    return {
      total: plans.length,
      submitted: plans.filter(p => p.status === 'submitted').length,
      draft: plans.filter(p => p.status === 'draft').length,
      reviewed: plans.filter(p => p.status === 'reviewed').length,
    };
  }

  /**
   * Get coaches without submitted plans for a month
   */
  async getCoachesWithoutSubmission(month: string): Promise<string[]> {
    const submittedPlans = await this.query(
      where('month', '==', month),
      where('status', 'in', ['submitted', 'reviewed'])
    );

    const submittedCoachIds = new Set(submittedPlans.map(p => p.coachId));

    // Get all active coaches
    const { coachesService } = await import('./coaches.service');
    const allCoaches = await coachesService.getActiveCoaches();

    return allCoaches
      .filter(c => !submittedCoachIds.has(c.id))
      .map(c => c.id);
  }
}

export const monthlyPlansService = new MonthlyPlansService();
