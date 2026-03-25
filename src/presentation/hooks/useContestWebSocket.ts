/**
 * React Hook: useContestWebSocket
 * Provides real-time contest leaderboard and performance data via WebSocket
 *
 * Features:
 * - Connects to STOMP topics for leaderboard and per-user performance
 * - Tracks rank changes (previousRank) for animations
 * - Detects contest completion via "COMPLETED" status
 * - Falls back to REST polling if WebSocket fails to connect
 * - AppState handling (pause when backgrounded)
 * - Clean lifecycle management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ContestWebSocketClient } from '@/src/data/websocket/ContestWebSocketClient';
import {
  WsLeaderboardMessage,
  WsLeaderboardEntry,
  WsPerformanceMessage,
} from '@/src/data/websocket/ContestWebSocketTypes';
import type { ContestEntry, ContestStock, LeaderboardEntry } from '@/src/domain/entities/Contest';

/**
 * Hook options
 */
export interface UseContestWebSocketOptions {
  /** Enable the WebSocket connection (default: true) */
  enabled?: boolean;
  /** Timeout before falling back to REST (ms, default: 5000) */
  fallbackTimeout?: number;
  /** Callback when contest status changes to COMPLETED */
  onContestEnd?: () => void;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Hook return type
 */
export interface UseContestWebSocketResult {
  /** Latest leaderboard entries (mapped to domain type) */
  leaderboard: LeaderboardEntry[] | null;
  /** Latest user performance (mapped to domain type) */
  myPerformance: ContestEntry | null;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Whether WebSocket failed and we should fall back to polling */
  shouldFallback: boolean;
  /** Rank change: positive = improved, negative = dropped, 0 = no change */
  rankChange: number;
  /** Timestamp of last WebSocket update */
  lastUpdate: Date | null;
}

/**
 * Map WebSocket leaderboard entries to domain LeaderboardEntry[]
 */
function mapWsLeaderboard(entries: WsLeaderboardEntry[]): LeaderboardEntry[] {
  return entries.map((e) => ({
    rank: e.rank,
    userId: e.userId,
    userName: e.userName,
    teamName: e.teamName,
    totalReturnPercentage: e.totalReturn,
    totalPoints: 0, // Backend doesn't send points via WebSocket
  }));
}

/**
 * Map WebSocket performance to domain ContestEntry
 */
function mapWsPerformance(msg: WsPerformanceMessage): ContestEntry {
  const stocks: ContestStock[] = msg.stocks.map((s) => ({
    symbol: s.symbol,
    instrumentToken: '',
    openingPrice: s.entryPrice,
    currentPrice: s.currentPrice,
    percentageChange: s.changePercent,
  }));

  return {
    id: '',
    contestId: msg.contestId,
    userId: msg.userId,
    teamName: msg.teamName,
    stocks,
    totalReturnPercentage: msg.totalReturn,
    totalPoints: 0, // Backend doesn't send points via WebSocket
    rank: msg.rank,
    submittedAt: new Date(),
  };
}

/**
 * useContestWebSocket - Real-time contest data hook
 */
export function useContestWebSocket(
  contestId: string | null,
  userId: string | null,
  options: UseContestWebSocketOptions = {}
): UseContestWebSocketResult {
  const {
    enabled = true,
    fallbackTimeout = 5000,
    onContestEnd,
    debug = false,
  } = options;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [myPerformance, setMyPerformance] = useState<ContestEntry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [shouldFallback, setShouldFallback] = useState(false);
  const [rankChange, setRankChange] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const clientRef = useRef<ContestWebSocketClient | null>(null);
  const isMountedRef = useRef(true);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const previousRankRef = useRef<number | null>(null);
  const onContestEndRef = useRef(onContestEnd);
  onContestEndRef.current = onContestEnd;

  const log = useCallback(
    (msg: string) => {
      if (debug) console.log(`[useContestWS] ${msg}`);
    },
    [debug]
  );

  // Clean up subscriptions
  const cleanupSubscriptions = useCallback(() => {
    unsubscribersRef.current.forEach((unsub) => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    unsubscribersRef.current = [];
  }, []);

  // Set up subscriptions after connection
  const setupSubscriptions = useCallback(() => {
    const client = clientRef.current;
    if (!client || !client.isConnected() || !contestId) return;

    cleanupSubscriptions();

    // Subscribe to leaderboard
    const unsubLeaderboard = client.subscribeToLeaderboard(contestId, (msg: WsLeaderboardMessage) => {
      if (!isMountedRef.current) return;

      // Check for contest completion
      if (msg.status === 'COMPLETED') {
        log('Contest completed via WebSocket');
        onContestEndRef.current?.();
        return;
      }

      const mapped = mapWsLeaderboard(msg.entries);
      setLeaderboard(mapped);
      setLastUpdate(new Date(msg.timestamp));

      // Track rank change for current user
      if (userId) {
        const myEntry = msg.entries.find((e) => e.userId === userId);
        if (myEntry && myEntry.previousRank > 0) {
          const change = myEntry.previousRank - myEntry.rank; // positive = improved
          setRankChange(change);
          previousRankRef.current = myEntry.rank;
        }
      }

      log(`Leaderboard update: ${mapped.length} entries`);
    });
    unsubscribersRef.current.push(unsubLeaderboard);

    // Subscribe to user performance if userId available
    if (userId) {
      const unsubPerformance = client.subscribeToPerformance(contestId, userId, (msg: WsPerformanceMessage) => {
        if (!isMountedRef.current) return;

        const mapped = mapWsPerformance(msg);
        setMyPerformance(mapped);
        setLastUpdate(new Date(msg.timestamp));

        // Track rank change
        if (msg.previousRank > 0) {
          const change = msg.previousRank - msg.rank;
          setRankChange(change);
        }

        log(`Performance update: rank #${msg.rank}, return ${msg.totalReturn.toFixed(2)}%`);
      });
      unsubscribersRef.current.push(unsubPerformance);
    }

    // Cancel fallback timer since we connected successfully
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setShouldFallback(false);
  }, [contestId, userId, cleanupSubscriptions, log]);

  // Main connection effect
  useEffect(() => {
    if (!enabled || !contestId) {
      return;
    }

    isMountedRef.current = true;

    const client = new ContestWebSocketClient({ debug });
    clientRef.current = client;

    // Listen for connection state
    const unsubConnection = client.onConnection((connected) => {
      if (!isMountedRef.current) return;
      setIsConnected(connected);

      if (connected) {
        log('Connected — setting up subscriptions');
        setupSubscriptions();
      }
    });

    // Listen for errors
    const unsubError = client.onError((error) => {
      log(`Error: ${error.message}`);
    });

    // Start fallback timer
    fallbackTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (!client.isConnected()) {
        log('Fallback timeout — switching to REST polling');
        setShouldFallback(true);
      }
    }, fallbackTimeout);

    // Connect
    client.connect().catch((err) => {
      log(`Connection failed: ${err.message}`);
      if (isMountedRef.current) {
        setShouldFallback(true);
      }
    });

    // Cleanup
    return () => {
      isMountedRef.current = false;
      cleanupSubscriptions();
      unsubConnection();
      unsubError();
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      client.disconnect();
      clientRef.current = null;
    };
  }, [enabled, contestId, debug, fallbackTimeout, setupSubscriptions, cleanupSubscriptions, log]);

  // Handle AppState changes
  useEffect(() => {
    if (!enabled) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App resumed — reconnect if needed
        const client = clientRef.current;
        if (client && !client.isConnected() && contestId) {
          log('App resumed — reconnecting');
          client.connect().catch((err) => {
            log(`Reconnect failed: ${err.message}`);
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [enabled, contestId, log]);

  return {
    leaderboard,
    myPerformance,
    isConnected,
    shouldFallback,
    rankChange,
    lastUpdate,
  };
}

export default useContestWebSocket;
