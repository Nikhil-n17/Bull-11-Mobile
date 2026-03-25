/**
 * Use Case: Withdraw From Contest
 * Single Responsibility: Handle user withdrawal from a contest
 */

import { ContestRepository } from '../../repositories/ContestRepository';

export interface WithdrawFromContestRequest {
  contestId: string;
}

export class WithdrawFromContestUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID to withdraw from
   */
  async execute(request: WithdrawFromContestRequest): Promise<void> {
    const { contestId } = request;

    // Business validation
    this.validateContestId(contestId);

    await this.contestRepository.withdrawFromContest(contestId);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }
}
