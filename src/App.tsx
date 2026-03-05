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
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Coach Pages
import { CoachDashboard } from '@/pages/coach/CoachDashboard';

// Loading Spinner
import { Spinner } from '@/components/ui/Spinner';

// ============================================
// PROTECTED ROUTE WRAPPER
// ============================================

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
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
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Root redirect */}
          <Route index element={<RoleRedirect />} />

          {/* Coach Routes */}
          <Route path="coach">
            <Route index element={<CoachDashboard />} />
            {/* More coach routes will be added here */}
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
