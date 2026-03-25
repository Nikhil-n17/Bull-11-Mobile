/**
 * Contest Repository Implementation
 * Implements domain repository interface for contest operations
 */

import { ContestRepository } from '@/src/domain/repositories/ContestRepository';
import { Contest, ContestEntry, ContestStatus, ContestType, ContestStock, LeaderboardEntry } from '@/src/domain/entities/Contest';
import { ApiClient } from '../api/ApiClient';
import { API_ENDPOINTS } from '@/src/core/constants/app.constants';
import {
  ContestResponseDTO,
  TeamResponseDTO,
  LeaderboardResponseDTO,
  MyPerformanceResponseDTO,
  ContestResultResponseDTO,
  JoinContestRequestDTO,
  TeamRequestDTO,
  CreateContestRequestDTO,
  StockDetailDTO,
  LeaderboardEntryDTO,
  StockPickDTO
} from '../api/dto';

export class ContestRepositoryImpl implements ContestRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async listContests(status?: ContestStatus): Promise<Contest[]> {
    const params = status ? { status } : {};
    const dtos = await this.apiClient.get<ContestResponseDTO[]>(
      API_ENDPOINTS.CONTESTS.LIST,
      { params }
    );
    return dtos.map(this.mapToContest);
  }

  async getContestById(contestId: string): Promise<Contest> {
    const dto = await this.apiClient.get<ContestResponseDTO>(
      API_ENDPOINTS.CONTESTS.DETAILS(contestId)
    );
    return this.mapToContest(dto);
  }

  async getUpcomingContests(): Promise<Contest[]> {
    const dtos = await this.apiClient.get<ContestResponseDTO[]>(
      API_ENDPOINTS.CONTESTS.UPCOMING
    );
    return dtos.map(this.mapToContest);
  }

  async getLiveContests(): Promise<Contest[]> {
    const dtos = await this.apiClient.get<ContestResponseDTO[]>(
      API_ENDPOINTS.CONTESTS.LIVE
    );
    return dtos.map(this.mapToContest);
  }

  async getCompletedContests(): Promise<Contest[]> {
    const dtos = await this.apiClient.get<ContestResponseDTO[]>(
      API_ENDPOINTS.CONTESTS.COMPLETED
    );
    return dtos.map(this.mapToContest);
  }

  async joinContest(contestId: string, teamName: string): Promise<void> {
    const request: JoinContestRequestDTO = { teamName };
    await this.apiClient.post<void>(
      API_ENDPOINTS.CONTESTS.JOIN(contestId),
      request
    );
  }

  async submitTeam(contestId: string, stockSymbols: string[]): Promise<void> {
    const stocks: StockPickDTO[] = stockSymbols.map(symbol => ({
      symbol,
      exchange: 'NSE'
    }));
    const request: TeamRequestDTO = { stocks, exchange: 'NSE' };
    await this.apiClient.post<TeamResponseDTO>(
      API_ENDPOINTS.CONTESTS.SUBMIT_TEAM(contestId),
      request
    );
  }

  async getMyTeam(contestId: string): Promise<ContestEntry> {
    const dto = await this.apiClient.get<TeamResponseDTO>(
      API_ENDPOINTS.CONTESTS.MY_TEAM(contestId)
    );
    return this.mapToContestEntry(dto);
  }

  async withdrawFromContest(contestId: string): Promise<void> {
    await this.apiClient.delete<void>(
      API_ENDPOINTS.CONTESTS.WITHDRAW(contestId)
    );
  }

  async getLeaderboard(contestId: string): Promise<LeaderboardEntry[]> {
    const dto = await this.apiClient.get<LeaderboardResponseDTO>(
      API_ENDPOINTS.CONTESTS.LEADERBOARD(contestId)
    );
    return dto.entries.map(this.mapToLeaderboardEntry);
  }

  async getMyPerformance(contestId: string): Promise<ContestEntry> {
    const dto = await this.apiClient.get<MyPerformanceResponseDTO>(
      API_ENDPOINTS.CONTESTS.MY_PERFORMANCE(contestId)
    );
    return this.mapPerformanceToContestEntry(dto);
  }

  async getMyContests(): Promise<ContestEntry[]> {
    try {
      // Backend returns list of TeamResponse for user's contests
      const dtos = await this.apiClient.get<TeamResponseDTO[]>(
        API_ENDPOINTS.CONTESTS.MY_CONTESTS
      );

      // Safety check - backend might return null/undefined if no contests
      if (!dtos || !Array.isArray(dtos)) {
        console.log('[ContestRepository] Backend returned non-array:', dtos);
        return [];
      }

      console.log('[ContestRepository] Received', dtos.length, 'contest entries');

      // Map each DTO, skipping any that are missing required fields
      return dtos
        .filter(dto => {
          if (!dto.contestId) {
            console.warn('[ContestRepository] Skipping entry with missing contestId:', dto);
            return false;
          }
          return true;
        })
        .map(this.mapToContestEntry);
    } catch (error) {
      console.error('[ContestRepository] Error in getMyContests:', error);
      throw error;
    }
  }

  // ==================== Admin Methods ====================

  async createContest(request: CreateContestRequestDTO): Promise<Contest> {
    const dto = await this.apiClient.post<ContestResponseDTO>(
      API_ENDPOINTS.CONTESTS.CREATE,
      request
    );
    return this.mapToContest(dto);
  }

  async forceOpenRegistration(contestId: string): Promise<void> {
    await this.apiClient.post<void>(
      API_ENDPOINTS.CONTESTS.FORCE_OPEN_REGISTRATION(contestId)
    );
  }

  async forceStartContest(contestId: string): Promise<void> {
    await this.apiClient.post<void>(
      API_ENDPOINTS.CONTESTS.FORCE_START(contestId)
    );
  }

  async forceEndContest(contestId: string): Promise<void> {
    await this.apiClient.post<void>(
      API_ENDPOINTS.CONTESTS.FORCE_END(contestId)
    );
  }

  async cancelContest(contestId: string): Promise<void> {
    await this.apiClient.patch<void>(
      API_ENDPOINTS.CONTESTS.CANCEL(contestId)
    );
  }

  async deleteContest(contestId: string): Promise<void> {
    await this.apiClient.delete<void>(
      API_ENDPOINTS.CONTESTS.DELETE(contestId)
    );
  }

  // ==================== Mapper Methods ====================

  // Backend stores all times in UTC but sends as LocalDateTime (no Z suffix).
  // Append 'Z' so JS Date correctly interprets them as UTC.
  private parseUtcDate = (isoStr: string): Date => {
    if (!isoStr) return new Date();
    return isoStr.endsWith('Z') ? new Date(isoStr) : new Date(isoStr + 'Z');
  };

  private mapToContest = (dto: ContestResponseDTO): Contest => {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      startTime: this.parseUtcDate(dto.contestStart),
      endTime: this.parseUtcDate(dto.contestEnd),
      registrationEndTime: this.parseUtcDate(dto.registrationEnd),
      status: dto.status as ContestStatus,
      type: dto.type as ContestType,
      maxParticipants: dto.maxParticipants,
      currentParticipants: dto.currentParticipants,
      entryFee: dto.entryFee,
      prizePool: dto.prizePool,
      createdAt: this.parseUtcDate(dto.registrationStart),
    };
  };

  private mapToContestStock = (dto: StockDetailDTO): ContestStock => {
    return {
      symbol: dto.symbol,
      instrumentToken: dto.symbol, // Backend doesn't return instrument token in StockDetail
      openingPrice: dto.entryPrice,
      currentPrice: dto.currentPrice,
      closingPrice: undefined, // Not available in StockDetail
      percentageChange: dto.changePercent,
    };
  };

  private mapToContestEntry = (dto: TeamResponseDTO): ContestEntry => {
    const stocks = (dto.stocks || []).map(this.mapToContestStock);

    // Use totalReturn from backend if available, otherwise calculate from stocks
    const totalReturnPercentage = dto.totalReturn !== undefined
      ? dto.totalReturn
      : stocks.length > 0
        ? stocks.reduce((sum, stock) => sum + (stock.percentageChange || 0), 0) / stocks.length
        : 0;

    return {
      id: `${dto.contestId}-${dto.userId}`, // Composite ID
      contestId: dto.contestId,
      userId: dto.userId,
      teamName: dto.teamName,
      stocks,
      totalReturnPercentage,
      totalPoints: 0, // Backend doesn't use points system yet
      rank: dto.rank,
      submittedAt: new Date(), // Backend doesn't return submission time
    };
  };

  private mapPerformanceToContestEntry = (dto: MyPerformanceResponseDTO): ContestEntry => {
    const stocks = dto.stocks.map(this.mapToContestStock);

    return {
      id: `${dto.contestId}-${dto.userId}`,
      contestId: dto.contestId,
      userId: dto.userId,
      teamName: dto.teamName,
      stocks,
      totalReturnPercentage: dto.totalReturn,
      totalPoints: 0, // Backend doesn't use points system yet
      rank: dto.rank,
      submittedAt: new Date(), // Backend doesn't return submission time
    };
  };

  private mapToLeaderboardEntry = (dto: LeaderboardEntryDTO): LeaderboardEntry => {
    return {
      rank: dto.rank,
      userId: dto.userId,
      userName: dto.userName,
      teamName: dto.teamName,
      totalReturnPercentage: dto.totalReturn,
      totalPoints: 0, // Backend doesn't use points system yet
    };
  };
}
