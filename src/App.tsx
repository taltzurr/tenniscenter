/**
 * Main App Component
 * Handles routing and layout
 */

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Layouts
import { AppLayout } from '@/components/layout/AppLayout';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Coach Pages
import { CoachDashboard } from '@/pages/coach/CoachDashboard';
import { CalendarPage } from '@/pages/coach/CalendarPage';
import { TrainingsPage } from '@/pages/coach/TrainingsPage';
import { TrainingFormPage } from '@/pages/coach/TrainingFormPage';
import { GroupsPage } from '@/pages/coach/GroupsPage';

// Loading Spinner
import { Spinner } from '@/components/ui/Spinner';

// ============================================
// PROTECTED ROUTE WRAPPER
// ============================================

function ProtectedRoute() {
  const { isAuthenticated, isLoading, error, retryLoadSession, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">שגיאה בטעינת המשתמש</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={retryLoadSession}
              className="w-full px-4 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              נסה שוב
            </button>
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ============================================
// PUBLIC ROUTE WRAPPER (redirect if logged in)
// ============================================

function PublicRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Redirect based on role
    const redirectPath = getDefaultPath(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}

// ============================================
// ROLE-BASED REDIRECT
// ============================================

function RoleRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const redirectPath = getDefaultPath(user.role);
  return <Navigate to={redirectPath} replace />;
}

function getDefaultPath(role: string): string {
  switch (role) {
    case 'supervisor':
      return '/admin';
    case 'center_manager':
      return '/center';
    case 'coach':
    default:
      return '/coach';
  }
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Root redirect */}
          <Route index element={<RoleRedirect />} />

          {/* Coach Routes */}
          <Route path="coach">
            <Route index element={<CoachDashboard />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="trainings" element={<TrainingsPage />} />
            <Route path="trainings/new" element={<TrainingFormPage />} />
            <Route path="trainings/:id" element={<TrainingFormPage />} />
            <Route path="groups" element={<GroupsPage />} />
          </Route>

          {/* Center Manager Routes (placeholder) */}
          <Route path="center">
            <Route index element={<div className="p-6">דשבורד מנהל מרכז - בקרוב</div>} />
          </Route>

          {/* Supervisor Routes (placeholder) */}
          <Route path="admin">
            <Route index element={<div className="p-6">דשבורד מנהל מקצועי - בקרוב</div>} />
          </Route>
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
