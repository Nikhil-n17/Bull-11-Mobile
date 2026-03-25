/**
 * Active Games Screen
 * Shows all active games for the logged-in user
 *
 * WebSocket Integration:
 * - Real-time price updates via WebSocket
 * - Automatic connection management
 * - Fallback to REST API if WebSocket fails
 * - Visual connection state indicator
 *
 * Animations (React Native Reanimated):
 * - Card entry: Fade in + slide up with staggered delays (FadeInDown)
 * - Price changes: Scale pulse animation on update (AnimatedPrice)
 * - Performance indicator: Color-coded border glow
 * - Loading skeleton: Shimmer placeholder cards (GameCardsSkeleton)
 * - Position changes: LayoutAnimation for smooth reordering
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  AppState,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import ReAnimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter, useFocusEffect } from 'expo-router';
import { Card } from '@/src/presentation/components/common/Card';
import { GameDetailsModal } from '@/src/presentation/components/GameDetailsModal';
import { StockComparisonBar } from '@/src/presentation/components/StockComparisonBar';
import { GameCardsSkeleton } from '@/src/presentation/components/GameCardSkeleton';
import { ErrorDisplay } from '@/src/presentation/components/common/ErrorDisplay';
import { ErrorBanner } from '@/src/presentation/components/common/ErrorBanner';
import { ConfirmDialog } from '@/src/presentation/components/ConfirmDialog';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { useStockWebSocket, useMarketCountdown, COUNTDOWN_COLORS } from '@/src/presentation/hooks';
import { WebSocketConnectionState } from '@/src/domain/ports/WebSocketPort';
import { ErrorHandler } from '@/src/core/utils/errorHandler';
import { generateGameInsight } from '@/src/core/utils/gameInsights';
import { InsightBanner } from '@/src/presentation/components/InsightBanner';
import { GameCardCountdown } from '@/src/presentation/components/GameCardCountdown';
import { StockLogo } from '@/src/presentation/components/StockLogo';
import type { Game, GameStock } from '@/src/domain/entities/Game';
import { theme, getPerformanceColor } from '@/src/core/theme';

// Backup polling interval (commented out - WebSocket is primary)
// const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

/**
 * Animated Price Text Component
 * Scales up briefly when price changes for visual feedback
 */
interface AnimatedPriceProps {
  price: number;
  hasChanged: boolean;
  style?: any;
}

const AnimatedPrice: React.FC<AnimatedPriceProps> = ({ price, hasChanged, style }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (hasChanged) {
      scale.value = withSequence(
        withTiming(1.15, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) })
      );
    }
  }, [hasChanged, price]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReAnimated.Text style={[style, animatedStyle]}>
      {'\u20B9'}{price.toFixed(2)}
    </ReAnimated.Text>
  );
};

/**
 * Format momentum text for display
 */
const formatMomentum = (momentum: string): string => {
  switch (momentum) {
    case 'STRONG_GAINING':
      return '🚀 Strong Gaining';
    case 'GAINING':
      return '📈 Gaining';
    case 'STABLE':
      return '➡️ Stable';
    case 'LOSING':
      return '📉 Losing';
    case 'STRONG_LOSING':
      return '⚠️ Strong Losing';
    default:
      return momentum;
  }
};

/**
 * Get momentum badge style based on momentum type
 */
const getMomentumStyle = (momentum: string) => {
  switch (momentum) {
    case 'STRONG_GAINING':
      return { backgroundColor: theme.colors.success.dark };
    case 'GAINING':
      return { backgroundColor: theme.colors.success.main };
    case 'STABLE':
      return { backgroundColor: theme.colors.info.main };
    case 'LOSING':
      return { backgroundColor: theme.colors.warning.main };
    case 'STRONG_LOSING':
      return { backgroundColor: theme.colors.error.main };
    default:
      return { backgroundColor: theme.colors.neutral.gray200 };
  }
};

