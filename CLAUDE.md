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

---

## RTL Notes

- Use `padding-inline-start` / `padding-inline-end` instead of `padding-left` / `padding-right`.
- Use `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`.
- Chevron icons: `ChevronRight` points **backward** (previous), `ChevronLeft` points **forward** (next) in RTL.
- Text alignment defaults to `right` via global RTL direction.

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

### Month Navigation
- Touch targets: minimum `40×40px`
- RTL arrows: ChevronRight = previous, ChevronLeft = next
- Swipe: right = next, left = previous (RTL-aware)

### Consistency Rule
All changes to calendar design must be applied to **every** calendar in the app:
- `TrainingProgramPage` (coach view)
- `EventsCalendarPage` (manager view)
- `PlansList` (coach plans view)
- `CalendarPage` (react-big-calendar view)
- `calendar.css` (global react-big-calendar overrides)

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
