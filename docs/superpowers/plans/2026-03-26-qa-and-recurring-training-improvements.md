# QA & Recurring Training Series Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build recurring training series management (view/edit/delete series), then QA all 5 feature areas on production with Firestore backend verification.

**Architecture:** Add series CRUD to existing trainings service/store, create a new SeriesManagementModal component triggered from TrainingForm edit mode, add truncation warning to creation flow, and series badge to details page. All follows existing patterns: service → store → component with CSS Modules.

**Tech Stack:** React 19, Vite 7, Firebase/Firestore, Zustand 5, CSS Modules, lucide-react, date-fns v4

**Spec:** `docs/superpowers/specs/2026-03-26-qa-plan-and-recurring-training-improvements-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/features/trainings/SeriesManagementModal/SeriesManagementModal.jsx` | Modal UI for viewing/editing/deleting a training series |
| `src/features/trainings/SeriesManagementModal/SeriesManagementModal.module.css` | Styles for series management modal |

### Modified Files
| File | Changes |
|------|---------|
| `src/services/trainings.js` | Add `fetchSeriesTrainings()`, `updateSeriesTrainings()`, `deleteSeriesTrainings()`. Modify `createRecurringTrainings()` to return truncation info. |
| `src/stores/trainingsStore.js` | Add `seriesTrainings` state, `fetchSeries()`, `updateSeries()`, `deleteSeries()` actions |
| `src/features/trainings/TrainingForm/TrainingForm.jsx` | Replace read-only recurrence message (lines 416-435) with series management button. Handle truncation warning in handleSubmit (lines 217-223). |
| `src/features/trainings/TrainingDetailsPage.jsx` | Add series badge and count when `recurrenceGroupId` exists |

---

## Phase 1: Development

### Task 1: Series Service Functions

**Files:**
- Modify: `src/services/trainings.js:125-203`

- [ ] **Step 1: Add fetchSeriesTrainings function**

Add after the existing `createRecurringTrainings` function (after line 203):

```javascript
export const fetchSeriesTrainings = async (recurrenceGroupId) => {
  const q = query(
    collection(db, 'trainings'),
    where('recurrenceGroupId', '==', recurrenceGroupId),
    orderBy('date', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate?.() ? doc.data().date.toDate() : doc.data().date
  }));
};
```

Ensure `query`, `where`, `orderBy`, `getDocs` are imported from `firebase/firestore` at the top of the file.

- [ ] **Step 2: Add updateSeriesTrainings function**

Add after fetchSeriesTrainings:

```javascript
export const updateSeriesTrainings = async (recurrenceGroupId, updates, scope = 'future') => {
  const seriesTrainings = await fetchSeriesTrainings(recurrenceGroupId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trainingsToUpdate = scope === 'all'
    ? seriesTrainings
    : seriesTrainings.filter(t => {
        const trainingDate = t.date instanceof Date ? t.date : new Date(t.date);
        return trainingDate > today;
      });

  if (trainingsToUpdate.length === 0) return { updated: 0 };

  const batch = writeBatch(db);
  trainingsToUpdate.forEach(training => {
    const ref = doc(db, 'trainings', training.id);
    batch.update(ref, { ...updates, updatedAt: Timestamp.now() });
  });

  await batch.commit();
  return { updated: trainingsToUpdate.length };
};
```

Ensure `writeBatch`, `doc`, `Timestamp` are imported.

- [ ] **Step 3: Add deleteSeriesTrainings function**

Add after updateSeriesTrainings:

```javascript
export const deleteSeriesTrainings = async (recurrenceGroupId, scope = 'future') => {
  const seriesTrainings = await fetchSeriesTrainings(recurrenceGroupId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trainingsToDelete = scope === 'all'
    ? seriesTrainings
    : seriesTrainings.filter(t => {
        const trainingDate = t.date instanceof Date ? t.date : new Date(t.date);
        return trainingDate > today;
      });

  if (trainingsToDelete.length === 0) return { deleted: 0 };

  const batch = writeBatch(db);
  trainingsToDelete.forEach(training => {
    const ref = doc(db, 'trainings', training.id);
    batch.delete(ref);
  });

  await batch.commit();
  return { deleted: trainingsToDelete.length, deletedIds: trainingsToDelete.map(t => t.id) };
};
```

- [ ] **Step 4: Modify createRecurringTrainings to return truncation info**

At line 136, the `ABSOLUTE_MAX_COUNT = 100` constant exists. Modify the return value of `createRecurringTrainings` (around line 200) to include truncation data:

