/**
 * Domain Repository Interface: Contest
 * Defines contract for contest operations (Dependency Inversion Principle)
 */

import { Contest, ContestEntry, ContestStatus, LeaderboardEntry } from '../entities/Contest';

export interface ContestRepository {
  /**
   * Get all contests with optional status filter
   */
  listContests(status?: ContestStatus): Promise<Contest[]>;

  /**
   * Get single contest by ID
   */
  getContestById(contestId: string): Promise<Contest>;

  /**
   * Get upcoming contests (UPCOMING or REGISTRATION_OPEN)
   */
  getUpcomingContests(): Promise<Contest[]>;

  /**
   * Get live contests (LIVE status)
   */
  getLiveContests(): Promise<Contest[]>;

  /**
   * Get completed contests (COMPLETED status)
   */
  getCompletedContests(): Promise<Contest[]>;

  /**
   * Join a contest with team name
   */
  joinContest(contestId: string, teamName: string): Promise<void>;

  /**
   * Submit team with 5 stock symbols
   */
  submitTeam(contestId: string, stockSymbols: string[]): Promise<void>;

  /**
   * Get user's team for a contest
   */
  getMyTeam(contestId: string): Promise<ContestEntry>;

  /**
   * Withdraw from a contest
   */
  withdrawFromContest(contestId: string): Promise<void>;

  /**
   * Get contest leaderboard
   */
  getLeaderboard(contestId: string): Promise<LeaderboardEntry[]>;

  /**
   * Get user's performance in a contest
   */
  getMyPerformance(contestId: string): Promise<ContestEntry>;

  /**
   * Get all user's contest entries
   */
  getMyContests(): Promise<ContestEntry[]>;
}
