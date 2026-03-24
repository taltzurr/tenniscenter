import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the monthlyPlans service
vi.mock('../services/monthlyPlans', () => ({
  getMonthlyPlan: vi.fn(),
  getCoachMonthlyPlans: vi.fn(),
  getGroupMonthlyPlans: vi.fn(),
  saveMonthlyPlan: vi.fn(),
  deleteMonthlyPlan: vi.fn(),
  submitMonthlyPlan: vi.fn(),
  approveMonthlyPlan: vi.fn(),
  rejectMonthlyPlan: vi.fn(),
  getPendingMonthlyPlans: vi.fn(),
  getAllMonthlyPlans: vi.fn(),
}));

import useMonthlyPlansStore from './monthlyPlansStore';
import {
  getMonthlyPlan,
  getCoachMonthlyPlans,
  saveMonthlyPlan,
  deleteMonthlyPlan,
  submitMonthlyPlan,
  approveMonthlyPlan,
  rejectMonthlyPlan,
  getAllMonthlyPlans,
} from '../services/monthlyPlans';

describe('Monthly Plans Store', () => {
  beforeEach(() => {
    useMonthlyPlansStore.setState({
      plans: [],
      currentPlan: null,
      pendingPlans: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchCoachPlans', () => {
    it('should fetch plans for a coach', async () => {
      const mockPlans = [
        { id: 'p1', coachId: 'c1', year: 2024, month: 1, status: 'draft' },
        { id: 'p2', coachId: 'c1', year: 2024, month: 2, status: 'submitted' },
      ];
      vi.mocked(getCoachMonthlyPlans).mockResolvedValue(mockPlans);

      const { result } = renderHook(() => useMonthlyPlansStore());

      await act(async () => {
        await result.current.fetchCoachPlans('c1', 2024);
      });

      expect(result.current.plans).toEqual(mockPlans);
      expect(result.current.isLoading).toBe(false);
      expect(getCoachMonthlyPlans).toHaveBeenCalledWith('c1', 2024);
    });

    it('should handle fetch error', async () => {
      vi.mocked(getCoachMonthlyPlans).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useMonthlyPlansStore());

      await act(async () => {
        await result.current.fetchCoachPlans('c1');
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetchAllPlans', () => {
    it('should fetch all plans for manager view', async () => {
      const mockPlans = [{ id: 'p1', status: 'submitted' }];
      vi.mocked(getAllMonthlyPlans).mockResolvedValue(mockPlans);

      const { result } = renderHook(() => useMonthlyPlansStore());

      await act(async () => {
        await result.current.fetchAllPlans(2024, 6);
      });

      expect(getAllMonthlyPlans).toHaveBeenCalledWith(2024, 6);
      expect(result.current.plans).toEqual(mockPlans);
    });
  });

  describe('fetchPlan', () => {
    it('should fetch a single plan', async () => {
      const mockPlan = { id: 'p1', groupId: 'g1', year: 2024, month: 3, status: 'draft' };
      vi.mocked(getMonthlyPlan).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => useMonthlyPlansStore());

      let plan;
      await act(async () => {
        plan = await result.current.fetchPlan('g1', 2024, 3);
      });

      expect(plan).toEqual(mockPlan);
      expect(result.current.currentPlan).toEqual(mockPlan);
      expect(getMonthlyPlan).toHaveBeenCalledWith('g1', 2024, 3);
    });

    it('should return null on fetch error', async () => {
      vi.mocked(getMonthlyPlan).mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(() => useMonthlyPlansStore());

      let plan;
      await act(async () => {
        plan = await result.current.fetchPlan('g1', 2024, 3);
      });

      expect(plan).toBeNull();
      expect(result.current.error).toBe('Not found');
    });
  });

  describe('savePlan', () => {
    it('should save a new plan and add to list', async () => {
      const savedPlan = { id: 'p-new', groupId: 'g1', year: 2024, month: 5, status: 'draft' };
      vi.mocked(saveMonthlyPlan).mockResolvedValue(savedPlan);

      const { result } = renderHook(() => useMonthlyPlansStore());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.savePlan({ groupId: 'g1', year: 2024, month: 5 });
      });

      expect(saveResult.success).toBe(true);
      expect(saveResult.plan).toEqual(savedPlan);
      expect(result.current.plans).toHaveLength(1);
      expect(result.current.currentPlan).toEqual(savedPlan);
    });

    it('should update existing plan in list', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1', status: 'draft', goals: 'old goals' }],
      });

      const savedPlan = { id: 'p1', status: 'draft', goals: 'new goals' };
      vi.mocked(saveMonthlyPlan).mockResolvedValue(savedPlan);

      const { result } = renderHook(() => useMonthlyPlansStore());

      await act(async () => {
        await result.current.savePlan({ id: 'p1', goals: 'new goals' });
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].goals).toBe('new goals');
    });

    it('should handle save error', async () => {
      vi.mocked(saveMonthlyPlan).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useMonthlyPlansStore());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.savePlan({ groupId: 'g1' });
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toBe('Save failed');
      expect(result.current.error).toBe('Save failed');
    });
  });

  describe('removePlan', () => {
    it('should remove plan from state', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1' }, { id: 'p2' }],
        currentPlan: { id: 'p1' },
      });

      vi.mocked(deleteMonthlyPlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMonthlyPlansStore());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removePlan('p1');
      });

      expect(removeResult.success).toBe(true);
      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].id).toBe('p2');
      expect(result.current.currentPlan).toBeNull();
    });

    it('should keep currentPlan if different id deleted', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1' }, { id: 'p2' }],
        currentPlan: { id: 'p2' },
      });

      vi.mocked(deleteMonthlyPlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMonthlyPlansStore());

      await act(async () => {
        await result.current.removePlan('p1');
      });

      expect(result.current.currentPlan).toEqual({ id: 'p2' });
    });

    it('should handle delete error', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1' }],
      });

      vi.mocked(deleteMonthlyPlan).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useMonthlyPlansStore());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removePlan('p1');
      });

      expect(removeResult.success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
      expect(result.current.plans).toHaveLength(1);
    });
  });

  describe('submitPlan', () => {
    it('should submit plan and update status', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1', status: 'draft' }],
        currentPlan: { id: 'p1', status: 'draft' },
      });

      vi.mocked(submitMonthlyPlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMonthlyPlansStore());

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitPlan('p1', 'Group A');
      });

      expect(submitResult.success).toBe(true);
      expect(result.current.plans[0].status).toBe('submitted');
      expect(result.current.currentPlan.status).toBe('submitted');
      expect(submitMonthlyPlan).toHaveBeenCalledWith('p1', 'Group A');
    });

    it('should handle submit error', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1', status: 'draft' }],
      });

      vi.mocked(submitMonthlyPlan).mockRejectedValue(new Error('Submit failed'));

      const { result } = renderHook(() => useMonthlyPlansStore());

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitPlan('p1', 'Group A');
      });

      expect(submitResult.success).toBe(false);
      expect(result.current.error).toBe('Submit failed');
    });
  });

  describe('approvePlan', () => {
    it('should approve plan and update status', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1', status: 'submitted' }],
        currentPlan: { id: 'p1', status: 'submitted' },
        pendingPlans: [{ id: 'p1', status: 'submitted' }],
      });

      vi.mocked(approveMonthlyPlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMonthlyPlansStore());

      let approveResult;
      await act(async () => {
        approveResult = await result.current.approvePlan('p1', 'c1', 'Group A');
      });

      expect(approveResult.success).toBe(true);
      expect(result.current.plans[0].status).toBe('approved');
      expect(result.current.currentPlan.status).toBe('approved');
      // Should be removed from pending
      expect(result.current.pendingPlans).toHaveLength(0);
    });
  });

  describe('rejectPlan', () => {
    it('should reject plan and update status', async () => {
      useMonthlyPlansStore.setState({
        plans: [{ id: 'p1', status: 'submitted' }],
        currentPlan: { id: 'p1', status: 'submitted' },
        pendingPlans: [{ id: 'p1', status: 'submitted' }],
      });

      vi.mocked(rejectMonthlyPlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMonthlyPlansStore());

      let rejectResult;
      await act(async () => {
        rejectResult = await result.current.rejectPlan('p1', 'Needs more detail', 'Group A');
      });

      expect(rejectResult.success).toBe(true);
      expect(result.current.plans[0].status).toBe('rejected');
      expect(result.current.currentPlan.status).toBe('rejected');
      expect(result.current.pendingPlans).toHaveLength(0);
      expect(rejectMonthlyPlan).toHaveBeenCalledWith('p1', 'Needs more detail', 'Group A');
    });
  });
});
