# Analytics Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the ManagerAnalyticsDashboard into a polished "נתונים" (Data/Analytics) page with accurate data, alerts, bar charts, and proper navigation placement.

**Architecture:** Enhance the existing ManagerAnalyticsDashboard.jsx component in-place. Add alerts section (data-driven from real Firestore data), bar chart visualizations (pure CSS, no library), and fix data accuracy by filtering out unknown centers. Update navigation across BottomNav, Sidebar, and ManagerDashboard management cards.

**Tech Stack:** React 19, CSS Modules, Zustand, Firebase/Firestore, lucide-react, date-fns

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/components/layout/BottomNav/BottomNav.jsx` | Replace משתמשים with נתונים (/analytics) for supervisor |
| Modify | `src/components/layout/Sidebar/Sidebar.jsx` | Add נתונים link to supervisor sidebar |
| Modify | `src/features/dashboard/ManagerDashboard.jsx` | Rename פיקוח ובקרה card to נתונים |
| Modify | `src/features/dashboard/ManagerAnalyticsDashboard.jsx` | Major: rename, fix data, add alerts, add stat cards, add bar charts |
| Modify | `src/features/dashboard/ManagerAnalyticsDashboard.module.css` | Add styles for alerts, bar charts, new stat grid, current month highlight |
| Modify | `CLAUDE.md` | Document analytics dashboard conventions |

---

### Task 1: Navigation Changes

**Files:**
- Modify: `src/components/layout/BottomNav/BottomNav.jsx`
- Modify: `src/components/layout/Sidebar/Sidebar.jsx`
- Modify: `src/features/dashboard/ManagerDashboard.jsx`

- [ ] **Step 1: Update BottomNav for supervisor**

In `BottomNav.jsx`, supervisor nav items (line 23-29): Replace the `/users` entry with `/analytics` entry:
```jsx
// Before:
{ to: '/users', icon: UserCog, label: 'משתמשים' },
// After:
{ to: '/analytics', icon: BarChart3, label: 'נתונים' },
```
Import `BarChart3` from lucide-react (replace `UserCog` if no longer used).

- [ ] **Step 2: Add נתונים to supervisor sidebar**

In `Sidebar.jsx`, supervisor "ניהול" section (line 83-89): Add analytics link:
```jsx
{ to: '/analytics', icon: BarChart3, label: 'נתונים' },
```
Import `BarChart3` from lucide-react.

- [ ] **Step 3: Update ManagerDashboard management card**

In `ManagerDashboard.jsx`, dashboardItems (line 206): Change the analytics card:
```jsx
// Before:
{ title: 'פיקוח ובקרה', description: 'דוחות ביצוע, סטטיסטיקות מאמנים ומעקב.', icon: BarChart2, color: 'orange', path: '/analytics' },
// After:
{ title: 'נתונים', description: 'דוחות ביצוע, סטטיסטיקות מאמנים ומעקב.', icon: BarChart3, color: 'orange', path: '/analytics' },
```

- [ ] **Step 4: Commit**

---

### Task 2: Rename Page + Fix Month Selector

**Files:**
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.jsx`
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.module.css`

- [ ] **Step 1: Update page title and subtitle**

Change line 275: `דאשבורד פיקוח ובקרה` → `נתונים`
Change subtitle to be more concise.

- [ ] **Step 2: Center the month selector**

In CSS `.monthSelector`: add `align-self: center` (mobile) and keep `align-self: auto` on tablet+.
In CSS `.header`: ensure `align-items: center` on mobile.

- [ ] **Step 3: Highlight current month**

Add a `isCurrentMonth` boolean. When true, add a visual indicator (bold text, primary color background) to `.monthTitle`. Add CSS class `.monthTitleCurrent` with `font-weight: 700; color: var(--primary-700); background: var(--primary-50); border-radius: var(--radius-md); padding: var(--space-1) var(--space-2);`

- [ ] **Step 4: Commit**

---

### Task 3: Fix Data Accuracy

**Files:**
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.jsx`

- [ ] **Step 1: Filter out 'unknown' centers in executionData**

In the `executionData` useMemo (line 124): Skip entries where `centerId === 'unknown'`. Add filter at the end: `.filter(c => c.centerId !== 'unknown')`

