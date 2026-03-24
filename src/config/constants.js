// Application constants

// Roles
export const ROLES = {
    SUPERVISOR: 'supervisor',
    CENTER_MANAGER: 'centerManager',
    COACH: 'coach',
};

// Training statuses
export const TRAINING_STATUS = {
    DRAFT: 'draft',
    PLANNED: 'planned',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Monthly plan statuses
export const PLAN_STATUS = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    REVIEWED: 'reviewed',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};

// Exercise types
export const EXERCISE_TYPE = {
    GLOBAL: 'global',
    PRIVATE: 'private',
};

// Exercise request statuses
export const REQUEST_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};

// Comment statuses
export const COMMENT_STATUS = {
    OPEN: 'open',
    RESOLVED: 'resolved',
};

// Recurrence types
export const RECURRENCE_TYPE = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    BIWEEKLY: 'biweekly',
    MONTHLY: 'monthly',
};

// Default group types
// Default group types
export const DEFAULT_GROUP_TYPES = [
    { id: 'competitive', name: 'תחרותי' },
    { id: 'reserve', name: 'עתודה' },
    { id: 'tennis-lovers', name: 'אוהבי הטניס' },
    { id: 'tots', name: 'קטנטנים' },
    { id: 'adults', name: 'מבוגרים' },
    { id: 'parents', name: 'הורים' },
];

// File size limits
export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_AVATAR_SIZE_MB = 5;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Date formats
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Hebrew day names
export const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Hebrew month names
export const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];
