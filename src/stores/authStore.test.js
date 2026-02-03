import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAuthStore from './authStore';

// Mock auth service
vi.mock('../services/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.user = null;
      result.current.userData = null;
      result.current.isLoading = true;
      result.current.error = null;
    });
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.userData).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should have login action', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(typeof result.current.login).toBe('function');
  });

  it('should have logout action', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(typeof result.current.logout).toBe('function');
  });

  it('should have initialize action', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(typeof result.current.initialize).toBe('function');
  });

  it('should have role check methods', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(typeof result.current.isCoach).toBe('function');
    expect(typeof result.current.isCenterManager).toBe('function');
    expect(typeof result.current.isSupervisor).toBe('function');
  });

  it('should correctly identify coach role', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.userData = { role: 'coach' };
    });

    expect(result.current.isCoach()).toBe(true);
    expect(result.current.isCenterManager()).toBe(false);
    expect(result.current.isSupervisor()).toBe(false);
  });

  it('should correctly identify center manager role', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.userData = { role: 'centerManager' };
    });

    expect(result.current.isCoach()).toBe(false);
    expect(result.current.isCenterManager()).toBe(true);
    expect(result.current.isSupervisor()).toBe(false);
  });

  it('should correctly identify supervisor role', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.userData = { role: 'supervisor' };
    });

    expect(result.current.isCoach()).toBe(false);
    expect(result.current.isCenterManager()).toBe(false);
    expect(result.current.isSupervisor()).toBe(true);
  });

  it('should return false for role checks when userData is null', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isCoach()).toBe(false);
    expect(result.current.isCenterManager()).toBe(false);
    expect(result.current.isSupervisor()).toBe(false);
  });
});
