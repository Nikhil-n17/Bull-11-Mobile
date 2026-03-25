/**
 * Leaderboard Screen
 * Full-screen live leaderboard for contest participants
 * Features: Real-time WebSocket updates, REST fallback, user rank highlighting, top 3 medals
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
  AppStateStatus,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { LeaderboardEntry, ContestEntry, Contest, ContestStatus } from '@/src/domain/entities/Contest';
import { theme } from '@/src/core/theme';
import { useContestWebSocket } from '@/src/presentation/hooks/useContestWebSocket';

const REFRESH_INTERVAL = 10000; // 10 seconds for live contests
const ITEMS_PER_PAGE = 50;

export default function LeaderboardScreen() {
  const router = useRouter();
  const { id: contestId } = useLocalSearchParams();
  const { isAuthenticated, user, updateActivity } = useAuth();

  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPerformance, setMyPerformance] = useState<ContestEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isScrolling, setIsScrolling] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const flatListRef = useRef<FlatList>(null);

  // Calculate if contest is LIVE
  const isContestLive = contest?.status === ContestStatus.LIVE;

  // WebSocket for real-time leaderboard
  const contestIdStr = typeof contestId === 'string' ? contestId : null;
  const {
    leaderboard: wsLeaderboard,
    myPerformance: wsPerformance,
    isConnected: wsConnected,
    shouldFallback,
    lastUpdate: wsLastUpdate,
  } = useContestWebSocket(
    isContestLive ? contestIdStr : null,
    isContestLive ? (user?.id ?? null) : null,
    {
      enabled: isContestLive,
      onContestEnd: () => {
        // Contest completed — reload via REST for final results
        loadData(true);
      },
    }
  );

  // Apply WebSocket leaderboard data
  useEffect(() => {
    if (wsLeaderboard && wsConnected) {
      setLeaderboard(wsLeaderboard);
      if (wsLastUpdate) setLastUpdated(wsLastUpdate);
    }
  }, [wsLeaderboard, wsConnected, wsLastUpdate]);

  // Apply WebSocket performance data
  useEffect(() => {
    if (wsPerformance && wsConnected) {
      setMyPerformance(wsPerformance);
    }
  }, [wsPerformance, wsConnected]);

  // Load initial data
  const loadData = useCallback(async (silent: boolean = false) => {
    if (!contestId || typeof contestId !== 'string') {
      setError('Invalid contest ID');
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      } else {
        setUpdating(true);
      }
      setError(null);

      // Parallel fetch
      const [contestData, leaderboardData, performanceData] = await Promise.all([
        container.getContestUseCase.execute({ contestId }),
        container.getLeaderboardUseCase.execute({ contestId }),
        container.getMyPerformanceUseCase.execute({ contestId }).catch(() => null),
      ]);

      setContest(contestData);
      setLeaderboard(leaderboardData);
      setMyPerformance(performanceData);
      setLastUpdated(new Date());
      await updateActivity();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setUpdating(false);
    }
  }, [contestId, updateActivity]);

  // Manual refresh (pull-to-refresh)
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Fallback: REST polling only when WebSocket is not connected for live contests
  useEffect(() => {
    if (!isContestLive || (wsConnected && !shouldFallback)) {
      return;
    }

    // Start auto-refresh as fallback
    refreshTimerRef.current = setInterval(() => {
      // Don't refresh if user is scrolling
      if (!isScrolling) {
        loadData(true); // Silent refresh
      }
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [isContestLive, isScrolling, loadData, wsConnected, shouldFallback]);

  // Handle app state changes (pause when backgrounded)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh immediately
        loadData(true);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Scroll to user's position
  const scrollToMyRank = useCallback(() => {
    if (!myPerformance?.rank || !flatListRef.current) {
      return;
    }

    const index = leaderboard.findIndex((entry) => entry.userId === user?.id);
    if (index !== -1) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [myPerformance, leaderboard, user]);

  // Get relative time string
  const getRelativeTime = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Get rank medal
  const getRankMedal = (rank: number): string | null => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>
            {contest?.name || 'Leaderboard'}
          </Text>
          <View style={styles.headerMeta}>
            {isContestLive && (
              <View style={styles.liveBadge}>
                <View style={[styles.liveDot, { backgroundColor: wsConnected ? '#4ade80' : '#fbbf24' }]} />
                <Text style={styles.liveText}>{wsConnected ? 'LIVE' : 'LIVE (polling)'}</Text>
              </View>
            )}
            <Text style={styles.lastUpdatedText}>{getRelativeTime(lastUpdated)}</Text>
            {updating && <ActivityIndicator size="small" color="#ffffff" style={styles.updateLoader} />}
          </View>
        </View>
      </View>

      {/* User's Position Card */}
      {myPerformance && (
        <View style={styles.myRankCard}>
          <View style={styles.myRankHeader}>
            <Text style={styles.myRankLabel}>YOUR RANK</Text>
            <TouchableOpacity onPress={scrollToMyRank} style={styles.jumpButton}>
              <Text style={styles.jumpButtonText}>Jump to my position →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.myRankContent}>
            <View style={styles.myRankMain}>
              <Text style={styles.myRankNumber}>
                #{myPerformance.rank || '—'}
              </Text>
              <Text style={styles.myRankTotal}>/ {leaderboard.length}</Text>
            </View>
            <View style={styles.myRankStats}>
              <View style={styles.myRankStat}>
                <Text style={styles.myRankStatLabel}>Returns</Text>
                <Text
                  style={[
                    styles.myRankStatValue,
                    { color: (myPerformance.totalReturnPercentage ?? 0) >= 0 ? theme.colors.success.main : theme.colors.error.main },
                  ]}
                >
                  {(myPerformance.totalReturnPercentage ?? 0) >= 0 ? '+' : ''}
                  {(myPerformance.totalReturnPercentage ?? 0).toFixed(2)}%
                </Text>
              </View>
              <View style={styles.myRankStat}>
                <Text style={styles.myRankStatLabel}>Points</Text>
                <Text style={styles.myRankStatValue}>{(myPerformance.totalPoints ?? 0).toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Contest Progress Bar (LIVE) */}
      {isContestLive && contest && (() => {
        const now = new Date().getTime();
        const start = new Date(contest.startTime).getTime();
        const end = new Date(contest.endTime).getTime();
        const totalDuration = end - start;
        const elapsed = now - start;
        const remaining = end - now;

        const effectiveProgress = totalDuration > 0
          ? Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
          : 0;

        const remainingMs = Math.max(remaining, 0);
        const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const remSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        const timeLeftStr = remainingMs <= 0
          ? 'Ended'
          : remHours > 0
            ? `${remHours}h ${remMinutes}m left`
            : remMinutes > 0
              ? `${remMinutes}m ${remSeconds}s left`
              : `${remSeconds}s left`;

        const formatTimeIST = (date: Date) => {
          return new Date(date).toLocaleString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
          });
        };

        return (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Contest Progress</Text>
              <Text style={styles.progressPercent}>{timeLeftStr}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${effectiveProgress}%` }]} />
            </View>
            <View style={styles.progressTimes}>
              <Text style={styles.progressTimeText}>{formatTimeIST(contest.startTime)}</Text>
              <Text style={styles.progressTimeText}>{formatTimeIST(contest.endTime)}</Text>
            </View>
          </View>
        );
      })()}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colRank]}>RANK</Text>
        <Text style={[styles.tableHeaderText, styles.colName]}>NAME</Text>
        <Text style={[styles.tableHeaderText, styles.colTeam]}>TEAM</Text>
        <Text style={[styles.tableHeaderText, styles.colReturns]}>RETURNS</Text>
        <Text style={[styles.tableHeaderText, styles.colPoints]}>POINTS</Text>
      </View>
    </View>
  );

  // Render leaderboard row
  const renderLeaderboardRow = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.userId === user?.id;
    const medal = getRankMedal(item.rank);
    const isTopThree = item.rank <= 3;

    return (
      <View
        style={[
          styles.leaderboardRow,
          isCurrentUser && styles.leaderboardRowHighlight,
          isTopThree && styles.leaderboardRowTopThree,
        ]}
      >
        <View style={[styles.col, styles.colRank]}>
          {medal ? (
            <Text style={styles.medalText}>{medal}</Text>
          ) : (
            <Text style={[styles.rankText, isCurrentUser && styles.rankTextHighlight]}>
              {item.rank}
            </Text>
          )}
        </View>
        <Text
          style={[styles.col, styles.colName, styles.nameText, isCurrentUser && styles.nameTextHighlight]}
          numberOfLines={1}
        >
          {item.userName}
          {isCurrentUser && ' (You)'}
        </Text>
        <Text style={[styles.col, styles.colTeam, styles.teamText]} numberOfLines={1}>
          {item.teamName}
        </Text>
        <Text
          style={[
            styles.col,
            styles.colReturns,
            styles.returnsText,
            { color: (item.totalReturnPercentage ?? 0) >= 0 ? theme.colors.success.main : theme.colors.error.main },
          ]}
        >
          {(item.totalReturnPercentage ?? 0) >= 0 ? '+' : ''}
          {(item.totalReturnPercentage ?? 0).toFixed(2)}%
        </Text>
        <Text style={[styles.col, styles.colPoints, styles.pointsText]}>
          {(item.totalPoints ?? 0).toFixed(0)}
        </Text>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Leaderboard</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="theme.colors.primary.main" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Leaderboard</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData(false)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No participants yet</Text>
          <Text style={styles.emptySubtext}>Check back when the contest starts</Text>
        </View>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={leaderboard}
        renderItem={renderLeaderboardRow}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="theme.colors.primary.main"
            colors={['theme.colors.primary.main']}
          />
        }
        onScrollBeginDrag={() => setIsScrolling(true)}
        onScrollEndDrag={() => setIsScrolling(false)}
        onMomentumScrollBegin={() => setIsScrolling(true)}
        onMomentumScrollEnd={() => setIsScrolling(false)}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    backgroundColor: theme.colors.primary.main,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  updateLoader: {
    marginLeft: 4,
  },
  myRankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  myRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  myRankLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  jumpButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  jumpButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  myRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRankMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  myRankNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  myRankTotal: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  myRankStats: {
    flexDirection: 'row',
    gap: 20,
  },
  myRankStat: {
    alignItems: 'flex-end',
  },
  myRankStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  myRankStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressTimeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  colRank: {
    width: 50,
  },
  colName: {
    flex: 2,
  },
  colTeam: {
    flex: 1.5,
  },
  colReturns: {
    width: 70,
    textAlign: 'right',
  },
  colPoints: {
    width: 60,
    textAlign: 'right',
  },
  listContent: {
    paddingBottom: 16,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  leaderboardRowHighlight: {
    backgroundColor: 'rgba(0, 110, 28, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: 'theme.colors.primary.main',
  },
  leaderboardRowTopThree: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  col: {
    fontSize: 14,
  },
  medalText: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  rankTextHighlight: {
    color: 'theme.colors.primary.main',
    fontWeight: '700',
  },
  nameText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  nameTextHighlight: {
    fontWeight: '700',
    color: 'theme.colors.primary.main',
  },
  teamText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  returnsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error.main,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'theme.colors.primary.main',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.hint,
    textAlign: 'center',
  },
});
