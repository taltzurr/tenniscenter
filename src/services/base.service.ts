/**
 * Base Service
 * Provides common CRUD operations for Firestore collections
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentData,
  QueryConstraint,
  DocumentReference,
  QuerySnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { BaseEntity, PaginationParams } from '../types';

/**
 * Convert Firestore document to typed object
 */
export function docToObject<T extends BaseEntity>(
  doc: DocumentData
): T {
  return {
    id: doc.id,
    ...doc.data()
  } as T;
}

/**
 * Convert query snapshot to array of typed objects
 */
export function snapshotToArray<T extends BaseEntity>(
  snapshot: QuerySnapshot<DocumentData>
): T[] {
  return snapshot.docs.map(doc => docToObject<T>(doc));
}

/**
 * Base service class with common CRUD operations
 */
export class BaseService<T extends BaseEntity, CreateData, UpdateData> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Get collection reference
   */
  protected getCollectionRef() {
    return collection(db, this.collectionName);
  }

  /**
   * Get document reference by ID
   */
  protected getDocRef(id: string): DocumentReference {
    return doc(db, this.collectionName, id);
  }

  /**
   * Get single document by ID
   */
  async getById(id: string): Promise<T | null> {
    const docSnap = await getDoc(this.getDocRef(id));

    if (!docSnap.exists()) {
      return null;
    }

    return docToObject<T>(docSnap);
  }

  /**
   * Get all documents (with optional pagination)
   */
  async getAll(params?: PaginationParams): Promise<T[]> {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc')
    ];

    if (params?.limit) {
      constraints.push(limit(params.limit));
    }

    if (params?.startAfter) {
      constraints.push(startAfter(params.startAfter));
    }

    const q = query(this.getCollectionRef(), ...constraints);
    const snapshot = await getDocs(q);

    return snapshotToArray<T>(snapshot);
  }

  /**
   * Query documents with custom constraints
   */
  async query(...constraints: QueryConstraint[]): Promise<T[]> {
    const q = query(this.getCollectionRef(), ...constraints);
    const snapshot = await getDocs(q);

    return snapshotToArray<T>(snapshot);
  }

  /**
   * Create new document
   */
  async create(data: CreateData): Promise<T> {
    const docRef = await addDoc(this.getCollectionRef(), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newDoc = await getDoc(docRef);
    return docToObject<T>(newDoc);
  }

  /**
   * Create document with specific ID
   */
  async createWithId(id: string, data: CreateData): Promise<T> {
    const docRef = this.getDocRef(id);

    await updateDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // Document doesn't exist, use setDoc instead
      return import('firebase/firestore').then(({ setDoc }) =>
        setDoc(docRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    const newDoc = await getDoc(docRef);
    return docToObject<T>(newDoc);
  }

  /**
   * Update existing document
   */
  async update(id: string, data: UpdateData): Promise<T> {
    const docRef = this.getDocRef(id);

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    } as DocumentData);

    const updatedDoc = await getDoc(docRef);
    return docToObject<T>(updatedDoc);
  }

  /**
   * Delete document (hard delete)
   */
  async delete(id: string): Promise<void> {
    await deleteDoc(this.getDocRef(id));
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    const docSnap = await getDoc(this.getDocRef(id));
    return docSnap.exists();
  }

  /**
   * Get documents by field value
   */
  async getByField(field: string, value: unknown): Promise<T[]> {
    return this.query(where(field, '==', value));
  }

  /**
   * Get documents by multiple field values (AND)
   */
  async getByFields(fields: Record<string, unknown>): Promise<T[]> {
    const constraints = Object.entries(fields).map(
      ([field, value]) => where(field, '==', value)
    );

    return this.query(...constraints);
  }
}

/**
 * Helper to convert Date to Firestore Timestamp
 */
export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Helper to convert Firestore Timestamp to Date
 */
export function timestampToDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

/**
 * Get current month string in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get next month string in YYYY-MM format
 */
export function getNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
}
