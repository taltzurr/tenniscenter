import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking
 * Only enabled in production environment
 */
export const initSentry = () => {
  // Only initialize Sentry in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],

      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions in production

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Environment
      environment: import.meta.env.MODE,

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'development',

      // Filter out common errors
      beforeSend(event, hint) {
        // Filter out development errors
        if (event.environment === 'development') {
          return null;
        }

        // Filter out network errors (they're usually not actionable)
        const error = hint.originalException;
        if (error && error.message && error.message.includes('NetworkError')) {
          return null;
        }

        return event;
      },
    });
  }
};

export default Sentry;