- [ ] **Step 2: Filter out 'unknown' centers in planData**

Already has `.filter(c => c.totalGroups > 0)` — also add `&& c.centerId !== 'unknown'`

- [ ] **Step 3: Fix plan submission counting**

Current logic counts any non-draft plan as "submitted". Should count plans with status in ['submitted', 'approved', 'reviewed']. Update `overallStats` and `planData` to use this filter consistently.

In `overallStats`:
```jsx
const submittedPlans = plans.filter(p => ['submitted', 'approved', 'reviewed'].includes(p.status)).length;
```

In `planData` (line 185):
```jsx
if (['submitted', 'approved', 'reviewed'].includes(p.status)) {
```

- [ ] **Step 4: Only show centers that have data**

In `executionData`: already filtered by training existence.
In `planData`: already filtered by `totalGroups > 0`.
Both now also filter `unknown`. This is sufficient.

- [ ] **Step 5: Commit**

---

### Task 4: Add Coach Count + Group Count Stat Cards

**Files:**
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.jsx`
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.module.css`

- [ ] **Step 1: Calculate coach and group counts**

In `overallStats`, add:
```jsx
const activeCoaches = new Set();
trainings.forEach(t => { if (t.coachId) activeCoaches.add(t.coachId); });
const totalCoaches = users?.filter(u => u.role === 'coach' && u.isActive !== false).length || 0;
const totalActiveGroups = groups.filter(g => g.isActive !== false).length;
```

- [ ] **Step 2: Add stat cards to JSX**

Expand stats grid from 4 to 6 cards (3x2 on mobile, 6x1 on tablet+):
- מאמנים (coaches count) — Users icon, primary colors
- קבוצות (groups count) — Users icon, accent colors
- Keep existing 4 cards

- [ ] **Step 3: Update CSS statsGrid**

Change mobile grid to `repeat(3, 1fr)` and tablet+ to `repeat(3, 1fr)` or `repeat(6, 1fr)`:
```css
.statsGrid {
    grid-template-columns: repeat(3, 1fr);
}
@media (min-width: 768px) {
    .statsGrid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1024px) {
    .statsGrid { grid-template-columns: repeat(6, 1fr); }
}
```

- [ ] **Step 4: Commit**

---

### Task 5: Add Alerts Section

**Files:**
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.jsx`
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.module.css`

- [ ] **Step 1: Build alerts computation**

Create `alerts` useMemo based on REAL data only:
```jsx
const alerts = useMemo(() => {
    const items = [];

    // Low execution rate alert
    if (overallStats.executionRate < 50 && overallStats.totalTrainings > 0) {
        items.push({ type: 'danger', text: `אחוז ביצוע נמוך: ${overallStats.executionRate}% מהאימונים בוצעו` });
    }

    // Low plan submission alert
    if (overallStats.planRate < 50 && overallStats.totalGroups > 0) {
        items.push({ type: 'warning', text: `${overallStats.totalGroups - overallStats.submittedPlans} תוכניות טרם הוגשו מתוך ${overallStats.totalGroups}` });
    }

    // Centers with 0% execution
    executionData.filter(c => c.rate === 0 && c.total > 0).forEach(c => {
        items.push({ type: 'danger', text: `${c.centerName}: אף אימון לא בוצע (${c.total} תוכננו)` });
    });

    // Centers with 0% plan submission
    planData.filter(c => c.rate === 0 && c.totalGroups > 0).forEach(c => {
        items.push({ type: 'warning', text: `${c.centerName}: לא הוגשו תוכניות (${c.totalGroups} קבוצות)` });
    });

    return items;
}, [overallStats, executionData, planData]);
```

- [ ] **Step 2: Add alerts JSX between stats and sections**

```jsx
{alerts.length > 0 && (
    <div className={styles.alertsSection}>
        {alerts.map((alert, i) => (
            <div key={i} className={`${styles.alertItem} ${styles[alert.type]}`}>
                <AlertTriangle size={16} />
                <span>{alert.text}</span>
            </div>
        ))}
    </div>
)}
```

- [ ] **Step 3: Add alerts CSS**

