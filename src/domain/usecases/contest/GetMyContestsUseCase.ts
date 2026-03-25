/**
 * Use Case: Get My Contests
 * Single Responsibility: Retrieve all contest entries for the current user
 */

import { ContestEntry } from '../../entities/Contest';
import { ContestRepository } from '../../repositories/ContestRepository';

export class GetMyContestsUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @returns List of all user's contest entries
   */
  async execute(): Promise<ContestEntry[]> {
    return await this.contestRepository.getMyContests();
  }
}
