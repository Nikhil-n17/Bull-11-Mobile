/**
 * Game Details Modal Component
 * Gaming dashboard-style modal with performance visualizations
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
import type { Game } from '@/src/domain/entities/Game';
import { GameStatus } from '@/src/domain/entities/Game';
import { generateGameInsight } from '@/src/core/utils/gameInsights';
import { InsightBanner } from './InsightBanner';
import { StockComparisonBar } from './StockComparisonBar';
import { StockLogo } from './StockLogo';
import { theme } from '@/src/core/theme';
import { useMarketCountdown, COUNTDOWN_COLORS } from '@/src/presentation/hooks';

/**
 * Timeline Entry Component for vertical timeline visualization
 */
interface TimelineEntryProps {
  icon: string;
  label: string;
  value: string;
  subtext?: string;
  color: string;
  isLast?: boolean;
  highlight?: boolean;
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({
  icon,
  label,
  value,
  subtext,
  color,
  isLast = false,
  highlight = false,
}) => (
  <View style={timelineStyles.timelineEntryContainer}>
    {/* Vertical line connecting dots */}
    {!isLast && <View style={timelineStyles.timelineConnector} />}

    {/* Dot with icon */}
    <View style={[timelineStyles.timelineIconContainer, { backgroundColor: `${color}20`, borderColor: color }]}>
      <Text style={timelineStyles.timelineIcon}>{icon}</Text>
    </View>

    {/* Content */}
    <View style={timelineStyles.timelineEntryContent}>
      <Text style={timelineStyles.timelineEntryLabel}>{label}</Text>
      <Text style={[
        timelineStyles.timelineEntryValue,
        highlight && { color, fontWeight: '700' }
      ]}>
        {value}
      </Text>
      {subtext && (
        <Text style={timelineStyles.timelineEntrySubtext}>{subtext}</Text>
      )}
    </View>
  </View>
);

// Styles for TimelineEntry component (defined early for use in component)
const timelineStyles = StyleSheet.create({
  timelineEntryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 40,
    backgroundColor: theme.colors.neutral.gray300,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  timelineIcon: {
    fontSize: 18,
  },
  timelineEntryContent: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: 20,
  },
  timelineEntryLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timelineEntryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  timelineEntrySubtext: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
});

interface GameDetailsModalProps {
  gameId: string;
  visible: boolean;
  onClose: () => void;
  /** Optional: Pre-merged game data with live WebSocket prices (for active games) */
  gameWithLivePrices?: Game | null;
}

interface StockWithPerformance {
  symbol: string;
  openingPrice: number;
  currentPrice?: number;
  closingPrice?: number;
  percentageChange?: number;
  change: number;
  rank: number;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({
  gameId,
  visible,
  onClose,
  gameWithLivePrices,
}) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Use market countdown hook for active games
  const marketCountdown = useMarketCountdown();

