import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTraining, createTraining, updateTraining, deleteTraining } from './trainings';
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

  describe('getTraining', () => {
    it('should return training if it exists', async () => {
      const mockDate = new Date('2024-01-15');
      const mockTraining = {
        groupId: 'group123',
        coachId: 'coach123',
        date: { toDate: () => mockDate },
        startTime: '10:00',
        endTime: '11:00',
        topic: 'Forehand Practice',
      };

      const mockDocRef = { id: 'training123', path: 'trainings/training123' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        id: 'training123',
        data: () => mockTraining,
      });

      const result = await getTraining('training123');

      expect(result).toHaveProperty('id', 'training123');
      expect(result).toHaveProperty('date', mockDate);
    });

    it('should return null if training does not exist', async () => {
      const mockDocRef = { id: 'nonexistent', path: 'trainings/nonexistent' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      });

      const result = await getTraining('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTraining', () => {
    it('should create a new training', async () => {
      const mockTraining = {
        groupId: 'group123',
        coachId: 'coach123',
        date: new Date('2024-01-15'),
        startTime: '10:00',
        endTime: '11:00',
        topic: 'Forehand Practice',
        status: 'scheduled',
      };

      const mockCollectionRef = { path: 'trainings' };
      const mockDocRef = { id: 'training123' };
      vi.mocked(firestore.collection).mockReturnValue(mockCollectionRef);
      vi.mocked(firestore.addDoc).mockResolvedValue(mockDocRef);

      const result = await createTraining(mockTraining);

      expect(result).toHaveProperty('id', 'training123');
      expect(firestore.addDoc).toHaveBeenCalled();
    });
  });

  describe('updateTraining', () => {
    it('should update an existing training', async () => {
      const mockDocRef = { id: 'training123', path: 'trainings/training123' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

      const updates = { topic: 'Updated Topic' };
      await updateTraining('training123', updates);

      expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'trainings', 'training123');
      expect(firestore.updateDoc).toHaveBeenCalledWith(mockDocRef, expect.objectContaining(updates));
    });
  });

  describe('deleteTraining', () => {
    it('should delete a training', async () => {
      const mockDocRef = { id: 'training123', path: 'trainings/training123' };
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      await deleteTraining('training123');

      expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'trainings', 'training123');
      expect(firestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });
  });
});
