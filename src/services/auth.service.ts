/**
 * Authentication Service
 * Handles user authentication with Firebase Auth
 */

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from './firebase';
import type { User, UserRole } from '../types';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current Firebase user
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Get user data from Firestore
 */
export async function getUserData(userId: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

  if (!userDoc.exists()) {
    return null;
  }

  return {
    id: userDoc.id,
    ...userDoc.data()
  } as User;
}

/**
 * Create user document in Firestore (called after Firebase Auth user creation)
 */
export async function createUserDocument(
  userId: string,
  data: {
    email: string;
    displayName: string;
    role: UserRole;
    centerIds: string[];
    createdBy: string;
  }
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...data,
    isActive: true,
    fcmTokens: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update user's FCM token for push notifications
 */
export async function updateFcmToken(userId: string, token: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    const currentTokens: string[] = userDoc.data().fcmTokens || [];

    if (!currentTokens.includes(token)) {
      await setDoc(userRef, {
        fcmTokens: [...currentTokens, token],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }
}

/**
 * Remove FCM token (on logout)
 */
export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    const currentTokens: string[] = userDoc.data().fcmTokens || [];
    const updatedTokens = currentTokens.filter(t => t !== token);

    await setDoc(userRef, {
      fcmTokens: updatedTokens,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(user: User | null, roles: UserRole | UserRole[]): boolean {
  if (!user) return false;

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}

/**
 * Check if user belongs to a specific center
 */
export function belongsToCenter(user: User | null, centerId: string): boolean {
  if (!user) return false;

  // Supervisor has access to all centers
  if (user.role === 'supervisor') return true;

  return user.centerIds.includes(centerId);
}

/**
 * Check if user can manage another user
 */
export function canManageUser(currentUser: User | null, targetUser: User): boolean {
  if (!currentUser) return false;

  // Supervisor can manage anyone
  if (currentUser.role === 'supervisor') return true;

  // Center manager can manage coaches in their centers
  if (currentUser.role === 'center_manager' && targetUser.role === 'coach') {
    return targetUser.centerIds.some(centerId =>
      currentUser.centerIds.includes(centerId)
    );
  }

  return false;
}
