/**
 * Use Case: Get Contest
 * Single Responsibility: Retrieve single contest by ID
 */

import { Contest } from '../../entities/Contest';
import { ContestRepository } from '../../repositories/ContestRepository';

export interface GetContestRequest {
  contestId: string;
}

export class GetContestUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID
   * @returns Contest details
   */
  async execute(request: GetContestRequest): Promise<Contest> {
    const { contestId } = request;

    // Business validation
    this.validateContestId(contestId);

    return await this.contestRepository.getContestById(contestId);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }
}
