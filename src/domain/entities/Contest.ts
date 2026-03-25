/**
 * Domain Entities: Contest
 * Pure business objects for contest feature without framework dependencies
 */

/**
 * Contest status enum matching backend
 */
export enum ContestStatus {
  UPCOMING = 'UPCOMING',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Contest type enum
 */
export enum ContestType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Main contest entity
 */
export interface Contest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly registrationEndTime: Date;
  readonly status: ContestStatus;
  readonly type: ContestType;
  readonly maxParticipants: number;
  readonly currentParticipants: number;
  readonly entryFee: number;
  readonly prizePool: number;
  readonly createdAt: Date;
}

/**
 * Stock within a contest entry
 */
export interface ContestStock {
  readonly symbol: string;
  readonly instrumentToken: string;
  readonly openingPrice: number;
  readonly currentPrice?: number;
  readonly closingPrice?: number;
  readonly percentageChange?: number;
}

/**
 * User's entry in a contest
 */
export interface ContestEntry {
  readonly id: string;
  readonly contestId: string;
  readonly userId: string;
  readonly teamName: string;
  readonly stocks: ContestStock[];
  readonly totalReturnPercentage: number;
  readonly totalPoints: number;
  readonly rank?: number;
  readonly submittedAt: Date;
}

/**
 * Leaderboard entry for contest rankings
 */
export interface LeaderboardEntry {
  readonly rank: number;
  readonly userId: string;
  readonly userName: string;
  readonly teamName: string;
  readonly totalReturnPercentage: number;
  readonly totalPoints: number;
}
