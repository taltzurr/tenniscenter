/**
 * Values Service
 * Manages monthly organizational values (1-3 per month)
 */

import { where, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService, getCurrentMonth } from './base.service';
import type { Value, CreateValueData, UpdateData } from '../types';

class ValuesService extends BaseService<Value, CreateValueData, UpdateData<Value>> {
  constructor() {
    super(COLLECTIONS.VALUES);
  }

  /**
   * Get values for a specific month
   */
  async getByMonth(month: string): Promise<Value[]> {
    return this.query(
      where('month', '==', month),
      orderBy('sortOrder', 'asc')
    );
  }

  /**
   * Get current month values
   */
  async getCurrentMonthValues(): Promise<Value[]> {
    return this.getByMonth(getCurrentMonth());
  }

  /**
   * Create a new value (supervisor only)
   * Maximum 3 values per month
   */
  async createValue(data: CreateValueData, createdBy: string): Promise<Value> {
    // Check current count for the month
    const existingValues = await this.getByMonth(data.month);

    if (existingValues.length >= 3) {
      throw new Error('Maximum 3 values per month allowed');
    }

    // Auto-set sort order if not provided
    const sortOrder = data.sortOrder || existingValues.length + 1;

    return this.create({
      ...data,
      sortOrder,
      createdBy,
    } as unknown as CreateValueData);
  }

  /**
   * Update value sort order
   */
  async updateSortOrder(valueId: string, sortOrder: number): Promise<Value> {
    if (sortOrder < 1 || sortOrder > 3) {
      throw new Error('Sort order must be between 1 and 3');
    }
    return this.update(valueId, { sortOrder });
  }

  /**
   * Reorder values for a month
   */
  async reorderValues(month: string, valueIds: string[]): Promise<Value[]> {
    const updates: Promise<Value>[] = [];

    valueIds.forEach((id, index) => {
      updates.push(this.update(id, { sortOrder: index + 1 }));
    });

    return Promise.all(updates);
  }

  /**
   * Get values history (last N months)
   */
  async getValuesHistory(months: number = 6): Promise<Value[]> {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startMonthStr = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`;

    return this.query(
      where('month', '>=', startMonthStr),
      orderBy('month', 'desc'),
      orderBy('sortOrder', 'asc')
    );
  }
}

export const valuesService = new ValuesService();
