/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signIn,
  signOut as authSignOut,
  resetPassword,
  onAuthChange,
  getUserData,
  hasRole,
  belongsToCenter,
} from '@/services/auth.service';
import type { User, UserRole } from '@/types';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearError: () => void;
  retryLoadSession: () => Promise<void>;

  // Helpers
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  belongsToCenter: (centerId: string) => boolean;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user session data
  const loadUserSession = useCallback(async (fbUser: FirebaseUser) => {
    try {
      setError(null);
      const userData = await getUserData(fbUser.uid);
      if (!userData) {
        setError('לא נמצאו נתוני משתמש. אנא פנה למנהל המערכת.');
        setUser(null);
      } else {
        setUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('שגיאה בטעינת נתוני המשתמש. בדוק את החיבור לאינטרנט ונסה שוב.');
      setUser(null);
    }
  }, []);

  // Retry loading session
  const retryLoadSession = useCallback(async () => {
    if (firebaseUser) {
      setIsLoading(true);
      await loadUserSession(firebaseUser);
      setIsLoading(false);
    }
  }, [firebaseUser, loadUserSession]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        await loadUserSession(fbUser);
      } else {
        setUser(null);
        setError(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserSession]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signIn(email, password);
      // Auth state listener will handle the rest
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authSignOut();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Password reset
  const sendPasswordReset = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  // Role check helper
  const checkRole = useCallback((roles: UserRole | UserRole[]) => {
    return hasRole(user, roles);
  }, [user]);

  // Center check helper
  const checkCenter = useCallback((centerId: string) => {
    return belongsToCenter(user, centerId);
  }, [user]);

  // Context value
  const value: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    sendPasswordReset,
    clearError,
    retryLoadSession,
    hasRole: checkRole,
    belongsToCenter: checkCenter,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// ============================================
// ROLE GUARD COMPONENT
// ============================================

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
