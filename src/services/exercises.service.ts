/**
 * Exercises Service
 * Manages exercises (global and private)
 */

import { where, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService } from './base.service';
import type {
  Exercise,
  CreateExerciseData,
  UpdateData,
  SkillLevel,
  GameState,
  ExerciseTopic
} from '../types';

class ExercisesService extends BaseService<Exercise, CreateExerciseData, UpdateData<Exercise>> {
  constructor() {
    super(COLLECTIONS.EXERCISES);
  }

  /**
   * Get all global exercises
   */
  async getGlobalExercises(): Promise<Exercise[]> {
    return this.query(
      where('isGlobal', '==', true),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
  }

  /**
   * Get exercises available to a coach (global + their private)
   */
  async getExercisesForCoach(coachId: string): Promise<Exercise[]> {
    // Get global exercises
    const globalExercises = await this.getGlobalExercises();

    // Get private exercises for this coach
    const privateExercises = await this.query(
      where('isGlobal', '==', false),
      where('createdByCoachId', '==', coachId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );

    return [...globalExercises, ...privateExercises];
  }

  /**
   * Get private exercises by coach
   */
  async getPrivateExercisesByCoach(coachId: string): Promise<Exercise[]> {
    return this.query(
      where('isGlobal', '==', false),
      where('createdByCoachId', '==', coachId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
  }

  /**
   * Filter exercises by skill level
   */
  async filterBySkillLevel(skillLevel: SkillLevel): Promise<Exercise[]> {
    return this.query(
      where('skillLevels', 'array-contains', skillLevel),
      where('isActive', '==', true),
      where('isGlobal', '==', true)
    );
  }

  /**
   * Filter exercises by game state
   */
  async filterByGameState(gameState: GameState): Promise<Exercise[]> {
    return this.query(
      where('gameStates', 'array-contains', gameState),
      where('isActive', '==', true),
      where('isGlobal', '==', true)
    );
  }

  /**
   * Filter exercises by topic
   */
  async filterByTopic(topic: ExerciseTopic): Promise<Exercise[]> {
    return this.query(
      where('topics', 'array-contains', topic),
      where('isActive', '==', true),
      where('isGlobal', '==', true)
    );
  }

  /**
   * Search exercises by name (client-side filtering)
   */
  async searchByName(searchTerm: string, coachId?: string): Promise<Exercise[]> {
    const exercises = coachId
      ? await this.getExercisesForCoach(coachId)
      : await this.getGlobalExercises();

    const lowerSearch = searchTerm.toLowerCase();

    return exercises.filter(
      e => e.name.toLowerCase().includes(lowerSearch) ||
           e.description.toLowerCase().includes(lowerSearch)
    );
  }

  /**
   * Create a global exercise (supervisor only)
   */
  async createGlobalExercise(data: Omit<CreateExerciseData, 'isGlobal'>): Promise<Exercise> {
    return this.create({
      ...data,
      isGlobal: true,
      isActive: true,
    } as CreateExerciseData);
  }

  /**
   * Create a private exercise (coach)
   */
  async createPrivateExercise(
    data: Omit<CreateExerciseData, 'isGlobal' | 'createdByCoachId'>,
    coachId: string
  ): Promise<Exercise> {
    return this.create({
      ...data,
      isGlobal: false,
      createdByCoachId: coachId,
      isActive: true,
    } as CreateExerciseData);
  }

  /**
   * Deactivate exercise (soft delete)
   */
  async deactivateExercise(exerciseId: string): Promise<Exercise> {
    return this.update(exerciseId, { isActive: false });
  }

  /**
   * Update exercise video
   */
  async updateVideo(exerciseId: string, videoUrl: string): Promise<Exercise> {
    return this.update(exerciseId, { videoUrl });
  }

  /**
   * Remove video from exercise
   */
  async removeVideo(exerciseId: string): Promise<Exercise> {
    return this.update(exerciseId, { videoUrl: undefined });
  }

  /**
   * Get exercise with filtering options
   */
  async getFilteredExercises(
    filters: {
      skillLevel?: SkillLevel;
      gameState?: GameState;
      topic?: ExerciseTopic;
      coachId?: string;
    }
  ): Promise<Exercise[]> {
    let exercises = filters.coachId
      ? await this.getExercisesForCoach(filters.coachId)
      : await this.getGlobalExercises();

    if (filters.skillLevel) {
      exercises = exercises.filter(e =>
        e.skillLevels.includes(filters.skillLevel!)
      );
    }

    if (filters.gameState) {
      exercises = exercises.filter(e =>
        e.gameStates.includes(filters.gameState!)
      );
    }

    if (filters.topic) {
      exercises = exercises.filter(e =>
        e.topics.includes(filters.topic!)
      );
    }

    return exercises;
  }
}

export const exercisesService = new ExercisesService();
