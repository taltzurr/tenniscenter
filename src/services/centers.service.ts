/**
 * Centers Service
 * Manages tennis centers
 */

import { where, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from './firebase';
import { BaseService } from './base.service';
import type { Center, CreateCenterData, UpdateData } from '../types';

class CentersService extends BaseService<Center, CreateCenterData, UpdateData<Center>> {
  constructor() {
    super(COLLECTIONS.CENTERS);
  }

  /**
   * Get all active centers
   */
  async getActiveCenters(): Promise<Center[]> {
    return this.query(
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
  }

  /**
   * Create a new center
   */
  async createCenter(data: CreateCenterData): Promise<Center> {
    return this.create({
      ...data,
      isActive: true,
    } as CreateCenterData);
  }

  /**
   * Deactivate a center (soft delete)
   */
  async deactivateCenter(centerId: string): Promise<Center> {
    return this.update(centerId, { isActive: false });
  }

  /**
   * Reactivate a center
   */
  async activateCenter(centerId: string): Promise<Center> {
    return this.update(centerId, { isActive: true });
  }

  /**
   * Update center logo
   */
  async updateLogo(centerId: string, logoUrl: string): Promise<Center> {
    return this.update(centerId, { logoUrl });
  }
}

export const centersService = new CentersService();
