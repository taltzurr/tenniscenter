import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseApp from 'firebase/app';
import * as firebaseFunctions from 'firebase/functions';

// Mock Firebase modules
vi.mock('firebase/firestore');
vi.mock('firebase/auth');
vi.mock('firebase/app');
vi.mock('firebase/functions');
vi.mock('../services/firebase', () => ({
  db: {},
}));
vi.mock('../config/firebase', () => ({
  default: { apiKey: 'test' },
}));
vi.mock('../services/auth', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../config/constants', () => ({
  ROLES: {
    SUPERVISOR: 'supervisor',
    CENTER_MANAGER: 'centerManager',
    COACH: 'coach',
  },
}));

// Must import after mocks
import useUsersStore from './usersStore';
import { sendWelcomeEmail } from '../services/auth';

describe('Users Store', () => {
  beforeEach(() => {
    // Reset store
    useUsersStore.setState({ users: [], isLoading: false, error: null });
    vi.clearAllMocks();
  });

  describe('fetchUsers', () => {
    it('should fetch and set users', async () => {
      const mockUsers = [
        { id: 'u1', displayName: 'Alice', role: 'coach' },
        { id: 'u2', displayName: 'Bob', role: 'supervisor' },
      ];
      const mockSnapshot = {
        forEach: (cb) => mockUsers.forEach((u) => cb({ id: u.id, data: () => ({ displayName: u.displayName, role: u.role }) })),
      };
      vi.mocked(firestore.collection).mockReturnValue('usersCol');
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useUsersStore());

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.users).toHaveLength(2);
      expect(result.current.users[0]).toEqual({ id: 'u1', displayName: 'Alice', role: 'coach' });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      vi.mocked(firestore.collection).mockReturnValue('usersCol');
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUsersStore());

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('addUser', () => {
    it('should create a new user with auth account and firestore doc', async () => {
      const mockUid = 'new-uid-123';
      const mockSecondaryApp = { name: 'secondary' };
      const mockSecondaryAuth = {};

      vi.mocked(firebaseApp.initializeApp).mockReturnValue(mockSecondaryApp);
      vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockSecondaryAuth);
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
        user: { uid: mockUid },
      });
      vi.mocked(firebaseAuth.updateProfile).mockResolvedValue(undefined);
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
      vi.mocked(firebaseApp.deleteApp).mockResolvedValue(undefined);

      const mockDocRef = { id: mockUid };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsersStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addUser({
          email: 'new@example.com',
          displayName: 'New User',
          role: 'coach',
          centerIds: ['c1'],
          onboardingMethod: 'manual',
          initialPassword: 'Pass123!',
        });
      });

      expect(addResult.success).toBe(true);
      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].id).toBe(mockUid);
      expect(result.current.isLoading).toBe(false);
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should send welcome email for invitation onboarding', async () => {
      const mockUid = 'inv-uid-456';
      vi.mocked(firebaseApp.initializeApp).mockReturnValue({});
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({});
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
        user: { uid: mockUid },
      });
      vi.mocked(firebaseAuth.updateProfile).mockResolvedValue(undefined);
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
      vi.mocked(firebaseApp.deleteApp).mockResolvedValue(undefined);
      vi.mocked(firestore.doc).mockReturnValue({ id: mockUid });
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsersStore());

      await act(async () => {
        await result.current.addUser({
          email: 'invite@example.com',
          displayName: 'Invited User',
          role: 'coach',
          centerIds: [],
          onboardingMethod: 'invitation',
        });
      });

      expect(sendWelcomeEmail).toHaveBeenCalledWith('invite@example.com');
    });

    it('should recover orphaned auth account on email-already-in-use', async () => {
      const orphanUid = 'orphan-uid-789';
      vi.mocked(firebaseApp.initializeApp).mockReturnValue({});
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({});

      const emailError = new Error('Email already in use');
      emailError.code = 'auth/email-already-in-use';
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValue(emailError);
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
      vi.mocked(firebaseApp.deleteApp).mockResolvedValue(undefined);

      // Mock orphan lookup
      vi.mocked(firestore.query).mockReturnValue('orphanQuery');
      vi.mocked(firestore.where).mockReturnValue('whereClause');
      vi.mocked(firestore.collection).mockReturnValue('deletedUsersCol');
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: orphanUid, data: () => ({ email: 'orphan@example.com' }) }],
      });
      vi.mocked(firestore.doc).mockReturnValue({ id: orphanUid });
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsersStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addUser({
          email: 'orphan@example.com',
          displayName: 'Recovered User',
          role: 'coach',
          centerIds: [],
          onboardingMethod: 'manual',
          initialPassword: 'Pass123!',
        });
      });

      expect(addResult.success).toBe(true);
      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].id).toBe(orphanUid);
    });

    it('should return error for non-recoverable auth failure', async () => {
      vi.mocked(firebaseApp.initializeApp).mockReturnValue({});
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({});

      const authError = new Error('Too many requests');
      authError.code = 'auth/too-many-requests';
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValue(authError);
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
      vi.mocked(firebaseApp.deleteApp).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsersStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addUser({
          email: 'fail@example.com',
          displayName: 'Fail User',
          role: 'coach',
          centerIds: [],
          onboardingMethod: 'manual',
          initialPassword: 'Pass123!',
        });
      });

      expect(addResult.success).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it('should set managedCenterId for center manager role', async () => {
      const mockUid = 'cm-uid';
      vi.mocked(firebaseApp.initializeApp).mockReturnValue({});
      vi.mocked(firebaseAuth.getAuth).mockReturnValue({});
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
        user: { uid: mockUid },
      });
      vi.mocked(firebaseAuth.updateProfile).mockResolvedValue(undefined);
      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
      vi.mocked(firebaseApp.deleteApp).mockResolvedValue(undefined);
      vi.mocked(firestore.doc).mockReturnValue({ id: mockUid });
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUsersStore());

      await act(async () => {
        await result.current.addUser({
          email: 'cm@example.com',
          displayName: 'Center Manager',
          role: 'centerManager',
          centerIds: ['center-1'],
          onboardingMethod: 'manual',
          initialPassword: 'Pass123!',
        });
      });

      // Verify setDoc was called with managedCenterId
      const setDocCall = vi.mocked(firestore.setDoc).mock.calls[0];
      expect(setDocCall[1]).toHaveProperty('managedCenterId', 'center-1');
    });
  });

  describe('updateUser', () => {
    it('should update user in Firestore and local state', async () => {
      useUsersStore.setState({
        users: [{ id: 'u1', displayName: 'Old Name', role: 'coach' }],
      });

      const mockDocRef = { id: 'u1' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);
      vi.mocked(firebaseFunctions.getFunctions).mockReturnValue({});
      vi.mocked(firebaseFunctions.httpsCallable).mockReturnValue(vi.fn().mockResolvedValue({}));

      const { result } = renderHook(() => useUsersStore());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateUser('u1', { displayName: 'New Name' });
      });

      expect(updateResult.success).toBe(true);
      expect(result.current.users[0].displayName).toBe('New Name');
      expect(firestore.updateDoc).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({ displayName: 'New Name' }));
    });

    it('should handle update error', async () => {
      useUsersStore.setState({
        users: [{ id: 'u1', displayName: 'Name', role: 'coach' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'u1' });
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useUsersStore());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateUser('u1', { displayName: 'X' });
      });

      expect(updateResult.success).toBe(false);
      expect(result.current.error).toBe('Permission denied');
    });

    it('should strip centerId and onboardingMethod from updates', async () => {
      useUsersStore.setState({
        users: [{ id: 'u1', displayName: 'Name', role: 'coach' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'u1' });
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);
      vi.mocked(firebaseFunctions.getFunctions).mockReturnValue({});
      vi.mocked(firebaseFunctions.httpsCallable).mockReturnValue(vi.fn().mockResolvedValue({}));

      const { result } = renderHook(() => useUsersStore());

      await act(async () => {
        await result.current.updateUser('u1', {
          displayName: 'Updated',
          centerId: 'should-be-stripped',
          onboardingMethod: 'should-be-stripped',
          initialPassword: 'should-be-stripped',
        });
      });

      const updateCall = vi.mocked(firestore.updateDoc).mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('centerId');
      expect(updateCall).not.toHaveProperty('onboardingMethod');
      expect(updateCall).not.toHaveProperty('initialPassword');
    });
  });

  describe('deleteUser', () => {
    it('should save deletedUsers record and delete Firestore doc', async () => {
      useUsersStore.setState({
        users: [{ id: 'u1', email: 'del@example.com', displayName: 'Del User' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'u1' });
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      vi.mocked(firebaseFunctions.getFunctions).mockReturnValue({});
      vi.mocked(firebaseFunctions.httpsCallable).mockReturnValue(vi.fn().mockResolvedValue({}));

      const { result } = renderHook(() => useUsersStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteUser('u1');
      });

      expect(deleteResult.success).toBe(true);
      expect(result.current.users).toHaveLength(0);
      // setDoc should be called to create deletedUsers record
      expect(firestore.setDoc).toHaveBeenCalled();
      // deleteDoc should be called for the user document
      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      useUsersStore.setState({
        users: [{ id: 'u1', email: 'del@example.com' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'u1' });
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firebaseFunctions.getFunctions).mockReturnValue({});
      vi.mocked(firebaseFunctions.httpsCallable).mockReturnValue(vi.fn().mockResolvedValue({}));
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useUsersStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteUser('u1');
      });

      expect(deleteResult.success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
    });

    it('should still delete user even if Cloud Function fails', async () => {
      useUsersStore.setState({
        users: [{ id: 'u1', email: 'del@example.com' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'u1' });
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      vi.mocked(firebaseFunctions.getFunctions).mockReturnValue({});
      // Cloud function fails
      vi.mocked(firebaseFunctions.httpsCallable).mockReturnValue(
        vi.fn().mockRejectedValue(new Error('Function not deployed'))
      );

      const { result } = renderHook(() => useUsersStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteUser('u1');
      });

      // Should still succeed because cloud function failure is caught
      expect(deleteResult.success).toBe(true);
      expect(result.current.users).toHaveLength(0);
    });
  });
});
