# Tennis Center App -- Development Guidelines

## CRITICAL: Deployment Platform

**This project uses Firebase Hosting ONLY. There is NO Vercel connection whatsoever.**
**This project uses CSS Modules ONLY. There is NO Tailwind CSS.**

Do NOT suggest or attempt Vercel deployments, Vercel CLI commands, or Tailwind utility classes.

---

## Project Overview

Tennis center management system for the **Israeli Tennis Association**. Manages coaches, training sessions, monthly plans, groups, players, exercises, goals, and events across multiple tennis centers nationwide.

### Live URLs

- **Production**: https://tennis-training-app-gemini.web.app
- **Secondary**: https://tennis-centers.web.app

### Hosting & Deployment

- **Firebase Hosting** -- the ONLY deployment platform
- Firebase project: `tennis-training-app-gemini`
- Two hosting targets: `main` (tennis-training-app-gemini) and `tennis-centers`
- Build output: `dist/` directory
- Deploy command: `npx firebase deploy --only hosting`

### Firebase Services Used

- **Firebase Auth** -- email/password authentication
- **Firestore** -- main database (collections: users, centers, groups, trainings, monthlyPlans, exercises, events, notifications, goals, players, exerciseRequests, monthlyOutstanding)
- **Firebase Storage** -- file uploads
- **Firebase Functions** -- server-side logic (in `/functions` directory)
- **Firebase Emulators** -- local dev (auth:9099, firestore:8080, storage:9199)

---

## Tech Stack

- **React 19** + **Vite 7**
- **CSS Modules** (NO Tailwind -- never use Tailwind classes)
- **Firebase 12** (Firestore + Auth + Storage + Functions)
- **Zustand 5** for state management
- **React Router v7** for routing
- **date-fns v4** for date handling
- **lucide-react** for icons
- **@dnd-kit** for drag-and-drop
- **@sentry/react** for error monitoring
- **react-big-calendar** for calendar views
- **RTL (Hebrew)** -- all layouts must support `direction: rtl`

---

## Color Palette (from logo)

### Primary (Blue)

| Token | Hex |
|---|---|
| `--primary-900` | `#1a4a6e` |
| `--primary-800` | `#1e5680` |
| `--primary-700` | `#2d6a9f` |
| `--primary-600` (main) | `#3d7db5` |
| `--primary-500` | `#4a9fd4` |
| `--primary-400` | `#6bb3de` |
| `--primary-300` | `#8dc7e8` |
| `--primary-200` | `#b0dbf2` |
| `--primary-100` | `#e8f4fc` |
| `--primary-50` | `#f4f9fd` |

### Accent (Gold/Yellow)

| Token | Hex |
|---|---|
| `--accent-700` | `#b59a1a` |
| `--accent-600` (main) | `#d4b82e` |
| `--accent-500` | `#f5d742` |
| `--accent-400` | `#ffe066` |
| `--accent-300` | `#ffeb99` |
| `--accent-200` | `#fff4cc` |
| `--accent-100` | `#fffaeb` |
| `--accent-50` | `#fffdf5` |

### Neutral Grays

