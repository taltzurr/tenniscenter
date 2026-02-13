import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking in production.
 * Requires VITE_SENTRY_DSN environment variable to be set.
 * In development, Sentry is disabled to avoid noise.
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Skip if no DSN configured (development) or explicitly disabled
  if (!dsn) {
    console.info('[Sentry] No DSN configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' or 'production'
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Session replay for debugging (production only)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,

    // Don't send errors in development
    enabled: import.meta.env.PROD,

    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'Network request failed',
      'Load failed',
      'Failed to fetch',
    ],

    // Add user context when available
    beforeSend(event) {
      // Strip demo mode events — never send to Sentry
      if (typeof window !== 'undefined' && window.localStorage?.getItem('demo_mode') === 'true') {
        return null;
      }
      return event;
    },
  });
};

export default Sentry;
