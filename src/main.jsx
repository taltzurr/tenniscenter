import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import App from './App.jsx';
import { initSentry } from './config/sentry.js';

// Initialize Sentry for error tracking
initSentry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