`--gray-900` (#212121) through `--gray-50` (#fafafa)

### Semantic Colors

- **Success**: `--success-700` (#388e3c), `--success-500` (#4caf50), `--success-200` (#a5d6a7), `--success-100` (#e8f5e9)
- **Warning**: `--warning-700` (#f57c00), `--warning-500` (#ff9800), `--warning-200` (#ffe0b2), `--warning-100` (#fff3e0)
- **Error**: `--error-700` (#d32f2f), `--error-500` (#f44336), `--error-200` (#ef9a9a), `--error-100` (#ffebee)
- **Info**: `--info-500` (#2196f3), `--info-100` (#e3f2fd)

### Dashboard Chart Colors

- **Completed** segments: Primary blue (`--primary-600`)
- **Not completed** segments: Accent gold (`--accent-500`)
- **Cancelled** segments: Error red (`--error-500`)

---

## User Roles

1. **supervisor** -- CPO/organization-wide manager, sees all centers and coaches
2. **centerManager** -- manages a single center, sees their center's coaches/groups
3. **coach** -- manages their own groups, trainings, and monthly plans

---

## Feature Domains

- **auth** -- login, authentication, role-based routing
- **dashboard** -- role-specific dashboards (CoachDashboard, CenterManagerDashboard, ManagerDashboard for supervisors)
- **trainings** -- training session CRUD, status tracking (draft/planned/completed/cancelled)
- **monthlyPlans** -- monthly training plans per group (draft/submitted/reviewed/approved/rejected)
- **groups** -- player groups per center/coach
- **players** -- player management within groups
- **exercises** -- exercise library (global/private), exercise requests
- **goals** -- organizational goals and values
- **centers** -- tennis center management
- **users** -- user management, role assignment
- **notifications** -- in-app notification system
- **monthlyOutstanding** -- monthly outstanding player recognition
- **settings** -- app settings
- **manager** -- manager-specific analytics and tools

---

## File Structure

```
src/
  features/<domain>/<Component>.jsx       # Feature components (co-located *.module.css)
  services/<name>.js                      # Firebase service wrappers
  stores/<name>Store.js                   # Zustand stores
  components/ui/<Component>/<Component>.jsx  # Shared UI components
  components/layout/                      # Sidebar, Header, etc.
  config/constants.js                     # App constants
  styles/variables.css                    # CSS variables (colors, spacing, typography)
functions/                                # Firebase Cloud Functions
firestore.rules                           # Firestore security rules
```

---

## Key Architecture Patterns

- **Zustand stores** fetch data from Firestore via services and cache in memory
- **Services** are thin wrappers around Firestore queries (in `src/services/`)
- **Role-based routing** -- different dashboards and accessible pages per role
- **Firestore security rules** enforce access control server-side (`firestore.rules`)
- **Error monitoring** via Sentry integration

---

## Mobile-First Development

- **Always design for 375px viewport first**, then enhance for tablet (768px) and desktop (1024px+).
- Use `min-width` media queries to progressively enhance layouts.
- Touch targets must be **minimum 44x44px**.
- Prefer vertical stacking on mobile, grid/flex-row on desktop.
- Test horizontal scroll containers with `overflow-x: auto` and `-webkit-overflow-scrolling: touch`.

---

## CSS Conventions

- Use CSS variables from `src/styles/variables.css` for ALL colors, spacing, typography, and shadows.
- Component styles go in `*.module.css` files co-located with the component.
- Mobile styles are the default; desktop overrides go inside `@media (min-width: 768px) { }`.
- Use `var(--space-*)` for spacing, `var(--font-size-*)` for typography.
- Use `var(--radius-*)` for border-radius, `var(--shadow-*)` for box-shadows.
- Font family: `'Rubik', 'Segoe UI', system-ui, -apple-system, sans-serif`

### Icon + Text Spacing (CRITICAL)

When placing a lucide-react icon next to text (in badges, meta items, buttons, links, etc.), **always** use a minimum gap of `var(--space-2)` (8px). Never use `var(--space-1)` or `var(--space-1-5)` for icon-text pairs — they are too cramped on mobile.

- **Status badges** (pill-shaped): `gap: var(--space-2)`, `padding: var(--space-1-5) var(--space-3)` — give the text breathing room inside the badge border.
- **Meta items** (icon + label text): `gap: var(--space-2)`
- **Action buttons/links** (icon + text): `gap: var(--space-2)`
- **Summary items** (icon + count): `gap: var(--space-2)`

This applies globally to all components, not just specific pages.

### Unified Header Standards

The app uses two header levels with a single consistent format across ALL pages.

#### Page Header (h1 -- every page)

Every page starts with a `.header` div containing a title and optional subtitle. No centering, no flex tricks -- simple block layout.

**CSS classes**: `.header`, `.title`, `.subtitle`

```css
.header { margin-bottom: var(--space-4); }
.title { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--text-primary); margin: 0 0 var(--space-1) 0; }
.subtitle { font-size: var(--font-size-sm); color: var(--text-secondary); margin: 0; }
```

**JSX pattern**:
```jsx
<div className={styles.header}>
    <h1 className={styles.title}>כותרת עמוד</h1>
    <p className={styles.subtitle}>תיאור קצר של העמוד</p>
</div>
```

Desktop override: `.title { font-size: var(--font-size-2xl); }`

#### Section Header (h2 -- inside white cards)

Content sections use a card with an internal header. The icon and title are wrapped in a `sectionTitleRow` div -- the icon is NEVER inside the `<h2>` tag.

**CSS classes**: `.section`, `.sectionHeader`, `.sectionTitleRow`, `.sectionIcon`, `.sectionTitle`, `.sectionBadge`, `.sectionAction`

```css
.section { background: white; border-radius: var(--radius-xl); padding: var(--space-4); box-shadow: var(--shadow-sm); border: 1px solid var(--gray-100); margin-bottom: var(--space-4); }
.sectionHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.sectionTitleRow { display: flex; align-items: center; gap: var(--space-2); }
.sectionIcon { color: var(--primary-400); flex-shrink: 0; }
.sectionTitle { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--text-secondary); margin: 0; letter-spacing: 0.02em; }
.sectionBadge { font-size: var(--font-size-sm); font-weight: 700; padding: var(--space-1) var(--space-3); border-radius: var(--radius-full, 999px); background: var(--primary-50); color: var(--primary-700); }
.sectionAction { font-size: var(--font-size-sm); color: var(--primary-600); font-weight: 600; }
```

**JSX pattern**:
```jsx
<div className={styles.section}>
    <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleRow}>
            <Icon size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>כותרת סקשן</h2>
        </div>
        {/* Right side: badge OR action link */}
        <span className={styles.sectionBadge}>42%</span>
    </div>
    {/* section content */}
</div>
```

**Key rules**:
- Icon is ALWAYS 18px, inside `sectionTitleRow`, with `sectionIcon` class -- never inside the `<h2>`
- Title text is muted (`text-secondary`, `semibold`) -- NOT bold/primary like page titles
- Right side can be a badge (`.sectionBadge`) or action link (`.sectionAction`)
- This pattern is used across ALL dashboards and data pages

### Monthly Context Cards (Goals & Values)

Goals and values share a `.contextCard` container with consistent design. They appear on both ManagerDashboard and CoachDashboard.

**Container** (`.contextCard`): `background: white`, `border-radius: var(--radius-lg)`, `padding: var(--space-4)`, `border: 1px solid var(--gray-100)`, `box-shadow: var(--shadow-xs)`

**Card header** (`.contextCardHeader`): flex row with 16px icon + bold title (`font-weight: 700`, `font-size: var(--font-size-sm)`)

**Goal items** (`.goalItem`): Each goal = colored type badge + bold goal text in a row.
- Row: `padding: var(--space-3) var(--space-4)`, `background: var(--gray-50)`, `border-radius: var(--radius-md)`, `border-inline-end: 3px solid var(--accent-400)`, `gap: var(--space-3)`
- Type badge (`.goalTypeBadge`): `font-size: 10px`, `font-weight: 700`, gold colors (`accent-700` text, `accent-100` bg), `border-radius: var(--radius-sm)`, `padding: var(--space-1) 10px`
- Goal text (`.goalText`): `font-size: var(--font-size-base)`, `font-weight: 600` — must look prominent, NOT plain text

**Value items** (`.valueTag`): Same row style as goals but with blue accent.
- Row: `padding: var(--space-3) var(--space-4)`, `background: var(--gray-50)`, `border-radius: var(--radius-md)`, `border-inline-end: 3px solid var(--primary-400)`
- Text: `font-size: var(--font-size-base)`, `font-weight: 600`, `color: var(--text-primary)`
- `.valuesList`: `flex-direction: column` (NOT `flex-wrap`)

**Key rules**:
- Values must NOT look like goal type badges — different shape, size, color, and padding
- Goal text must be bold and prominent, never look like plain unstyled text
- Tags/badges must always have generous padding (minimum 10px horizontal)
- Coach dashboard filters goals to only show group types the coach manages
- Design must look good with 1-2 goals (coach) AND many goals (supervisor)

---

## RTL Notes

- Use `padding-inline-start` / `padding-inline-end` instead of `padding-left` / `padding-right`.
- Use `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`.
- Chevron icons: `ChevronRight` points **backward** (previous), `ChevronLeft` points **forward** (next) in RTL.
- Text alignment defaults to `right` via global RTL direction.
- **Directional icons MUST always point left in RTL**: `TrendingUp`, `TrendingDown`, `ArrowRight`, `ArrowUpRight`, `ArrowDownRight`, and any other directional icon must be flipped with `transform: scaleX(-1)` so arrows point left. Use a `.rtlIcon { transform: scaleX(-1); }` CSS class in each module and apply it to every directional icon. This is a **hard rule** — no exceptions.

---

## Calendar Design Guidelines

All calendars in the app must follow a unified design system for consistency.

### Calendar Container
- `background: var(--bg-primary)`, `border-radius: var(--radius-xl)`, `border: 1px solid var(--gray-200)`, `box-shadow: var(--shadow-sm)`, `overflow: hidden`
- **NO thick colored top border** — keep it clean

### Calendar Grid
- 7-column CSS grid: `grid-template-columns: repeat(7, 1fr)`
- Use gap-border technique where applicable: `gap: 1px`, `background: var(--gray-100)` on grid

### Day Headers
- `background: var(--gray-50)` — flat, no gradient
- `font-weight: 600`, `font-size: 11px` mobile / `var(--font-size-sm)` desktop
- `color: var(--text-secondary)`, `text-align: center`
- `border-bottom: 2px solid var(--gray-200)`

### Day Cells
- `min-height: 90px` mobile, `130px` desktop
- `padding: 4px` mobile, `8px` desktop
- Today: `background: var(--primary-50)` — NO thick border accent
- Today number: circle with `var(--primary-500)` bg, white bold text
- Hover: `background: var(--gray-50)`

### Event Pills (organizational events from manager)
- Render **inside dayContent** (NOT in dayTop alongside day number)
- Always render **FIRST** before training items
- Full width, `font-size: 9px` mobile / `10-11px` desktop
- `font-weight: 600`, `padding: 2px 6px`, `border-radius: 4px`
- `color: white`, colored background per event type
- `text-shadow: 0 1px 1px rgba(0,0,0,0.15)`
- Read-only for non-supervisor users — clicking shows detail modal

### Training Dots / Time Badges
- `font-size: 10px` mobile / `11px` desktop
- `font-weight: 600`, `padding: 2px 6px`, `border-radius: 4px`
- Group-colored background, white text

### Overflow Handling (many events per day)
- Mobile: show max 3 items (events first, then trainings), display `+N` badge for hidden items
- Desktop: show all items, scrollable if needed

### Month Navigation (Standard monthSelector)

All month navigation must use the unified `monthSelector` pattern:

**CSS classes**: `.monthSelector`, `.navButton`, `.monthTitle`, `.monthTitleCurrent`

```css
.monthSelector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    background: white;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xs);
    margin-bottom: var(--space-4);
}

.monthTitle {
    font-weight: 600;
    font-size: var(--font-size-sm);
    min-width: 100px;
    text-align: center;
}

.monthTitleCurrent {
    font-weight: 700;
    color: var(--primary-700);
    background: var(--primary-50);
    border-radius: var(--radius-md);
    padding: var(--space-1) var(--space-2);
}

.navButton {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--primary-50);
    color: var(--primary-600);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    flex-shrink: 0;
}

.navButton:hover { background: var(--primary-100); }
```

**JSX pattern**:
```jsx
const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
// ...
<div className={styles.monthSelector}>
    <button className={styles.navButton} onClick={handlePrevMonth}><ChevronRight size={20} /></button>
    <span className={`${styles.monthTitle} ${isCurrentMonth ? styles.monthTitleCurrent : ''}`}>
        {HEBREW_MONTHS[selectedMonth]} {selectedYear}
    </span>
    <button className={styles.navButton} onClick={handleNextMonth}><ChevronLeft size={20} /></button>
</div>
```

**Key rules**:
- Container is **centered** (`justify-content: center`)
- Nav buttons have **blue background** (`primary-50`) and **rounded square** (`radius-md`), not transparent circles
- Current month gets **highlighted** with `monthTitleCurrent` class (bold, primary colors, padding)
- RTL arrows: ChevronRight = previous, ChevronLeft = next
- Touch targets: minimum 40×40px

### Consistency Rule
All changes to calendar design must be applied to **every** calendar in the app:
- `TrainingProgramPage` (coach view)
- `EventsCalendarPage` (manager view)
- `PlansList` (coach plans view)
- `CalendarPage` (react-big-calendar view)
- `calendar.css` (global react-big-calendar overrides)

---

## Analytics Dashboard (נתונים)

The analytics dashboard (`ManagerAnalyticsDashboard`) is the supervisor/centerManager data overview page at `/analytics`.

### Navigation Placement
- **Bottom nav**: "נתונים" with `BarChart3` icon (replaces משתמשים for supervisor)
- **Sidebar**: Under "ניהול" section for supervisor
- **Main dashboard**: Management card titled "נתונים" with `BarChart3` icon
- Users page is accessible only from sidebar, NOT bottom nav

### Page Structure (top to bottom)
1. **Header**: Page title "נתונים" + subtitle, centered on mobile
2. **Month selector**: Centered, with current month highlight (`monthTitleCurrent` class — bold, primary colors)
3. **Stats grid**: 6 cards in 3x2 (mobile), 3x2 (tablet), 6x1 (desktop) — מאמנים, קבוצות, אימונים תוכננו, אחוז ביצוע, תוכניות הוגשו, אחוז הגשה
4. **Alerts section**: Data-driven alerts (low execution, missing plans, per-center warnings). Only real data — never hardcoded!
5. **Training execution**: Expandable center → coach breakdown with progress bars
6. **Plan submission**: Same expandable structure
7. **Bar charts**: Horizontal bar charts — "מאמנים לפי מרכז" (primary-500) and "קבוצות לפי מרכז" (accent-600). Side by side on desktop.

### Data Accuracy Rules
- **Filter unknown centers**: Only show centers that exist in the `centers` collection (`validCenterIds` set)
- **Plan submission**: Count only plans with status `submitted`, `approved`, or `reviewed` — NOT all non-draft plans
- **Never show "מרכז לא ידוע"**: Skip trainings/groups without a valid center ID
- **Zero-count centers**: Hide from bar charts (`.filter(c => c.count > 0)`)

### Color Coding for Rates
- `≥80%`: success green (`--success-500`)
- `≥50%`: warning orange (`--warning-500`)
- `<50%`: error red (`--error-500`)

---

## Center Filter Dropdown

When filtering by center (supervisor view), use a **multi-select dropdown** instead of scattered chips. This keeps the UI compact with 17+ centers.

**Pages using this pattern**: `WeeklySchedulePage`, `EventsCalendarPage`

**Behavior**:
- Trigger shows "כל המרכזים" when no filter active, or "X מרכזים" with count badge when centers selected
- Default: all centers selected (empty `selectedCenterIds` = show all)
- Dropdown panel with checkboxes, closes on click outside
- "כל המרכזים" option at top clears selection (shows all)
- Uses `Building2` icon from lucide-react, `ChevronDown` for arrow, `Check` for checkboxes

**CSS classes**: `.centerDropdown`, `.centerDropdownTrigger`, `.centerDropdownPanel`, `.centerDropdownItem`, `.centerDropdownCheckbox`

**Key rules**:
- Dropdown trigger: `min-height: 44px`, `border: 1px solid var(--gray-200)`, white background
- Panel: absolute positioned, `max-height: 300px`, `overflow-y: auto`, `z-index: 50`
- Active items: `primary-50` background, `primary-700` color, bold
- Checked checkbox: `primary-500` background with white check icon
- Do NOT use flat chip layout for center filters — always use dropdown

---

## Commands

```bash
# Development
npm run dev                                  # Start Vite dev server
npm run build                                # Production build to dist/
npm run test                                 # Run Vitest tests

# Deployment (Firebase ONLY)
npx firebase deploy --only hosting           # Deploy frontend to production
npx firebase deploy --only firestore:rules   # Deploy Firestore security rules
npx firebase deploy --only functions         # Deploy Cloud Functions
```