The current function returns a plain array (`return trainings;`). Wrap it in an object:

```javascript
return {
  trainings,
  wasTruncated: trainings.length >= ABSOLUTE_MAX_COUNT,
  actualCount: trainings.length
};
```

The key change: wrap the existing `return trainings` in an object. `wasTruncated` is true when the array length equals ABSOLUTE_MAX_COUNT (100), meaning the loop was cut short. Drop `requestedCount` — for date-based recurrence there's no pre-calculated count, and the warning message only needs `actualCount`.

- [ ] **Step 5: Verify imports at top of trainings.js**

Add `orderBy` to the existing imports at lines 1-15 of trainings.js. Current imports include `collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, writeBatch, limit` — add `orderBy` to this list:

```javascript
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    writeBatch,
    limit
} from 'firebase/firestore';
```

- [ ] **Step 6: Commit**

```bash
git add src/services/trainings.js
git commit -m "feat: add series management service functions (fetch/update/delete series)"
```

---

### Task 2: Store Functions

**Files:**
- Modify: `src/stores/trainingsStore.js:1-137`

- [ ] **Step 1: Add imports for new service functions**

At top of file, add to the imports from trainings service:
```javascript
import { fetchSeriesTrainings, updateSeriesTrainings, deleteSeriesTrainings } from '../services/trainings';
```

- [ ] **Step 2: Add seriesTrainings state**

In the store state definition (around line 3-8), add:
```javascript
seriesTrainings: [],
seriesLoading: false,
```

- [ ] **Step 3: Add fetchSeries action**

Add after the existing `getTrainingsByDate` action (after line 136):

```javascript
fetchSeries: async (recurrenceGroupId) => {
  set({ seriesLoading: true });
  try {
    const seriesTrainings = await fetchSeriesTrainings(recurrenceGroupId);
    set({ seriesTrainings, seriesLoading: false });
    return seriesTrainings;
  } catch (error) {
    console.error('Error fetching series:', error);
    set({ seriesLoading: false, error: error.message });
    return [];
  }
},
```

- [ ] **Step 4: Add updateSeries action**

```javascript
updateSeries: async (recurrenceGroupId, updates, scope) => {
  try {
    const result = await updateSeriesTrainings(recurrenceGroupId, updates, scope);
    // Refresh series list only (main trainings list requires coachId/date params — caller refreshes as needed)
    const { fetchSeries } = get();
    await fetchSeries(recurrenceGroupId);
    // Update local trainings array for any that were modified
    const { trainings } = get();
    const updatedIds = new Set((await fetchSeriesTrainings(recurrenceGroupId)).map(t => t.id));
    set({ trainings: trainings.map(t => updatedIds.has(t.id) ? { ...t, ...updates } : t) });
    return result;
  } catch (error) {
    console.error('Error updating series:', error);
    set({ error: error.message });
    return { updated: 0, error: error.message };
  }
},
```

- [ ] **Step 5: Add deleteSeries action**

```javascript
deleteSeries: async (recurrenceGroupId, scope) => {
  try {
    const result = await deleteSeriesTrainings(recurrenceGroupId, scope);
    // Remove deleted trainings from local state (no need to re-fetch with coachId/date params)
    const { trainings } = get();
    const deletedIds = new Set(result.deletedIds || []);
    set({ trainings: trainings.filter(t => !deletedIds.has(t.id)), seriesTrainings: [] });
    return result;
  } catch (error) {
    console.error('Error deleting series:', error);
    set({ error: error.message });
    return { deleted: 0, error: error.message };
  }
},

clearSeries: () => set({ seriesTrainings: [], seriesLoading: false }),
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/trainingsStore.js
git commit -m "feat: add series management store actions (fetch/update/delete/clear)"
```

---

### Task 3: Series Management Modal Component

**Files:**
- Create: `src/features/trainings/SeriesManagementModal/SeriesManagementModal.jsx`
- Create: `src/features/trainings/SeriesManagementModal/SeriesManagementModal.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/trainings/SeriesManagementModal/SeriesManagementModal.module.css` with styles following the app's design system. Use CSS variables from `src/styles/variables.css`:

