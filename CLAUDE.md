# Tennis Center App – Development Guidelines

## Tech Stack
- React 19 + Vite
- CSS Modules (no Tailwind)
- Firebase (Firestore + Auth)
- Zustand for state management
- React Router v6
- date-fns for date handling
- lucide-react for icons
- RTL (Hebrew) – all layouts must support `direction: rtl`

## Mobile-First Development
- **Always design for 375px viewport first**, then enhance for tablet (768px) and desktop (1024px+).
- Use `min-width` media queries to progressively enhance layouts.
- Touch targets must be **minimum 44×44px**.
- Prefer vertical stacking on mobile, grid/flex-row on desktop.
- Test horizontal scroll containers with `overflow-x: auto` and `-webkit-overflow-scrolling: touch`.

## CSS Conventions
- Use CSS variables from `src/styles/variables.css` for colors, spacing, typography, and shadows.
- Component styles go in `*.module.css` files co-located with the component.
- Mobile styles are the default; desktop overrides go inside `@media (min-width: 768px) { }`.
- Use `var(--space-*)` for spacing, `var(--font-size-*)` for typography.
- Use `var(--radius-*)` for border-radius, `var(--shadow-*)` for box-shadows.

## RTL Notes
- Use `padding-inline-start` / `padding-inline-end` where possible instead of `padding-left` / `padding-right`.
- Chevron icons: `ChevronRight` points backward (previous), `ChevronLeft` points forward (next) in RTL.
- Text alignment defaults to `right` via global RTL direction.

## File Structure
- Features: `src/features/<domain>/<Component>/<Component>.jsx`
- Services (Firebase): `src/services/<name>.js`
- Stores (Zustand): `src/stores/<name>Store.js`
- Shared UI: `src/components/ui/<Component>.jsx`
