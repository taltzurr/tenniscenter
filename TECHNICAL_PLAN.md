# מסמך תכנון טכני
## מערכת ניהול אימוני טניס - Tennis Training Management System
### גרסה 1.0 | ינואר 2026

---

## תוכן עניינים
1. [סקירת ארכיטקטורה](#1-סקירת-ארכיטקטורה)
2. [מבנה הפרויקט](#2-מבנה-הפרויקט)
3. [סכמת נתונים - Firestore](#3-סכמת-נתונים---firestore)
4. [Firebase Security Rules](#4-firebase-security-rules)
5. [רכיבי React](#5-רכיבי-react)
6. [Cloud Functions](#6-cloud-functions)
7. [שלבי פיתוח מפורטים](#7-שלבי-פיתוח-מפורטים)
8. [הנחיות UI/UX](#8-הנחיות-uiux)

---

## 1. סקירת ארכיטקטורה

### 1.1 Stack טכנולוגי

```
Frontend:
├── React 18+ (with TypeScript)
├── Vite (build tool)
├── React Router v6 (routing)
├── Tailwind CSS (styling)
├── React Query / TanStack Query (data fetching & caching)
├── React Hook Form (forms)
├── Zod (validation)
├── date-fns (date handling)
├── FullCalendar (calendar component)
└── PWA (Workbox - בשלב מאוחר)

Backend (Firebase):
├── Firebase Authentication
├── Cloud Firestore
├── Firebase Storage
├── Cloud Functions (Node.js)
└── Firebase Hosting
```

### 1.2 דיאגרמת ארכיטקטורה

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (PWA)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   מאמן      │  │ מנהל מרכז   │  │   מנהל מקצועי      │  │
│  │  Dashboard  │  │  Dashboard  │  │     Dashboard       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │  Services │                            │
│                    │   Layer   │                            │
│                    └─────┬─────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
     ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
     │  Firestore │   │  Storage  │   │   Auth    │
     │  Database  │   │  (Videos) │   │           │
     └───────────┘   └───────────┘   └───────────┘
                           │
                    ┌──────▼──────┐
                    │    Cloud    │
                    │  Functions  │
                    └─────────────┘
```

---

## 2. מבנה הפרויקט

```
tennis-training-app/
├── public/
│   ├── manifest.json
│   ├── favicon.ico
│   ├── logo.png
│   └── icons/
│       ├── icon-192x192.png
│       └── icon-512x512.png
│
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component + routing
│   ├── vite-env.d.ts
│   │
│   ├── assets/
│   │   └── images/
│   │
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── MultiSelect.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Main layout wrapper
│   │   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   │   ├── Header.tsx          # Top header
│   │   │   ├── MobileNav.tsx       # Mobile bottom navigation
│   │   │   └── NotificationBell.tsx
│   │   │
│   │   ├── calendar/
│   │   │   ├── CalendarView.tsx    # Main calendar component
│   │   │   ├── DayView.tsx
│   │   │   ├── WeekView.tsx
│   │   │   ├── MonthView.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── RecurringModal.tsx
│   │   │
│   │   ├── training/
│   │   │   ├── TrainingForm.tsx    # Create/edit training
│   │   │   ├── TrainingCard.tsx    # Training display card
│   │   │   ├── TrainingDetails.tsx
│   │   │   ├── ExerciseSelector.tsx
│   │   │   ├── ExerciseCard.tsx
│   │   │   └── TrainingStatusBadge.tsx
│   │   │
│   │   ├── groups/
│   │   │   ├── GroupForm.tsx
│   │   │   ├── GroupCard.tsx
│   │   │   └── GroupList.tsx
│   │   │
│   │   ├── exercises/
│   │   │   ├── ExerciseForm.tsx
│   │   │   ├── ExerciseCard.tsx
│   │   │   ├── ExerciseFilters.tsx
│   │   │   ├── ExerciseRequestForm.tsx
│   │   │   └── VideoPlayer.tsx
│   │   │
│   │   ├── comments/
│   │   │   ├── CommentThread.tsx
│   │   │   ├── CommentForm.tsx
│   │   │   └── CommentCard.tsx
│   │   │
│   │   ├── goals/
│   │   │   ├── GoalForm.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   └── GoalProgress.tsx
│   │   │
│   │   └── values/
│   │       ├── ValueForm.tsx
│   │       └── ValueCard.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   │
│   │   ├── coach/                  # מאמן
│   │   │   ├── CoachDashboard.tsx  # Main dashboard
│   │   │   ├── MyTrainings.tsx     # Calendar + list view
│   │   │   ├── CreateTraining.tsx
│   │   │   ├── EditTraining.tsx
│   │   │   ├── MyGroups.tsx
│   │   │   ├── GroupDetails.tsx
│   │   │   ├── Exercises.tsx       # Browse exercises
│   │   │   ├── MyExercises.tsx     # Private exercises
│   │   │   ├── RequestExercise.tsx
│   │   │   ├── MonthlyPlan.tsx     # Submit monthly plan
│   │   │   └── Notifications.tsx
│   │   │
│   │   ├── center-manager/         # מנהל מרכז
│   │   │   ├── CenterDashboard.tsx
│   │   │   ├── CenterCalendar.tsx
│   │   │   ├── ManageCoaches.tsx
│   │   │   ├── ManageGroups.tsx
│   │   │   ├── CoachDetails.tsx
│   │   │   ├── ReviewTrainings.tsx
│   │   │   ├── MonthlyValues.tsx
│   │   │   └── MonthlyGoal.tsx
│   │   │
│   │   ├── supervisor/             # מנהל מקצועי
│   │   │   ├── SupervisorDashboard.tsx
│   │   │   ├── AllCenters.tsx
│   │   │   ├── CenterOverview.tsx
│   │   │   ├── AllCoaches.tsx
│   │   │   ├── ManageUsers.tsx
│   │   │   ├── ExerciseRequests.tsx
│   │   │   ├── GlobalExercises.tsx
│   │   │   ├── ManageGoals.tsx
│   │   │   ├── ManageValues.tsx
│   │   │   ├── ManageGroupTypes.tsx
│   │   │   ├── MonthlyPlansOverview.tsx
│   │   │   ├── SystemSettings.tsx
│   │   │   └── TrashBin.tsx
│   │   │
│   │   └── shared/
│   │       ├── NotFoundPage.tsx
│   │       └── UnauthorizedPage.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Authentication hook
│   │   ├── useUser.ts              # Current user data
│   │   ├── useTrainings.ts         # Training CRUD
│   │   ├── useGroups.ts            # Groups CRUD
│   │   ├── useExercises.ts         # Exercises CRUD
│   │   ├── useComments.ts          # Comments CRUD
│   │   ├── useGoals.ts             # Goals CRUD
│   │   ├── useValues.ts            # Values CRUD
│   │   ├── useNotifications.ts     # Notifications
│   │   ├── useCalendarEvents.ts    # Calendar events
│   │   ├── useRecurring.ts         # Recurring logic
│   │   └── useSearch.ts            # Search functionality
│   │
│   ├── services/
│   │   ├── firebase.ts             # Firebase initialization
│   │   ├── auth.service.ts         # Authentication
│   │   ├── users.service.ts        # User management
│   │   ├── centers.service.ts      # Centers CRUD
│   │   ├── coaches.service.ts      # Coaches CRUD
│   │   ├── groups.service.ts       # Groups CRUD
│   │   ├── trainings.service.ts    # Trainings CRUD
│   │   ├── exercises.service.ts    # Exercises CRUD
│   │   ├── comments.service.ts     # Comments CRUD
│   │   ├── goals.service.ts        # Goals CRUD
│   │   ├── values.service.ts       # Values CRUD
│   │   ├── events.service.ts       # Calendar events
│   │   ├── notifications.service.ts
│   │   ├── storage.service.ts      # File uploads
│   │   └── trash.service.ts        # Soft delete / restore
│   │
│   ├── store/                      # Global state (if needed)
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/
│   │   ├── index.ts                # Export all types
│   │   ├── user.types.ts
│   │   ├── center.types.ts
│   │   ├── coach.types.ts
│   │   ├── group.types.ts
│   │   ├── training.types.ts
│   │   ├── exercise.types.ts
│   │   ├── comment.types.ts
│   │   ├── goal.types.ts
│   │   ├── value.types.ts
│   │   ├── event.types.ts
│   │   └── notification.types.ts
│   │
│   ├── utils/
│   │   ├── constants.ts            # App constants
│   │   ├── helpers.ts              # General helpers
│   │   ├── dateUtils.ts            # Date formatting
│   │   ├── validators.ts           # Validation schemas
│   │   └── recurringUtils.ts       # Recurring event logic
│   │
│   ├── locales/
│   │   └── he.ts                   # Hebrew translations
│   │
│   └── styles/
│       ├── globals.css
│       └── tailwind.css
│
├── functions/                      # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts                # Functions entry
│   │   ├── auth/
│   │   │   └── onUserCreate.ts     # New user setup
│   │   ├── notifications/
│   │   │   ├── sendPush.ts
│   │   │   └── onCommentCreate.ts
│   │   ├── exercises/
│   │   │   └── onRequestApproved.ts
│   │   ├── trainings/
│   │   │   └── onMonthlyPlanSubmit.ts
│   │   └── scheduled/
│   │       ├── monthlyPlanReminder.ts
│   │       └── cleanupTrash.ts
│   ├── package.json
│   └── tsconfig.json
│
├── firestore.rules
├── storage.rules
├── firebase.json
├── .firebaserc
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── .env.local                      # (gitignored)
├── .gitignore
└── README.md
```

---

## 3. סכמת נתונים - Firestore

### 3.1 Collections Overview

```
firestore/
├── users/                  # משתמשים
├── centers/                # מרכזי טניס
├── coaches/                # מאמנים
├── groups/                 # קבוצות
├── trainings/              # אימונים
├── exercises/              # תרגילים
├── exerciseRequests/       # בקשות לתרגילים
├── goals/                  # מטרות
├── values/                 # ערכים
├── comments/               # הערות על תוכניות
├── notifications/          # התראות
├── calendarEvents/         # אירועי לוח שנה
├── monthlyPlans/           # תוכניות חודשיות
├── groupTypes/             # סוגי קבוצות
├── trash/                  # סל מיחזור
└── settings/               # הגדרות מערכת
```

### 3.2 Document Schemas

#### users
```typescript
interface User {
  id: string;                          // Firebase Auth UID
  email: string;
  displayName: string;
  role: 'coach' | 'center_manager' | 'supervisor';
  centerIds: string[];                 // מרכזים משויכים
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                   // User ID שיצר
  fcmTokens: string[];                 // Push notification tokens
}
```

#### centers
```typescript
interface Center {
  id: string;
  name: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### coaches
```typescript
interface Coach {
  id: string;                          // Same as user ID
  userId: string;
  displayName: string;
  email: string;
  centerIds: string[];                 // מספר מרכזים
  isActive: boolean;
  isArchived: boolean;                 // כשעוזב
  archivedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### groups
```typescript
interface Group {
  id: string;
  name: string;
  centerId: string;
  coachId: string;
  groupTypeId: string;                 // Reference to groupTypes
  birthYearLow: number;                // שנתון נמוך
  birthYearHigh: number;               // שנתון גבוה
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // History of coach changes
  coachHistory: {
    coachId: string;
    coachName: string;
    fromDate: Timestamp;
    toDate?: Timestamp;
  }[];
}
```

#### groupTypes
```typescript
interface GroupType {
  id: string;
  name: string;                        // e.g., "תחרותי 14-16"
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### trainings
```typescript
interface Training {
  id: string;
  groupId: string;
  groupName: string;                   // Denormalized for display
  coachId: string;
  coachName: string;                   // Denormalized
  centerId: string;

  date: Timestamp;
  startTime: string;                   // "09:00"
  endTime: string;                     // "10:30"

  periodType: PeriodType;
  gameState: GameState;
  gameComponent: 'technical' | 'tactical';
  topics: string[];                    // Multi-select
  details?: string;                    // Free text

  exercises: TrainingExercise[];

  status: 'draft' | 'planned' | 'completed' | 'cancelled';
  completedAt?: Timestamp;

  // Recurring
  isRecurring: boolean;
  recurringId?: string;                // ID of recurring series
  recurringRule?: RecurringRule;

  // Monthly plan
  monthlyPlanId?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TrainingExercise {
  exerciseId: string;
  exerciseName: string;
  duration: number;                    // minutes
  order: number;
}

interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  endType: 'count' | 'date';
  endCount?: number;
  endDate?: Timestamp;
  exceptions: string[];                // Dates to skip (ISO strings)
}

type PeriodType =
  | 'general_preparation'
  | 'specific_preparation'
  | 'competition'
  | 'transition'
  | 'reinforcement'
  | 'periodic_tests';

type GameState =
  | 'serving'
  | 'returning'
  | 'both_baseline'
  | 'approaching'
  | 'passing'
  | 'match_play';
```

#### exercises
```typescript
interface Exercise {
  id: string;
  name: string;
  description: string;

  skillLevels: SkillLevel[];          // מתאים לרמות
  gameStates: GameState[];            // מצבי משחק
  topics: ExerciseTopic[];            // נושאי תרגיל

  videoUrl?: string;                   // Firebase Storage URL
  duration: number;                    // minutes

  isGlobal: boolean;                   // true = available to all
  createdByCoachId?: string;           // If private exercise

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

type ExerciseTopic =
  | 'opportunity_center'
  | 'match_play'
  | 'direction'
  | 'stability'
  | 'depth'
  | 'height'
  | 'clearance_search'
  | 'agility';
```

#### exerciseRequests
```typescript
interface ExerciseRequest {
  id: string;
  coachId: string;
  coachName: string;

  name: string;
  description: string;
  skillLevels: SkillLevel[];
  gameStates: GameState[];            // Max 3
  topics: ExerciseTopic[];            // Max 4
  videoUrl?: string;
  duration: number;

  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;

  createdAt: Timestamp;
}
```

#### goals
```typescript
interface Goal {
  id: string;
  description: string;
  month: string;                       // "2026-01" format
  groupTypeId: string;                 // Goal per group type
  groupTypeName: string;               // Denormalized

  isAchieved: boolean;
  achievedAt?: Timestamp;

  createdBy: string;                   // Supervisor ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### values
```typescript
interface Value {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  month: string;                       // "2026-01" format
  sortOrder: number;                   // 1-3

  createdBy: string;                   // Supervisor ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### comments
```typescript
interface Comment {
  id: string;
  trainingId: string;
  monthlyPlanId?: string;

  authorId: string;
  authorName: string;
  authorRole: 'center_manager' | 'supervisor';

  content: string;
  status: 'open' | 'resolved';

  parentId?: string;                   // For replies

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### monthlyPlans
```typescript
interface MonthlyPlan {
  id: string;
  coachId: string;
  coachName: string;
  centerId: string;
  centerName: string;
  month: string;                       // "2026-01"

  status: 'draft' | 'submitted' | 'reviewed';
  submittedAt?: Timestamp;

  trainingIds: string[];               // References to trainings
  trainingCount: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### calendarEvents
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;

  date: Timestamp;
  endDate?: Timestamp;                 // For multi-day events

  centerId?: string;                   // null = all centers
  centerName?: string;

  description?: string;
  sendNotification: boolean;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type CalendarEventType =
  | 'holiday'
  | 'competition'
  | 'internal_competition'
  | 'abroad'
  | 'special_event'
  | 'staff_meeting'
  | 'social_event'
  | 'training_seminar'
  | 'instruction'
  | 'special_training'
  | 'training_camp';
```

#### notifications
```typescript
interface Notification {
  id: string;
  userId: string;                      // Recipient

  type: NotificationType;
  title: string;
  body: string;

  relatedEntityType?: 'training' | 'comment' | 'exercise' | 'monthlyPlan';
  relatedEntityId?: string;

  isRead: boolean;
  readAt?: Timestamp;

  createdAt: Timestamp;
}

type NotificationType =
  | 'comment_received'
  | 'comment_reply'
  | 'exercise_approved'
  | 'exercise_rejected'
  | 'monthly_plan_reminder'
  | 'event_reminder'
  | 'general';
```

#### settings
```typescript
// Document ID: 'global'
interface GlobalSettings {
  monthlyPlanDeadlineDay: number;      // Default: 1
  allowedEmailDomain: string;          // e.g., "tenniscenter.co.il"
  organizationName: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

#### trash
```typescript
interface TrashItem {
  id: string;
  originalCollection: string;          // e.g., 'trainings'
  originalId: string;
  data: Record<string, any>;           // Original document data
  deletedBy: string;
  deletedAt: Timestamp;
  expiresAt: Timestamp;                // Auto-delete after 30 days
}
```

### 3.3 Indexes

```
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "trainings",
      "fields": [
        { "fieldPath": "coachId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "trainings",
      "fields": [
        { "fieldPath": "centerId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "trainings",
      "fields": [
        { "fieldPath": "groupId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "trainings",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "exercises",
      "fields": [
        { "fieldPath": "isGlobal", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "fields": [
        { "fieldPath": "trainingId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "monthlyPlans",
      "fields": [
        { "fieldPath": "centerId", "order": "ASCENDING" },
        { "fieldPath": "month", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "goals",
      "fields": [
        { "fieldPath": "month", "order": "ASCENDING" },
        { "fieldPath": "groupTypeId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 4. Firebase Security Rules

### 4.1 Firestore Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isRole(role) {
      return isAuthenticated() && getUserData().role == role;
    }

    function isSupervisor() {
      return isRole('supervisor');
    }

    function isCenterManager() {
      return isRole('center_manager');
    }

    function isCoach() {
      return isRole('coach');
    }

    function isCenterManagerOrSupervisor() {
      return isSupervisor() || isCenterManager();
    }

    function belongsToCenter(centerId) {
      return centerId in getUserData().centerIds;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isCenterManagerOrSupervisor();
      allow update: if isCenterManagerOrSupervisor() || isOwner(userId);
      allow delete: if isSupervisor();
    }

    // Centers collection
    match /centers/{centerId} {
      allow read: if isAuthenticated();
      allow write: if isSupervisor();
    }

    // Coaches collection
    match /coaches/{coachId} {
      allow read: if isAuthenticated();
      allow create: if isCenterManagerOrSupervisor();
      allow update: if isCenterManagerOrSupervisor() || isOwner(coachId);
      allow delete: if isSupervisor();
    }

    // Groups collection
    match /groups/{groupId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.coachId == request.auth.uid ||
        isCenterManagerOrSupervisor()
      );
      allow delete: if isCenterManagerOrSupervisor();
    }

    // Group Types collection
    match /groupTypes/{typeId} {
      allow read: if isAuthenticated();
      allow write: if isSupervisor();
    }

    // Trainings collection
    match /trainings/{trainingId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.coachId == request.auth.uid ||
        isCenterManagerOrSupervisor()
      );
      allow delete: if resource.data.coachId == request.auth.uid ||
        isCenterManagerOrSupervisor();
    }

    // Exercises collection
    match /exercises/{exerciseId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isSupervisor() || (
        resource.data.createdByCoachId == request.auth.uid &&
        !resource.data.isGlobal
      );
      allow delete: if isSupervisor();
    }

    // Exercise Requests collection
    match /exerciseRequests/{requestId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isSupervisor();
      allow delete: if isSupervisor();
    }

    // Goals collection
    match /goals/{goalId} {
      allow read: if isAuthenticated();
      allow write: if isSupervisor();
    }

    // Values collection
    match /values/{valueId} {
      allow read: if isAuthenticated();
      allow write: if isSupervisor();
    }

    // Comments collection
    match /comments/{commentId} {
      allow read: if isAuthenticated();
      allow create: if isCenterManagerOrSupervisor() || (
        isCoach() && request.resource.data.parentId != null
      );
      allow update: if resource.data.authorId == request.auth.uid ||
        isCenterManagerOrSupervisor();
      allow delete: if isSupervisor();
    }

    // Monthly Plans collection
    match /monthlyPlans/{planId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if resource.data.coachId == request.auth.uid ||
        isCenterManagerOrSupervisor();
      allow delete: if isSupervisor();
    }

    // Calendar Events collection
    match /calendarEvents/{eventId} {
      allow read: if isAuthenticated();
      allow write: if isCenterManagerOrSupervisor();
    }

    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if resource.data.userId == request.auth.uid;
      allow update: if resource.data.userId == request.auth.uid;
      allow delete: if resource.data.userId == request.auth.uid;
      allow create: if false; // Only via Cloud Functions
    }

    // Settings collection
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isSupervisor();
    }

    // Trash collection
    match /trash/{trashId} {
      allow read: if isSupervisor();
      allow write: if isSupervisor();
    }
  }
}
```

### 4.2 Storage Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    // Exercise videos
    match /exercises/{exerciseId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated()
        && request.resource.size < 100 * 1024 * 1024  // 100MB limit
        && request.resource.contentType.matches('video/.*');
    }

    // Center logos
    match /centers/{centerId}/logo/{fileName} {
      allow read: if true;  // Public
      allow write: if isAuthenticated()
        && request.resource.size < 5 * 1024 * 1024  // 5MB limit
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 5. רכיבי React

### 5.1 Routing Structure

```typescript
// src/App.tsx
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      // Coach routes
      {
        path: 'coach',
        element: <RoleGuard allowedRoles={['coach']} />,
        children: [
          { index: true, element: <CoachDashboard /> },
          { path: 'trainings', element: <MyTrainings /> },
          { path: 'trainings/new', element: <CreateTraining /> },
          { path: 'trainings/:id', element: <EditTraining /> },
          { path: 'groups', element: <MyGroups /> },
          { path: 'groups/:id', element: <GroupDetails /> },
          { path: 'exercises', element: <Exercises /> },
          { path: 'my-exercises', element: <MyExercises /> },
          { path: 'exercises/request', element: <RequestExercise /> },
          { path: 'monthly-plan', element: <MonthlyPlan /> },
          { path: 'notifications', element: <Notifications /> },
        ],
      },

      // Center Manager routes
      {
        path: 'center',
        element: <RoleGuard allowedRoles={['center_manager']} />,
        children: [
          { index: true, element: <CenterDashboard /> },
          { path: 'calendar', element: <CenterCalendar /> },
          { path: 'coaches', element: <ManageCoaches /> },
          { path: 'coaches/:id', element: <CoachDetails /> },
          { path: 'groups', element: <ManageGroups /> },
          { path: 'trainings/review', element: <ReviewTrainings /> },
          { path: 'values', element: <MonthlyValues /> },
          { path: 'goals', element: <MonthlyGoal /> },
        ],
      },

      // Supervisor routes
      {
        path: 'admin',
        element: <RoleGuard allowedRoles={['supervisor']} />,
        children: [
          { index: true, element: <SupervisorDashboard /> },
          { path: 'centers', element: <AllCenters /> },
          { path: 'centers/:id', element: <CenterOverview /> },
          { path: 'coaches', element: <AllCoaches /> },
          { path: 'users', element: <ManageUsers /> },
          { path: 'exercises', element: <GlobalExercises /> },
          { path: 'exercises/requests', element: <ExerciseRequests /> },
          { path: 'goals', element: <ManageGoals /> },
          { path: 'values', element: <ManageValues /> },
          { path: 'group-types', element: <ManageGroupTypes /> },
          { path: 'monthly-plans', element: <MonthlyPlansOverview /> },
          { path: 'settings', element: <SystemSettings /> },
          { path: 'trash', element: <TrashBin /> },
        ],
      },

      // Redirect based on role
      { index: true, element: <RoleRedirect /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
```

### 5.2 Core Component Examples

#### useAuth Hook
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      login,
      logout,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

#### Training Form Component Structure
```typescript
// src/components/training/TrainingForm.tsx
interface TrainingFormProps {
  training?: Training;
  onSubmit: (data: TrainingFormData) => Promise<void>;
  onCancel: () => void;
}

export function TrainingForm({ training, onSubmit, onCancel }: TrainingFormProps) {
  // Form sections:
  // 1. Group & Date/Time selection
  // 2. Period type, Game state, Game component
  // 3. Topics (multi-select)
  // 4. Details (textarea)
  // 5. Exercises table with:
  //    - Autocomplete exercise selector
  //    - Duration
  //    - Auto-loaded: level, game state, topic
  //    - Video preview
  //    - Description preview
  // 6. Recurring options (if new)
  // 7. Save as draft / Save as planned buttons
}
```

---

## 6. Cloud Functions

### 6.1 Function Definitions

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// ===== AUTH TRIGGERS =====

// On new user creation - validate email domain
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const settings = await admin.firestore()
    .collection('settings')
    .doc('global')
    .get();

  const allowedDomain = settings.data()?.allowedEmailDomain;

  if (allowedDomain && !user.email?.endsWith(`@${allowedDomain}`)) {
    // Delete unauthorized user
    await admin.auth().deleteUser(user.uid);
    throw new functions.https.HttpsError(
      'permission-denied',
      'Email domain not authorized'
    );
  }
});

// ===== FIRESTORE TRIGGERS =====

// On comment creation - send notification
export const onCommentCreate = functions.firestore
  .document('comments/{commentId}')
  .onCreate(async (snap, context) => {
    const comment = snap.data();

    // Get training to find coach
    const training = await admin.firestore()
      .collection('trainings')
      .doc(comment.trainingId)
      .get();

    const coachId = training.data()?.coachId;

    // Create notification
    await admin.firestore().collection('notifications').add({
      userId: coachId,
      type: 'comment_received',
      title: 'הערה חדשה על תוכנית האימון',
      body: `${comment.authorName} הוסיף הערה`,
      relatedEntityType: 'comment',
      relatedEntityId: snap.id,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send push notification
    const coach = await admin.firestore()
      .collection('users')
      .doc(coachId)
      .get();

    const tokens = coach.data()?.fcmTokens || [];

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'הערה חדשה על תוכנית האימון',
          body: `${comment.authorName} הוסיף הערה`,
        },
        data: {
          type: 'comment',
          trainingId: comment.trainingId,
        },
      });
    }
  });

// On exercise request approval
export const onExerciseRequestUpdate = functions.firestore
  .document('exerciseRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to approved
    if (before.status === 'pending' && after.status === 'approved') {
      // Create global exercise from request
      await admin.firestore().collection('exercises').add({
        name: after.name,
        description: after.description,
        skillLevels: after.skillLevels,
        gameStates: after.gameStates,
        topics: after.topics,
        videoUrl: after.videoUrl,
        duration: after.duration,
        isGlobal: true,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notify coach
      await admin.firestore().collection('notifications').add({
        userId: after.coachId,
        type: 'exercise_approved',
        title: 'התרגיל אושר!',
        body: `התרגיל "${after.name}" אושר והתווסף למאגר`,
        relatedEntityType: 'exercise',
        relatedEntityId: context.params.requestId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Check if rejected
    if (before.status === 'pending' && after.status === 'rejected') {
      await admin.firestore().collection('notifications').add({
        userId: after.coachId,
        type: 'exercise_rejected',
        title: 'התרגיל לא אושר',
        body: `התרגיל "${after.name}" לא אושר. סיבה: ${after.rejectionReason || 'לא צוינה'}`,
        relatedEntityType: 'exercise',
        relatedEntityId: context.params.requestId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// ===== SCHEDULED FUNCTIONS =====

// Monthly plan deadline reminder - runs daily at 8:00 AM
export const monthlyPlanReminder = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    const settings = await admin.firestore()
      .collection('settings')
      .doc('global')
      .get();

    const deadlineDay = settings.data()?.monthlyPlanDeadlineDay || 1;
    const today = new Date();

    // Remind 3 days before deadline
    const reminderDay = deadlineDay - 3;

    if (today.getDate() === reminderDay || today.getDate() === deadlineDay) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const monthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

      // Find coaches without submitted plans
      const coaches = await admin.firestore()
        .collection('coaches')
        .where('isActive', '==', true)
        .get();

      const submittedPlans = await admin.firestore()
        .collection('monthlyPlans')
        .where('month', '==', monthStr)
        .where('status', '==', 'submitted')
        .get();

      const submittedCoachIds = new Set(
        submittedPlans.docs.map(d => d.data().coachId)
      );

      for (const coach of coaches.docs) {
        if (!submittedCoachIds.has(coach.id)) {
          const isDeadline = today.getDate() === deadlineDay;

          await admin.firestore().collection('notifications').add({
            userId: coach.id,
            type: 'monthly_plan_reminder',
            title: isDeadline
              ? 'היום הדדליין להגשת תוכנית חודשית!'
              : 'תזכורת: הגשת תוכנית חודשית',
            body: isDeadline
              ? `נא להגיש את התוכנית החודשית ל-${monthStr}`
              : `נותרו 3 ימים להגשת התוכנית החודשית ל-${monthStr}`,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }
  });

// Cleanup trash - runs daily at 2:00 AM
export const cleanupTrash = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    const expiredItems = await admin.firestore()
      .collection('trash')
      .where('expiresAt', '<=', now)
      .get();

    const batch = admin.firestore().batch();

    expiredItems.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Deleted ${expiredItems.size} expired trash items`);
  });

// ===== CALLABLE FUNCTIONS =====

// Soft delete with trash
export const softDelete = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');
  }

  const { collection, documentId } = data;

  const docRef = admin.firestore().collection(collection).doc(documentId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Document not found');
  }

  // Move to trash
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await admin.firestore().collection('trash').add({
    originalCollection: collection,
    originalId: documentId,
    data: doc.data(),
    deletedBy: context.auth.uid,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  await docRef.delete();

  return { success: true };
});

// Restore from trash
export const restoreFromTrash = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');
  }

  const { trashId } = data;

  const trashDoc = await admin.firestore()
    .collection('trash')
    .doc(trashId)
    .get();

  if (!trashDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Trash item not found');
  }

  const trashData = trashDoc.data()!;

  // Restore to original collection
  await admin.firestore()
    .collection(trashData.originalCollection)
    .doc(trashData.originalId)
    .set(trashData.data);

  // Delete from trash
  await trashDoc.ref.delete();

  return { success: true };
});
```

---

## 7. שלבי פיתוח מפורטים

### שלב 1: בסיס הפרויקט (2-3 ימים)

#### 1.1 Setup
- [ ] יצירת פרויקט Vite + React + TypeScript
- [ ] התקנת dependencies
- [ ] הגדרת Tailwind CSS
- [ ] הגדרת מבנה תיקיות
- [ ] הגדרת ESLint + Prettier

#### 1.2 Firebase Setup
- [ ] יצירת פרויקט Firebase
- [ ] הגדרת Authentication (Email/Password)
- [ ] יצירת Firestore database
- [ ] יצירת Storage bucket
- [ ] הגדרת Cloud Functions project
- [ ] Deploy של Security Rules ראשוניים

#### 1.3 Authentication
- [ ] דף התחברות
- [ ] דף שכחתי סיסמה
- [ ] Auth context + hook
- [ ] Protected routes
- [ ] Role-based routing

### שלב 2: ליבת המאמן (5-7 ימים)

#### 2.1 Layout & Navigation
- [ ] App layout (header, sidebar, content)
- [ ] Mobile navigation (bottom tabs)
- [ ] Responsive design base
- [ ] RTL setup

#### 2.2 Coach Dashboard
- [ ] תצוגת יום נוכחי
- [ ] רשימת אימונים להיום
- [ ] Quick actions (יצירת אימון, צפייה בתרגילים)
- [ ] סיכום חודשי קצר

#### 2.3 Calendar Views
- [ ] תצוגת יום
- [ ] תצוגת שבוע
- [ ] תצוגת חודש
- [ ] ניווט בין תאריכים
- [ ] יצירת אימון מהלוח

#### 2.4 ניהול קבוצות
- [ ] רשימת קבוצות
- [ ] יצירת קבוצה חדשה
- [ ] עריכת קבוצה
- [ ] חיפוש וסינון

#### 2.5 תכנון אימון
- [ ] טופס יצירת אימון
- [ ] בחירת קבוצה ותאריך/שעה
- [ ] בחירת סוג תקופה, מצב משחק, מרכיב
- [ ] בחירת נושאים (multi-select)
- [ ] שדה פירוט
- [ ] סטטוס אימון

#### 2.6 אימונים חוזרים
- [ ] Modal להגדרת חזרה
- [ ] אפשרויות: יומי, שבועי, דו-שבועי, חודשי
- [ ] סיום: אחרי X פעמים או בתאריך
- [ ] עריכה: האימון הזה / עתידיים / כל הסדרה
- [ ] שכפול אימון

#### 2.7 תוכנית חודשית
- [ ] תצוגת אימוני החודש
- [ ] כפתור הגשה
- [ ] סטטוס הגשה
- [ ] תזכורת לדדליין

### שלב 3: תרגילים (3-4 ימים)

#### 3.1 מאגר תרגילים
- [ ] רשימת תרגילים גלובליים
- [ ] כרטיס תרגיל (שם, הסבר, סרטון)
- [ ] סינון: מצב משחק, רמה, נושא
- [ ] חיפוש

#### 3.2 תרגילים פרטיים
- [ ] רשימת התרגילים שלי
- [ ] יצירת תרגיל פרטי
- [ ] עריכה ומחיקה

#### 3.3 בקשות לתרגילים
- [ ] טופס בקשה
- [ ] העלאת סרטון ל-Storage
- [ ] סטטוס בקשה
- [ ] היסטוריית בקשות

#### 3.4 שילוב באימון
- [ ] Autocomplete לבחירת תרגיל
- [ ] טעינה אוטומטית של פרטי התרגיל
- [ ] תצוגת סרטון
- [ ] סידור תרגילים (drag & drop)

### שלב 4: מנהלים (4-5 ימים)

#### 4.1 דשבורד מנהל מרכז
- [ ] לוח שנה מרכזי
- [ ] סטטוס תוכניות חודשיות
- [ ] רשימת מאמנים
- [ ] ערכים ומטרות החודש

#### 4.2 ניהול מאמנים
- [ ] רשימת מאמנים במרכז
- [ ] יצירת מאמן חדש
- [ ] צפייה בפרטי מאמן
- [ ] העברה לארכיון

#### 4.3 צפייה בתוכניות
- [ ] רשימת תוכניות אימון
- [ ] סינון לפי מאמן/קבוצה
- [ ] צפייה בפרטי אימון

#### 4.4 דשבורד מנהל מקצועי
- [ ] גרף מטרות שהושגו
- [ ] מעקב תוכניות חודשיות
- [ ] לוח שנה כללי
- [ ] סטטוס מרכזים

#### 4.5 ניהול משתמשים
- [ ] רשימת כל המשתמשים
- [ ] יצירת משתמש חדש
- [ ] הגדרת תפקיד
- [ ] ניהול הרשאות

#### 4.6 הגדרות מערכת
- [ ] דדליין תוכנית חודשית
- [ ] דומיין מייל מאושר
- [ ] שם הארגון

### שלב 5: מערכת הערות (2-3 ימים)

#### 5.1 הוספת הערות
- [ ] כפתור הערה בתוכנית
- [ ] טופס הערה
- [ ] שמירה ותצוגה

#### 5.2 שיחות
- [ ] תגובות להערות
- [ ] Thread של הודעות
- [ ] סטטוס: פתוח/טופל

#### 5.3 התראות
- [ ] התראה על הערה חדשה
- [ ] התראה על תגובה
- [ ] סימון כנקרא

### שלב 6: מטרות וערכים (2 ימים)

#### 6.1 ניהול מטרות
- [ ] יצירת מטרה לסוג קבוצה
- [ ] עריכה ומחיקה
- [ ] סימון כהושגה
- [ ] תצוגה לפי חודש

#### 6.2 ניהול ערכים
- [ ] יצירת ערכים חודשיים (1-3)
- [ ] עדיפות
- [ ] תצוגה לכל המשתמשים

#### 6.3 ניהול סוגי קבוצות
- [ ] רשימת סוגי קבוצות
- [ ] הוספה ועריכה
- [ ] סדר תצוגה

### שלב 7: התראות ואירועים (2-3 ימים)

#### 7.1 מערכת התראות
- [ ] Push notifications setup (FCM)
- [ ] מסך התראות
- [ ] סימון כנקרא
- [ ] מחיקה

#### 7.2 לוח אירועים
- [ ] יצירת אירוע
- [ ] סוגי אירועים
- [ ] תצוגה בלוח
- [ ] בחירת התראה

#### 7.3 התראות לאירועים
- [ ] Cloud Function לשליחה
- [ ] זמן התראה מותאם

### שלב 8: השלמות (2-3 ימים)

#### 8.1 סל מיחזור
- [ ] מסך צפייה בפריטים שנמחקו
- [ ] שחזור פריט
- [ ] מחיקה סופית
- [ ] Cloud Function לניקוי אוטומטי

#### 8.2 חיפוש
- [ ] חיפוש תרגילים
- [ ] חיפוש קבוצות
- [ ] חיפוש אימונים
- [ ] חיפוש מאמנים (למנהלים)

#### 8.3 התרעות
- [ ] התרעה על התנגשות זמנים
- [ ] אישור המשך / ביטול

#### 8.4 בדיקות וליטוש
- [ ] בדיקות E2E
- [ ] ביצועים
- [ ] תיקוני באגים
- [ ] שיפורי UX

---

## 8. הנחיות UI/UX

### 8.1 Design Tokens

```css
/* Colors */
--color-primary: #2563eb;        /* Blue 600 */
--color-primary-hover: #1d4ed8;  /* Blue 700 */
--color-secondary: #64748b;      /* Slate 500 */
--color-success: #16a34a;        /* Green 600 */
--color-warning: #ca8a04;        /* Yellow 600 */
--color-error: #dc2626;          /* Red 600 */

--color-background: #ffffff;
--color-surface: #f8fafc;        /* Slate 50 */
--color-border: #e2e8f0;         /* Slate 200 */
--color-text-primary: #1e293b;   /* Slate 800 */
--color-text-secondary: #64748b; /* Slate 500 */

/* Spacing */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* Border Radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

/* Typography */
--font-family: 'Heebo', 'Assistant', sans-serif;
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-lg: 18px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-3xl: 30px;
```

### 8.2 Status Colors & Badges

```
// Training Status
draft     → Gray      → "טיוטה"
planned   → Blue      → "מתוכנן"
completed → Green     → "בוצע"
cancelled → Red       → "בוטל"

// Exercise Request Status
pending   → Yellow    → "ממתין"
approved  → Green     → "מאושר"
rejected  → Red       → "נדחה"

// Comment Status
open      → Yellow    → "פתוח"
resolved  → Green     → "טופל"

// Monthly Plan Status
draft     → Gray      → "טיוטה"
submitted → Green     → "הוגש"
reviewed  → Blue      → "נבדק"

// Priority
high      → Red       → "גבוהה"
medium    → Yellow    → "בינונית"
low       → Gray      → "נמוכה"
```

### 8.3 Responsive Breakpoints

```css
/* Mobile First */
sm: 640px   /* Large phones */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

### 8.4 Mobile Navigation

```
Bottom Navigation (Mobile):
┌─────────────────────────────────────────┐
│  [🏠]     [📅]     [➕]    [📝]    [⚙️] │
│  בית    יומן     אימון  תרגילים הגדרות │
└─────────────────────────────────────────┘
```

### 8.5 RTL Considerations

- כל הטקסט מיושר לימין
- Icons בצד שמאל של כפתורים
- Navigation מימין לשמאל
- Sidebar בצד ימין (desktop)
- Form labels מעל השדות, מיושרים לימין
- Table headers מיושרים לימין
- Numbers remain LTR (תאריכים, שעות)

### 8.6 Component Guidelines

#### Cards
- רקע לבן
- Border radius: 12px
- Shadow קל
- Padding: 16px
- Header עם כותרת ו-actions בצד שמאל

#### Forms
- Labels מעל השדות
- Placeholder בצבע בהיר
- Error message מתחת לשדה באדום
- כפתור Submit בולט, Cancel משני
- ולידציה בזמן אמת

#### Tables (Mobile)
- המרה ל-Cards במובייל
- או גלילה אופקית עם sticky first column
- שורות לחיצות לצפייה בפרטים

#### Empty States
- אייקון גדול באמצע
- כותרת קצרה
- כפתור פעולה (למשל "יצירת אימון ראשון")

---

## 9. סיכום

מסמך זה מתאר את התכנון הטכני המלא למערכת ניהול אימוני טניס. המערכת בנויה כ-PWA מבוססת React + Firebase, עם תמיכה מלאה בעברית ו-RTL.

### אבני דרך עיקריות:
1. **שלב 1-2**: בסיס + ליבת מאמן (MVP ראשוני)
2. **שלב 3-4**: תרגילים + מנהלים
3. **שלב 5-7**: הערות, מטרות, התראות
4. **שלב 8**: השלמות וליטוש

### הערות חשובות:
- פיתוח Mobile-first (80% שימוש מהטלפון)
- אופליין יתווסף בשלב מאוחר יותר
- ייצוא דוחות יתווסף בהמשך
- היסטוריית שינויים תתווסף בהמשך

---

*מסמך זה נכתב ב-26 בינואר 2026*
