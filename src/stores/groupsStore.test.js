import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the groups service
vi.mock('../services/groups', () => ({
  getGroups: vi.fn(),
  getAllGroups: vi.fn(),
  getGroupsByCenter: vi.fn(),
  getGroup: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

import useGroupsStore from './groupsStore';
import {
  getGroups,
  getAllGroups,
  getGroupsByCenter,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../services/groups';

describe('Groups Store', () => {
  beforeEach(() => {
    useGroupsStore.setState({
      groups: [],
      selectedGroup: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchGroups', () => {
    it('should fetch groups for a coach', async () => {
      const mockGroups = [
        { id: 'g1', name: 'Group A', coachId: 'coach1' },
        { id: 'g2', name: 'Group B', coachId: 'coach1' },
      ];
      vi.mocked(getGroups).mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups('coach1');
      });

      expect(result.current.groups).toEqual(mockGroups);
      expect(result.current.isLoading).toBe(false);
      expect(getGroups).toHaveBeenCalledWith('coach1');
    });

    it('should fetch all groups for supervisor', async () => {
      const mockGroups = [{ id: 'g1', name: 'Group A' }];
      vi.mocked(getAllGroups).mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups('coach1', true);
      });

      expect(getAllGroups).toHaveBeenCalled();
      expect(result.current.groups).toEqual(mockGroups);
    });

    it('should fetch groups by center', async () => {
      const mockGroups = [{ id: 'g1', name: 'Group A', centerId: 'c1' }];
      vi.mocked(getGroupsByCenter).mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups('coach1', false, 'c1');
      });

      expect(getGroupsByCenter).toHaveBeenCalledWith('c1');
      expect(result.current.groups).toEqual(mockGroups);
    });

    it('should handle fetch error', async () => {
      vi.mocked(getGroups).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.fetchGroups('coach1');
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('addGroup', () => {
    it('should add a new group and prepend to list', async () => {
      const newGroup = { id: 'g-new', name: 'New Group', coachId: 'coach1' };
      vi.mocked(createGroup).mockResolvedValue(newGroup);

      const { result } = renderHook(() => useGroupsStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addGroup({ name: 'New Group', coachId: 'coach1' });
      });

      expect(addResult.success).toBe(true);
      expect(addResult.group).toEqual(newGroup);
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.groups[0]).toEqual(newGroup);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle add error', async () => {
      vi.mocked(createGroup).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useGroupsStore());

      let addResult;
      await act(async () => {
        addResult = await result.current.addGroup({ name: 'Fail Group' });
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Create failed');
      expect(result.current.error).toBe('Create failed');
    });
  });

  describe('editGroup', () => {
    it('should update group in state', async () => {
      useGroupsStore.setState({
        groups: [{ id: 'g1', name: 'Old Name' }],
        selectedGroup: { id: 'g1', name: 'Old Name' },
      });

      vi.mocked(updateGroup).mockResolvedValue({ name: 'New Name' });

      const { result } = renderHook(() => useGroupsStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editGroup('g1', { name: 'New Name' });
      });

      expect(editResult.success).toBe(true);
      expect(result.current.groups[0].name).toBe('New Name');
      expect(result.current.selectedGroup.name).toBe('New Name');
    });

    it('should not update selectedGroup if different id', async () => {
      useGroupsStore.setState({
        groups: [{ id: 'g1', name: 'G1' }, { id: 'g2', name: 'G2' }],
        selectedGroup: { id: 'g2', name: 'G2' },
      });

      vi.mocked(updateGroup).mockResolvedValue({ name: 'G1 Updated' });

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.editGroup('g1', { name: 'G1 Updated' });
      });

      expect(result.current.selectedGroup.name).toBe('G2');
    });

    it('should handle edit error', async () => {
      useGroupsStore.setState({
        groups: [{ id: 'g1', name: 'Name' }],
      });

      vi.mocked(updateGroup).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useGroupsStore());

      let editResult;
      await act(async () => {
        editResult = await result.current.editGroup('g1', { name: 'X' });
      });

      expect(editResult.success).toBe(false);
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('removeGroup', () => {
    it('should remove group from state', async () => {
      useGroupsStore.setState({
        groups: [{ id: 'g1', name: 'G1' }, { id: 'g2', name: 'G2' }],
        selectedGroup: { id: 'g1', name: 'G1' },
      });

      vi.mocked(deleteGroup).mockResolvedValue(undefined);

      const { result } = renderHook(() => useGroupsStore());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeGroup('g1');
      });

      expect(removeResult.success).toBe(true);
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.groups[0].id).toBe('g2');
      expect(result.current.selectedGroup).toBeNull();
    });

    it('should keep selectedGroup if different id', async () => {
      useGroupsStore.setState({
        groups: [{ id: 'g1' }, { id: 'g2' }],
        selectedGroup: { id: 'g2', name: 'G2' },
      });

      vi.mocked(deleteGroup).mockResolvedValue(undefined);

      const { result } = renderHook(() => useGroupsStore());

      await act(async () => {
        await result.current.removeGroup('g1');
      });

      expect(result.current.selectedGroup).toEqual({ id: 'g2', name: 'G2' });
    });

    it('should handle delete error', async () => {
      useGroupsStore.setState({
        groups: [{ id: 'g1' }],
      });

      vi.mocked(deleteGroup).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useGroupsStore());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeGroup('g1');
      });

      expect(removeResult.success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
      // Group should still be in state
      expect(result.current.groups).toHaveLength(1);
    });
  });
});
