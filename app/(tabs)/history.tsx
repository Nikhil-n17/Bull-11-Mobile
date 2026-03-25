/**
 * History Screen
 * Shows completed and cancelled games with final results
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Box, VStack, HStack, Text, Badge, Button } from 'native-base';
import { useRouter } from 'expo-router';
import { GameDetailsModal } from '@/src/presentation/components/GameDetailsModal';
import { StockComparisonBar } from '@/src/presentation/components/StockComparisonBar';
import { LoadingSpinner } from '@/src/presentation/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/src/presentation/components/common/ErrorDisplay';
import { ErrorBanner } from '@/src/presentation/components/common/ErrorBanner';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { ErrorHandler } from '@/src/core/utils/errorHandler';
import { getPerformanceColor } from '@/src/core/theme';
import type { Game } from '@/src/domain/entities/Game';
import { GameStatus } from '@/src/domain/entities/Game';

export default function HistoryScreen() {
  const router = useRouter();
  const { user, isAuthenticated, updateActivity } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await updateActivity();

      const allGames = await container.getGameHistoryUseCase.execute();

      // Filter to show only completed and cancelled games
      const historyGames = allGames.filter(
        game => game.status === GameStatus.COMPLETED || game.status === GameStatus.CANCELLED
      );

      // Sort by closedAt date, most recent first
      historyGames.sort((a, b) => {
        const dateA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
        const dateB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
        return dateB - dateA;
      });

      setGames(historyGames);
    } catch (err) {
      const errorMessage = ErrorHandler.getShortMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Note: AuthGuard handles authentication redirects at the root level
  // No need to check isAuthenticated here - if we reached this component, we're authenticated


  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const calculateDuration = (createdAt: Date, closedAt?: Date): string => {
    if (!closedAt) return 'Unknown';

    const start = new Date(createdAt);
    const end = new Date(closedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
  };

  const handleViewDetails = (gameId: string) => {
    setSelectedGameId(gameId);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedGameId(null);
  };

  const renderGameCard = ({ item }: { item: Game }) => {
    const openingPrice = item.openingPrice || 0;
    const closingPrice = item.closingPrice || openingPrice;
    const percentChange = item.totalReturnPercentage ||
      (openingPrice > 0 ? ((closingPrice - openingPrice) / openingPrice) * 100 : 0);
    const isProfit = percentChange >= 0;
    const isCancelled = item.status === GameStatus.CANCELLED;
    const duration = calculateDuration(item.createdAt, item.closedAt);

    return (
      <Box
        bg="white"
        borderRadius="lg"
        p={4}
        mb={3}
        shadow={2}
        mx={4}
      >
        <VStack space={3}>
          {/* Header with date and status badge */}
          <HStack justifyContent="space-between" alignItems="flex-start">
            <VStack>
              <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              {item.closedAt && (
                <Text fontSize="xs" color="coolGray.500" mt={1}>
                  Closed: {new Date(item.closedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </VStack>
            <Badge
              colorScheme={isCancelled ? 'coolGray' : 'blue'}
              variant="solid"
              rounded="full"
              px={3}
              py={1}
            >
              <Text fontSize="xs" fontWeight="bold" color="white">
                {isCancelled ? 'CANCELLED' : 'COMPLETED'}
              </Text>
            </Badge>
          </HStack>

          {/* Stock Comparison Bar */}
          <StockComparisonBar stocks={item.stocks} variant="mini" isActive={false} />

          {/* Performance metrics in gray boxes */}
          <HStack space={3} justifyContent="space-between">
            <Box flex={1} bg="coolGray.100" borderRadius="md" p={3}>
              <Text fontSize="xs" color="coolGray.600" fontWeight="medium" mb={1}>
                OPENING
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
                ₹{openingPrice.toFixed(2)}
              </Text>
            </Box>
            <Box flex={1} bg="coolGray.100" borderRadius="md" p={3}>
              <Text fontSize="xs" color="coolGray.600" fontWeight="medium" mb={1}>
                CLOSING
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
                ₹{closingPrice.toFixed(2)}
              </Text>
            </Box>
          </HStack>

          {/* Total return in gray box */}
          <Box bg="coolGray.100" borderRadius="md" p={3}>
            <Text fontSize="xs" color="coolGray.600" fontWeight="medium" mb={1}>
              TOTAL RETURN
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={isCancelled ? 'coolGray.500' : (isProfit ? 'success.600' : 'error.600')}
            >
              {isCancelled ? 'N/A' : `${isProfit ? '+' : ''}${percentChange.toFixed(2)}%`}
            </Text>
          </Box>

          {/* View Details Button */}
          <Button
            onPress={() => handleViewDetails(item.id)}
            bg="primary.500"
            _pressed={{ bg: 'primary.600' }}
            borderRadius="lg"
            py={3}
          >
            <Text fontSize="md" fontWeight="semibold" color="white">
              View Details
            </Text>
          </Button>
        </VStack>
      </Box>
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading history..." />;
  }

  if (error && !refreshing) {
    return (
      <ErrorDisplay
        title="Failed to Load History"
        message={error}
        onRetry={loadHistory}
      />
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      {/* Header */}
      <Box bg="secondary.500" pt={16} pb={6} px={4}>
        <Text fontSize="2xl" fontWeight="bold" color="white" mb={1}>
          Game History
        </Text>
        <Text fontSize="md" color="secondary.200">
          Your completed games
        </Text>
      </Box>

      {error && refreshing && (
        <ErrorBanner message={error} type="error" />
      )}

      <FlatList
        data={games}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Box flex={1} justifyContent="center" alignItems="center" py={20}>
            <Text fontSize="6xl" mb={4}>📊</Text>
            <Text fontSize="lg" fontWeight="semibold" color="coolGray.600" mb={2}>
              No game history
            </Text>
            <Text fontSize="sm" color="coolGray.500" textAlign="center">
              Complete or close a game to see it here
            </Text>
          </Box>
        }
      />

      {selectedGameId && (
        <GameDetailsModal
          gameId={selectedGameId}
          visible={modalVisible}
          onClose={handleCloseModal}
        />
      )}
    </Box>
  );
}

const styles = StyleSheet.create({});
