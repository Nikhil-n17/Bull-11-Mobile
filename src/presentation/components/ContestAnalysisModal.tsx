/**
 * Contest Analysis Modal Component
 * Shows final results for completed contests with all participants and their teams
 * Focus: Learning and winner analysis
 */

import React, { useEffect, useState, useRef } from 'react';
import { Animated } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Divider,
  Spinner,
} from 'native-base';
import ConfettiCannon from 'react-native-confetti-cannon';
import { container } from '@/src/core/di/container';
import type { ContestEntry, LeaderboardEntry, Contest } from '@/src/domain/entities/Contest';
import { ContestStatus } from '@/src/domain/entities/Contest';
import { theme } from '@/src/core/theme';

interface ContestAnalysisModalProps {
  contestId: string;
  entryId: string; // User's entry ID
  visible: boolean;
  onClose: () => void;
}

export const ContestAnalysisModal: React.FC<ContestAnalysisModalProps> = ({
  contestId,
  entryId,
  visible,
  onClose,
}) => {
  const [myPerformance, setMyPerformance] = useState<ContestEntry | null>(null);
  const [allParticipants, setAllParticipants] = useState<LeaderboardEntry[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && contestId) {
      // Reset state when modal opens
      setLoading(true);
      setError(null);
      setMyPerformance(null);
      setAllParticipants([]);
      setContest(null);

      // Reset animation value to 0 before starting (fixes blank content on reopen)
      fadeAnim.setValue(0);
      loadContestData();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, contestId]);

  // Trigger confetti when user is THE winner (rank #1)
  useEffect(() => {
    if (visible && !loading && myPerformance && myPerformance.rank === 1) {
      // Delay confetti to ensure ConfettiCannon ref is attached after render
      const timer = setTimeout(() => {
        confettiRef.current?.start();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, loading, myPerformance]);

  const loadContestData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [performanceData, leaderboardData, contestData] = await Promise.all([
        container.getMyPerformanceUseCase.execute({ contestId }),
        container.getLeaderboardUseCase.execute({ contestId }), // Gets ALL participants
        container.getContestUseCase.execute({ contestId }),
      ]);

      setMyPerformance(performanceData);
      setAllParticipants(leaderboardData);
      setContest(contestData);

      // Animate content fade-in after data loads
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contest results';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const formatDateRange = (start: Date, end: Date): string => {
    const startStr = new Date(start).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    const endStr = new Date(end).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    return `${startStr} - ${endStr}`;
  };

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const calculateDuration = (): string => {
    if (!contest) return 'N/A';

    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const renderLoadingState = () => (
    <Box flex={1} justifyContent="center" alignItems="center" py={10}>
      <Spinner size="lg" color="primary.500" />
      <Text mt={4} fontSize="md" color="gray.600">
        Loading contest results...
      </Text>
    </Box>
  );

  const renderErrorState = () => (
    <Box flex={1} justifyContent="center" alignItems="center" py={10}>
      <Text fontSize="md" color="error.500" textAlign="center" mb={4}>
        {error || 'Failed to load contest results'}
      </Text>
      <Pressable
        onPress={() => loadContestData()}
        bg="primary.500"
        px={6}
        py={3}
        borderRadius="full"
        _pressed={{ bg: 'primary.600' }}
      >
        <Text color="white" fontWeight="600" fontSize="md">
          Retry
        </Text>
      </Pressable>
    </Box>
  );

  const renderContent = () => {
    if (loading) return renderLoadingState();
    if (error || !myPerformance || !contest) return renderErrorState();

    const topPerformer = allParticipants.length > 0 ? allParticipants[0] : null;
    const isProfit = myPerformance.totalReturnPercentage >= 0;
    const userWinnings = myPerformance.rank && myPerformance.rank <= 10
      ? `₹${((contest.prizePool * (11 - myPerformance.rank)) / 55).toFixed(0)}` // Simple prize distribution
      : '₹0';

    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Contest Summary Card */}
          <Box bg="coolGray.50" px={5} py={6}>
            <VStack space={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    TOTAL PARTICIPANTS
                  </Text>
                  <Text fontSize="3xl" fontWeight="bold" color="gray.800">
                    {contest.currentParticipants}
                  </Text>
                </VStack>
                <VStack flex={1} alignItems="flex-end">
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    PRIZE POOL
                  </Text>
                  <Text fontSize="3xl" fontWeight="bold" color="success.500">
                    ₹{contest.prizePool.toFixed(0)}
                  </Text>
                </VStack>
              </HStack>

              <Divider />

              {topPerformer && (
                <VStack space={2}>
                  <Text fontSize="xs" color="gray.600">
                    TOP PERFORMER
                  </Text>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="lg" fontWeight="700" color="gray.800">
                      {topPerformer.userName}
                    </Text>
                    <Text fontSize="lg" fontWeight="700" color="success.500">
                      +{(topPerformer.totalReturnPercentage ?? 0).toFixed(2)}%
                    </Text>
                  </HStack>
                </VStack>
              )}

              <HStack justifyContent="space-between">
                <VStack>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    DURATION
                  </Text>
                  <Text fontSize="md" fontWeight="600" color="gray.800">
                    {calculateDuration()}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>

          {/* Leaderboard */}
          <Box bg="white" px={5} py={5} mt={2}>
            <Text fontSize="lg" fontWeight="600" color="gray.800" mb={4}>
              🏆 Leaderboard ({allParticipants.length})
            </Text>

            <VStack space={2}>
              {allParticipants.map((entry) => {
                const isCurrentUser = entry.userId === myPerformance.userId;
                const medalEmoji = getMedalEmoji(entry.rank);
                const isTopTen = entry.rank <= 10;

                return (
                  <Box
                    key={entry.rank}
                    bg={
                      entry.rank === 1
                        ? 'success.50'
                        : isCurrentUser
                        ? 'primary.50'
                        : 'gray.50'
                    }
                    p={4}
                    borderRadius="lg"
                    borderWidth={isCurrentUser ? 2 : 1}
                    borderColor={
                      entry.rank === 1
                        ? 'success.500'
                        : isCurrentUser
                        ? 'primary.500'
                        : 'gray.200'
                    }
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <HStack space={3} alignItems="center" flex={1}>
                        <Box
                          bg={
                            entry.rank === 1
                              ? 'success.500'
                              : isCurrentUser
                              ? 'primary.500'
                              : 'coolGray.300'
                          }
                          w={8}
                          h={8}
                          borderRadius="full"
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text
                            fontSize="sm"
                            fontWeight="700"
                            color={entry.rank === 1 || isCurrentUser ? 'white' : 'gray.700'}
                          >
                            {entry.rank}
                          </Text>
                        </Box>
                        {medalEmoji && <Text fontSize="lg">{medalEmoji}</Text>}
                        <VStack flex={1}>
                          <Text
                            fontSize="md"
                            fontWeight="600"
                            color="gray.800"
                            numberOfLines={1}
                          >
                            {isCurrentUser ? 'You' : entry.userName}
                          </Text>
                          <Text fontSize="xs" color="gray.600" numberOfLines={1}>
                            {entry.teamName}
                          </Text>
                        </VStack>
                      </HStack>
                      <VStack alignItems="flex-end">
                        <Text
                          fontSize="md"
                          fontWeight="700"
                          color={(entry.totalReturnPercentage ?? 0) >= 0 ? '#006e1c' : '#b3272a'}
                        >
                          {(entry.totalReturnPercentage ?? 0) >= 0 ? '+' : ''}
                          {(entry.totalReturnPercentage ?? 0).toFixed(2)}%
                        </Text>
                        {isTopTen && (
                          <Text fontSize="xs" color="gray.600">
                            ₹{((contest.prizePool * (11 - entry.rank)) / 55).toFixed(0)}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </Box>
          <Box bg="white" px={5} py={5} mt={2}>
            <Text fontSize="lg" fontWeight="600" color="gray.800" mb={4}>
              Your Performance
            </Text>

            <Box
              bg={isProfit ? 'success.50' : 'error.50'}
              p={6}
              borderRadius="xl"
              borderWidth={2}
              borderColor={isProfit ? 'success.500' : 'error.500'}
            >
              <VStack space={4} alignItems="center">
                {/* Rank Display */}
                <HStack space={8} justifyContent="center">
                  <VStack alignItems="center">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      FINAL RANK
                    </Text>
                    <Text fontSize="4xl" fontWeight="bold" color="gray.800">
                      #{myPerformance.rank || '—'}
                    </Text>
                  </VStack>
                  <Divider orientation="vertical" />
                  <VStack alignItems="center">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      RETURNS
                    </Text>
                    <Text
                      fontSize="4xl"
                      fontWeight="bold"
                      color={isProfit ? '#006e1c' : '#b3272a'}
                    >
                      {isProfit ? '+' : ''}{(myPerformance.totalReturnPercentage ?? 0).toFixed(2)}%
                    </Text>
                  </VStack>
                </HStack>

                <Divider />

                {/* Winnings */}
                <VStack alignItems="center">
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    WINNINGS
                  </Text>
                  <Text fontSize="2xl" fontWeight="700" color="success.500">
                    {userWinnings}
                  </Text>
                </VStack>

                {/* Team Name */}
                <VStack alignItems="center">
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    TEAM NAME
                  </Text>
                  <Text fontSize="lg" fontWeight="600" color="gray.800" numberOfLines={1}>
                    {myPerformance.teamName}
                  </Text>
                </VStack>
              </VStack>
            </Box>
          </Box>

          {/* Your Team Breakdown */}
          <Box bg="white" px={5} py={5} mt={2}>
            <Text fontSize="lg" fontWeight="600" color="gray.800" mb={4}>
              Your Team Breakdown
            </Text>

            {/* Single card table layout */}
            <Box bg="coolGray.50" borderRadius="xl" borderWidth={1} borderColor="gray.200" overflow="hidden">
              {/* Table Header */}
              <HStack px={4} py={3} bg="coolGray.100">
                <Text flex={2} fontSize="xs" fontWeight="700" color="gray.500">Stock</Text>
                <Text flex={1} fontSize="xs" fontWeight="700" color="gray.500" textAlign="right">Open</Text>
                <Text flex={1} fontSize="xs" fontWeight="700" color="gray.500" textAlign="right">Close</Text>
                <Text flex={1} fontSize="xs" fontWeight="700" color="gray.500" textAlign="right">Change</Text>
              </HStack>

              {/* Stock Rows — elevated cards */}
              <VStack space={1.5} p={2}>
                {myPerformance.stocks.map((stock, index) => {
                  const closingPrice = stock.closingPrice || stock.openingPrice;
                  const change = (stock.percentageChange != null)
                    ? stock.percentageChange
                    : (stock.openingPrice > 0)
                      ? ((closingPrice - stock.openingPrice) / stock.openingPrice) * 100
                      : 0;
                  const isStockProfit = change >= 0;
                  const priceChange = closingPrice - stock.openingPrice;

                  return (
                    <HStack
                      key={index}
                      px={3}
                      py={2.5}
                      alignItems="center"
                      bg={isStockProfit ? '#f0faf1' : '#fef5f5'}
                      borderRadius="lg"
                      shadow={1}
                    >
                    <VStack flex={2}>
                      <Text fontSize="sm" fontWeight="700" color="gray.800">{stock.symbol}</Text>
                      <Text fontSize="2xs" fontWeight="600" color={isStockProfit ? '#006e1c' : '#b3272a'}>
                        {isStockProfit ? '+' : ''}{change.toFixed(2)}%
                      </Text>
                    </VStack>
                    <Text flex={1} fontSize="xs" fontWeight="600" color="gray.700" textAlign="right">
                      ₹{stock.openingPrice.toFixed(2)}
                    </Text>
                    <Text flex={1} fontSize="xs" fontWeight="600" color="gray.700" textAlign="right">
                      ₹{closingPrice.toFixed(2)}
                    </Text>
                    <Text
                      flex={1}
                      fontSize="xs"
                      fontWeight="700"
                      textAlign="right"
                      color={isStockProfit ? '#006e1c' : '#b3272a'}
                    >
                      {priceChange >= 0 ? '+' : ''}₹{priceChange.toFixed(2)}
                    </Text>
                  </HStack>
                );
              })}
              </VStack>
            </Box>
          </Box>

          {/* Bottom Padding */}
          <Box h={8} />
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <Modal isOpen={visible} onClose={onClose} size="full">
      <Modal.Content maxWidth="100%" height="100%">
        {/* Clean header — matches Home / Join Modal pattern */}
        <HStack
          justifyContent="space-between"
          alignItems="center"
          pt={16}
          px={5}
          pb={4}
          bg={theme.colors.background.default}
          borderBottomWidth={1}
          borderBottomColor={theme.colors.border.light}
        >
          <VStack flex={1} mr={3}>
            <Text fontSize="2xl" fontWeight="bold" color={theme.colors.text.primary} numberOfLines={1}>
              {contest?.name || 'Contest Results'}
            </Text>
            <HStack space={2} alignItems="center" mt={1}>
              <Box bg={theme.colors.info.main} px={2} py={0.5} borderRadius="md">
                <Text fontSize="2xs" fontWeight="700" color="white">COMPLETED</Text>
              </Box>
              {contest && (
                <Text fontSize="xs" color={theme.colors.text.secondary}>
                  {formatDateRange(contest.startTime, contest.endTime)}
                </Text>
              )}
            </HStack>
          </VStack>
          <Pressable
            onPress={onClose}
            w={8}
            h={8}
            borderRadius="full"
            bg="rgba(0, 0, 0, 0.08)"
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize="xl" color={theme.colors.text.primary} fontWeight="600">✕</Text>
          </Pressable>
        </HStack>

        <Box flex={1}>
          {renderContent()}
        </Box>

        {/* Confetti Cannon - positioned over entire Modal.Content */}
        {visible && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={99999}
            pointerEvents="none"
          >
            <ConfettiCannon
              ref={confettiRef}
              count={200}
              origin={{ x: 200, y: 0 }}
              autoStart={false}
              fadeOut={true}
              explosionSpeed={350}
              fallSpeed={3000}
              colors={['#006e1c', '#FFD700', '#4CAF50', '#FFA726', '#66BB6A']}
            />
          </Box>
        )}
      </Modal.Content>
    </Modal>
  );
};
