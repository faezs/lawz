import { AftokTimeLog, LawFirm } from '@/types';

/**
 * Aftok Service
 * Integrates with Aftok time tracking and revenue distribution
 * Law firms and contributors track time spent on legal documents
 */
export class AftokService {
  private readonly apiEndpoint: string;

  constructor() {
    this.apiEndpoint = import.meta.env.VITE_AFTOK_API_ENDPOINT || '/api/aftok';
  }

  /**
   * Log time for a contributor (law firm member)
   */
  async logTime(log: Omit<AftokTimeLog, 'date'>): Promise<AftokTimeLog> {
    try {
      const timeLog: AftokTimeLog = {
        ...log,
        date: Date.now(),
      };

      const response = await fetch(`${this.apiEndpoint}/time/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeLog),
      });

      if (!response.ok) {
        throw new Error('Failed to log time');
      }

      return timeLog;
    } catch (error) {
      console.error('Failed to log time:', error);
      throw error;
    }
  }

  /**
   * Get time logs for a project
   */
  async getTimeLogs(projectId: string): Promise<AftokTimeLog[]> {
    try {
      const response = await fetch(`${this.apiEndpoint}/time/logs/${projectId}`);

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch time logs:', error);
      return [];
    }
  }

  /**
   * Calculate revenue distribution for a project
   * Based on Aftok's time-weighted algorithm with depreciation
   */
  async calculateRevenueDistribution(
    projectId: string,
    totalRevenue: number
  ): Promise<Map<string, number>> {
    try {
      const logs = await this.getTimeLogs(projectId);

      // Apply Aftok's depreciation model
      const now = Date.now();
      const depreciationRate = 0.02; // 2% per month
      const monthMs = 30 * 24 * 60 * 60 * 1000;

      // Calculate depreciated time weights
      const weights = new Map<string, number>();

      for (const log of logs) {
        const monthsElapsed = (now - log.date) / monthMs;
        const depreciation = Math.max(0, 1 - (depreciationRate * monthsElapsed));
        const weightedHours = log.hours * depreciation;

        const current = weights.get(log.contributor) || 0;
        weights.set(log.contributor, current + weightedHours);
      }

      // Calculate total weighted hours
      const totalWeightedHours = Array.from(weights.values())
        .reduce((sum, hours) => sum + hours, 0);

      // Distribute revenue proportionally
      const distribution = new Map<string, number>();

      for (const [contributor, hours] of weights) {
        const share = (hours / totalWeightedHours) * totalRevenue;
        distribution.set(contributor, share);
      }

      return distribution;
    } catch (error) {
      console.error('Failed to calculate revenue distribution:', error);
      throw error;
    }
  }

  /**
   * Get available law firms
   */
  async getLawFirms(): Promise<LawFirm[]> {
    try {
      const response = await fetch(`${this.apiEndpoint}/lawfirms`);

      if (!response.ok) {
        // Return mock data for development
        return this.getMockLawFirms();
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch law firms:', error);
      return this.getMockLawFirms();
    }
  }

  /**
   * Mock law firms for development
   */
  private getMockLawFirms(): LawFirm[] {
    return [
      {
        id: '1',
        name: 'Khan & Associates',
        address: 'Lahore, Pakistan',
        zcashAddress: 'ztestsapling1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
        specializations: ['Tax Law', 'Corporate Law'],
        rating: 4.8,
        verified: true,
      },
      {
        id: '2',
        name: 'Rahman Legal Services',
        address: 'Karachi, Pakistan',
        zcashAddress: 'ztestsapling1rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
        specializations: ['Family Law', 'Divorce Settlements'],
        rating: 4.6,
        verified: true,
      },
      {
        id: '3',
        name: 'Malik Law Firm',
        address: 'Islamabad, Pakistan',
        zcashAddress: 'ztestsapling1mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
        specializations: ['Property Law', 'Financial Disclosure'],
        rating: 4.9,
        verified: true,
      },
    ];
  }

  /**
   * Create a new project for a legal case
   */
  async createProject(name: string, lawFirmId: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiEndpoint}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lawFirmId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const { projectId } = await response.json();
      return projectId;
    } catch (error) {
      console.error('Failed to create project:', error);
      // Return mock project ID
      return 'project_' + Date.now();
    }
  }

  /**
   * Distribute payment to contributors via Zcash
   */
  async distributePayment(
    projectId: string,
    totalAmount: number,
    zcashService: any
  ): Promise<Map<string, string>> {
    try {
      const distribution = await this.calculateRevenueDistribution(projectId, totalAmount);
      const txIds = new Map<string, string>();

      // Send payments to each contributor
      for (const [contributor, amount] of distribution) {
        const txId = await zcashService.sendPayment({
          amount,
          recipient: contributor,
          memo: `Revenue distribution for project ${projectId}`,
          documentId: projectId,
        });

        txIds.set(contributor, txId);
      }

      return txIds;
    } catch (error) {
      console.error('Failed to distribute payment:', error);
      throw error;
    }
  }
}

export const aftokService = new AftokService();
