/**
 * Contest WebSocket Message Types
 * Defines the message structures for contest-specific STOMP communication
 *
 * Topics:
 * - /topic/contest/{contestId}/leaderboard — broadcast to all viewers
 * - /topic/contest/{contestId}/performance/{userId} — per-user performance
 */

/**
 * Leaderboard broadcast message from server
 */
export interface WsLeaderboardMessage {
  contestId: string;
  contestName: string;
  status: string; // "LIVE" or "COMPLETED"
  timestamp: number; // epoch millis
  entries: WsLeaderboardEntry[];
}

/**
 * Single leaderboard entry in broadcast
 */
export interface WsLeaderboardEntry {
  rank: number;
  previousRank: number;
  teamName: string;
  totalReturn: number;
  userId: string;
  userName: string;
}

/**
 * Per-user performance message from server
 */
export interface WsPerformanceMessage {
  contestId: string;
  userId: string;
  teamName: string;
  rank: number;
  previousRank: number;
  totalParticipants: number;
  totalReturn: number;
  timestamp: number; // epoch millis
  stocks: WsStockDetail[];
}

/**
 * Stock detail within performance message
 */
export interface WsStockDetail {
  symbol: string;
  companyName: string;
  entryPrice: number;
  currentPrice: number;
  changePercent: number;
  position: number;
}
