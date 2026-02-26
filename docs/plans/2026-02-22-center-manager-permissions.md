# Center Manager Permissions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lock `managedCenterId` from self-editing in Settings, add full group management for center managers, and make schedule pages show center-scoped data read-only.

**Architecture:** All changes are UI-layer only — no new Firebase collections needed. The `managedCenterId` field on the user document is already the source of truth; we just prevent the manager from overwriting it via ProfileForm and ensure every data-fetch is scoped to their center. The services layer (`groups.js`, `trainings.js`) already supports the queries we need.

**Tech Stack:** React 19, Zustand, Firebase Firestore, CSS Modules, React Router v6, lucide-react

---

### Task 1: Lock center field in ProfileForm for centerManager

**Files:**
- Modify: `src/features/settings/ProfileForm.jsx`

**Context:** Lines 75-88 render a `<select>` for the center. When the logged-in user is a `centerManager`, replace it with a read-only display of the center name. The `handleSubmit` must also not overwrite `centerIds`/`managedCenterId` for managers.

**Step 1: Read the file**
Already read — `ProfileForm.jsx` lines 75-88 (center select) and lines 29-34 (handleSubmit writes `centerIds`).

**Step 2: Edit ProfileForm.jsx**

Replace lines 75-88 (the center `<select>` group):

```jsx
<div className={styles.formGroup}>
    <label className={styles.label}>מרכז טניס</label>
    {userData?.role === 'centerManager' ? (
        <input
            type="text"
            className={`${styles.input} ${styles.disabled}`}
            value={centers.find(c => c.id === (userData?.managedCenterId || userData?.centerIds?.[0]))?.name || 'לא מוגדר'}
            disabled
        />
    ) : (
        <select
            className={styles.input}
            value={formData.centerId}
            onChange={e => setFormData({ ...formData, centerId: e.target.value })}
        >
            <option value="">בחר מרכז...</option>
            {centers.map(center => (
                <option key={center.id} value={center.id}>
                    {center.name}
                </option>
            ))}
        </select>
    )}
</div>
```

Replace `handleSubmit` (lines 29-34) — exclude `centerIds`/`centerName` for managers:

```jsx
const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const updateData = {
            displayName: formData.displayName,
            phone: formData.phone,
        };
        // Only non-managers can change their center
        if (userData?.role !== 'centerManager') {
            updateData.centerIds = [formData.centerId];
            updateData.centerName = centers.find(c => c.id === formData.centerId)?.name || '';
        }
        await updateProfile(updateData);
        onClose();
    } catch (error) {
        console.error('Failed to update profile', error);
    } finally {
        setIsSaving(false);
    }
};
```

**Step 3: Manual verify**
Login as manager@tennis.com → Settings → Profile — center field should show as read-only text, no dropdown.

**Step 4: Commit**
```bash
git add src/features/settings/ProfileForm.jsx
git commit -m "fix: lock managedCenterId from self-edit in ProfileForm for centerManager"
```

---

### Task 2: Add `getGroupsByCenter` to groups service and store

**Files:**
- Modify: `src/services/groups.js`
- Modify: `src/stores/groupsStore.js`

**Context:** `groupsStore.fetchGroups(coachId, isSupervisor)` currently only filters by `coachId` or fetches all. We need a third path: fetch by `centerId` for center managers.

**Step 1: Add `getGroupsByCenter` to `src/services/groups.js`**

After line 129 (end of `getAllGroups`), add:

