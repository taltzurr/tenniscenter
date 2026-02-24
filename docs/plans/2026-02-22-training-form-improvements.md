# Training Form Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three improvements to TrainingForm: (1) rich categorized topic picker with personal custom topics, (2) auto-navigate back after save, (3) dynamic end-time defaulting to start+60min.

**Architecture:**
- Task 1: Build a new `TopicsPicker` component (`src/components/ui/TopicsPicker/`) that replaces the `MultiSelect` in TrainingForm for `trainingTopics`. It shows category tabs (🎾 טכניקה, 👟 רגליים, etc.), a grid of toggle-chips per category, a free-text input, and persists custom topics to `userData.customTrainingTopics` via `authStore.updateProfile()`.
- Task 2: In `TrainingForm.handleSubmit`, replace the post-save navigation logic with `navigate(-1)` for both create and edit flows. Also fix the cancel button.
- Task 3: Add a `isEndTimeUserModified` flag to form state; when `startTime` changes and the flag is false, auto-set `endTime = startTime + 60min`. Set the flag to true when the user manually changes `endTime`.

**Tech Stack:** React 19, CSS Modules, Zustand (authStore), React Router v6 `useNavigate`, date-fns, lucide-react

---

## Constants Reference

The full topic list, grouped by category, to use in `TopicsPicker`:

```js
export const TRAINING_TOPICS_BY_CATEGORY = [
  {
    id: 'technique',
    label: '🎾 טכניקה',
    topics: [
      'אחיזות','בלימה לפני החבטה','הגשה','הכנה מהירה לחבטה','המשך תנועה',
      'הנפה לאחור','הנפה קצרה','התאמה של גובה ההנפה לחבטה','יד חלשה',
      'ידיים קדימה','מהירות ראש מחבט','נק\' מגע מס\' 1','נק\' מגע מס\' 2',
      'נק\' מגע מס\' 3','נק\' מגע מס\' 4','נקודת מפגש','סלייס','עמידת מוצא',
      'תנועה ארוכה','תנועה משוחררת','תנועה רציפה','תפנית',
    ],
  },
  {
    id: 'footwork',
    label: '👟 עבודת רגליים',
    topics: [
      'גישת הגעה לכדור','חזרה למרכז אפשרויות','יציבות','מרכז כובד נמוך',
      'ספליט','צעדי התאמה','קפיצה חזקה','שיווי משקל',
      'תנועה קדימה ואחורה','תנועת בריחה לפורהנד',
    ],
  },
  {
    id: 'tactics',
    label: '♟️ טקטיקה',
    topics: [
      'בניה','גובה','הגנה','התקפה','התקרבות במהלך הראלי',
      'כדורי עליה איכותיים','כיוונים','נטרלי','סרב + חבטה שלישית',
      'סרב וולי','סיבוביות','עומקים','עצמה','עליה + וולי ראשון',
      'ריטרן + חבטה רביעית','ריטרן התקפי','ריטרן וולי',
    ],
  },
  {
    id: 'reading',
    label: '👁️ זיהוי',
    topics: [
      'זיהוי גובה הכדור','זיהוי עומק הכדור','זיהוי חולשת היריב',
      'זיהוי כדור קצר','זיהוי כיוון הכדור','זיהוי מומנטום',
      'זיהוי נקודת מפגש','זיהוי סיבוביות הכדור','זיהוי עוצמת הכדור',
      'זיהוי ריטרן',
    ],
  },
  {
    id: 'mental',
    label: '🧠 מנטלי',
    topics: [
      'דיבור עצמי חיובי','התמודדות במצבי הובלה','התמודדות במצבי פיגור',
      'חוסן מנטלי','חיזוק הפרטנר','להתמקד בעיקר ולא בתפל',
      'מיקוד מטרות ביצוע','רוטינה קבועה','ריכוז','רמת עוררות אופטימלית',
      'שפת גוף חיובית',
    ],
  },
  {
    id: 'general',
    label: '🎯 כלליות',
    topics: ['קאורדינציה','קשר עין יד'],
  },
];
```

---

## Task 1: TopicsPicker Component

**Files:**
- Create: `src/components/ui/TopicsPicker/TopicsPicker.jsx`
- Create: `src/components/ui/TopicsPicker/TopicsPicker.module.css`
- Create: `src/components/ui/TopicsPicker/index.js`
- Create: `src/components/ui/TopicsPicker/topics.js` (constants)
- Modify: `src/features/trainings/TrainingForm/TrainingForm.jsx`

### Step 1: Create the constants file

`src/components/ui/TopicsPicker/topics.js`:
```js
export const TRAINING_TOPICS_BY_CATEGORY = [
  // ... paste full constant from above
];
```

### Step 2: Create `TopicsPicker.jsx`

```jsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import useAuthStore from '../../../stores/authStore';
import { TRAINING_TOPICS_BY_CATEGORY } from './topics';
import styles from './TopicsPicker.module.css';

function TopicsPicker({ value = [], onChange }) {
  const { userData, updateProfile } = useAuthStore();
  const customTopics = userData?.customTrainingTopics || [];

  // Build categories: standard ones + a "שלי" tab for custom topics (only if any exist)
  const categories = [
    ...TRAINING_TOPICS_BY_CATEGORY,
    ...(customTopics.length > 0
      ? [{ id: 'custom', label: '⭐ שלי', topics: customTopics }]
      : []),
  ];

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [freeText, setFreeText] = useState('');

  const activeCategoryTopics = categories.find(c => c.id === activeCategory)?.topics || [];

  const toggle = (topic) => {
    if (value.includes(topic)) {
      onChange(value.filter(t => t !== topic));
    } else {
      onChange([...value, topic]);
    }
  };

  const addCustomTopic = async () => {
    const trimmed = freeText.trim();
    if (!trimmed) return;

    // Add to selection
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }

    // Persist to user profile if not already saved
    if (!customTopics.includes(trimmed)) {
      const updated = [...customTopics, trimmed];
      await updateProfile({ customTrainingTopics: updated });
    }

    setFreeText('');
  };

  const handleFreeTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTopic();
    }
  };

  const removeSelected = (topic) => {
    onChange(value.filter(t => t !== topic));
  };

  return (
    <div className={styles.container}>
      {/* Selected tags */}
      {value.length > 0 && (
        <div className={styles.selectedTags}>
          {value.map(tag => (
            <span key={tag} className={styles.tag}>
              {tag}
              <button
                type="button"
                className={styles.removeTag}
                onClick={() => removeSelected(tag)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Category tabs */}
      <div className={styles.tabs}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.tab} ${activeCategory === cat.id ? styles.tabActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Topic chips grid */}
      <div className={styles.chipsGrid}>
        {activeCategoryTopics.map(topic => (
          <button
            key={topic}
            type="button"
            className={`${styles.chip} ${value.includes(topic) ? styles.chipSelected : ''}`}
            onClick={() => toggle(topic)}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Free text input */}
      <div className={styles.freeTextRow}>
        <input
          type="text"
          className={styles.freeTextInput}
          placeholder="הוסף נושא חופשי..."
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          onKeyDown={handleFreeTextKeyDown}
          dir="rtl"
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={addCustomTopic}
          disabled={!freeText.trim()}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default TopicsPicker;
```

### Step 3: Create `TopicsPicker.module.css`

```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

/* Selected tags row */
.selectedTags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
  min-height: 40px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
}

.tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--primary-50, #eff6ff);
  color: var(--primary-600, #2563eb);
  font-size: 13px;
  font-weight: 500;
}

.removeTag {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: currentColor;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
}
.removeTag:hover { opacity: 1; }

/* Category tabs */
.tabs {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.tab {
  padding: 5px 10px;
  border-radius: var(--radius-full, 9999px);
  border: 1.5px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.tab:hover {
  border-color: var(--primary-400);
  color: var(--primary-600);
}

.tabActive {
  border-color: var(--primary-500);
  background: var(--primary-50, #eff6ff);
  color: var(--primary-600);
  font-weight: 600;
}

/* Topic chips grid */
.chipsGrid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-secondary, #f9fafb);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  min-height: 80px;
}

.chip {
  padding: 5px 12px;
  border-radius: var(--radius-full, 9999px);
  border: 1.5px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  border-color: var(--primary-400);
  background: var(--primary-50, #eff6ff);
  color: var(--primary-600);
}

.chipSelected {
  border-color: var(--primary-500);
  background: var(--primary-500);
  color: #fff;
  font-weight: 500;
}

.chipSelected:hover {
  background: var(--primary-600);
  border-color: var(--primary-600);
  color: #fff;
}

/* Free text row */
.freeTextRow {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.freeTextInput {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: border-color 0.15s;
}

.freeTextInput:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.freeTextInput::placeholder {
  color: var(--text-tertiary);
}

.addButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--primary-500);
  background: var(--primary-500);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.addButton:hover:not(:disabled) {
  background: var(--primary-600);
  border-color: var(--primary-600);
}

.addButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Step 4: Create `index.js`

```js
export { default } from './TopicsPicker';
```

### Step 5: Wire TopicsPicker into TrainingForm

In `src/features/trainings/TrainingForm/TrainingForm.jsx`:

**Add import** at top:
```js
import TopicsPicker from '../../../components/ui/TopicsPicker';
```

**Remove** the old `TOPIC_SUGGESTIONS` constant and the `MultiSelect` import (if it is only used for topics).

**Re-order fields in SECTION 2** — move `trainingTopics` block ABOVE `equipment`:

Replace the block with:
```jsx
{/* Training Topics - ABOVE equipment */}
<div className={styles.gridItem} style={{ gridColumn: '1 / -1' }}>
  <div className={styles.labelWrapper}>
    <div className={`${styles.iconBox} ${styles.greenBox}`}>
      <Tag size={18} />
    </div>
    <span className={styles.labelText}>נושאי האימון</span>
  </div>
  <TopicsPicker
    value={formData.trainingTopics}
    onChange={(topics) => setFormData(prev => ({ ...prev, trainingTopics: topics }))}
  />
</div>

