/**
 * Initialize Sentry for error tracking in production.
 * Requires VITE_SENTRY_DSN environment variable to be set.
 * Uses dynamic import so the app works even if @sentry/react is unavailable.
 */
export const initSentry = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Skip if no DSN configured (development) or not production
  if (!dsn || !import.meta.env.PROD) {
    return;
  }

  try {
    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',

      // Performance monitoring
      tracesSampleRate: 0.2,

      // Session replay for debugging
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,

      // Filter out noisy errors
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'Network request failed',
        'Load failed',
        'Failed to fetch',
      ],

      beforeSend(event) {
        // Never send demo mode events
        if (typeof window !== 'undefined' && window.localStorage?.getItem('demo_mode') === 'true') {
          return null;
        }
        return event;
      },
    });
  } catch {
    // @sentry/react not installed — silently skip
  }
};

export default {};
