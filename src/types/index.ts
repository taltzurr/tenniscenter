/**
 * Tennis Training Management System
 * TypeScript Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type UserRole = 'coach' | 'center_manager' | 'supervisor';

export type TrainingStatus = 'draft' | 'planned' | 'completed' | 'cancelled';

export type ExerciseRequestStatus = 'pending' | 'approved' | 'rejected';

export type CommentStatus = 'open' | 'resolved';

export type MonthlyPlanStatus = 'draft' | 'submitted' | 'reviewed';

export type Priority = 'high' | 'medium' | 'low';

export type PeriodType =
  | 'general_preparation'    // הכנה כללית
  | 'specific_preparation'   // הכנה ספציפית
  | 'competition'            // תחרות
  | 'transition'             // תקופת מעבר
  | 'reinforcement'          // אימון תגבור
  | 'periodic_tests';        // מבדקים תקופתיים

export type GameState =
  | 'serving'                // שחקן מגיש
  | 'returning'              // שחקן מחזיר
  | 'both_baseline'          // שניים מאחור
  | 'approaching'            // שחקן מתקרב
  | 'passing'                // שחקן מעביר
  | 'match_play';            // משחקי אימון

export type GameComponent = 'technical' | 'tactical';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type ExerciseTopic =
  | 'opportunity_center'     // מרכז אפשרויות
  | 'match_play'             // משחק אימון
  | 'direction'              // כיוון
  | 'stability'              // יציבות
  | 'depth'                  // עומק
  | 'height'                 // גובה
  | 'clearance_search'       // חיפוש פינוי
  | 'agility';               // זריזות

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type RecurringEndType = 'count' | 'date';

export type CalendarEventType =
  | 'holiday'                // חופשה/חג
  | 'competition'            // תחרות
  | 'internal_competition'   // תחרות פנים מרכז
  | 'abroad'                 // חו"ל
  | 'special_event'          // אירוע מיוחד
  | 'staff_meeting'          // ישיבת צוות
  | 'social_event'           // אירוע חברתי
  | 'training_seminar'       // השתלמות
  | 'instruction'            // הדרכה
  | 'special_training'       // אימון מיוחד
  | 'training_camp';         // מחנה אימונים

export type NotificationType =
  | 'comment_received'
  | 'comment_reply'
  | 'exercise_approved'
  | 'exercise_rejected'
  | 'monthly_plan_reminder'
  | 'event_reminder'
  | 'general';

// ============================================
// BASE INTERFACES
// ============================================

export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// USER & AUTH
// ============================================

export interface User extends BaseEntity {
  email: string;
  displayName: string;
  role: UserRole;
  centerIds: string[];
  isActive: boolean;
  createdBy: string;
  fcmTokens: string[];
}

export interface CreateUserData {
  email: string;
  displayName: string;
  role: UserRole;
  centerIds: string[];
}

// ============================================
// CENTER
// ============================================

export interface Center extends BaseEntity {
  name: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface CreateCenterData {
  name: string;
  logoUrl?: string;
}

// ============================================
// COACH
// ============================================

export interface Coach extends BaseEntity {
  userId: string;
  displayName: string;
  email: string;
  centerIds: string[];
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: Timestamp;
}

export interface CreateCoachData {
  userId: string;
  displayName: string;
  email: string;
  centerIds: string[];
}

// ============================================
// GROUP
// ============================================

export interface CoachHistoryEntry {
  coachId: string;
  coachName: string;
  fromDate: Timestamp;
  toDate?: Timestamp;
}

export interface Group extends BaseEntity {
  name: string;
  centerId: string;
  coachId: string;
  groupTypeId: string;
  birthYearLow: number;
  birthYearHigh: number;
  isActive: boolean;
  coachHistory: CoachHistoryEntry[];
}

export interface CreateGroupData {
  name: string;
  centerId: string;
  coachId: string;
  groupTypeId: string;
  birthYearLow: number;
  birthYearHigh: number;
}

// ============================================
// GROUP TYPE
// ============================================

export interface GroupType extends BaseEntity {
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateGroupTypeData {
  name: string;
  description?: string;
  sortOrder: number;
}

// ============================================
// TRAINING
// ============================================

export interface TrainingExercise {
  exerciseId: string;
  exerciseName: string;
  duration: number;
  order: number;
}

export interface RecurringRule {
  frequency: RecurringFrequency;
  endType: RecurringEndType;
  endCount?: number;
  endDate?: Timestamp;
  exceptions: string[]; // ISO date strings to skip
}

export interface Training extends BaseEntity {
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  centerId: string;

  date: Timestamp;
  startTime: string;        // "09:00"
  endTime: string;          // "10:30"

  periodType: PeriodType;
  gameState: GameState;
  gameComponent: GameComponent;
  topics: string[];
  details?: string;

  exercises: TrainingExercise[];

  status: TrainingStatus;
  completedAt?: Timestamp;

  isRecurring: boolean;
  recurringId?: string;
  recurringRule?: RecurringRule;

  monthlyPlanId?: string;
}

export interface CreateTrainingData {
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  centerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  periodType: PeriodType;
  gameState: GameState;
  gameComponent: GameComponent;
  topics: string[];
  details?: string;
  exercises: TrainingExercise[];
  isRecurring?: boolean;
  recurringRule?: Omit<RecurringRule, 'exceptions'> & { endDate?: Date };
}

// ============================================
// EXERCISE
// ============================================

export interface Exercise extends BaseEntity {
  name: string;
  description: string;
  skillLevels: SkillLevel[];
  gameStates: GameState[];
  topics: ExerciseTopic[];
  videoUrl?: string;
  duration: number;
  isGlobal: boolean;
  createdByCoachId?: string;
  isActive: boolean;
}

export interface CreateExerciseData {
  name: string;
  description: string;
  skillLevels: SkillLevel[];
  gameStates: GameState[];
  topics: ExerciseTopic[];
  videoUrl?: string;
  duration: number;
  isGlobal: boolean;
  createdByCoachId?: string;
}

// ============================================
// EXERCISE REQUEST
// ============================================

export interface ExerciseRequest extends BaseEntity {
  coachId: string;
  coachName: string;
  name: string;
  description: string;
  skillLevels: SkillLevel[];
  gameStates: GameState[];       // Max 3
  topics: ExerciseTopic[];       // Max 4
  videoUrl?: string;
  duration: number;
  status: ExerciseRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
}

export interface CreateExerciseRequestData {
  coachId: string;
  coachName: string;
  name: string;
  description: string;
  skillLevels: SkillLevel[];
  gameStates: GameState[];
  topics: ExerciseTopic[];
  videoUrl?: string;
  duration: number;
}

// ============================================
// GOAL
// ============================================

export interface Goal extends BaseEntity {
  description: string;
  month: string;                 // "2026-01" format
  groupTypeId: string;
  groupTypeName: string;
  isAchieved: boolean;
  achievedAt?: Timestamp;
  createdBy: string;
}

export interface CreateGoalData {
  description: string;
  month: string;
  groupTypeId: string;
  groupTypeName: string;
}

// ============================================
// VALUE
// ============================================

export interface Value extends BaseEntity {
  name: string;
  description: string;
  priority: Priority;
  month: string;                 // "2026-01" format
  sortOrder: number;             // 1-3
  createdBy: string;
}

export interface CreateValueData {
  name: string;
  description: string;
  priority: Priority;
  month: string;
  sortOrder: number;
}

// ============================================
// COMMENT
// ============================================

export interface Comment extends BaseEntity {
  trainingId: string;
  monthlyPlanId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'center_manager' | 'supervisor';
  content: string;
  status: CommentStatus;
  parentId?: string;             // For replies
}

export interface CreateCommentData {
  trainingId: string;
  monthlyPlanId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'center_manager' | 'supervisor';
  content: string;
  parentId?: string;
}

// ============================================
// MONTHLY PLAN
// ============================================

export interface MonthlyPlan extends BaseEntity {
  coachId: string;
  coachName: string;
  centerId: string;
  centerName: string;
  month: string;                 // "2026-01"
  status: MonthlyPlanStatus;
  submittedAt?: Timestamp;
  trainingIds: string[];
  trainingCount: number;
}

export interface CreateMonthlyPlanData {
  coachId: string;
  coachName: string;
  centerId: string;
  centerName: string;
  month: string;
}

// ============================================
// CALENDAR EVENT
// ============================================

export interface CalendarEvent extends BaseEntity {
  title: string;
  type: CalendarEventType;
  date: Timestamp;
  endDate?: Timestamp;
  centerId?: string;             // null = all centers
  centerName?: string;
  description?: string;
  sendNotification: boolean;
  createdBy: string;
}

export interface CreateCalendarEventData {
  title: string;
  type: CalendarEventType;
  date: Date;
  endDate?: Date;
  centerId?: string;
  centerName?: string;
  description?: string;
  sendNotification: boolean;
}

// ============================================
// NOTIFICATION
// ============================================

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: 'training' | 'comment' | 'exercise' | 'monthlyPlan';
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: Timestamp;
}

// ============================================
// SETTINGS
// ============================================

export interface GlobalSettings {
  monthlyPlanDeadlineDay: number;   // Default: 1
  allowedEmailDomain: string;
  organizationName: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface UpdateSettingsData {
  monthlyPlanDeadlineDay?: number;
  allowedEmailDomain?: string;
  organizationName?: string;
}

// ============================================
// TRASH
// ============================================

export interface TrashItem extends BaseEntity {
  originalCollection: string;
  originalId: string;
  data: Record<string, unknown>;
  deletedBy: string;
  deletedAt: Timestamp;
  expiresAt: Timestamp;
}

// ============================================
// HELPER TYPES
// ============================================

export type WithoutId<T> = Omit<T, 'id'>;

export type UpdateData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Query helpers
export interface PaginationParams {
  limit?: number;
  startAfter?: unknown;
}

export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}