```js
/**
 * Get all groups for a specific center (for center managers)
 * @param {string} centerId
 * @returns {Promise<Array>}
 */
export async function getGroupsByCenter(centerId) {
    if (isDemoMode()) {
        return getMockGroups().filter(g => g.centerId === centerId && g.isActive);
    }

    const q = query(
        collection(db, COLLECTION),
        where('centerId', '==', centerId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**Step 2: Update import in `src/stores/groupsStore.js`**

Line 1-9 — add `getGroupsByCenter` to the import:

```js
import {
    getGroups,
    getAllGroups,
    getGroupsByCenter,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup
} from '../services/groups';
```

**Step 3: Update `fetchGroups` in `src/stores/groupsStore.js`**

Replace lines 19-29:

```js
// Fetch groups for current user
fetchGroups: async (coachId, isSupervisor = false, centerId = null) => {
    set({ isLoading: true, error: null });
    try {
        let groups;
        if (isSupervisor) {
            groups = await getAllGroups();
        } else if (centerId) {
            groups = await getGroupsByCenter(centerId);
        } else {
            groups = await getGroups(coachId);
        }
        set({ groups, isLoading: false });
    } catch (error) {
        set({ error: error.message, isLoading: false });
    }
},
```

**Step 4: Commit**
```bash
git add src/services/groups.js src/stores/groupsStore.js
git commit -m "feat: add getGroupsByCenter for center manager scoped group fetching"
```

---

### Task 3: Update GroupList to support centerManager

**Files:**
- Modify: `src/features/groups/GroupList/GroupList.jsx`

**Context:** Lines 27-32 call `fetchGroups(userData.id, isSupervisor)`. For `centerManager`, pass `centerId` instead. The "new group" button should remain visible for managers. No other changes needed — edit/delete are already available.

**Step 1: Edit `useEffect` in `GroupList.jsx` (lines 27-32)**

```jsx
useEffect(() => {
    if (userData) {
        const isSupervisor = userData.role === 'supervisor';
        const isCenterManager = userData.role === 'centerManager';
        const centerId = isCenterManager ? userData.managedCenterId : null;
        fetchGroups(userData.id, isSupervisor, centerId);
    }
}, [userData, fetchGroups]);
```

**Step 2: Manual verify**
Login as manager@tennis.com → `/groups` — should see only groups with `centerId === managedCenterId`. Create a new group — it should appear in the list.

**Step 3: Commit**
```bash
git add src/features/groups/GroupList/GroupList.jsx
git commit -m "feat: filter groups by centerId for centerManager in GroupList"
```

---

### Task 4: Ensure GroupForm locks centerId for centerManager

**Files:**
- Modify: `src/features/groups/GroupForm/GroupForm.jsx`

**Context:** Line 117 in `handleSubmit` already does:
```js
centerId: userData.centerIds?.[0] || userData.managedCenterId || userData.centerId,
```
This is correct — `managedCenterId` is used as fallback. However, for managers the `coachId` set on line 116 (`coachId: userData.id`) would be the manager's ID, not a coach's ID. This is acceptable — the group needs *some* owner, and the manager creating the group is the logical owner. No changes needed here.

**Verify:** GroupForm already correctly auto-assigns `centerId` from `managedCenterId`. No code change required. ✅

---

### Task 5: Add center-scoped training fetch to trainingsStore

**Files:**
- Modify: `src/services/trainings.js` — already has `getOrganizationTrainings(startDate, endDate)` (fetches all). We need one scoped to a center's coaches.
- Modify: `src/stores/trainingsStore.js`

**Context:** `fetchTrainings(coachId, start, end)` calls `getCoachTrainings` (single coach). For managers, we need to fetch trainings for multiple coaches. The existing `getOrganizationTrainings` fetches all — we'll filter by coach IDs in the store after fetching.

**Step 1: Add `fetchCenterTrainings` action to `src/stores/trainingsStore.js`**

After `fetchTraining` action (after line 49), add:

```js
// Fetch all trainings for a list of coach IDs (for center manager view)
fetchCenterTrainings: async (coachIds, startDate, endDate) => {
    if (!coachIds || coachIds.length === 0) {
        set({ trainings: [], isLoading: false });
        return;
    }
    set({ isLoading: true, error: null });
    try {
        const { getOrganizationTrainings } = await import('../services/trainings');
        const all = await getOrganizationTrainings(startDate, endDate);
        const filtered = all.filter(t => coachIds.includes(t.coachId));
        set({ trainings: filtered, isLoading: false });
    } catch (error) {
        set({ error: error.message, isLoading: false });
    }
},
```

**Step 2: Commit**
```bash
git add src/stores/trainingsStore.js
git commit -m "feat: add fetchCenterTrainings action for center manager schedule view"
```

---

### Task 6: Update WeeklySchedulePage for center manager (read-only view)

**Files:**
- Modify: `src/features/trainings/WeeklySchedulePage.jsx`

**Context:** Lines 55-65: `useEffect` calls `fetchGroups(userData.id)` and `fetchTrainings(userData.id, ...)`. For managers, we need to:
1. Fetch groups by centerId
2. Fetch trainings for all center coaches
3. Hide the "Add training" button (read-only)

**Step 1: Add imports at top of WeeklySchedulePage.jsx**

After line 22 (`import useGroupsStore`), add:
```js
import useUsersStore from '../../stores/usersStore';
```

**Step 2: Add usersStore destructure in component** (after line 45):
```js
const { users, fetchUsers } = useUsersStore();
const isCenterManager = userData?.role === 'centerManager';
```

**Step 3: Replace useEffect (lines 55-65)**:
```jsx
useEffect(() => {
    if (!userData?.id) return;

    if (isCenterManager) {
        const centerId = userData.managedCenterId;
        fetchUsers();
        fetchGroups(userData.id, false, centerId);
        fetchEvents(today.getFullYear(), today.getMonth());
        if (weekStart.getMonth() !== weekEnd.getMonth()) {
            fetchEvents(today.getFullYear(), weekEnd.getMonth());
        }
    } else {
        fetchGroups(userData.id);
        fetchTrainings(userData.id, weekStart, weekEnd);
        fetchEvents(today.getFullYear(), today.getMonth());
        if (weekStart.getMonth() !== weekEnd.getMonth()) {
            fetchEvents(today.getFullYear(), weekEnd.getMonth());
        }
    }
}, [userData, isCenterManager]);
```

**Step 4: Add center coaches trainings fetch effect** (after previous useEffect):
```jsx
// For center managers: fetch trainings for all center coaches once users are loaded
useEffect(() => {
    if (!isCenterManager || !users || users.length === 0) return;
    const centerId = userData?.managedCenterId;
    const coachIds = users
        .filter(u => u.role === 'coach' && u.centerIds?.includes(centerId))
        .map(u => u.id);
    const { fetchCenterTrainings } = useTrainingsStore.getState();
    fetchCenterTrainings(coachIds, weekStart, weekEnd);
}, [isCenterManager, users]);
```

**Step 5: Hide "Add training" button for managers**

Find the `<Button>` or `<Link>` that navigates to `/trainings/new` (in `getDayContent` or render). Wrap it:
```jsx
{!isCenterManager && (
    <Button onClick={() => navigate(`/trainings/new?date=...`)}>
        <Plus size={16} />
    </Button>
)}
```

**Step 6: Commit**
```bash
git add src/features/trainings/WeeklySchedulePage.jsx
git commit -m "feat: show center-scoped trainings read-only for centerManager in WeeklySchedulePage"
```

---

### Task 7: Update TrainingProgramPage for center manager (read-only view)

**Files:**
- Modify: `src/features/trainings/TrainingProgramPage/TrainingProgramPage.jsx`

**Context:** Similar to WeeklySchedulePage. The page fetches `fetchGroups(userData.id, isSupervisor)` and `fetchTrainings(userData.id, ...)`. Find these calls (around lines 80-120) and add center manager branch.

**Step 1: Read lines 73-150 of TrainingProgramPage.jsx to find exact useEffect**
```bash
# Read the file section
```

**Step 2: In the useEffect that calls fetchGroups and fetchTrainings:**

Add center manager branch:
```js
if (userData?.role === 'centerManager') {
    const centerId = userData.managedCenterId;
    // fetch center groups
    fetchGroups(userData.id, false, centerId);
    // trainings fetched after users load (via fetchCenterTrainings)
} else {
    const isSupervisor = userData?.role === 'supervisor';
    fetchGroups(userData.id, isSupervisor);
    fetchTrainings(userData.id, monthStart, monthEnd);
}
```

**Step 3: Add secondary useEffect for center manager trainings** (after users are known):
```js
const { users, fetchUsers } = useUsersStore(); // add import at top