  useEffect(() => {
    if (visible && gameId) {
      // If we have pre-merged live prices data, use it directly (no API call needed)
      if (gameWithLivePrices && gameWithLivePrices.id === gameId) {
        setGame(gameWithLivePrices);
        setLoading(false);
        setError(null);
      } else {
        // Otherwise fetch from API (for history/closed games or if no live data provided)
        loadGameDetails();
      }

      // Animate modal content on open
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, gameId, gameWithLivePrices]);

  const loadGameDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try live game first (for active games), fallback to regular game details (for closed/cancelled)
      try {
        const gameData = await container.getLiveGameUseCase.execute(gameId);
        setGame(gameData);
      } catch (liveErr) {
        // If live game fails (maybe it's closed), try getting game details
        const gameData = await container.getGameHistoryUseCase.execute();
        const foundGame = gameData.find(g => g.id === gameId);
        if (foundGame) {
          setGame(foundGame);
        } else {
          throw new Error('Game not found');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (createdAt: Date, closedAt?: Date): string => {
    const start = new Date(createdAt);
    const end = closedAt ? new Date(closedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };



  const formatMomentum = (momentum?: string): string => {
    if (!momentum) return 'N/A';
    // Convert backend enum format to display format
    return momentum
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getMomentumEmoji = (momentum?: string): string => {
    switch (momentum) {
      case 'STRONG_GAINING': return '⬆️⬆️';
      case 'GAINING': return '⬆️';
      case 'STABLE': return '━';
      case 'LOSING': return '⬇️';
      case 'STRONG_LOSING': return '⬇️⬇️';
      default: return '━';
    }
  };

  const getMomentumColor = (momentum?: string): string => {
    switch (momentum) {
      case 'STRONG_GAINING': return theme.colors.success.main;
      case 'GAINING': return '#66BB6A'; // Light green
      case 'STABLE': return theme.colors.neutral.gray500;
      case 'LOSING': return '#EF5350'; // Light red
      case 'STRONG_LOSING': return theme.colors.error.main;
      default: return theme.colors.neutral.gray500;
    }
  };

  const getTrendIndicator = (change: number): string => {
    if (change >= 5) return '▲▲';
    if (change >= 1) return '▲';
    if (change <= -5) return '▼▼';
    if (change <= -1) return '▼';
    return '─';
  };

  const getRankEmoji = (rank: number, totalStocks: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank === totalStocks) return '💀';
    return '';
  };

  const formatTimeIST = (date: Date): string => {
    return new Date(date).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const formatDateTimeIST = (date: Date): string => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  /**
   * Render the enhanced Timeline section with market countdown
   */
  const renderTimeline = (
    isActive: boolean,
    isCancelled: boolean,
    createdAt: Date,
    closedAt?: Date,
    duration?: string
  ) => {
    // Calculate progress percentage for active games (9:15 AM to 3:30 PM = 375 minutes)
    const getMarketProgress = (): number => {
      if (!isActive) return 100;
      const totalMarketMinutes = 375; // 6h 15m
      const minutesUsed = totalMarketMinutes - marketCountdown.minutesRemaining;
      return Math.min(Math.max((minutesUsed / totalMarketMinutes) * 100, 0), 100);
    };

    const marketProgress = getMarketProgress();

    return (
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Game Timeline</Text>

        {/* Visual Timeline */}
        <View style={styles.timelineContainer}>
          {/* Game Started Entry */}
          <TimelineEntry
            icon="🎮"
            label="Game Started"
            value={formatDateTimeIST(createdAt)}
            color={COUNTDOWN_COLORS.safe}
            isLast={!isActive && !closedAt}
          />

          {/* Active Game: Show current duration and market countdown */}
          {isActive && (
            <>
              {/* Current Duration Entry */}
              <TimelineEntry
                icon="⏱️"
                label="Active Duration"
                value={duration || '0m'}
                subtext="Currently running"
                color={theme.colors.primary.main}
                highlight
              />

              {/* Market Close Countdown Entry */}
              <TimelineEntry
                icon={marketCountdown.hasEnded ? '🏁' : '⏰'}
                label={marketCountdown.hasEnded ? 'Market Closed' : 'Market Closes'}
                value={marketCountdown.hasEnded ? marketCountdown.displayText : `3:30 PM IST`}
                subtext={marketCountdown.hasEnded ? 'Game will auto-settle' : `Remaining: ${marketCountdown.displayText}`}
                color={marketCountdown.color}
                isLast
                highlight={!marketCountdown.hasEnded}
              />
            </>
          )}

          {/* Closed/Cancelled Game: Show end time */}
          {!isActive && closedAt && (
            <TimelineEntry
              icon={isCancelled ? '❌' : '🏁'}
              label={isCancelled ? 'Game Cancelled' : 'Game Completed'}
              value={formatDateTimeIST(closedAt)}
              subtext={`Total duration: ${duration || 'N/A'}`}
              color={isCancelled ? theme.colors.neutral.gray500 : theme.colors.info.main}
              isLast
            />
          )}
        </View>

        {/* Progress Bar for Active Games */}
        {isActive && (
          <View style={styles.marketProgressContainer}>
            <View style={styles.marketProgressHeader}>
              <Text style={styles.marketProgressLabel}>Trading Day Progress</Text>
              <Text style={[styles.marketProgressPercent, { color: marketCountdown.color }]}>
                {marketProgress.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.marketProgressTrack}>
              <View
                style={[
                  styles.marketProgressBar,
                  {
                    width: `${marketProgress}%`,
                    backgroundColor: marketCountdown.color
                  }
                ]}
              />
            </View>
            <View style={styles.marketProgressTimes}>
              <Text style={styles.marketProgressTimeText}>9:15 AM</Text>
              <Text style={styles.marketProgressTimeText}>3:30 PM</Text>
            </View>
          </View>
        )}

        {/* Key Events Summary Card */}
        <View style={styles.timelineSummaryCard}>
          <View style={styles.timelineSummaryRow}>
            <View style={styles.timelineSummaryItem}>
              <Text style={styles.timelineSummaryLabel}>Started</Text>
              <Text style={styles.timelineSummaryValue}>{formatTimeIST(createdAt)}</Text>
            </View>
            <View style={styles.timelineSummaryDivider} />
            <View style={styles.timelineSummaryItem}>
              <Text style={styles.timelineSummaryLabel}>Duration</Text>
              <Text style={styles.timelineSummaryValue}>{duration || 'N/A'}</Text>
            </View>
            <View style={styles.timelineSummaryDivider} />
            <View style={styles.timelineSummaryItem}>
              <Text style={styles.timelineSummaryLabel}>
                {isActive ? 'Market' : 'Ended'}
              </Text>
              <Text style={[
                styles.timelineSummaryValue,
                isActive && { color: marketCountdown.color }
              ]}>
                {isActive
                  ? (marketCountdown.isMarketOpen ? 'Open' : 'Closed')
                  : (closedAt ? formatTimeIST(closedAt) : 'N/A')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading game details...</Text>
        </View>
      );
    }

    if (error || !game) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load game details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGameDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const openingPrice = game.openingPrice || 0;
    const currentOrClosingPrice = game.status === GameStatus.ACTIVE
      ? game.stocks.reduce((sum, stock) => sum + (stock.currentPrice || stock.openingPrice), 0)
      : (game.closingPrice || openingPrice);

    // Use backend's totalReturnPercentage if available (more accurate, especially for closed games)
    // Otherwise calculate it manually for active games
    const totalReturn = game.totalReturnPercentage !== undefined && game.totalReturnPercentage !== null
      ? game.totalReturnPercentage
      : (openingPrice > 0 ? ((currentOrClosingPrice - openingPrice) / openingPrice) * 100 : 0);

    const isProfit = totalReturn >= 0;
    const isActive = game.status === GameStatus.ACTIVE;
    const isCancelled = game.status === GameStatus.CANCELLED;
    const duration = calculateDuration(game.createdAt, game.closedAt);

    // Prepare sorted stocks with rankings
    const stocksWithPerformance: StockWithPerformance[] = game.stocks.map((stock) => {
      const stockOpening = stock.openingPrice;
      const stockCurrent = stock.currentPrice || stock.closingPrice || stock.openingPrice;
      const stockChange = (stock.percentageChange != null)
        ? stock.percentageChange
        : (stockOpening > 0)
          ? ((stockCurrent - stockOpening) / stockOpening) * 100
          : 0;

      return {
        symbol: stock.symbol,
        openingPrice: stockOpening,
        currentPrice: stock.currentPrice,
        closingPrice: stock.closingPrice,
        percentageChange: stock.percentageChange,
        change: stockChange,
        rank: 0,
      };
    });

    // Sort by performance and assign ranks
    stocksWithPerformance.sort((a, b) => b.change - a.change);
    stocksWithPerformance.forEach((stock, index) => {
      stock.rank = index + 1;
    });

    // Use backend-provided best/worst performers (fallback to calculated if not available)
    const bestGain = game.bestPerformer?.percentageChange ??
      (stocksWithPerformance.length > 0 ? stocksWithPerformance[0].change : 0);
    const worstLoss = game.worstPerformer?.percentageChange ??
      (stocksWithPerformance.length > 0
        ? stocksWithPerformance[stocksWithPerformance.length - 1].change
        : 0);

    // Use backend momentum for active games (fallback to null for closed games)
    const momentum = game.momentum;

    // Generate insight for this game (only for active games)
    const insight = isActive ? generateGameInsight(game) : null;

    // Background gradient color based on performance
    const backgroundGradient = isCancelled
      ? theme.colors.background.alt
      : totalReturn >= 0
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

          {/* Hero Score Section */}
          <View style={[styles.heroSection, { backgroundColor: backgroundGradient }]}>
            <View style={styles.heroScoreContainer}>
              <Text style={styles.heroLabel}>Total Return</Text>
              <Text style={[
                styles.heroScore,
                isCancelled ? styles.cancelled : (isProfit ? styles.profit : styles.loss)
              ]}>
                {isCancelled
                  ? 'N/A'
                  : totalReturn !== null && totalReturn !== undefined
                    ? `${isProfit ? '+' : ''}${totalReturn.toFixed(2)}%`
                    : 'N/A'}
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>Time Held</Text>
                <Text style={styles.quickStatValue}>{duration}</Text>
              </View>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>Best Gain</Text>
                <Text style={[styles.quickStatValue, styles.profit]}>
                  {bestGain >= 0 ? '+' : ''}{bestGain.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>Worst Loss</Text>
                <Text style={[styles.quickStatValue, styles.loss]}>
                  {worstLoss >= 0 ? '+' : ''}{worstLoss.toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* Momentum Indicator */}
            {!isCancelled && momentum && (
              <View style={[
                styles.momentumBadge,
                { backgroundColor: `${getMomentumColor(momentum)}15` }
              ]}>
                <Text style={styles.momentumEmoji}>{getMomentumEmoji(momentum)}</Text>
                <View style={styles.momentumTextContainer}>
                  <Text style={styles.momentumLabel}>Portfolio Momentum</Text>
                  <Text style={[
                    styles.momentumValue,
                    { color: getMomentumColor(momentum) }
                  ]}>
                    {formatMomentum(momentum)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.gameIdText}>
                  Game #{game.id ? game.id.slice(0, 8) : 'N/A'}
                </Text>
                <Text style={styles.dateText}>
                  Started: {new Date(game.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {game.closedAt && (
                  <Text style={styles.dateText}>
                    Closed: {new Date(game.closedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
              <View style={[
                styles.statusBadge,
                isActive ? styles.activeBadge : (isCancelled ? styles.cancelledBadge : styles.completedBadge)
              ]}>
                <Text style={styles.statusText}>
                  {game.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Stocks Performance Table */}
          <View style={styles.stocksSection}>
            <Text style={styles.sectionTitle}>Stock Performance Rankings</Text>

            {/* Stock Comparison Bar */}
            <StockComparisonBar stocks={game.stocks} variant="full" isActive={isActive} />

            {stocksWithPerformance.map((stock, index) => {
              const stockCurrent = stock.currentPrice || stock.closingPrice || stock.openingPrice;
              const stockProfit = stock.change >= 0;
              const trendIndicator = getTrendIndicator(stock.change);
              const rankEmoji = getRankEmoji(stock.rank, stocksWithPerformance.length);

              // Calculate bar width (0-100% scale, capped at +/- 20%)
              const maxChange = 20;
              const barWidth = Math.min(Math.abs(stock.change), maxChange) / maxChange * 100;

              // Row background tint
              const rowBackground = stockProfit
                ? 'rgba(76, 175, 80, 0.08)'
                : 'rgba(244, 67, 54, 0.08)';

              return (
                <View key={index} style={[styles.stockCard, { backgroundColor: rowBackground }]}>
                  <View style={styles.stockRankRow}>
                    <View style={styles.stockRankBadge}>
                      <Text style={styles.stockRankNumber}>{stock.rank}</Text>
                      {rankEmoji && <Text style={styles.stockRankEmoji}>{rankEmoji}</Text>}
                    </View>
                    <View style={styles.stockMainInfo}>
                      <StockLogo symbol={stock.symbol} size={36} />
                      <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                      <Text style={styles.stockTrendIndicator}>{trendIndicator}</Text>
                    </View>
                    <Text style={[
                      styles.stockChange,
                      stockProfit ? styles.profit : styles.loss
                    ]}>
                      {stockProfit ? '+' : ''}{stock.change.toFixed(2)}%
                    </Text>
                  </View>

                  {/* Performance Bar */}
                  <View style={styles.performanceBarContainer}>
                    <View style={styles.performanceBarTrack}>
                      <View
                        style={[
                          styles.performanceBar,
                          stockProfit ? styles.performanceBarGreen : styles.performanceBarRed,
                          { width: `${barWidth}%` }
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.stockPriceRow}>
                    <View style={styles.stockPriceItem}>
                      <Text style={styles.stockPriceLabel}>Opening</Text>
                      <Text style={styles.stockPriceValue}>₹{stock.openingPrice.toFixed(2)}</Text>
                    </View>

                    <View style={styles.stockPriceArrow}>
                      <Text style={styles.arrowText}>→</Text>
                    </View>

                    <View style={styles.stockPriceItem}>
                      <Text style={styles.stockPriceLabel}>
                        {isActive ? 'Current' : 'Closing'}
                      </Text>
                      <Text style={styles.stockPriceValue}>₹{stockCurrent.toFixed(2)}</Text>
                    </View>

                    <View style={styles.stockPriceItem}>
                      <Text style={styles.stockPriceLabel}>Change</Text>
                      <Text style={[
                        styles.stockPriceValue,
                        stockProfit ? styles.profit : styles.loss
                      ]}>
                        ₹{(stockCurrent - stock.openingPrice).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Summary Stats Section */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Summary Stats</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{duration || 'N/A'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Stocks</Text>
                <Text style={styles.summaryValue}>{game.stocks.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Opening</Text>
                <Text style={styles.summaryValue}>
                  {openingPrice > 0 ? `₹${openingPrice.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isActive ? 'Current' : 'Closing'}</Text>
                <Text style={styles.summaryValue}>
                  {currentOrClosingPrice > 0 ? `₹${currentOrClosingPrice.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Enhanced Timeline Section */}
          {renderTimeline(isActive, isCancelled, game.createdAt, game.closedAt, duration)}
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
        <View style={styles.header}>
          <Text style={styles.title}>Game Details</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
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
  // Insight Section
  insightSection: {
    padding: 20,
    paddingBottom: 0,
  },
  // Hero Score Section
  heroSection: {
    padding: 20,
    marginBottom: 2,
  },
  heroScoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroScore: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtext: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  quickStatBox: {
    flex: 1,
    backgroundColor: theme.colors.background.paper,
    padding: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  momentumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.paper,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: theme.colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  momentumEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  momentumTextContainer: {
    flex: 1,
  },
  momentumLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  momentumValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Header Section
  headerSection: {
    backgroundColor: theme.colors.background.paper,
    padding: 20,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gameIdText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: theme.colors.success.main,
  },
  completedBadge: {
    backgroundColor: theme.colors.info.main,
  },
  cancelledBadge: {
    backgroundColor: theme.colors.neutral.gray500,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  // Stocks Performance Section
  stocksSection: {
    backgroundColor: theme.colors.background.paper,
    padding: 20,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  stockCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  stockRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockRankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary.main,
  },
  stockRankNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary.main,
  },
  stockRankEmoji: {
    fontSize: 16,
    position: 'absolute',
    top: -4,
    right: -4,
  },
  stockMainInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginRight: 8,
  },
  stockTrendIndicator: {
    fontSize: 18,
    color: theme.colors.text.secondary,
  },
  stockChange: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Performance Bar
  performanceBarContainer: {
    marginBottom: 12,
  },
  performanceBarTrack: {
    height: 8,
    backgroundColor: theme.colors.neutral.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  performanceBar: {
    height: '100%',
    borderRadius: 4,
  },
  performanceBarGreen: {
    backgroundColor: theme.colors.success.main,
  },
  performanceBarRed: {
    backgroundColor: theme.colors.error.main,
  },
  stockPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockPriceItem: {
    flex: 1,
  },
  stockPriceArrow: {
    paddingHorizontal: 8,
  },
  arrowText: {
    fontSize: 16,
    color: theme.colors.neutral.gray400,
  },
  stockPriceLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  stockPriceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  profit: {
    color: theme.colors.success.main,
  },
  loss: {
    color: theme.colors.error.main,
  },
  cancelled: {
    color: theme.colors.neutral.gray400,
  },
  // Summary Section
  summarySection: {
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
  // Enhanced Timeline Section
  timelineSection: {
    backgroundColor: theme.colors.background.paper,
    padding: 20,
    marginBottom: 20,
  },
  timelineContainer: {
    marginBottom: 16,
  },
  // Market Progress Bar
  marketProgressContainer: {
    backgroundColor: theme.colors.background.alt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  marketProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  marketProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  marketProgressTrack: {
    height: 8,
    backgroundColor: theme.colors.neutral.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  marketProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  marketProgressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  marketProgressTimeText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  // Timeline Summary Card
  timelineSummaryCard: {
    backgroundColor: theme.colors.background.alt,
    borderRadius: 12,
    padding: 16,
  },
  timelineSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  timelineSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.neutral.gray300,
  },
  timelineSummaryLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timelineSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
});
