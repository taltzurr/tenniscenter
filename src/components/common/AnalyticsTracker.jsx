import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../services/analytics';

const ROUTE_NAMES = {
  '/dashboard': 'דשבורד',
  '/calendar': 'יומן אימונים',
  '/weekly-schedule': 'לוח שבועי',
  '/analytics': 'נתונים',
  '/groups': 'קבוצות',
  '/exercises': 'תרגילים',
  '/monthly-plans': 'תוכניות חודשיות',
  '/events-calendar': 'לוח אירועים',
  '/users': 'משתמשים',
  '/centers': 'מרכזים',
  '/goals': 'יעדים',
  '/settings': 'הגדרות',
  '/monthly-outstanding': 'מצטיינים',
};

function getPageName(pathname) {
  // Exact match
  if (ROUTE_NAMES[pathname]) return ROUTE_NAMES[pathname];
  // Prefix match for dynamic routes
  for (const [route, name] of Object.entries(ROUTE_NAMES)) {
    if (pathname.startsWith(route)) return name;
  }
  return pathname;
}

/**
 * Tracks page views on every route change.
 * Place inside <BrowserRouter>.
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(getPageName(location.pathname), location.pathname);
  }, [location.pathname]);

  return null;
}