Key classes needed:
- `.overlay` — modal backdrop (rgba(0,0,0,0.5), fixed, z-index 1000)
- `.modal` — white card, max-width 560px, border-radius var(--radius-xl), padding var(--space-6)
- `.header` — flex between title and close button
- `.title` — font-size var(--font-size-xl), font-weight 700, color var(--text-primary)
- `.trainingList` — scrollable list, max-height 320px, overflow-y auto
- `.trainingItem` — flex row with date, time, status badge, padding var(--space-3), border-bottom 1px solid var(--gray-100)
- `.currentItem` — highlighted with background var(--primary-50), border-right 3px solid var(--primary-500)
- `.statusBadge` — small pill with status color
- `.actions` — flex row of action buttons at bottom, gap var(--space-3)
- `.actionBtn` — styled button with icon + text, gap var(--space-2)
- `.dangerBtn` — error-colored variant for delete
- `.scopeSelector` — radio group for "future only" / "entire series"
- `.confirmOverlay` — nested confirmation dialog
- `.emptyState` — message for single-training series
- `.spinner` — loading state

Remember: RTL layout (direction: rtl), mobile-first, icon-text gap minimum var(--space-2).

- [ ] **Step 2: Create the modal JSX component**

Create `src/features/trainings/SeriesManagementModal/SeriesManagementModal.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { X, Edit3, Trash2, Calendar, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import useTrainingsStore from '../../../stores/trainingsStore';
import useUIStore from '../../../stores/uiStore';
import styles from './SeriesManagementModal.module.css';

const STATUS_LABELS = {
  draft: 'טיוטה',
  planned: 'מתוכנן',
  completed: 'הושלם',
  cancelled: 'בוטל'
};

const STATUS_COLORS = {
  draft: 'var(--gray-500)',
  planned: 'var(--primary-500)',
  completed: 'var(--success-500)',
  cancelled: 'var(--error-500)'
};

export default function SeriesManagementModal({ recurrenceGroupId, currentTrainingId, onClose, onSeriesDeleted }) {
  const { seriesTrainings, seriesLoading, fetchSeries, updateSeries, deleteSeries, clearSeries } = useTrainingsStore();
  const addToast = useUIStore(state => state.addToast);

  const [action, setAction] = useState(null); // 'update' | 'delete' | null
  const [scope, setScope] = useState('future'); // 'future' | 'all'
  const [updateFields, setUpdateFields] = useState({ startTime: '', endTime: '', topic: '', location: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (recurrenceGroupId) {
      fetchSeries(recurrenceGroupId);
    }
    return () => clearSeries();
  }, [recurrenceGroupId]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureCount = seriesTrainings.filter(t => {
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    return d > today;
  }).length;

  const handleUpdate = async () => {
    setIsProcessing(true);
    const updates = {};
    if (updateFields.startTime) updates.startTime = updateFields.startTime;
    if (updateFields.endTime) updates.endTime = updateFields.endTime;
    if (updateFields.topic) updates.topic = updateFields.topic;
    if (updateFields.location) updates.location = updateFields.location;

    if (Object.keys(updates).length === 0) {
      addToast({ type: 'warning', message: 'לא נבחרו שדות לעדכון' });
      setIsProcessing(false);
      return;
    }

    const result = await updateSeries(recurrenceGroupId, updates, scope);
    if (result.error) {
      addToast({ type: 'error', message: 'שגיאה בעדכון הסדרה. נסה שוב.' });
    } else {
      addToast({ type: 'success', message: `עודכנו ${result.updated} אימונים בסדרה` });
      setAction(null);
      setShowConfirm(false);
    }
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    const result = await deleteSeries(recurrenceGroupId, scope);
    if (result.error) {
      addToast({ type: 'error', message: 'שגיאה במחיקת הסדרה. נסה שוב.' });
    } else {
      addToast({ type: 'success', message: `נמחקו ${result.deleted} אימונים מהסדרה` });
      if (scope === 'all' || result.deleted === seriesTrainings.length) {
        onSeriesDeleted?.();
      }
      onClose();
    }
    setIsProcessing(false);
  };

  // ... render: loading state, training list, action panels, confirm dialog
  // Follow existing modal patterns in the app (e.g., UserFormModal overlay pattern)
}
```

The component should render:
1. **Loading state**: Spinner when `seriesLoading` is true
2. **Empty/single state**: Message when series has ≤1 training
3. **Training list**: Scrollable list of all trainings with date, time, status
4. **Current training highlighted**: Match by `currentTrainingId`
5. **Action buttons**: "עדכון אימונים" and "מחיקת אימונים"
6. **Action panels**: When action selected, show scope selector + relevant fields
7. **Confirm dialog**: Before destructive delete action

- [ ] **Step 3: Commit**

