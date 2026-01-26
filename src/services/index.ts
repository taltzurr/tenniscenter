/**
 * Services Index
 * Export all services for easy importing
 */

// Firebase
export { db, auth, storage, functions, COLLECTIONS, SETTINGS_DOC_ID } from './firebase';

// Auth
export * from './auth.service';

// Base
export { BaseService, dateToTimestamp, timestampToDate, getCurrentMonth, getNextMonth } from './base.service';

// Entity Services
export { centersService } from './centers.service';
export { coachesService } from './coaches.service';
export { groupsService } from './groups.service';
export { trainingsService } from './trainings.service';
export { exercisesService } from './exercises.service';
export { exerciseRequestsService } from './exercise-requests.service';
export { goalsService } from './goals.service';
export { valuesService } from './values.service';
export { commentsService } from './comments.service';
export { monthlyPlansService } from './monthly-plans.service';
