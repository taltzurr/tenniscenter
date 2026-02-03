import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrainingById, createTraining, updateTraining, deleteTraining } from './trainings';
import * as firestore from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/firestore');
vi.mock('./firebase', () => ({
  db: {},
}));

describe('Trainings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTrainingById', () => {
    it('should return training if it exists', async () => {
      const mockTraining = {
        groupId: 'group123',
        coachId: 'coach123',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
        topic: 'Forehand Practice',
      };

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        id: 'training123',
        data: () => mockTraining,
      });

      const result = await getTrainingById('training123');

      expect(result).toEqual({ id: 'training123', ...mockTraining });
    });

    it('should return null if training does not exist', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      });

      const result = await getTrainingById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTraining', () => {
    it('should create a new training', async () => {
      const mockTraining = {
        groupId: 'group123',
        coachId: 'coach123',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
        topic: 'Forehand Practice',
        status: 'scheduled',
      };

      const mockDocRef = { id: 'training123' };
      vi.mocked(firestore.addDoc).mockResolvedValue(mockDocRef);

      const result = await createTraining(mockTraining);

      expect(result).toHaveProperty('id');
      expect(firestore.addDoc).toHaveBeenCalled();
    });
  });

  describe('updateTraining', () => {
    it('should update an existing training', async () => {
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      const updates = { topic: 'Updated Topic' };
      await updateTraining('training123', updates);

      expect(firestore.updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(updates));
    });
  });

  describe('deleteTraining', () => {
    it('should delete a training', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      await deleteTraining('training123');

      expect(firestore.deleteDoc).toHaveBeenCalledWith(expect.anything());
    });
  });
});