{/* Equipment - AFTER topics */}
<div className={styles.gridItem}>
  <div className={styles.labelWrapper}>
    <div className={`${styles.iconBox} ${styles.slateBox}`}>
      <Briefcase size={18} />
    </div>
    <span className={styles.labelText}>ציוד נדרש</span>
  </div>
  <Input
    name="equipment"
    value={formData.equipment || ''}
    onChange={handleChange}
    placeholder="קונוסים, סולמות..."
  />
</div>
```

### Step 6: Verify visually

Run `npm run dev`, open TrainingForm, confirm:
- Category tabs appear
- Clicking a topic chip toggles it (fills blue)
- Selected topics appear as tags at top
- Free text adds to selection and persists on next open
- Topics field appears above Equipment field

### Step 7: Commit

```bash
git add src/components/ui/TopicsPicker/ src/features/trainings/TrainingForm/TrainingForm.jsx
git commit -m "feat: add categorized TopicsPicker with custom topics persistence"
```

---

## Task 2: Navigate Back After Save

**Files:**
- Modify: `src/features/trainings/TrainingForm/TrainingForm.jsx`

### Step 1: Update post-save navigation in `handleSubmit`

Find the `if (result.success)` block. Replace the entire navigation section at the bottom of it:

**Current code (lines ~195-203):**
```js
if (!isEditMode && result.id) {
    navigate(`/trainings/${result.id}/edit`, { replace: true });
} else if (isEditMode) {
    // Stay on page
}
```

**Replace with:**
```js
navigate(-1);
```

### Step 2: Fix the cancel button

Find:
```js
onClick={() => navigate('/calendar')}
```
Replace with:
```js
onClick={() => navigate(-1)}
```

### Step 3: Verify

- Create a new training from `/calendar` → after save, should return to `/calendar`
- Create from `/weekly-schedule` → after save, should return to `/weekly-schedule`
- Edit a training → after save, should go back to wherever came from
- Press Cancel → should go back

### Step 4: Commit

```bash
git add src/features/trainings/TrainingForm/TrainingForm.jsx
git commit -m "feat: navigate back after training save/cancel"
```

---

## Task 3: Dynamic End Time

**Files:**
- Modify: `src/features/trainings/TrainingForm/TrainingForm.jsx`

### Step 1: Add `isEndTimeUserModified` to form state

Find the `useState` for `formData` initialization. **Outside** that state (separate useState), add:

```js
const [isEndTimeUserModified, setIsEndTimeUserModified] = useState(false);
```

### Step 2: Mark end time as user-modified when edited manually

In `handleChange`, intercept `endTime`:

```js
const handleChange = (e) => {
  const { name, value, type, checked } = e.target;
  if (name === 'endTime') {
    setIsEndTimeUserModified(true);
  }
  setFormData(prev => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value
  }));
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: null }));
  }
};
```

### Step 3: Auto-update end time when start time changes

Add a dedicated handler for `startTime` changes (use it in place of `handleChange` for the startTime input):

```js
const handleStartTimeChange = (e) => {
  const newStartTime = e.target.value;
  setFormData(prev => {
    const updated = { ...prev, startTime: newStartTime };
    if (!isEndTimeUserModified && newStartTime) {
      // Calculate endTime = startTime + 60 minutes
      const [h, m] = newStartTime.split(':').map(Number);
      const endDate = new Date(2000, 0, 1, h, m + 60);
      const endH = String(endDate.getHours()).padStart(2, '0');
      const endM = String(endDate.getMinutes()).padStart(2, '0');
      updated.endTime = `${endH}:${endM}`;
    }
    return updated;
  });
  if (errors.startTime) setErrors(prev => ({ ...prev, startTime: null }));
};
```

### Step 4: Wire the new handler in JSX

Find the startTime `<Input>` and change `onChange={handleChange}` to `onChange={handleStartTimeChange}`:

```jsx
<Input
  type="time"
  name="startTime"
  value={formData.startTime}
  onChange={handleStartTimeChange}
  required
  containerStyle={{ flex: 1 }}
/>
```

### Step 5: Mark end time as user-modified when loading edit mode

In the `useEffect` that loads the training for edit mode, after `setFormData(...)`:

```js
setIsEndTimeUserModified(true); // Don't auto-override stored end time
```

### Step 6: Verify

- Open new training form → change start time to 10:00 → end time auto-sets to 11:00
- Change start time to 15:00 → end time auto-sets to 16:00
- Manually change end time to 15:30 → change start time again → end time stays 15:30 (no override)
- Edit existing training → end time is preserved as stored

### Step 7: Commit

```bash
git add src/features/trainings/TrainingForm/TrainingForm.jsx
git commit -m "feat: auto-set end time to start+60min by default"
```

---

## Verification (All Features)

1. **Run dev server:** `npm run dev`
2. Navigate to `/trainings/new`
3. Confirm: Topics section appears above Equipment
4. Confirm: Category tabs work, chips toggle on/off
5. Confirm: Free text adds topic, shows in ⭐ שלי on next open
6. Confirm: Start time change auto-updates end time
7. Confirm: Manual end time change disables auto-update
8. Save → confirm redirect back to previous page
9. Edit existing → save → confirm redirect back
10. Cancel → confirm redirect back
