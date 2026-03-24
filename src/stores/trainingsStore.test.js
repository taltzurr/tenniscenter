import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the trainings service
vi.mock('../services/trainings', () => ({
  getCoachTrainings: vi.fn(),
  createTraining: vi.fn(),
  updateTraining: vi.fn(),
  deleteTraining: vi.fn(),
  getTraining: vi.fn(),
}));

import useTrainingsStore from './trainingsStore';
import {
  getCoachTrainings,
  createTraining,
  updateTraining,
  deleteTraining,
} from '../services/trainings';

describe('Trainings Store', () => {
  beforeEach(() => {
    useTrainingsStore.setState({
      trainings: [],
      selectedTraining: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchTrainings', () => {
    it('should fetch trainings for a coach', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockTrainings = [
        { id: 't1', coachId: 'c1', date: new Date('2024-01-10'), topic: 'Forehand' },
        { id: 't2', coachId: 'c1', date: new Date('2024-01-15'), topic: 'Backhand' },
      ];
      vi.mocked(getCoachTrainings).mockResolvedValue(mockTrainings);

      const { result } = renderHook(() => useTrainingsStore());

      await act(async () => {
        await result.current.fetchTrainings('c1', startDate, endDate);
      });

      expect(result.current.trainings).toEqual(mockTrainings);
      expect(result.current.isLoading).toBe(false);
      expect(getCoachTrainings).toHaveBeenCalledWith('c1', startDate, endDate, undefined);
    });

    it('should pass status filter', async () => {
      vi.mocked(getCoachTrainings).mockResolvedValue([]);

      const { result } = renderHook(() => useTrainingsStore());

      await act(async () => {
        await result.current.fetchTrainings('c1', new Date(), new Date(), 'scheduled');
      });

      expect(getCoachTrainings).toHaveBeenCalledWith('c1', expect.any(Date), expect.any(Date), 'scheduled');
    });

    it('should handle fetch error', async () => {
      vi.mocked(getCoachTrainings).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTrainingsStore());

      await act(async () => {
        await result.current.fetchTrainings('c1', new Date(), new Date());
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('addTraining', () => {
    it('should add training and sort by date', async () => {
      const existingTraining = { id: 't1', date: new Date('2024-01-20'), topic: 'Serve' };
      useTrainingsStore.setState({ trainings: [existingTraining] });

      const newTraining = { id: 't2', date: new Date('2024-01-10'), topic: 'Forehand' };
      vi.mocked(createTraining).mockResolvedValue(newTraining);

      const { result } = renderHook(() => useTrainingsStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addTraining({ topic: 'Forehand', date: new Date('2024-01-10') });
      });

      expect(addResult.success).toBe(true);
      expect(addResult.training).toEqual(newTraining);
      expect(result.current.trainings).toHaveLength(2);
      // Should be sorted by date — t2 (Jan 10) before t1 (Jan 20)
      expect(result.current.trainings[0].id).toBe('t2');
      expect(result.current.trainings[1].id).toBe('t1');
    });

    it('should handle add error', async () => {
      vi.mocked(createTraining).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useTrainingsStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addTraining({ topic: 'Fail' });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Create failed');
      expect(result.current.error).toBe('Create failed');
    });
  });

  describe('editTraining', () => {
    it('should update training in state', async () => {
      useTrainingsStore.setState({
        trainings: [{ id: 't1', topic: 'Old Topic', date: new Date('2024-01-10') }],
        selectedTraining: { id: 't1', topic: 'Old Topic', date: new Date('2024-01-10') },
      });

      vi.mocked(updateTraining).mockResolvedValue({ topic: 'New Topic' });

      const { result } = renderHook(() => useTrainingsStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editTraining('t1', { topic: 'New Topic' });
      });

      expect(editResult.success).toBe(true);
      expect(result.current.trainings[0].topic).toBe('New Topic');
      expect(result.current.selectedTraining.topic).toBe('New Topic');
    });

    it('should update date if provided', async () => {
      const newDate = new Date('2024-02-01');
      useTrainingsStore.setState({
        trainings: [{ id: 't1', topic: 'Topic', date: new Date('2024-01-10') }],
      });

      vi.mocked(updateTraining).mockResolvedValue({ topic: 'Topic' });

      const { result } = renderHook(() => useTrainingsStore());

      await act(async () => {
        await result.current.editTraining('t1', { topic: 'Topic', date: newDate });
      });

      expect(result.current.trainings[0].date).toEqual(newDate);
    });

    it('should not update selectedTraining if different id', async () => {
      useTrainingsStore.setState({
        trainings: [{ id: 't1' }, { id: 't2' }],
        selectedTraining: { id: 't2', topic: 'T2' },
      });

      vi.mocked(updateTraining).mockResolvedValue({ topic: 'T1 Updated' });

      const { result } = renderHook(() => useTrainingsStore());

      await act(async () => {
        await result.current.editTraining('t1', { topic: 'T1 Updated' });
      });

      expect(result.current.selectedTraining.topic).toBe('T2');
    });

    it('should handle edit error', async () => {
      useTrainingsStore.setState({
        trainings: [{ id: 't1', topic: 'Topic' }],
      });

      vi.mocked(updateTraining).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useTrainingsStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editTraining('t1', { topic: 'X' });
      });

      expect(editResult.success).toBe(false);
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('removeTraining', () => {
    it('should remove training from state', async () => {
      useTrainingsStore.setState({
        trainings: [{ id: 't1' }, { id: 't2' }],
        selectedTraining: { id: 't1' },
      });

      vi.mocked(deleteTraining).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTrainingsStore());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeTraining('t1');
      });

      expect(removeResult.success).toBe(true);
      expect(result.current.trainings).toHaveLength(1);
      expect(result.current.trainings[0].id).toBe('t2');
      expect(result.current.selectedTraining).toBeNull();
    });

    it('should keep selectedTraining if different id deleted', async () => {
      useTrainingsStore.setState({
        trainings: [{ id: 't1' }, { id: 't2' }],
        selectedTraining: { id: 't2' },
      });

      vi.mocked(deleteTraining).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTrainingsStore());

      await act(async () => {
        await result.current.removeTraining('t1');
      });

      expect(result.current.selectedTraining).toEqual({ id: 't2' });
    });

    it('should handle delete error', async () => {
      useTrainingsStore.setState({
        trainings: [{ id: 't1' }],
      });

      vi.mocked(deleteTraining).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useTrainingsStore());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeTraining('t1');
      });

      expect(removeResult.success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
      expect(result.current.trainings).toHaveLength(1);
    });
  });
});