export default function ActiveGamesScreen() {
  const router = useRouter();
  const { user, isAuthenticated, updateActivity } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [changedStocks, setChangedStocks] = useState<Set<string>>(new Set());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [gameToClose, setGameToClose] = useState<string | null>(null);
  const [closedGameResult, setClosedGameResult] = useState<Game | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // BACKUP: Old polling timer ref (kept for fallback scenarios)
  // const autoRefreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const isUserInteracting = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const previousPrices = useRef<Map<string, number>>(new Map());

  // Track previous stock positions for animation (key: `${gameId}-${symbol}`, value: position index)
  const previousPositions = useRef<Map<string, number>>(new Map());
  // Track stocks that changed position (key: `${gameId}-${symbol}`, value: 'up' | 'down' | null)
  const [positionChanges, setPositionChanges] = useState<Map<string, 'up' | 'down'>>(new Map());
  // Debounce threshold for reordering (percentage difference required to trigger reorder)
  const REORDER_THRESHOLD = 0.05; // 0.05% minimum difference to reorder

  // WebSocket hook for real-time price updates
  const {
    prices: wsPrices,
    connectionState,
    error: wsError,
    isConnected,
    lastUpdateTime: wsLastUpdateTime,
  } = useStockWebSocket(games, {
    autoConnect: true,
    pauseInBackground: true,
    debug: __DEV__,
  });

  // Merge WebSocket prices into games
  const gamesWithLivePrices = useMemo(() => {
    if (wsPrices.size === 0) {
      return games;
    }

    return games.map((game) => ({
      ...game,
      stocks: game.stocks.map((stock) => {
        const wsPrice = wsPrices.get(stock.symbol);
        if (wsPrice) {
          return {
            ...stock,
            openingPrice: wsPrice.open, // Use WebSocket's 'open' as opening price
            currentPrice: wsPrice.lastPrice,
            percentageChange: wsPrice.change, // Use WebSocket's pre-calculated change %
          } as GameStock;
        }
        return stock;
      }),
    }));
  }, [games, wsPrices]);

  // Track price changes from WebSocket updates
  useEffect(() => {
    if (wsPrices.size === 0) return;

    const changed = new Set<string>();

    games.forEach((game) => {
      game.stocks.forEach((stock) => {
        const key = `${game.id}-${stock.symbol}`;
        const wsPrice = wsPrices.get(stock.symbol);
        const currentPrice = wsPrice?.lastPrice || stock.currentPrice || stock.openingPrice;
        const prevPrice = previousPrices.current.get(key);

        if (prevPrice !== undefined && prevPrice !== currentPrice) {
          changed.add(key);
        }
        previousPrices.current.set(key, currentPrice);
      });
    });

    if (changed.size > 0) {
      setChangedStocks(changed);
      setLastUpdated(new Date());

      // Clear price change highlight after 2 seconds
      setTimeout(() => setChangedStocks(new Set()), 2000);
    }
  }, [wsPrices, games]);

  // Update lastUpdated from WebSocket
  useEffect(() => {
    if (wsLastUpdateTime) {
      setLastUpdated(wsLastUpdateTime);
    }
  }, [wsLastUpdateTime]);

  // Note: AuthGuard handles authentication redirects at the root level
  // No need to check isAuthenticated here - if we reached this component, we're authenticated

  // Reload games when tab becomes focused (e.g., after starting a new game)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadGames();
      }
      return () => {
        // Cleanup if needed
      };
    }, [isAuthenticated])
  );

  // Pulse animation for live indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // BACKUP: Handle app state changes (foreground/background)
  // Commented out as WebSocket hook handles this internally
  /*
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, restart auto-refresh
        startAutoRefresh();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background, stop auto-refresh
        stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  */

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadGames();
      // BACKUP: Old polling - now handled by WebSocket
      // startAutoRefresh();
    } else {
      // When logged out, clear games, stop refresh, and reset loading state
      setGames([]);
      setLoading(false);
      setError(null);
      // BACKUP: stopAutoRefresh();
    }

    return () => {
      // BACKUP: stopAutoRefresh();
    };
  }, [isAuthenticated]);

  /**
   * Load active games (initial load and manual refresh)
   * WebSocket handles real-time price updates after initial load
   * @param isSilent - If true, won't show loading spinner
   */
  const loadGames = async (isSilent = false) => {
    // Don't load if not authenticated (prevents loading during logout)
    if (!isAuthenticated) {
      return;
    }

    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);
      await updateActivity();

      const activeGames = await container.getActiveGamesUseCase.execute();

      // Initialize previous prices for change detection
      activeGames.forEach((game) => {
        game.stocks.forEach((stock) => {
          const key = `${game.id}-${stock.symbol}`;
          const currentPrice = stock.currentPrice || stock.openingPrice;
          previousPrices.current.set(key, currentPrice);
        });
      });

      setGames(activeGames);
      setLastUpdated(new Date());
    } catch (err) {
      const errorDetails = ErrorHandler.parseError(err);
      setError(errorDetails.message);

      // Only show alert for non-network errors (network errors will show in UI)
      if (errorDetails.type !== 'NETWORK' && !isSilent) {
        // Alert removed - error displays in UI
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  /**
   * BACKUP: Start auto-refresh timer (polling fallback)
   * Kept for scenarios where WebSocket is unavailable
   */
  /*
  const startAutoRefresh = () => {
    // Clear existing timer
    if (autoRefreshTimer.current) {
      clearInterval(autoRefreshTimer.current);
    }

    // Set up new timer
    autoRefreshTimer.current = setInterval(() => {
      // Only auto-refresh if:
      // 1. User is not interacting
      // 2. There are games to refresh
      // 3. No modal is open
      // 4. WebSocket is not connected (fallback only)
      if (!isUserInteracting.current && games.length > 0 && !modalVisible && !isConnected) {
        setIsAutoRefreshing(true);
        loadGames(true); // Silent refresh
      }
    }, AUTO_REFRESH_INTERVAL);
  };

  const stopAutoRefresh = () => {
    if (autoRefreshTimer.current) {
      clearInterval(autoRefreshTimer.current);
      autoRefreshTimer.current = null;
    }
  };
  */

  const handleManualRefresh = async () => {
    isUserInteracting.current = true;
    await loadGames();
    isUserInteracting.current = false;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    isUserInteracting.current = true;
    await loadGames();
    setRefreshing(false);
    isUserInteracting.current = false;
  };

  const handleScrollBegin = () => {
    isUserInteracting.current = true;
  };

  const handleScrollEnd = () => {
    // Delay to ensure user is done interacting
    setTimeout(() => {
      isUserInteracting.current = false;
    }, 1000);
  };

  const handleCloseGame = async (gameId: string) => {
    isUserInteracting.current = true;
    setGameToClose(gameId);
    setShowCloseConfirm(true);
  };

  const confirmCloseGame = async () => {
    if (!gameToClose) return;

    setShowCloseConfirm(false);
    try {
      const closedGame = await container.closeGameUseCase.execute(gameToClose);
      setClosedGameResult(closedGame);
      setShowResultModal(true);
      await loadGames();
    } catch (err) {
      const errorDetails = ErrorHandler.parseError(err);
      setError(`${errorDetails.title}: ${errorDetails.message}`);
    } finally {
      isUserInteracting.current = false;
      setGameToClose(null);
    }
  };

  const handleViewDetails = (gameId: string) => {
    isUserInteracting.current = true;
    setSelectedGameId(gameId);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedGameId(null);
    setTimeout(() => {
      isUserInteracting.current = false;
    }, 500);
  };

  /**
   * Format time since last update in human-readable form
   */
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  /**
   * Get connection status display info
   */
  const getConnectionStatus = () => {
    switch (connectionState) {
      case WebSocketConnectionState.CONNECTED:
        return {
          text: 'LIVE',
          color: theme.colors.gaming.liveIndicator,
          bgColor: 'rgba(255, 255, 255, 0.2)',
          showPulse: true,
        };
      case WebSocketConnectionState.CONNECTING:
      case WebSocketConnectionState.RECONNECTING:
        return {
          text: 'CONNECTING...',
          color: theme.colors.warning.main,
          bgColor: 'rgba(255, 193, 7, 0.2)',
          showPulse: true,
        };
      case WebSocketConnectionState.DISCONNECTED:
      case WebSocketConnectionState.ERROR:
        return {
          text: 'OFFLINE',
          color: theme.colors.error.main,
          bgColor: 'rgba(244, 67, 54, 0.2)',
          showPulse: false,
        };
      default:
        return {
          text: 'OFFLINE',
          color: theme.colors.error.main,
          bgColor: 'rgba(244, 67, 54, 0.2)',
          showPulse: false,
        };
    }
  };

  // Helper function to get color based on percentage change
  const getChangeColor = (percentChange: number) => {
    return getPerformanceColor(percentChange);
  };

  // Helper function to get rank badge
  const getRankBadge = (percentChange: number) => {
    if (percentChange >= 5) return '🏆';
    if (percentChange >= 2) return '🥈';
    if (percentChange > 0) return '🥉';
    return null;
  };

  /**
   * Sort stocks by performance with stability check
   * Returns sorted array and tracks position changes
   */
  const sortStocksWithPositionTracking = useCallback((
    gameId: string,
    stocks: Array<{ symbol: string; percentChange: number; [key: string]: any }>
  ) => {
    // Create a copy and sort by percent change descending
    const sorted = [...stocks].sort((a, b) => {
      const diff = (b.percentChange || 0) - (a.percentChange || 0);
      // Only reorder if difference exceeds threshold
      if (Math.abs(diff) < REORDER_THRESHOLD) {
        // Maintain previous order if difference is too small
        const prevPosA = previousPositions.current.get(`${gameId}-${a.symbol}`) ?? 0;
        const prevPosB = previousPositions.current.get(`${gameId}-${b.symbol}`) ?? 0;
        return prevPosA - prevPosB;
      }
      return diff;
    });

    // Track position changes
    const newPositionChanges = new Map<string, 'up' | 'down'>();
    let hasPositionChanged = false;

    sorted.forEach((stock, newIndex) => {
      const key = `${gameId}-${stock.symbol}`;
      const prevIndex = previousPositions.current.get(key);

      if (prevIndex !== undefined && prevIndex !== newIndex) {
        hasPositionChanged = true;
        if (newIndex < prevIndex) {
          newPositionChanges.set(key, 'up');
        } else {
          newPositionChanges.set(key, 'down');
        }
      }
    });

    // Update previous positions for next comparison
    sorted.forEach((stock, index) => {
      previousPositions.current.set(`${gameId}-${stock.symbol}`, index);
    });

    return { sorted, newPositionChanges, hasPositionChanged };
  }, []);

  /**
   * Render individual game card with performance metrics
   * Memoized to prevent unnecessary re-renders
   * Includes staggered entry animation using FadeInDown
   */
  const renderGameCard = useCallback(({ item, index }: { item: Game; index: number }) => {
    // Use percentageChange from WebSocket (already calculated) or fallback to manual calculation
    const stocksWithChanges = item.stocks.map(stock => {
      let change = stock.percentageChange;

      // Fallback calculation if WebSocket hasn't provided percentageChange yet
      if (change === undefined || change === null) {
        const opening = stock.openingPrice || 0;
        const current = stock.currentPrice || opening;
        change = opening > 0 ? ((current - opening) / opening) * 100 : 0;
      }

      return { ...stock, percentChange: change };
    });

    // Sort stocks by performance (best at top, worst at bottom)
    const { sorted: sortedStocks, newPositionChanges, hasPositionChanged } = sortStocksWithPositionTracking(
      item.id,
      stocksWithChanges
    );

    // Trigger layout animation if positions changed
    if (hasPositionChanged) {
      LayoutAnimation.configureNext({
        duration: 300,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });

      // Update position changes state for visual feedback
      setPositionChanges(prev => {
        const updated = new Map(prev);
        newPositionChanges.forEach((value, key) => updated.set(key, value));
        return updated;
      });

      // Clear position change indicators after animation
      setTimeout(() => {
        setPositionChanges(prev => {
          const updated = new Map(prev);
          newPositionChanges.forEach((_, key) => updated.delete(key));
          return updated;
        });
      }, 2000);
    }

    // Portfolio return = AVERAGE of all stock percentage changes
    const portfolioReturn = sortedStocks.reduce((sum, stock) => sum + (stock.percentChange || 0), 0) / sortedStocks.length;
    const isProfit = portfolioReturn >= 0;

    // Best and worst performers (use backend data if available, fallback to sorted list)
    const bestPerformer = item.bestPerformer?.symbol || sortedStocks[0]?.symbol;
    const worstPerformer = item.worstPerformer?.symbol || sortedStocks[sortedStocks.length - 1]?.symbol;

    const rankBadge = getRankBadge(portfolioReturn);
    const changeColor = getChangeColor(portfolioReturn);

    // Generate insight for this game
    const insight = generateGameInsight(item);

    return (
      <ReAnimated.View entering={FadeInDown.delay(index * 100).duration(400).springify().damping(15)}>
        <Card>
        <View style={styles.gameCard}>
          {/* Insight Banner */}
          {insight && <InsightBanner insight={insight} />}

          {/* Header with date, countdown timer, and rank badge */}
          <View style={styles.gameHeader}>
            <View style={styles.gameHeaderLeft}>
              <Text style={styles.gameDate}>
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              {rankBadge && (
                <Text style={styles.rankBadge}>{rankBadge}</Text>
              )}
            </View>
            <View style={styles.gameHeaderRight}>
              {/* Market Close Countdown Timer */}
              <GameCardCountdown gameCreatedAt={item.createdAt} />
              <View style={[styles.statusBadge, styles.activeBadge]}>
                <Animated.View style={[styles.pulseIndicator, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.statusText}>ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Stocks list with individual performance and price change highlighting */}
          {/* Sorted by performance: best performer at top, worst at bottom */}
          <View style={styles.stocksList}>
            {sortedStocks.map((stock, index) => {
              const stockChange = stock.percentChange || 0;
              const stockColor = getChangeColor(stockChange);
              // Use backend data for BEST/WORST tags (more accurate)
              const isBest = stock.symbol === bestPerformer && sortedStocks.length > 1;
              const isWorst = stock.symbol === worstPerformer && sortedStocks.length > 1 && stockChange < 0;
              const stockKey = `${item.id}-${stock.symbol}`;
              const hasChanged = changedStocks.has(stockKey);
              const positionChange = positionChanges.get(stockKey);

              return (
                <View key={stock.symbol} style={[
                  styles.stockItem,
                  hasChanged && styles.stockItemHighlight,
                  positionChange && styles.stockItemPositionChanged,
                ]}>
                  <View style={styles.stockLeft}>
                    {/* Position change indicator */}
                    {positionChange && (
                      <View style={[
                        styles.positionChangeIndicator,
                        positionChange === 'up' ? styles.positionUp : styles.positionDown,
                      ]}>
                        <Text style={styles.positionChangeArrow}>
                          {positionChange === 'up' ? '↑' : '↓'}
                        </Text>
                      </View>
                    )}
                    {/* Rank number */}
                    <View style={styles.rankNumber}>
                      <Text style={[
                        styles.rankNumberText,
                        index === 0 && styles.rankNumberBest,
                        index === sortedStocks.length - 1 && stockChange < 0 && styles.rankNumberWorst,
                      ]}>#{index + 1}</Text>
                    </View>
                    {/* Company Logo */}
                    <StockLogo symbol={stock.symbol} size={32} />
                    <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                    {isBest && (
                      <View style={[styles.performanceBadge, styles.bestBadge]}>
                        <Text style={styles.performanceBadgeText}>BEST</Text>
                      </View>
                    )}
                    {isWorst && (
                      <View style={[styles.performanceBadge, styles.worstBadge]}>
                        <Text style={styles.performanceBadgeText}>WORST</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stockRight}>
                    <AnimatedPrice
                      price={stock.currentPrice || stock.openingPrice}
                      hasChanged={hasChanged}
                      style={[styles.stockPrice, hasChanged && styles.stockPriceChanged]}
                    />
                    <View style={styles.stockChangeContainer}>
                      <Text style={[styles.stockChangeArrow, { color: stockColor }]}>
                        {stockChange > 0 ? '▲' : stockChange < 0 ? '▼' : '▬'}
                      </Text>
                      <Text style={[styles.stockChangeText, { color: stockColor }]}>
                        {stockChange > 0 ? '+' : ''}{stockChange.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Enhanced performance container */}
          <View style={[styles.performanceContainer, { borderLeftColor: changeColor, borderLeftWidth: 4 }]}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Portfolio Return:</Text>
              <Text style={[styles.returnValue, styles.returnValueLarge, { color: changeColor }]}>
                {isProfit ? '+' : ''}{portfolioReturn.toFixed(2)}%
              </Text>
            </View>
            {/* Momentum Indicator (from backend) */}
            {item.momentum && (
              <View style={styles.momentumRow}>
                <Text style={styles.momentumLabel}>Momentum:</Text>
                <View style={[styles.momentumBadge, getMomentumStyle(item.momentum)]}>
                  <Text style={styles.momentumText}>{formatMomentum(item.momentum)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => handleViewDetails(item.id)}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleCloseGame(item.id)}
            >
              <Text style={styles.closeButtonText}>Close Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
      </ReAnimated.View>
    );
  }, [changedStocks, pulseAnim, positionChanges, sortStocksWithPositionTracking]);

  // Don't show loading spinner if user is not authenticated (prevents flash during logout)
  if (!isAuthenticated) {
    return null;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Active Games</Text>
              <Text style={styles.subtitle}>
                Welcome, {user?.name || 'Player'}
              </Text>
            </View>
          </View>
        </View>
        <GameCardsSkeleton count={2} />
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <ErrorDisplay
        title="Failed to Load Games"
        message={error}
        onRetry={loadGames}
      />
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>My Practice Games</Text>
            <Text style={styles.subtitle}>
              Welcome, {user?.name || 'Player'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {gamesWithLivePrices.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleManualRefresh}
                >
                  <Text style={styles.refreshIcon}>🔄</Text>
                </TouchableOpacity>
                <View style={[styles.liveIndicator, { backgroundColor: connectionStatus.bgColor }]}>
                  {connectionStatus.showPulse ? (
                    <Animated.View
                      style={[
                        styles.liveDot,
                        {
                          backgroundColor: connectionStatus.color,
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.liveDot,
                        { backgroundColor: connectionStatus.color },
                      ]}
                    />
                  )}
                  <Text style={[styles.liveText, { color: isConnected ? theme.colors.primary.contrast : connectionStatus.color }]}>
                    {connectionStatus.text}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
        {lastUpdated && gamesWithLivePrices.length > 0 && (
          <Text style={styles.lastUpdatedText}>
            Updated {getTimeAgo(lastUpdated)}
            {wsError && ' (WebSocket error)'}
          </Text>
        )}
      </View>

      {error && refreshing && (
        <ErrorBanner message={error} type="error" />
      )}

      {wsError && !error && (
        <ErrorBanner
          message={`WebSocket: ${wsError.message}. Using cached prices.`}
          type="warning"
        />
      )}

      {/* Start New Game Button */}
      <View style={styles.newGameButtonContainer}>
        <TouchableOpacity
          style={styles.newGameButton}
          onPress={() => router.push('/(tabs)/new-game')}
          activeOpacity={0.8}
        >
          <Text style={styles.newGameButtonIcon}>➕</Text>
          <Text style={styles.newGameButtonText}>Start New Game</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={gamesWithLivePrices}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎮</Text>
            <Text style={styles.emptyText}>No active games</Text>
            <Text style={styles.emptySubtext}>
              Start a new game to begin playing!
            </Text>
          </View>
        }
      />

      {selectedGameId && (
        <GameDetailsModal
          gameId={selectedGameId}
          visible={modalVisible}
          onClose={handleCloseModal}
          gameWithLivePrices={gamesWithLivePrices.find(g => g.id === selectedGameId) || null}
        />
      )}

      {/* Close Game Confirmation */}
      <ConfirmDialog
        visible={showCloseConfirm}
        title="Close Game"
        message="Are you sure you want to close this game? This action cannot be undone."
        confirmText="Close Game"
        cancelText="Cancel"
        onConfirm={confirmCloseGame}
        onCancel={() => {
          setShowCloseConfirm(false);
          setGameToClose(null);
          isUserInteracting.current = false;
        }}
        confirmColor={theme.colors.error.main}
      />

      {/* Game Result Modal */}
      <ConfirmDialog
        visible={showResultModal}
        title="Game Closed!"
        message={closedGameResult ?
          `Final Result: ${(closedGameResult.totalReturnPercentage ?? 0) >= 0 ? '+' : ''}${closedGameResult.totalReturnPercentage?.toFixed(2) ?? '0.00'}%\n\n${(closedGameResult.totalReturnPercentage ?? 0) >= 0 ? '🎉 Profit!' : '📉 Loss'}`
          : 'Game closed successfully'}
        confirmText="OK"
        cancelText=""
        onConfirm={() => {
          setShowResultModal(false);
          setClosedGameResult(null);
        }}
        onCancel={() => {
          setShowResultModal(false);
          setClosedGameResult(null);
        }}
        confirmColor={theme.colors.primary.main}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.default,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: theme.colors.primary.main,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.gaming.liveIndicator,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary.contrast,
    letterSpacing: 0.5,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.primary.contrast,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 16,
    paddingBottom: 80,
  },
  gameCard: {
    padding: 4,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    fontSize: 20,
  },
  gameDate: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.neutral.white,
  },
  activeBadge: {
    backgroundColor: theme.colors.success.main,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success.contrast,
  },
  stocksList: {
    marginBottom: 16,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  stockItemHighlight: {
    backgroundColor: theme.colors.warning.bg,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  stockItemPositionChanged: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  positionChangeIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  positionUp: {
    backgroundColor: theme.colors.success.main,
  },
  positionDown: {
    backgroundColor: theme.colors.error.main,
  },
  positionChangeArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.neutral.white,
  },
  rankNumber: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.hint,
  },
  rankNumberBest: {
    color: theme.colors.success.main,
    fontWeight: '700',
  },
  rankNumberWorst: {
    color: theme.colors.error.main,
    fontWeight: '700',
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  performanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestBadge: {
    backgroundColor: theme.colors.gaming.bestPerformer,
  },
  worstBadge: {
    backgroundColor: theme.colors.gaming.worstPerformer,
  },
  performanceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.neutral.white,
    letterSpacing: 0.5,
  },
  stockPrice: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  stockPriceChanged: {
    fontWeight: '700',
    color: theme.colors.secondary.dark,
  },
  stockChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockChangeArrow: {
    fontSize: 10,
    fontWeight: '700',
  },
  stockChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceContainer: {
    backgroundColor: theme.colors.neutral.gray50,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  returnValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  returnValueLarge: {
    fontSize: 20,
    fontWeight: '800',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: theme.colors.primary.main,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: theme.colors.primary.contrast,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: theme.colors.error.main,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.error.contrast,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.hint,
    textAlign: 'center',
  },
  momentumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  momentumLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  momentumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentumText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.neutral.white,
    letterSpacing: 0.3,
  },
  newGameButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.background.default,
  },
  newGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006e1c', // Bull-11 green
    borderRadius: 24, // Pill shape
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  newGameButtonIcon: {
    fontSize: 18,
    color: theme.colors.neutral.white,
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.neutral.white,
    letterSpacing: 0.5,
  },
});
