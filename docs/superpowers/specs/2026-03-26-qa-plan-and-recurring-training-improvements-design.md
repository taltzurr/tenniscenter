# QA Plan & Recurring Training Improvements — Design Spec

**Date:** 2026-03-26
**Author:** Claude (AI Assistant)
**Status:** Approved (reviewed)

---

## Overview

Full QA cycle covering 5 feature areas of the Tennis Center app, plus development of missing recurring training management capabilities. All testing runs against production (https://tennis-centers.web.app) with Firestore backend verification.

---

## Part A: New Development — Recurring Training Series Management

### Problem

After creating a recurring training series, coaches have no way to:
- View which trainings belong to the same series
- Edit all trainings in a series at once
- Delete an entire series
- Know if the series was truncated at the 100-training limit

### Solution

#### A1. Series Management Service Functions

**File:** `src/services/trainings.js`

New functions:
- `fetchSeriesTrainings(recurrenceGroupId)` — query all trainings with matching `recurrenceGroupId`, ordered by date. **Requires Firestore composite index:** `recurrenceGroupId` + `date` (ascending).
- `updateSeriesTrainings(recurrenceGroupId, updates, scope)` — batch update trainings in series. Scope: `"future"` (date > today, exclusive of today) or `"all"` (entire series). Updatable fields: startTime, endTime, topic, location, equipment. Uses Firestore `writeBatch()` (safe: max 100 trainings per series, well under 500-op limit).
- `deleteSeriesTrainings(recurrenceGroupId, scope)` — batch delete with same scope options. "future" = date strictly after today. "all" = entire series regardless of date.

#### A2. Store Functions

**File:** `src/stores/trainingsStore.js`

New state and actions:
- `seriesTrainings: []` — list of trainings in current series
- `fetchSeries(recurrenceGroupId)` — calls service, populates seriesTrainings
- `updateSeries(recurrenceGroupId, updates, scope)` — calls service, refreshes store
- `deleteSeries(recurrenceGroupId, scope)` — calls service, removes from store

#### A3. Series Management Modal

**File:** `src/features/trainings/SeriesManagementModal/SeriesManagementModal.jsx` (new)
**File:** `src/features/trainings/SeriesManagementModal/SeriesManagementModal.module.css` (new)

UI:
- Triggered from TrainingForm when editing a training with `recurrenceGroupId`
- Replaces the read-only "this is part of a series" message with an actionable button: "ניהול סדרה (X אימונים)"
- Modal shows:
  - List of all trainings in series with date, time, status
  - Current training highlighted
  - Action buttons: "עדכן אימונים עתידיים" / "מחק אימונים עתידיים" / "מחק את כל הסדרה"
- Scope selector: "רק עתידיים" (future only) / "כל הסדרה" (entire series)
- Confirmation dialog before destructive actions
- **Loading state:** spinner while fetching series data
- **Empty state:** if series has only 1 training, show message "אימון זה הוא היחיד בסדרה" with option to remove series marker
- **Error state:** toast on batch failure with "שגיאה בעדכון הסדרה. נסה שוב."

#### A4. Truncation Warning

**File:** `src/services/trainings.js` (modify `createRecurringTrainings`)

- When series hits 100-training cap, return `{ trainings, wasTruncated: true, requestedCount, actualCount }`
- **File:** `src/features/trainings/TrainingForm/TrainingForm.jsx` — show warning toast: "נוצרו {actualCount} אימונים מתוך {requestedCount} המבוקשים (מקסימום מערכת)"

#### A5. Series Indicator in Training Details

**File:** `src/features/trainings/TrainingDetailsPage.jsx` (modify)

- If training has `recurrenceGroupId`, show badge: "חלק מסדרה חוזרת" with series count
- Link to series management modal

---

## Part B: QA Test Plan

### B1. Recurring Training QA

**Precondition:** Logged in as coach

| # | Test Case | Action | Expected Result | Backend Verification |
|---|-----------|--------|-----------------|---------------------|
| 1 | Create weekly recurring training | Fill form → select "שבועי" → end after 4 weeks | 4 trainings created | Firestore: 4 docs with same `recurrenceGroupId` |
| 2 | Create multi-day weekly training | Select Monday + Wednesday → 3 weeks | 6 trainings created | Firestore: 6 docs, correct dates (Mon/Wed) |
| 3 | Create daily recurring training | Daily for 5 days | 5 trainings created | Firestore: 5 docs with consecutive dates |
| 4 | Edit single training in series | Edit topic of one training | Only that training changes | Firestore: only 1 doc updated, others unchanged |
| 5 | View series management (NEW) | Click "ניהול סדרה" on recurring training | Modal shows all series trainings | N/A |
| 6 | Update future trainings (NEW) | Change time for future trainings | Future trainings updated | Firestore: future docs updated, past unchanged |
| 7 | Delete future trainings (NEW) | Delete future trainings in series | Future trainings removed | Firestore: future docs deleted |
| 8 | Delete entire series (NEW) | Delete all trainings in series | All trainings removed | Firestore: all docs with that groupId deleted |
| 9 | Truncation warning (NEW) | Create daily training with endType "never" (or end date 1 year out) | Warning toast showing "נוצרו 100 אימונים מתוך X המבוקשים" | Firestore: exactly 100 docs with same groupId |

### B2. Password Change QA

**Test user:** talzur007@gmail.com

| # | Test Case | Action | Expected Result | Backend Verification |
|---|-----------|--------|-----------------|---------------------|
| 1 | Navigate to settings | Login → Settings page | Settings page loads with password section | N/A |
| 2 | Initiate password change | Click "שנה" on password row | Confirmation dialog appears | N/A |
| 3 | Confirm send | Click confirm | Toast: "נשלח אימייל לאיפוס סיסמה" | Firebase Auth: password reset email sent |
| 4 | Receive email | Check inbox for talzur007@gmail.com | Email received with reset link | N/A |
| 5 | Reset password | Click link → enter new password | Success message, redirect to login | Firebase Auth: password hash updated |
| 6 | Login with new password | Login with new password | Successful login | Firebase Auth: sign-in succeeds |
| 7 | Restore original password | Repeat flow to restore original | Back to original state | Firebase Auth: password restored |

### B3. User Invitation QA

**Test user:** drorshay1@gmail.com

| # | Test Case | Action | Expected Result | Backend Verification |
|---|-----------|--------|-----------------|---------------------|
| 1 | Open user management | Login as supervisor → Users page | Users list loads | N/A |
| 2 | Create new user | Click add → fill form with drorshay1@gmail.com, role: coach | User created, email sent | Firestore: `users` doc created with correct fields |
| 3 | Verify Auth account | N/A | N/A | Firebase Auth: account exists for drorshay1@gmail.com |
| 4 | Receive welcome email | Check drorshay1@gmail.com inbox | Welcome email with link | N/A |
| 5 | Complete onboarding | Click link → WelcomePage → set password | Success, redirect to login | Firebase Auth: password set |
| 6 | First login | Login as drorshay1@gmail.com | Coach dashboard loads | Firestore: user doc `isActive: true` |
| 7 | Resend invitation | Back as supervisor → resend invitation icon | Email/link generated | N/A |

### B4. Exercise Management QA (Coach)

**Precondition:** Logged in as coach

| # | Test Case | Action | Expected Result | Backend Verification |
|---|-----------|--------|-----------------|---------------------|
| 1 | View exercise library | Navigate to /exercises | Exercise list loads with cards | N/A |
| 2 | Filter by category | Select category from dropdown | List filtered correctly | N/A |
| 3 | Filter by difficulty | Select difficulty level | List filtered correctly | N/A |
| 4 | Search exercises | Type search query | Results match query | N/A |
| 5 | View exercise detail | Click on exercise card | Detail page loads with all fields | N/A |
| 6 | Submit exercise request | Click "הגש בקשה" → fill form → submit | Success toast, redirected | Firestore: `exerciseRequests` doc with status `pending` |
| 7 | View own requests | Navigate to /exercise-requests | Own requests listed with correct statuses | N/A |

### B5. Exercise Approval QA (Supervisor)

**Precondition:** Logged in as supervisor (talzur007@gmail.com)

| # | Test Case | Action | Expected Result | Backend Verification |
|---|-----------|--------|-----------------|---------------------|
| 1 | View all requests | Navigate to /exercise-requests | All pending requests visible | N/A |
| 2 | Approve request | Click "אשר והוסף למאגר" on pending request | Toast: approved | Firestore: request status `approved` + new `exercises` doc |
| 3 | Verify exercise created | Navigate to /exercises | New exercise appears in library | Firestore: doc exists in `exercises` |
| 4 | Coach sees approved exercise | Login as coach → /exercises | Exercise visible in library | N/A |
| 5 | Reject request | Create new request as coach → reject as supervisor with note | Toast: rejected with note | Firestore: request status `rejected`, `statusNotes` populated |
| 6 | Coach sees rejection | Login as coach → /exercise-requests | Rejected status with reason visible | N/A |

---

## Execution Order

1. **Phase 1 — Development:** Build recurring training series management (A1-A5)
2. **Phase 2 — Code Review:** Parallel agents review all 5 features for bugs
3. **Phase 3 — Fix:** Apply all fixes from code review
4. **Phase 4 — Deploy:** Build + deploy to Firebase Hosting production
5. **Phase 5 — Production QA:** Execute all test cases (B1-B5) on live site
6. **Phase 6 — Backend Verification:** Firebase CLI checks on Firestore data
7. **Phase 7 — Final Deploy:** If any fixes needed from QA, fix + redeploy

---

## Out of Scope

- Direct password change without email (decided to keep current email-based flow unless user requests)
- Push notifications for exercise approvals
- Unit tests for recurring training date algorithms (can be added later)
- Recurring training edit UI for recurrence rules (frequency/days) — only batch field updates