```css
.alertsSection {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
}
.alertItem {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 600;
}
.alertItem.danger {
    background: var(--error-100);
    color: var(--error-700);
    border: 1px solid var(--error-200);
}
.alertItem.warning {
    background: var(--warning-100);
    color: var(--warning-700);
    border: 1px solid var(--warning-200);
}
```

- [ ] **Step 4: Commit**

---

### Task 6: Add Bar Charts

**Files:**
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.jsx`
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.module.css`

- [ ] **Step 1: Compute chart data**

```jsx
const coachesPerCenter = useMemo(() => {
    if (!centers.length || !users?.length) return [];
    return centers.map(c => {
        const count = users.filter(u => u.role === 'coach' && u.isActive !== false && u.centerIds?.includes(c.id)).length;
        return { name: c.name, count };
    }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
}, [centers, users]);

const groupsPerCenter = useMemo(() => {
    if (!centers.length || !groups.length) return [];
    return centers.map(c => {
        const count = groups.filter(g => g.centerId === c.id && g.isActive !== false).length;
        return { name: c.name, count };
    }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
}, [centers, groups]);
```

- [ ] **Step 2: Create BarChart inline component**

Pure CSS bar chart — horizontal bars, mobile-first:
```jsx
const HorizontalBarChart = ({ data, color, label }) => {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
                <BarChart3 size={18} />
                <h2 className={styles.chartTitle}>{label}</h2>
            </div>
            <div className={styles.chartBars}>
                {data.map(item => (
                    <div key={item.name} className={styles.barRow}>
                        <span className={styles.barLabel}>{item.name}</span>
                        <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${(item.count / max) * 100}%`, backgroundColor: color }} />
                        </div>
                        <span className={styles.barValue}>{item.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Add charts JSX after the two detail sections**

```jsx
{coachesPerCenter.length > 0 && (
    <HorizontalBarChart data={coachesPerCenter} color="var(--primary-500)" label="מאמנים לפי מרכז" />
)}
{groupsPerCenter.length > 0 && (
    <HorizontalBarChart data={groupsPerCenter} color="var(--accent-600)" label="קבוצות לפי מרכז" />
)}
```

- [ ] **Step 4: Add bar chart CSS**

```css
.chartSection {
    background: white;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--gray-100);
    margin-bottom: var(--space-4);
    overflow: hidden;
}
.chartHeader {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    border-bottom: 1px solid var(--gray-100);
    color: var(--text-primary);
}
.chartTitle {
    font-size: var(--font-size-base);
    font-weight: 700;
    flex: 1;
}
.chartBars {
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}
.barRow {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}
.barLabel {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
    min-width: 60px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
}
.barTrack {
    flex: 1;
    height: 24px;
    background: var(--gray-100);
    border-radius: var(--radius-md);
    overflow: hidden;
    min-width: 80px;
}
.barFill {
    height: 100%;
    border-radius: var(--radius-md);
    transition: width 0.5s ease;
    min-width: 4px;
}
.barValue {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--text-primary);
    min-width: 24px;
    text-align: left;
}
```

- [ ] **Step 5: Commit**

---

### Task 7: Responsive Polish + Desktop Grid

**Files:**
- Modify: `src/features/dashboard/ManagerAnalyticsDashboard.module.css`

- [ ] **Step 1: Update responsive breakpoints**

On desktop (1024px+), show the two chart sections side by side:
```css
.chartsGrid {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}
@media (min-width: 1024px) {
    .chartsGrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
}
```

Wrap the two bar charts in a `.chartsGrid` container in JSX.

- [ ] **Step 2: Ensure bar labels don't overflow on mobile**

Set `.barLabel { max-width: 70px; }` on mobile, expand on tablet+.

- [ ] **Step 3: Commit**

---

### Task 8: QA + Local Dev Testing

- [ ] **Step 1: Run `npm run build`** — verify no build errors
- [ ] **Step 2: Run `npm run dev`** — verify page loads
- [ ] **Step 3: Visual check** — responsive layout, spacing, RTL alignment
- [ ] **Step 4: Data check** — verify no "מרכז לא ידוע", correct counts

---

### Task 9: Update CLAUDE.md + Deploy

- [ ] **Step 1: Add Analytics Dashboard section to CLAUDE.md**
- [ ] **Step 2: Deploy** — `npm run build && npx firebase deploy --only hosting`
- [ ] **Step 3: Verify production**
