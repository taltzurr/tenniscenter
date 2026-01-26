/**
 * Comments Service
 * Manages comments on training plans (from managers to coaches)
 */

import { where, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService } from './base.service';
import type { Comment, CreateCommentData, UpdateData, CommentStatus } from '../types';

class CommentsService extends BaseService<Comment, CreateCommentData, UpdateData<Comment>> {
  constructor() {
    super(COLLECTIONS.COMMENTS);
  }

  /**
   * Get comments for a training
   */
  async getByTraining(trainingId: string): Promise<Comment[]> {
    return this.query(
      where('trainingId', '==', trainingId),
      orderBy('createdAt', 'asc')
    );
  }

  /**
   * Get comments for a monthly plan
   */
  async getByMonthlyPlan(monthlyPlanId: string): Promise<Comment[]> {
    return this.query(
      where('monthlyPlanId', '==', monthlyPlanId),
      orderBy('createdAt', 'asc')
    );
  }

  /**
   * Get root comments (not replies) for a training
   */
  async getRootCommentsByTraining(trainingId: string): Promise<Comment[]> {
    const comments = await this.getByTraining(trainingId);
    return comments.filter(c => !c.parentId);
  }

  /**
   * Get replies to a comment
   */
  async getReplies(parentCommentId: string): Promise<Comment[]> {
    return this.query(
      where('parentId', '==', parentCommentId),
      orderBy('createdAt', 'asc')
    );
  }

  /**
   * Get comments with thread structure
   */
  async getCommentThread(trainingId: string): Promise<Array<Comment & { replies: Comment[] }>> {
    const allComments = await this.getByTraining(trainingId);

    const rootComments = allComments.filter(c => !c.parentId);
    const replies = allComments.filter(c => c.parentId);

    return rootComments.map(root => ({
      ...root,
      replies: replies.filter(r => r.parentId === root.id),
    }));
  }

  /**
   * Create a new comment (manager/supervisor only)
   */
  async createComment(data: CreateCommentData): Promise<Comment> {
    return this.create({
      ...data,
      status: 'open',
    } as unknown as CreateCommentData);
  }

  /**
   * Create a reply to a comment (coach can reply)
   */
  async createReply(
    parentCommentId: string,
    data: Omit<CreateCommentData, 'parentId'>
  ): Promise<Comment> {
    const parentComment = await this.getById(parentCommentId);

    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    return this.create({
      ...data,
      parentId: parentCommentId,
      trainingId: parentComment.trainingId,
      monthlyPlanId: parentComment.monthlyPlanId,
      status: 'open',
    } as unknown as CreateCommentData);
  }

  /**
   * Mark comment as resolved
   */
  async markResolved(commentId: string): Promise<Comment> {
    return this.update(commentId, { status: 'resolved' });
  }

  /**
   * Mark comment as open
   */
  async markOpen(commentId: string): Promise<Comment> {
    return this.update(commentId, { status: 'open' });
  }

  /**
   * Get open comments count for a coach (for notifications)
   */
  async getOpenCommentsCountForCoach(coachId: string): Promise<number> {
    // This requires knowing which trainings belong to the coach
    // We'll need to get the trainings first
    const { trainingsService } = await import('./trainings.service');
    const trainings = await trainingsService.getByCoach(coachId);
    const trainingIds = trainings.map(t => t.id);

    let openCount = 0;

    for (const trainingId of trainingIds) {
      const comments = await this.query(
        where('trainingId', '==', trainingId),
        where('status', '==', 'open')
      );
      openCount += comments.length;
    }

    return openCount;
  }

  /**
   * Get all open comments (for manager view)
   */
  async getOpenComments(): Promise<Comment[]> {
    return this.query(
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
  }
}

export const commentsService = new CommentsService();
