/**
 * Data Transfer Objects (DTOs)
 * API request/response types
 */

// Auth DTOs
export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface RegisterRequestDTO {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponseDTO {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponseDTO {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export interface UserDTO {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface UserProfileResponseDTO {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  totalGames: number;
}

// Game DTOs
export interface StartGameRequestDTO {
  stockSymbols: string[];
  exchange?: string; // Optional: defaults to NSE in backend
}

export interface GameStockDTO {
  symbol: string;
  openingPrice: number;
  closingPrice?: number;
  currentPrice?: number;
  percentageChange?: number;
}

export interface StockPerformerDTO {
  symbol: string;
  percentageChange: number;
}

export interface GameDTO {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  closedAt?: string;
  stocks: GameStockDTO[];
  openingPrice?: number;
  closingPrice?: number;
  totalReturnPercentage?: number;
  bestPerformer?: StockPerformerDTO;
  worstPerformer?: StockPerformerDTO;
  momentum?: string;
}

// Live Game Response (different field names from backend)
export interface GameLiveResponseDTO {
  gameId: string;
  startTime: string;
  endTime?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  totalReturn?: number;
  durationSeconds?: number;
  stocks: GameStockDTO[];
  bestPerformer?: StockPerformerDTO;
  worstPerformer?: StockPerformerDTO;
  momentum?: string;
  lastUpdated?: string;
}

// Game History DTOs
export interface GameSummaryDTO {
  gameId: string;
  startTime: string;
  endTime?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  stockCount: number;
  stockSymbols: string[];
  totalReturn?: number;
  durationSeconds?: number;
  stocks?: GameStockDTO[]; // Backend now includes full stock details for completed games
  bestPerformer?: StockPerformerDTO;
  worstPerformer?: StockPerformerDTO;
}

export interface GameHistoryResponseDTO {
  userId: string;
  totalGames: number;
  activeGames: number;
  completedGames: number;
  games: GameSummaryDTO[];
}

// Stock DTOs
export interface StockDTO {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  instrumentToken: number;
  lastPrice?: number;
}

// ==================== Contest DTOs ====================

// Request DTOs
export interface CreateContestRequestDTO {
  name: string;
  description?: string;
  registrationStart: string; // ISO date
  registrationEnd: string;
  contestStart: string;
  contestEnd: string;
  type: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  maxParticipants?: number;
  entryFee?: number;
  prizePool?: number;
  isPublic?: boolean;
}

export interface JoinContestRequestDTO {
  teamName: string;
}

export interface TeamRequestDTO {
  stocks: StockPickDTO[];
  exchange?: string;
}

export interface StockPickDTO {
  symbol: string;
  exchange?: string;
}

// Response DTOs
export interface ContestResponseDTO {
  id: string;
  name: string;
  description: string;
  registrationStart: string; // ISO date
  registrationEnd: string;
  contestStart: string;
  contestEnd: string;
  status: string; // ContestStatus enum as string
  type: string; // ContestType enum as string
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizePool: number;
  isPublic: boolean;
}

export interface TeamResponseDTO {
  contestId: string;
  userId: string;
  teamName: string;
  stocks: StockDetailDTO[];
  rank?: number;
  totalReturn?: number;
}

export interface StockDetailDTO {
  symbol: string;
  companyName: string;
  entryPrice: number;
  currentPrice: number;
  changePercent: number;
  position: number;
}

export interface LeaderboardResponseDTO {
  contestId: string;
  contestName: string;
  status: string;
  entries: LeaderboardEntryDTO[];
}

export interface LeaderboardEntryDTO {
  rank: number;
  teamName: string;
  totalReturn: number;
  userId: string;
  userName: string;
}

export interface MyPerformanceResponseDTO {
  contestId: string;
  userId: string;
  teamName: string;
  rank: number;
  totalParticipants: number;
  totalReturn: number;
  stocks: StockDetailDTO[];
}

export interface ContestResultResponseDTO {
  contestId: string;
  contestName: string;
  status: string;
  results: ResultEntryDTO[];
}

export interface ResultEntryDTO {
  rank: number;
  teamName: string;
  totalReturn: number;
  userId: string;
  userName: string;
  stocks: StockDetailDTO[];
}
