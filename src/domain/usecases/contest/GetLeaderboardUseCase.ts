/**
 * Use Case: Get Leaderboard
 * Single Responsibility: Retrieve contest leaderboard with rankings
 */

import { LeaderboardEntry } from '../../entities/Contest';
import { ContestRepository } from '../../repositories/ContestRepository';

export interface GetLeaderboardRequest {
  contestId: string;
}

export class GetLeaderboardUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID
   * @returns Leaderboard entries sorted by rank
   */
  async execute(request: GetLeaderboardRequest): Promise<LeaderboardEntry[]> {
    const { contestId } = request;

    // Business validation
    this.validateContestId(contestId);

    return await this.contestRepository.getLeaderboard(contestId);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }
}