```bash
git add src/features/trainings/SeriesManagementModal/
git commit -m "feat: add SeriesManagementModal component for series view/edit/delete"
```

---

### Task 4: Integrate Modal into TrainingForm

**Files:**
- Modify: `src/features/trainings/TrainingForm/TrainingForm.jsx:217-223,416-435`

- [ ] **Step 1: Add import for SeriesManagementModal**

At top of TrainingForm.jsx, add:
```javascript
import SeriesManagementModal from '../SeriesManagementModal/SeriesManagementModal';
```

- [ ] **Step 2: Add modal state**

In the component state section, add:
```javascript
const [showSeriesModal, setShowSeriesModal] = useState(false);
```

- [ ] **Step 3: Replace read-only recurrence message with series management button**

Replace lines 416-435 (the `formData.recurrenceGroupId &&` conditional block ending with the read-only div "אימון זה הוא חלק מסדרת אימונים חוזרת") with:

```jsx
) : formData.recurrenceGroupId && (
    <div style={{ marginTop: '24px' }}>
        <div className={styles.labelWrapper}>
            <div className={`${styles.iconBox} ${styles.slateBox}`}>
                <Repeat size={18} />
            </div>
            <span className={styles.labelText}>חזרתיות</span>
        </div>
        <button
            type="button"
            onClick={() => setShowSeriesModal(true)}
            style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'var(--primary-50)',
                border: '1px solid var(--primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--primary-700)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontWeight: 600,
                fontFamily: 'inherit'
            }}
        >
            <Calendar size={16} />
            ניהול סדרה חוזרת
        </button>
    </div>
)}
```

- [ ] **Step 4: Add SeriesManagementModal render**

Add before the closing fragment tag of the component return:

```jsx
{showSeriesModal && formData.recurrenceGroupId && (
    <SeriesManagementModal
        recurrenceGroupId={formData.recurrenceGroupId}
        currentTrainingId={id}
        onClose={() => setShowSeriesModal(false)}
        onSeriesDeleted={() => {
            setShowSeriesModal(false);
            navigate('/trainings');
        }}
    />
)}
```

- [ ] **Step 5: Add truncation warning in handleSubmit**

Modify lines 217-223 (the recurring trainings creation block in handleSubmit). Change from:

```javascript
if (formData.recurrence && formData.recurrence.frequency !== 'NONE') {
    try {
        await createRecurringTrainings(basePayload, formData.recurrence);
        result = { success: true };
    } catch (error) {
        result = { success: false, error: error.message };
    }
```

To:

```javascript
if (formData.recurrence && formData.recurrence.frequency !== 'NONE') {
    try {
        const recurResult = await createRecurringTrainings(basePayload, formData.recurrence);
        result = { success: true };
        if (recurResult?.wasTruncated) {
            addToast({ type: 'warning', message: `נוצרו ${recurResult.actualCount} אימונים (מקסימום מערכת). חלק מהתאריכים לא נכללו.` });
        }
    } catch (error) {
        result = { success: false, error: error.message };
    }
```

Note: `addToast` uses **object format** `{ type, message }` — already available at line 35 via `useUIStore`.

- [ ] **Step 6: Commit**

```bash
git add src/features/trainings/TrainingForm/TrainingForm.jsx
git commit -m "feat: integrate series management modal into TrainingForm + truncation warning"
```

---

### Task 5: Series Badge in Training Details Page

**Files:**
- Modify: `src/features/trainings/TrainingDetailsPage.jsx`

- [ ] **Step 1: Add series count state and fetch**

Add state and effect to fetch series count when training has `recurrenceGroupId`:

```jsx
import { fetchSeriesTrainings } from '../../services/trainings';

// Inside component:
const [seriesCount, setSeriesCount] = useState(null);

useEffect(() => {
    if (training?.recurrenceGroupId) {
        fetchSeriesTrainings(training.recurrenceGroupId)
            .then(series => setSeriesCount(series.length))
            .catch(() => setSeriesCount(null));
    }
}, [training?.recurrenceGroupId]);
```

- [ ] **Step 2: Add series badge section with count**

In `TrainingDetailsPage.jsx`, after the existing training field grid (around line 250), add a conditional section:

```jsx
{training.recurrenceGroupId && (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: 'var(--primary-50)',
        borderRadius: 'var(--radius-md)',
        marginTop: 'var(--space-4)',
        border: '1px solid var(--primary-100)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--primary-700)',
        fontWeight: 500
    }}>
        <Repeat size={16} />
        <span>חלק מסדרה חוזרת{seriesCount ? ` (${seriesCount} אימונים)` : ''}</span>
    </div>
)}
```

