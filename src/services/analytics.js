import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import app from './firebase';

// Initialize Firebase Analytics (only in production)
let analytics = null;

if (typeof window !== 'undefined' && import.meta.env.PROD) {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn('Firebase Analytics initialization failed:', e);
  }
}

/**
 * Track page views — call on route changes
 */
export function trackPageView(pageName, pagePath) {
  if (!analytics) return;
  logEvent(analytics, 'page_view', {
    page_title: pageName,
    page_path: pagePath,
  });
}

/**
 * Track custom events (button clicks, actions, etc.)
 */
export function trackEvent(eventName, params = {}) {
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

/**
 * Set the authenticated user ID for analytics
 */
export function setAnalyticsUser(userId, userProps = {}) {
  if (!analytics) return;
  setUserId(analytics, userId);
  if (Object.keys(userProps).length > 0) {
    setUserProperties(analytics, userProps);
  }
}

/**
 * Clear user on logout
 */
export function clearAnalyticsUser() {
  if (!analytics) return;
  setUserId(analytics, null);
}
