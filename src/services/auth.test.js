import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signIn, signOut, resetPassword, getUserData, updateUserData } from './auth';
import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('./firebase', () => ({
  auth: {},
  db: {},
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in user with email and password', async () => {
      const mockUser = { uid: 'user123', email: 'test@example.com' };
      const mockUserData = { id: 'user123', displayName: 'Test User', role: 'coach' };

      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      });

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        id: 'user123',
        data: () => mockUserData,
      });

      const result = await signIn('test@example.com', 'password123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('userData');
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });

    it('should throw error on invalid credentials', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await expect(signIn('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out the current user', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);

      await signOut();

      expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValue(undefined);

      await resetPassword('test@example.com');

      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com'
      );
    });
  });

  describe('getUserData', () => {
    it('should return user data if document exists', async () => {
      const mockUserData = { displayName: 'Test User', role: 'coach' };

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        id: 'user123',
        data: () => mockUserData,
      });

      const result = await getUserData('user123');

      expect(result).toEqual({ id: 'user123', ...mockUserData });
    });

    it('should return null if user document does not exist', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      });

      const result = await getUserData('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserData', () => {
    it('should update user data in Firestore', async () => {
      const mockDocRef = { id: 'user123', path: 'users/user123' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      const updates = { displayName: 'Updated Name' };
      await updateUserData('user123', updates);

      expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'users', 'user123');
      expect(firestore.updateDoc).toHaveBeenCalledWith(mockDocRef, updates);
    });
  });
});
