/**
 * Use Case: Get My Team
 * Single Responsibility: Retrieve user's team for a specific contest
 */

import { ContestEntry } from '../../entities/Contest';
import { ContestRepository } from '../../repositories/ContestRepository';

export interface GetMyTeamRequest {
  contestId: string;
}

export class GetMyTeamUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID
   * @returns User's contest entry with team details
   */
  async execute(request: GetMyTeamRequest): Promise<ContestEntry> {
    const { contestId } = request;

    // Business validation
    this.validateContestId(contestId);

    return await this.contestRepository.getMyTeam(contestId);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }
}