useEffect(() => {
    if (userData?.role !== 'centerManager') return;
    if (!users || users.length === 0) { fetchUsers(); return; }
    const coachIds = users
        .filter(u => u.role === 'coach' && u.centerIds?.includes(userData.managedCenterId))
        .map(u => u.id);
    const { fetchCenterTrainings } = useTrainingsStore.getState();
    fetchCenterTrainings(coachIds, monthStart, monthEnd);
}, [userData?.role, users, currentMonth]);
```

**Step 4: Hide "Add training" / "Create training plan" buttons for centerManager**

Search for `navigate('/trainings/new')` or `<Link to="/trainings/new"` and wrap with:
```jsx
{userData?.role !== 'centerManager' && ( ... )}
```

**Step 5: Commit**
```bash
git add src/features/trainings/TrainingProgramPage/TrainingProgramPage.jsx
git commit -m "feat: show center-scoped trainings read-only for centerManager in TrainingProgramPage"
```

---

### Task 8: Add schedule nav items to BottomNav and Sidebar for centerManager

**Files:**
- Modify: `src/components/layout/BottomNav/BottomNav.jsx`
- Modify: `src/components/layout/Sidebar/Sidebar.jsx`

**Context:** BottomNav already has groups for manager (line 17). Need to add calendar/schedule. Sidebar already has groups (line 53). Need to add schedule items.

**Step 1: Update BottomNav.jsx — add Calendar import and schedule item**

Line 2 — add `Calendar` to imports:
```js
import { LayoutDashboard, Calendar, Users, CalendarDays, UserCog, Target } from 'lucide-react';
```
(Already imported — check. If not, add it.)

Replace lines 13-19 (CENTER_MANAGER nav items):
```jsx
if (userData?.role === ROLES.CENTER_MANAGER) {
    return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
        { to: '/users', icon: UserCog, label: 'מאמנים' },
        { to: '/groups', icon: Users, label: 'קבוצות' },
        { to: '/weekly-schedule', icon: Calendar, label: 'לוז' },
    ];
}
```

**Step 2: Update Sidebar.jsx — add schedule to manager section**

Replace lines 47-64 (CENTER_MANAGER nav sections):
```jsx
if (userData?.role === ROLES.CENTER_MANAGER) {
    return [
        {
            section: 'ראשי',
            items: [
                { to: '/dashboard', icon: LayoutDashboard, label: 'ראשי' },
                { to: '/users', icon: UserCog, label: 'מאמנים' },
                { to: '/groups', icon: Users, label: 'קבוצות' },
                { to: '/weekly-schedule', icon: Calendar, label: 'לוז שבועי' },
                { to: '/calendar', icon: CalendarDays, label: 'לוח חודשי' },
            ]
        },
        {
            section: 'ניהול',
            items: [
                { to: '/events-calendar', icon: CalendarDays, label: 'אירועים' },
                { to: '/monthly-plans/review', icon: CalendarDays, label: 'תוכניות' },
                { to: '/settings', icon: Settings, label: 'הגדרות' },
            ]
        }
    ];
}
```

Note: `CalendarDays` is already imported in Sidebar. `Calendar` may need to be added to Sidebar's import line.

**Step 3: Commit**
```bash
git add src/components/layout/BottomNav/BottomNav.jsx src/components/layout/Sidebar/Sidebar.jsx
git commit -m "feat: add schedule nav items for centerManager in BottomNav and Sidebar"
```

---

### Task 9: End-to-end manual verification

Login as `manager@tennis.com` / `Manager123!` and verify:

- [ ] Dashboard loads without error
- [ ] Settings → Profile: center field is read-only (shows center name, no dropdown)
- [ ] `/groups`: shows only groups of managed center; can create, edit, delete groups
- [ ] New group: `centerId` auto-assigned to managed center (visible in Firestore)
- [ ] Bottom nav shows: ראשי | מאמנים | קבוצות | לוז
- [ ] Hamburger menu shows: לוז שבועי + לוח חודשי
- [ ] `/weekly-schedule`: shows all trainings of all coaches in center, no "add training" button
- [ ] `/calendar`: shows all trainings of center coaches, no "add training" button

**Step 1: Commit any final fixes found during verification**
```bash
git add -A
git commit -m "fix: post-verification corrections for centerManager permissions"
```

---

### Task 10: Deploy to production

```bash
npm run build
firebase deploy --only hosting
```

Expected output:
```
✔  hosting[tennis-training-app-gemini]: release complete
✔  Deploy complete!
Hosting URL: https://tennis-training-app-gemini.web.app
```
