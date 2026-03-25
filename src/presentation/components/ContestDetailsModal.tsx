/**
 * Contest Details Modal Component
 * Shows contest details, user's team performance, and leaderboard preview
 * Styled to match GameDetailsModal (React Native Modal + StyleSheet)
 *
 * Uses WebSocket for real-time updates during LIVE contests,
 * falls back to REST polling if WebSocket fails.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { container } from '@/src/core/di/container';
import type { ContestEntry, LeaderboardEntry, Contest } from '@/src/domain/entities/Contest';
import { ContestStatus } from '@/src/domain/entities/Contest';
import { StockLogo } from './StockLogo';
import { InsightBanner } from './InsightBanner';
import type { GameInsight } from '@/src/core/utils/gameInsights';
import { useContestWebSocket } from '@/src/presentation/hooks/useContestWebSocket';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { theme } from '@/src/core/theme';

interface ContestDetailsModalProps {
  contestId: string;
  entryId: string;
  visible: boolean;
  onClose: () => void;
  onViewFullLeaderboard?: () => void;
}

export const ContestDetailsModal: React.FC<ContestDetailsModalProps> = ({
  contestId,
  entryId,
  visible,
  onClose,
  onViewFullLeaderboard,
}) => {
  const { user } = useAuth();
  const [myPerformance, setMyPerformance] = useState<ContestEntry | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Determine if we should enable WebSocket (only for LIVE contests when modal is visible)
  const isLive = contest?.status === ContestStatus.LIVE;
  const wsEnabled = visible && !!contestId && isLive;

  // WebSocket hook for real-time updates
  const {
    leaderboard: wsLeaderboard,
    myPerformance: wsPerformance,
    isConnected: wsConnected,
    shouldFallback,
  } = useContestWebSocket(
    wsEnabled ? contestId : null,
    wsEnabled ? (user?.id ?? null) : null,
    {
      enabled: wsEnabled,
      onContestEnd: () => {
        loadContestData(true);
      },
    }
  );

  // Apply WebSocket data when it arrives
  useEffect(() => {
    if (wsPerformance && wsConnected) {
      setMyPerformance(wsPerformance);
    }
  }, [wsPerformance, wsConnected]);

  useEffect(() => {
    if (wsLeaderboard && wsConnected) {
      setLeaderboard(wsLeaderboard.slice(0, 5));
    }
  }, [wsLeaderboard, wsConnected]);

  useEffect(() => {
    if (visible && contestId) {
      fadeAnim.setValue(0);
      setLoading(true);
      setError(null);
      loadContestData();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, contestId]);

  // Fallback: REST polling when WebSocket not connected for LIVE contests
  useEffect(() => {
    if (!visible || !contest) return;

    if (contest.status === ContestStatus.LIVE && (!wsConnected || shouldFallback)) {
      const interval = setInterval(() => {
        loadContestData(true);
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [visible, contest, wsConnected, shouldFallback]);

  // Fade in content after data loads
  useEffect(() => {
    if (visible && !loading && !error && myPerformance) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, loading, error, myPerformance]);

  const loadContestData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const [performanceData, leaderboardData, contestData] = await Promise.all([
        container.getMyPerformanceUseCase.execute({ contestId }),
        container.getLeaderboardUseCase.execute({ contestId }),
        container.getContestUseCase.execute({ contestId }),
      ]);

      setMyPerformance(performanceData);
      setLeaderboard(leaderboardData.slice(0, 5));
      setContest(contestData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contest details';
      setError(errorMessage);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const calculateTimeRemaining = (): string => {
    if (!contest) return 'N/A';
    const now = new Date();
    const end = new Date(contest.endTime);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 'Ended';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  const calculateDuration = (): string => {
    if (!contest) return 'N/A';
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  // Generate insight based on performance
  const generateContestInsight = (): GameInsight | null => {
    if (!myPerformance || !contest) return null;

    const totalReturn = myPerformance.totalReturnPercentage ?? 0;
    const rank = myPerformance.rank || 999;
    const totalParticipants = contest.currentParticipants;
    const topPercentile = (rank / totalParticipants) * 100;

    if (topPercentile <= 10 && totalReturn > 0) {
      return { message: `Top ${Math.round(topPercentile)}%! You're dominating!`, type: 'success', emoji: '🔥' };
    }
    if (topPercentile <= 25 && totalReturn > 0) {
      return { message: 'Strong position! Keep it up!', type: 'success', emoji: '💪' };
    }
    if (totalReturn > 3 && topPercentile > 50) {
      return { message: 'Good gains, but others are ahead', type: 'info', emoji: '📊' };
    }
    if (totalReturn < -3) {
      return { message: 'Time to reassess strategy', type: 'danger', emoji: '📉' };
    }
    if (topPercentile > 40 && topPercentile < 60) {
      return { message: 'Right in the middle - push harder!', type: 'warning', emoji: '⚡' };
    }
    return null;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading contest details...</Text>
        </View>
      );
    }

    if (error || !myPerformance || !contest) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load contest details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadContestData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const insight = generateContestInsight();
    const contestIsLive = contest.status === ContestStatus.LIVE;
    const isCompleted = contest.status === ContestStatus.COMPLETED;
    const totalReturn = myPerformance.totalReturnPercentage ?? 0;
    const isProfit = totalReturn >= 0;

    // Prepare stocks with calculated prices/changes (no ranking sort — keep original order)
    const stocksData = myPerformance.stocks.map((stock) => {
      const currentPrice = contestIsLive
        ? (stock.currentPrice || stock.openingPrice || 0)
        : (stock.closingPrice || stock.openingPrice || 0);
      const change = (stock.percentageChange != null)
        ? stock.percentageChange
        : (stock.openingPrice > 0)
          ? ((currentPrice - stock.openingPrice) / stock.openingPrice) * 100
          : 0;
      return { stock, currentPrice, change };
    });

    const backgroundGradient = isProfit
      ? 'rgba(76, 175, 80, 0.05)'
      : 'rgba(244, 67, 54, 0.05)';

    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Insight Banner */}
          {insight && (
            <View style={styles.insightSection}>
              <InsightBanner insight={insight} />
            </View>
          )}

          {/* Hero Section — Rank + Return */}
          <View style={[styles.heroSection, { backgroundColor: backgroundGradient }]}>
            <View style={styles.heroScoreContainer}>
              <Text style={styles.heroLabel}>YOUR RANK</Text>
              <View style={styles.rankRow}>
                <Text style={styles.rankNumber}>#{myPerformance.rank || '—'}</Text>
                <Text style={styles.rankTotal}>/ {contest.currentParticipants}</Text>
              </View>
            </View>

            <View style={styles.heroScoreContainer}>
              <Text style={[
                styles.heroScore,
                isProfit ? styles.profit : styles.loss,
              ]}>
                {isProfit ? '+' : ''}{totalReturn.toFixed(2)}%
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>Points</Text>
                <Text style={styles.quickStatValue}>
                  {(myPerformance.totalPoints ?? 0).toFixed(0)}
                </Text>
              </View>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>Team</Text>
                <Text style={styles.quickStatValue} numberOfLines={1}>
                  {myPerformance.teamName}
                </Text>
              </View>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>
                  {contestIsLive ? 'Time Left' : 'Duration'}
                </Text>
                <Text style={styles.quickStatValue}>
                  {contestIsLive ? calculateTimeRemaining() : calculateDuration()}
                </Text>
              </View>
            </View>
          </View>

          {/* Contest Progress Bar (for LIVE contests) */}
          {contestIsLive && contest && (() => {
            const now = new Date().getTime();
            const start = new Date(contest.startTime).getTime();
            const end = new Date(contest.endTime).getTime();
            const totalDuration = end - start;
            const elapsed = now - start;
            const remaining = end - now;

            // If contest was force-started early, start may be in the future
            // Use actual elapsed = max(0, now - start), and if we're before start, base progress on remaining time
            const effectiveProgress = totalDuration > 0
              ? Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
              : 0;

            // Time remaining display
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
              <View style={styles.progressSection}>
                <View style={styles.progressCard}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Contest Progress</Text>
                    <Text style={[styles.progressPercent, { color: theme.colors.primary.main }]}>
                      {timeLeftStr}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${effectiveProgress}%`, backgroundColor: theme.colors.primary.main },
                      ]}
                    />
                  </View>
                  <View style={styles.progressTimes}>
                    <Text style={styles.progressTimeText}>{formatTimeIST(contest.startTime)}</Text>
                    <Text style={styles.progressTimeText}>{formatTimeIST(contest.endTime)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Your Team — single card, table-style like D11 scorecard */}
          <View style={styles.stocksSection}>
            <Text style={styles.sectionTitle}>Your Team</Text>

            <View style={styles.teamCard}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Stock</Text>
                <Text style={[styles.tableHeaderText, styles.tableHeaderRight]}>Open</Text>
                <Text style={[styles.tableHeaderText, styles.tableHeaderRight]}>
                  {contestIsLive ? 'Current' : 'Close'}
                </Text>
                <Text style={[styles.tableHeaderText, styles.tableHeaderRight]}>Change</Text>
              </View>

              {/* Stock Rows */}
              <View style={styles.stockRowsContainer}>
                {stocksData.map((item, index) => {
                  const { stock, currentPrice, change } = item;
                  const stockProfit = change >= 0;
                  const priceChange = currentPrice - stock.openingPrice;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.stockRow,
                        stockProfit ? styles.stockRowGreen : styles.stockRowRed,
                      ]}
                    >
                    {/* Stock name + logo + % */}
                    <View style={styles.stockNameCol}>
                      <StockLogo symbol={stock.symbol} size={28} />
                      <View style={styles.stockNameText}>
                        <Text style={styles.stockSymbol} numberOfLines={1}>{stock.symbol}</Text>
                        <Text style={[
                          styles.stockPercent,
                          stockProfit ? styles.profit : styles.loss,
                        ]}>
                          {stockProfit ? '+' : ''}{change.toFixed(2)}%
                        </Text>
                      </View>
                    </View>

                    {/* Opening */}
                    <Text style={[styles.stockValue, styles.stockValueRight]}>
                      ₹{stock.openingPrice.toFixed(2)}
                    </Text>

                    {/* Current/Closing */}
                    <Text style={[styles.stockValue, styles.stockValueRight]}>
                      ₹{currentPrice.toFixed(2)}
                    </Text>

                    {/* Change */}
                    <Text style={[
                      styles.stockValue,
                      styles.stockValueRight,
                      stockProfit ? styles.profit : styles.loss,
                    ]}>
                      {priceChange >= 0 ? '+' : ''}₹{priceChange.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
              </View>
            </View>
          </View>

          {/* Contest Details Grid */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Contest Details</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Entry Fee</Text>
                <Text style={styles.summaryValue}>₹{contest.entryFee.toFixed(0)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Prize Pool</Text>
                <Text style={[styles.summaryValue, styles.profit]}>₹{contest.prizePool.toFixed(0)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Participants</Text>
                <Text style={styles.summaryValue}>{contest.currentParticipants}/{contest.maxParticipants}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Schedule</Text>
                <Text style={styles.summaryValueSmall}>
                  {formatDateTime(contest.startTime)} – {formatDateTime(contest.endTime)}
                </Text>
              </View>
            </View>
          </View>

          {/* Leaderboard */}
          <View style={styles.leaderboardSection}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              {contestIsLive && wsConnected && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            {leaderboard.map((entry) => {
              const isCurrentUser = entry.userId === myPerformance.userId;
              const medalEmoji = getMedalEmoji(entry.rank);
              const entryReturn = entry.totalReturnPercentage ?? 0;
              const entryProfit = entryReturn >= 0;

              return (
                <View
                  key={entry.rank}
                  style={[
                    styles.leaderboardRow,
                    isCurrentUser && styles.leaderboardRowHighlight,
                  ]}
                >
                  <View style={[
                    styles.leaderboardRankCircle,
                    isCurrentUser && styles.leaderboardRankCircleHighlight,
                  ]}>
                    <Text style={[
                      styles.leaderboardRankText,
                      isCurrentUser && styles.leaderboardRankTextHighlight,
                    ]}>
                      {entry.rank}
                    </Text>
                  </View>
                  {medalEmoji ? <Text style={styles.leaderboardMedal}>{medalEmoji}</Text> : null}
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName} numberOfLines={1}>
                      {isCurrentUser ? 'You' : entry.userName}
                    </Text>
                    <Text style={styles.leaderboardTeam} numberOfLines={1}>
                      {entry.teamName}
                    </Text>
                  </View>
                  <View style={styles.leaderboardStats}>
                    <Text style={[
                      styles.leaderboardReturn,
                      entryProfit ? styles.profit : styles.loss,
                    ]}>
                      {entryProfit ? '+' : ''}{entryReturn.toFixed(2)}%
                    </Text>
                    <Text style={styles.leaderboardPoints}>
                      {(entry.totalPoints ?? 0).toFixed(0)} pts
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Show user's position if not in top 5 */}
            {myPerformance.rank && myPerformance.rank > 5 && (
              <>
                <View style={styles.leaderboardDivider}>
                  <Text style={styles.leaderboardDividerText}>···</Text>
                </View>
                <View style={[styles.leaderboardRow, styles.leaderboardRowHighlight]}>
                  <View style={[styles.leaderboardRankCircle, styles.leaderboardRankCircleHighlight]}>
                    <Text style={[styles.leaderboardRankText, styles.leaderboardRankTextHighlight]}>
                      {myPerformance.rank}
                    </Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName}>You</Text>
                    <Text style={styles.leaderboardTeam} numberOfLines={1}>
                      {myPerformance.teamName}
                    </Text>
                  </View>
                  <View style={styles.leaderboardStats}>
                    <Text style={[
                      styles.leaderboardReturn,
                      isProfit ? styles.profit : styles.loss,
                    ]}>
                      {isProfit ? '+' : ''}{totalReturn.toFixed(2)}%
                    </Text>
                    <Text style={styles.leaderboardPoints}>
                      {(myPerformance.totalPoints ?? 0).toFixed(0)} pts
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* View Full Leaderboard Button */}
            {onViewFullLeaderboard && (
              <TouchableOpacity style={styles.viewLeaderboardButton} onPress={onViewFullLeaderboard}>
                <Text style={styles.viewLeaderboardText}>View Full Leaderboard</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Padding */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Compact header matching GameDetailsModal */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>
              {contest?.name || 'Contest Details'}
            </Text>
            {contest && (
              <View style={styles.headerSubRow}>
                <View style={[
                  styles.statusBadge,
                  contest.status === ContestStatus.LIVE ? styles.statusLive :
                  contest.status === ContestStatus.COMPLETED ? styles.statusCompleted :
                  styles.statusDefault,
                ]}>
                  <Text style={styles.statusText}>{contest.status}</Text>
                </View>
                {isLive && wsConnected && (
                  <View style={styles.headerLiveBadge}>
                    <View style={styles.headerLiveDot} />
                    <Text style={styles.headerLiveText}>LIVE</Text>
                  </View>
                )}
                <Text style={styles.headerDate} numberOfLines={1}>
                  {formatDateTime(contest.startTime)} - {formatDateTime(contest.endTime)}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary.main,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusLive: {
    backgroundColor: theme.colors.success.main,
  },
  statusCompleted: {
    backgroundColor: theme.colors.info.main,
  },
  statusDefault: {
    backgroundColor: theme.colors.neutral.gray500,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  headerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  headerLiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  headerDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error.main,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  insightSection: {
    padding: 20,
    paddingBottom: 0,
  },
  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 2,
  },
  heroScoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rankNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  rankTotal: {
    fontSize: 22,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  heroScore: {
    fontSize: 52,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStatBox: {
    flex: 1,
    backgroundColor: theme.colors.background.paper,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.shadow.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  // Contest Progress
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  progressCard: {
    backgroundColor: theme.colors.background.alt,
    borderRadius: 12,
    padding: 16,
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
    color: theme.colors.text.primary,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.neutral.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressTimeText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  // Stocks Section — table layout in single card
  stocksSection: {
    backgroundColor: theme.colors.background.paper,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  teamCard: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray200,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.background.alt,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray200,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderRight: {
    textAlign: 'right',
  },
  stockRowsContainer: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  stockRowGreen: {
    backgroundColor: '#f0faf1',
  },
  stockRowRed: {
    backgroundColor: '#fef5f5',
  },
  stockNameCol: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockNameText: {
    flexShrink: 1,
  },
  stockSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  stockPercent: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  stockValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  stockValueRight: {
    textAlign: 'right',
  },
  // Details Section
  detailsSection: {
    backgroundColor: theme.colors.background.paper,
    padding: 20,
    marginBottom: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  summaryValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  // Leaderboard Section
  leaderboardSection: {
    backgroundColor: theme.colors.background.paper,
    padding: 20,
    marginBottom: 2,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success.main,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success.main,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.alt,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  leaderboardRowHighlight: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderColor: theme.colors.primary.main,
    borderWidth: 2,
  },
  leaderboardRankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  leaderboardRankCircleHighlight: {
    backgroundColor: theme.colors.primary.main,
  },
  leaderboardRankText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.secondary,
  },
  leaderboardRankTextHighlight: {
    color: theme.colors.text.inverse,
  },
  leaderboardMedal: {
    fontSize: 16,
    marginRight: 8,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  leaderboardTeam: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },
  leaderboardStats: {
    alignItems: 'flex-end',
  },
  leaderboardReturn: {
    fontSize: 15,
    fontWeight: '700',
  },
  leaderboardPoints: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  leaderboardDivider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  leaderboardDividerText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    letterSpacing: 4,
  },
  viewLeaderboardButton: {
    backgroundColor: theme.colors.background.alt,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  viewLeaderboardText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary.main,
  },
  // Shared
  profit: {
    color: theme.colors.success.main,
  },
  loss: {
    color: theme.colors.error.main,
  },
});
