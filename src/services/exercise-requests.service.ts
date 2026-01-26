/**
 * Exercise Requests Service
 * Manages exercise submission requests from coaches
 */

import { where, orderBy, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService } from './base.service';
import type {
  ExerciseRequest,
  CreateExerciseRequestData,
  UpdateData,
  ExerciseRequestStatus
} from '../types';

class ExerciseRequestsService extends BaseService<
  ExerciseRequest,
  CreateExerciseRequestData,
  UpdateData<ExerciseRequest>
> {
  constructor() {
    super(COLLECTIONS.EXERCISE_REQUESTS);
  }

  /**
   * Get all pending requests (for supervisor)
   */
  async getPendingRequests(): Promise<ExerciseRequest[]> {
    return this.query(
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
  }

  /**
   * Get requests by coach
   */
  async getRequestsByCoach(coachId: string): Promise<ExerciseRequest[]> {
    return this.query(
      where('coachId', '==', coachId),
      orderBy('createdAt', 'desc')
    );
  }

  /**
   * Get requests by status
   */
  async getRequestsByStatus(status: ExerciseRequestStatus): Promise<ExerciseRequest[]> {
    return this.query(
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  }

  /**
   * Create a new exercise request
   */
  async createRequest(data: CreateExerciseRequestData): Promise<ExerciseRequest> {
    // Validate max selections
    if (data.gameStates.length > 3) {
      throw new Error('Maximum 3 game states allowed');
    }
    if (data.topics.length > 4) {
      throw new Error('Maximum 4 topics allowed');
    }

    return this.create({
      ...data,
      status: 'pending',
    } as unknown as CreateExerciseRequestData);
  }

  /**
   * Approve request (supervisor only)
   */
  async approveRequest(requestId: string, reviewerId: string): Promise<ExerciseRequest> {
    return this.update(requestId, {
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: Timestamp.now(),
    });
  }

  /**
   * Reject request (supervisor only)
   */
  async rejectRequest(
    requestId: string,
    reviewerId: string,
    reason: string
  ): Promise<ExerciseRequest> {
    return this.update(requestId, {
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: Timestamp.now(),
      rejectionReason: reason,
    });
  }

  /**
   * Get coach's pending requests count
   */
  async getPendingCountForCoach(coachId: string): Promise<number> {
    const requests = await this.query(
      where('coachId', '==', coachId),
      where('status', '==', 'pending')
    );
    return requests.length;
  }

  /**
   * Get total pending requests count (for supervisor badge)
   */
  async getTotalPendingCount(): Promise<number> {
    const requests = await this.getPendingRequests();
    return requests.length;
  }
}

export const exerciseRequestsService = new ExerciseRequestsService();
