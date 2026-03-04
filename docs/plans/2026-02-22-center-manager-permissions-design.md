# Center Manager Permissions — Design Doc
**Date:** 2026-02-22

## Guiding Principle
The center is a "branch". A manager sees and operates **only within their own center**. `managedCenterId` is set exclusively by a supervisor and is not self-editable.

## Scope of Changes

### 1. Lock `managedCenterId` in Settings (`ProfileForm`)
- When `role === 'centerManager'`, the center field renders as read-only text (center name), not a dropdown.
- No ability to change it from the settings page.

### 2. Groups page (`/groups`) for center manager
- Manager sees groups filtered to `managedCenterId` only.
- Manager can create groups — `centerId` is auto-set to `managedCenterId`, field is locked.
- Manager can edit/delete groups in their center.
- `groupsStore.fetchGroups()` already supports fetching by `centerId`; route guard must allow `centerManager`.

### 3. Schedule pages (`/calendar`, `/weekly-schedule`) for center manager
- Manager sees all trainings of all coaches in their center (read-only).
- Filtering: by `coachId` of coaches whose `centerIds` includes `managedCenterId`.
- Manager cannot create/edit/delete coach trainings.

### 4. Events calendar (`/events-calendar`)
- Already works. Verify every created event auto-receives `centerId = managedCenterId`.
- Events appear on all coaches in the center — already implemented.

### 5. Navigation — bottom nav + hamburger menu
Add "קבוצות" (`/groups`) for `centerManager` role in both nav components.

## Files to Modify
1. `src/features/settings/ProfileForm.jsx` — lock center field
2. `src/features/groups/GroupList/GroupList.jsx` — allow centerManager, filter by center
3. `src/features/groups/GroupForm/GroupForm.jsx` — lock centerId for centerManager
4. `src/stores/groupsStore.js` — ensure fetchGroups supports centerId filter
5. `src/features/trainings/TrainingProgramPage/TrainingProgramPage.jsx` — manager sees all center trainings read-only
6. `src/features/trainings/WeeklySchedulePage.jsx` — same
7. `src/components/layout/BottomNav.jsx` (or equivalent) — add groups nav item for manager
8. `src/components/layout/HamburgerMenu.jsx` (or equivalent) — add groups nav item for manager
9. `src/App.jsx` — route guards for /groups allow centerManager