Import `Repeat` from `lucide-react` if not already imported.

- [ ] **Step 2: Commit**

```bash
git add src/features/trainings/TrainingDetailsPage.jsx
git commit -m "feat: add recurring series badge to training details page"
```

---

### Task 6: Create Firestore Composite Index

- [ ] **Step 1: Add composite index for recurrenceGroupId + date**

Check `firestore.indexes.json` in the project root. Add the composite index:

```json
{
  "collectionGroup": "trainings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recurrenceGroupId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

If the file doesn't exist, create it with the standard structure:
```json
{
  "indexes": [
    {
      "collectionGroup": "trainings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recurrenceGroupId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Deploy the index**

```bash
npx firebase deploy --only firestore:indexes
```

Note: Firestore indexes take a few minutes to build. The query will fail with an error link until the index is ready.

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat: add Firestore composite index for recurring series queries"
```

---

## Phase 2: Code Review

### Task 7: Parallel Code Review of All 5 Feature Areas

- [ ] **Step 1: Dispatch 5 parallel code review agents**

Review the following files for bugs, edge cases, and issues:

**Agent 1 — Recurring Training:**
- `src/services/trainings.js` (especially createRecurringTrainings and the new series functions)
- `src/stores/trainingsStore.js`
- `src/features/trainings/TrainingForm/TrainingForm.jsx`
- `src/features/trainings/SeriesManagementModal/SeriesManagementModal.jsx`

**Agent 2 — Password Change:**
- `src/features/auth/ResetPasswordPage/ResetPasswordPage.jsx`
- `src/features/settings/SettingsPage.jsx`
- `src/services/auth.js` (resetPassword, verifyResetCode, confirmReset)

**Agent 3 — User Invitation:**
- `src/features/users/UsersPage.jsx`
- `src/features/users/UserFormModal.jsx`
- `src/stores/usersStore.js` (addUser, resendInvitation)
- `src/features/auth/WelcomePage/WelcomePage.jsx`

**Agent 4 — Exercises:**
- `src/features/exercises/ExerciseList/ExerciseList.jsx`
- `src/features/exercises/ExerciseForm/ExerciseForm.jsx`
- `src/services/exercises.js`
- `src/stores/exercisesStore.js`

**Agent 5 — Exercise Approvals:**
- `src/features/exerciseRequests/RequestsList/RequestsList.jsx`
- `src/features/exerciseRequests/RequestForm/RequestForm.jsx`
- `src/services/exerciseRequests.js`
- `src/stores/exerciseRequestsStore.js`

- [ ] **Step 2: Collect findings and fix all bugs**

- [ ] **Step 3: Commit all fixes**

```bash
git add -A
git commit -m "fix: address code review findings across all feature areas"
```

---

## Phase 3: Deploy

### Task 8: Build and Deploy to Firebase Hosting

- [ ] **Step 1: Build the project**

```bash
cd /Users/taltzur/Desktop/antigravity/tennis\ center
npm run build
```

Expected: Clean build with no errors in `dist/` directory.

- [ ] **Step 2: Deploy to Firebase Hosting**

```bash
npx firebase deploy --only hosting
```

Expected: Both targets deployed:
- https://tennis-training-app-gemini.web.app
- https://tennis-centers.web.app

- [ ] **Step 3: Commit and push**

```bash
git push origin main
```

---

## Phase 4: Production QA

### Task 9: QA — Recurring Training (B1)

**URL:** https://tennis-centers.web.app
**Precondition:** Logged in as coach

- [ ] **Step 1: Create weekly recurring training**
  - Navigate to training form → fill basic fields
  - Select "שבועי" in RecurrencePicker → end after 4 weeks
  - Submit → verify 4 trainings appear in calendar/list

- [ ] **Step 2: Verify in Firestore**
  ```bash
  npx firebase firestore:get trainings --where "recurrenceGroupId==<groupId>"
  ```
  Expected: 4 documents with same `recurrenceGroupId`, correct dates

- [ ] **Step 3: Test series management modal (NEW)**
  - Click edit on one of the recurring trainings
  - Click "ניהול סדרה חוזרת" button
  - Verify modal shows all 4 trainings with dates and statuses

- [ ] **Step 4: Test update future trainings (NEW)**
  - In modal, click "עדכון אימונים"
  - Select "רק עתידיים" scope
  - Change time → confirm
  - Verify future trainings updated, past unchanged

- [ ] **Step 5: Test delete series (NEW)**
  - Create another small series (2-3 trainings)
  - Open series modal → click "מחיקת אימונים" → "כל הסדרה"
  - Confirm deletion → verify all removed from Firestore

- [ ] **Step 6: Test truncation warning (NEW)**
  - Create daily recurring training with endType "never" or end date 1 year out
  - Verify warning toast appears about 100-training limit
  - Verify exactly 100 docs in Firestore

---

### Task 10: QA — Password Change (B2)

**Test user:** talzur007@gmail.com

- [ ] **Step 1: Navigate to Settings**
  - Login as talzur007@gmail.com → navigate to Settings
  - Find "סיסמה" section → click "שנה"

- [ ] **Step 2: Confirm and send reset email**
  - Confirm dialog → verify toast "נשלח אימייל לאיפוס סיסמה"
  - Check inbox for talzur007@gmail.com → email received

- [ ] **Step 3: Complete password reset**
  - Click link in email → arrives at ResetPasswordPage
  - Enter new password → success message
  - Verify redirect to login

- [ ] **Step 4: Login with new password**
  - Login with new password → successful
  - Verify Firebase Auth reflects the change

- [ ] **Step 5: Restore original password**
  - Repeat the reset flow to restore original password

---

### Task 11: QA — User Invitation (B3)

**Test user:** drorshay1@gmail.com

- [ ] **Step 1: Create user via dashboard**
  - Login as supervisor → Users page → Add user
  - Fill: name, email (drorshay1@gmail.com), role: coach, center
  - Submit with invitation method

- [ ] **Step 2: Verify backend**
  - Check Firestore `users` collection for new doc
  - Check Firebase Auth for new account
  ```bash
  # Verify in Firestore
  npx firebase firestore:get users --where "email==drorshay1@gmail.com"
  ```

- [ ] **Step 3: Check email and complete onboarding**
  - Verify email received at drorshay1@gmail.com
  - Click welcome link → WelcomePage → set password
  - Login as new user → coach dashboard loads

- [ ] **Step 4: Test resend invitation**
  - As supervisor → click resend invitation icon on the user
  - Verify email/link generated

---

### Task 12: QA — Exercise Management (B4)

**Precondition:** Logged in as coach

- [ ] **Step 1: Browse exercise library**
  - Navigate to /exercises → list loads with cards
  - Test filters: category, difficulty, search

- [ ] **Step 2: Submit exercise request**
  - Click "הגש בקשה לתרגיל"
  - Fill form: title "תרגיל הגשה מדויקת", description, category
  - Submit → success toast

- [ ] **Step 3: Verify in Firestore**
  ```bash
  npx firebase firestore:get exerciseRequests --where "status==pending"
  ```
  Expected: New doc with correct fields and status `pending`

- [ ] **Step 4: View own requests**
  - Navigate to /exercise-requests → see the new request with "ממתין" status

---

### Task 13: QA — Exercise Approvals (B5)

**Precondition:** Logged in as supervisor (talzur007@gmail.com)

- [ ] **Step 1: View pending requests**
  - Navigate to /exercise-requests → see pending requests tab
  - Find the request from Task 12

- [ ] **Step 2: Approve request**
  - Click "אשר והוסף למאגר" → verify toast

- [ ] **Step 3: Verify in Firestore**
  - Check `exerciseRequests` doc: status = `approved`
  - Check `exercises` collection: new doc created with matching data
  ```bash
  npx firebase firestore:get exerciseRequests --where "status==approved"
  npx firebase firestore:get exercises --orderBy "createdAt:desc" --limit 1
  ```

- [ ] **Step 4: Verify coach sees it**
  - Login as coach → /exercises → new exercise visible in library

- [ ] **Step 5: Test rejection flow**
  - Create another exercise request as coach
  - As supervisor → reject with note "לא מתאים לתוכנית הנוכחית"
  - Verify in Firestore: status `rejected`, `statusNotes` populated
  - As coach → see rejection with reason

---

## Phase 5: Final Deploy (if fixes needed)

### Task 14: Fix and Redeploy

- [ ] **Step 1: Fix any issues found during QA**
- [ ] **Step 2: Rebuild and redeploy**
  ```bash
  npm run build && npx firebase deploy --only hosting
  ```
- [ ] **Step 3: Push final changes**
  ```bash
  git push origin main
  ```
