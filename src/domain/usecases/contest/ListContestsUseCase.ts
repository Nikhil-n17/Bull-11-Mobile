/**
 * Use Case: List Contests
 * Single Responsibility: Get contests with optional status filter
 */

import { Contest, ContestStatus } from '../../entities/Contest';
import { ContestRepository } from '../../repositories/ContestRepository';

export interface ListContestsRequest {
  status?: ContestStatus;
}

export class ListContestsUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Optional status filter
   * @returns List of contests matching the criteria
   */
  async execute(request?: ListContestsRequest): Promise<Contest[]> {
    const status = request?.status;
    return await this.contestRepository.listContests(status);
  }
}
