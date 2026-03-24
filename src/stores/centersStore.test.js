import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as firestore from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/firestore');
vi.mock('../services/firebase', () => ({
  db: {},
}));

import useCentersStore from './centersStore';

describe('Centers Store', () => {
  beforeEach(() => {
    useCentersStore.setState({
      centers: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchCenters', () => {
    it('should fetch and set centers', async () => {
      const mockCenters = [
        { id: 'c1', name: 'Center A', address: 'Address A' },
        { id: 'c2', name: 'Center B', address: 'Address B' },
      ];
      const mockSnapshot = {
        forEach: (cb) =>
          mockCenters.forEach((c) =>
            cb({ id: c.id, data: () => ({ name: c.name, address: c.address }) })
          ),
      };
      vi.mocked(firestore.collection).mockReturnValue('centersCol');
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useCentersStore());

      await act(async () => {
        await result.current.fetchCenters();
      });

      expect(result.current.centers).toHaveLength(2);
      expect(result.current.centers[0]).toEqual({ id: 'c1', name: 'Center A', address: 'Address A' });
      expect(result.current.centers[1]).toEqual({ id: 'c2', name: 'Center B', address: 'Address B' });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      vi.mocked(firestore.collection).mockReturnValue('centersCol');
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useCentersStore());

      await act(async () => {
        await result.current.fetchCenters();
      });

      expect(result.current.centers).toEqual([]);
      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('addCenter', () => {
    it('should add a new center', async () => {
      const mockDocRef = { id: 'c-new' };
      vi.mocked(firestore.collection).mockReturnValue('centersCol');
      vi.mocked(firestore.addDoc).mockResolvedValue(mockDocRef);

      const { result } = renderHook(() => useCentersStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addCenter({ name: 'New Center', address: '123 Main St' });
      });

      expect(addResult.success).toBe(true);
      expect(result.current.centers).toHaveLength(1);
      expect(result.current.centers[0]).toEqual({ id: 'c-new', name: 'New Center', address: '123 Main St' });
      expect(result.current.isLoading).toBe(false);
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it('should handle add error', async () => {
      vi.mocked(firestore.collection).mockReturnValue('centersCol');
      vi.mocked(firestore.addDoc).mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useCentersStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addCenter({ name: 'Fail Center' });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Add failed');
      expect(result.current.error).toBe('Add failed');
      expect(result.current.centers).toEqual([]);
    });
  });

  describe('updateCenter', () => {
    it('should update center in Firestore and local state', async () => {
      useCentersStore.setState({
        centers: [{ id: 'c1', name: 'Old Name', address: 'Old Addr' }],
      });

      const mockDocRef = { id: 'c1' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCentersStore());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateCenter('c1', { name: 'New Name' });
      });

      expect(updateResult.success).toBe(true);
      expect(result.current.centers[0].name).toBe('New Name');
      expect(result.current.centers[0].address).toBe('Old Addr');
      expect(firestore.updateDoc).toHaveBeenCalledWith(mockDocRef, { name: 'New Name' });
    });

    it('should handle update error', async () => {
      useCentersStore.setState({
        centers: [{ id: 'c1', name: 'Name' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'c1' });
      vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useCentersStore());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateCenter('c1', { name: 'X' });
      });

      expect(updateResult.success).toBe(false);
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('deleteCenter', () => {
    it('should delete center and remove from state', async () => {
      useCentersStore.setState({
        centers: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'c1' });
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCentersStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteCenter('c1');
      });

      expect(deleteResult.success).toBe(true);
      expect(result.current.centers).toHaveLength(1);
      expect(result.current.centers[0].id).toBe('c2');
    });

    it('should handle delete error', async () => {
      useCentersStore.setState({
        centers: [{ id: 'c1' }],
      });

      vi.mocked(firestore.doc).mockReturnValue({ id: 'c1' });
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useCentersStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteCenter('c1');
      });

      expect(deleteResult.success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
      expect(result.current.centers).toHaveLength(1);
    });
  });

  describe('helper methods', () => {
    it('getCenterName should return center name by id', () => {
      useCentersStore.setState({
        centers: [{ id: 'c1', name: 'Tennis Center' }],
      });

      const { result } = renderHook(() => useCentersStore());
      expect(result.current.getCenterName('c1')).toBe('Tennis Center');
    });

    it('getCenterName should return fallback for unknown id', () => {
      useCentersStore.setState({ centers: [] });

      const { result } = renderHook(() => useCentersStore());
      expect(result.current.getCenterName('unknown')).toBe('מרכז לא ידוע');
    });

    it('getSimpleCentersList should return value/label pairs', () => {
      useCentersStore.setState({
        centers: [
          { id: 'c1', name: 'Center A' },
          { id: 'c2', name: 'Center B' },
        ],
      });

      const { result } = renderHook(() => useCentersStore());
      const list = result.current.getSimpleCentersList();
      expect(list).toEqual([
        { value: 'c1', label: 'Center A' },
        { value: 'c2', label: 'Center B' },
      ]);
    });
  });
});
