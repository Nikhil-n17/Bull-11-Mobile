/**
 * Use Case: Join Contest
 * Single Responsibility: Handle user joining a contest with team name
 */

import { ContestRepository } from '../../repositories/ContestRepository';

export interface JoinContestRequest {
  contestId: string;
  teamName: string;
}

export class JoinContestUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID and team name
   */
  async execute(request: JoinContestRequest): Promise<void> {
    const { contestId, teamName } = request;

    // Business validation
    this.validateContestId(contestId);
    this.validateTeamName(teamName);

    await this.contestRepository.joinContest(contestId, teamName);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }

  private validateTeamName(teamName: string): void {
    if (!teamName || teamName.trim().length === 0) {
      throw new Error('Team name is required');
    }

    if (teamName.trim().length < 3) {
      throw new Error('Team name must be at least 3 characters');
    }

    if (teamName.length > 50) {
      throw new Error('Team name must not exceed 50 characters');
    }
  }
}
