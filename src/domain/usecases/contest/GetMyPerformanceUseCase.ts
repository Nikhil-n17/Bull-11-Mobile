/**
 * Use Case: Get My Performance
 * Single Responsibility: Retrieve user's performance in a specific contest
 */

import { ContestEntry } from '../../entities/Contest';
import { ContestRepository } from '../../repositories/ContestRepository';

export interface GetMyPerformanceRequest {
  contestId: string;
}

export class GetMyPerformanceUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID
   * @returns User's contest entry with performance metrics
   */
  async execute(request: GetMyPerformanceRequest): Promise<ContestEntry> {
    const { contestId } = request;

    // Business validation
    this.validateContestId(contestId);

    return await this.contestRepository.getMyPerformance(contestId);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }
}
