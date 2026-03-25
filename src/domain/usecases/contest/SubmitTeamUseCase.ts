/**
 * Use Case: Submit Team
 * Single Responsibility: Submit user's 5-stock team for a contest
 */

import { ContestRepository } from '../../repositories/ContestRepository';

export interface SubmitTeamRequest {
  contestId: string;
  stockSymbols: string[];
}

export class SubmitTeamUseCase {
  constructor(private readonly contestRepository: ContestRepository) {}

  /**
   * Execute the use case
   * @param request Contest ID and stock symbols (must be exactly 5)
   */
  async execute(request: SubmitTeamRequest): Promise<void> {
    const { contestId, stockSymbols } = request;

    // Business validation
    this.validateContestId(contestId);
    this.validateStockSymbols(stockSymbols);

    await this.contestRepository.submitTeam(contestId, stockSymbols);
  }

  private validateContestId(contestId: string): void {
    if (!contestId || contestId.trim().length === 0) {
      throw new Error('Contest ID is required');
    }
  }

  private validateStockSymbols(stockSymbols: string[]): void {
    if (!stockSymbols || !Array.isArray(stockSymbols)) {
      throw new Error('Stock symbols must be an array');
    }

    if (stockSymbols.length !== 5) {
      throw new Error('Exactly 5 stocks must be selected');
    }

    // Check for duplicates
    const uniqueSymbols = new Set(stockSymbols);
    if (uniqueSymbols.size !== stockSymbols.length) {
      throw new Error('Stock symbols must be unique');
    }

    // Validate each symbol
    stockSymbols.forEach((symbol) => {
      if (!symbol || symbol.trim().length === 0) {
        throw new Error('All stock symbols must be valid');
      }
    });
  }
}
