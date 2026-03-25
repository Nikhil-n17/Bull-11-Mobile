/**
 * ContestCard Component
 * Reusable contest card with multiple variants for different contexts
 */

import React from 'react';
import { Animated } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from 'native-base';
import { Contest, ContestEntry, ContestStatus } from '@/src/domain/entities/Contest';
import { ContestBadge } from './ContestBadge';
import { theme } from '@/src/core/theme';

export type ContestCardVariant = 'browse' | 'upcoming' | 'live' | 'past';

export interface ContestCardProps {
  contest?: Contest;
  entry?: ContestEntry;
  variant: ContestCardVariant;
  onPress?: () => void;
  onJoin?: () => void;
  onEditTeam?: () => void;
  onWithdraw?: () => void;
  onViewDetails?: () => void;
  pulseAnim?: Animated.Value;
}

export const ContestCard: React.FC<ContestCardProps> = ({
  contest,
  entry,
  variant,
  onPress,
  onJoin,
  onEditTeam,
  onWithdraw,
  onViewDetails,
  pulseAnim,
}) => {
  // Helper to format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Helper to format time
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  // Helper to calculate time remaining
  const getTimeRemaining = (targetDate: Date): string => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffMs = target.getTime() - now.getTime();

    if (diffMs < 0) return 'Started';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d ${hours % 24}h`;
    }
    return `Starts in ${hours}h ${minutes}m`;
  };

  // Helper to get rank color
  const getRankColor = (rank?: number, totalParticipants?: number): string => {
    if (!rank || !totalParticipants) return theme.colors.text.primary;
    const percentile = (rank / totalParticipants) * 100;
    if (percentile <= 10) return '#006e1c'; // Top 10% - green
    if (percentile <= 25) return theme.colors.primary.main; // Top 25% - blue
    return theme.colors.text.secondary;
  };

  // Render based on variant
  const renderBrowseCard = (contest: Contest) => (
    <Pressable
      onPress={onPress}
      bg={theme.colors.background.paper}
      borderRadius="2xl"
      p={4}
      mb={3}
      shadow={2}
      _pressed={{ opacity: 0.8 }}
    >
      <HStack justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box flex={1} mr={3}>
          <Text fontSize="lg" fontWeight="700" color={theme.colors.text.primary} mb={1}>
            {contest.name}
          </Text>
          <Text fontSize="sm" color={theme.colors.text.secondary} numberOfLines={2} lineHeight="md">
            {contest.description}
          </Text>
        </Box>
        <ContestBadge status={contest.status} size="sm" />
      </HStack>

      <HStack
        alignItems="center"
        mb={3}
        bg="rgba(0, 110, 28, 0.05)"
        borderRadius="xl"
        p={3}
      >
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Prize Pool
          </Text>
          <Text fontSize="md" fontWeight="700" color={theme.colors.text.primary}>
            {formatCurrency(contest.prizePool)}
          </Text>
        </VStack>
        <Box w="1px" h={8} bg={theme.colors.neutral.gray300} />
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Entry Fee
          </Text>
          <Text fontSize="md" fontWeight="700" color={theme.colors.text.primary}>
            {formatCurrency(contest.entryFee)}
          </Text>
        </VStack>
        <Box w="1px" h={8} bg={theme.colors.neutral.gray300} />
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Spots
          </Text>
          <Text fontSize="md" fontWeight="700" color={theme.colors.text.primary}>
            {contest.currentParticipants} / {contest.maxParticipants}
          </Text>
        </VStack>
      </HStack>

      <HStack justifyContent="space-between" alignItems="center">
        <Text fontSize="sm" color={theme.colors.text.secondary}>
          {contest.status === ContestStatus.UPCOMING
            ? getTimeRemaining(contest.startTime)
            : formatTime(contest.startTime)}
        </Text>
        {onJoin && contest.status === ContestStatus.REGISTRATION_OPEN && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            bg="#1a1a1a"
            borderRadius="full"
            px={5}
            py={2.5}
            _pressed={{ opacity: 0.8 }}
          >
            <Text fontSize="sm" fontWeight="700" color="white">
              Join Contest
            </Text>
          </Pressable>
        )}
      </HStack>
    </Pressable>
  );

  const renderUpcomingCard = (contest: Contest) => (
    <Pressable
      onPress={onPress}
      bg={theme.colors.background.paper}
      borderRadius="2xl"
      p={4}
      mb={3}
      shadow={2}
      _pressed={{ opacity: 0.8 }}
    >
      <HStack justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Text fontSize="lg" fontWeight="700" color={theme.colors.text.primary}>
          {contest.name}
        </Text>
        <ContestBadge status={contest.status} size="sm" />
      </HStack>

      <HStack
        alignItems="center"
        mb={3}
        bg="rgba(0, 110, 28, 0.05)"
        borderRadius="xl"
        p={3}
      >
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Entry Fee
          </Text>
          <Text fontSize="md" fontWeight="700" color={theme.colors.text.primary}>
            {formatCurrency(contest.entryFee)}
          </Text>
        </VStack>
        <Box w="1px" h={8} bg={theme.colors.neutral.gray300} />
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Prize Pool
          </Text>
          <Text fontSize="md" fontWeight="700" color={theme.colors.text.primary}>
            {formatCurrency(contest.prizePool)}
          </Text>
        </VStack>
      </HStack>

      <Text fontSize="sm" color={theme.colors.text.secondary} mb={3}>
        {getTimeRemaining(contest.startTime)}
      </Text>

      <HStack space={2}>
        {onEditTeam && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEditTeam();
            }}
            flex={1}
            bg="rgba(0, 110, 28, 0.1)"
            borderRadius="full"
            py={2.5}
            alignItems="center"
            _pressed={{ opacity: 0.8 }}
          >
            <Text fontSize="sm" fontWeight="600" color="#006e1c">
              Edit Team
            </Text>
          </Pressable>
        )}
        {onWithdraw && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onWithdraw();
            }}
            flex={1}
            bg="rgba(179, 39, 42, 0.1)"
            borderRadius="full"
            py={2.5}
            alignItems="center"
            _pressed={{ opacity: 0.8 }}
          >
            <Text fontSize="sm" fontWeight="600" color="#b3272a">
              Withdraw
            </Text>
          </Pressable>
        )}
      </HStack>
    </Pressable>
  );

  const renderLiveCard = (contest: Contest, entry: ContestEntry) => (
    <Pressable
      onPress={onPress}
      bg={theme.colors.background.paper}
      borderRadius="2xl"
      p={4}
      mb={3}
      shadow={2}
      _pressed={{ opacity: 0.8 }}
    >
      <HStack justifyContent="space-between" alignItems="flex-start" mb={3}>
        <VStack flex={1} mr={3}>
          <Text fontSize="lg" fontWeight="700" color={theme.colors.text.primary} numberOfLines={1}>
            {contest.name}
          </Text>
          {pulseAnim && (
            <HStack
              alignItems="center"
              mt={1.5}
              bg="rgba(0, 110, 28, 0.1)"
              px={2.5}
              py={1}
              borderRadius="xl"
              alignSelf="flex-start"
            >
              <Animated.View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#006e1c',
                  marginRight: 6,
                  transform: [{ scale: pulseAnim }],
                }}
              />
              <Text fontSize="xs" fontWeight="700" color="#006e1c" letterSpacing={0.5}>
                LIVE
              </Text>
            </HStack>
          )}
        </VStack>
      </HStack>

      <HStack
        bg="rgba(0, 110, 28, 0.05)"
        borderRadius="xl"
        p={3}
        mb={3}
      >
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Rank
          </Text>
          <Text
            fontSize="lg"
            fontWeight="700"
            color={getRankColor(entry.rank, contest.currentParticipants)}
          >
            #{entry.rank || '-'} / {contest.currentParticipants}
          </Text>
        </VStack>
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Returns
          </Text>
          <Text
            fontSize="lg"
            fontWeight="700"
            color={(entry.totalReturnPercentage ?? 0) >= 0 ? '#006e1c' : '#b3272a'}
          >
            {(entry.totalReturnPercentage ?? 0) >= 0 ? '+' : ''}
            {(entry.totalReturnPercentage ?? 0).toFixed(2)}%
          </Text>
        </VStack>
        <VStack flex={1} alignItems="center">
          <Text fontSize="xs" color={theme.colors.text.secondary} mb={1}>
            Points
          </Text>
          <Text fontSize="lg" fontWeight="700" color={theme.colors.text.primary}>
            {(entry.totalPoints ?? 0).toFixed(0)}
          </Text>
        </VStack>
      </HStack>

      {onViewDetails && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          bg="rgba(0, 110, 28, 0.1)"
          borderRadius="full"
          py={2.5}
          alignItems="center"
          _pressed={{ opacity: 0.8 }}
        >
          <Text fontSize="sm" fontWeight="700" color="#006e1c">
            View Details
          </Text>
        </Pressable>
      )}
    </Pressable>
  );

  const renderPastCard = (contest: Contest, entry: ContestEntry) => {
    const winnings = entry.totalReturnPercentage > 0 ? contest.prizePool * 0.1 : 0; // Placeholder logic

    return (
      <Pressable
        onPress={onPress}
        bg="white"
        borderRadius="2xl"
        p={4}
        mb={3}
        shadow={1}
        _pressed={{ opacity: 0.8 }}
      >
        {/* Header: Name + Rank Badge */}
        <HStack justifyContent="space-between" alignItems="flex-start" mb={2}>
          <VStack flex={1} mr={3}>
            <Text fontSize="xl" fontWeight="700" color="black">
              {contest.name}
            </Text>
            <Text fontSize="xs" color="coolGray.500" mt={1}>
              CLOSED {new Date(contest.endTime).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Kolkata',
              }).toUpperCase()}
            </Text>
          </VStack>
          <Box
            bg="success.50"
            borderRadius="lg"
            px={3}
            py={1.5}
          >
            <Text fontSize="md" fontWeight="700" color="black">
              #{entry.rank}
            </Text>
          </Box>
        </HStack>

        {/* Stats: Winnings + Total Points */}
        <HStack space={3} mb={3}>
          <VStack flex={1} bg="gray.50" borderRadius="xl" p={3}>
            <Text fontSize="2xs" color="coolGray.600" fontWeight="600" textTransform="uppercase" mb={1}>
              WINNINGS
            </Text>
            <Text fontSize="xl" fontWeight="700" color={winnings > 0 ? 'success.600' : 'black'}>
              {formatCurrency(winnings)}
            </Text>
          </VStack>
          <VStack flex={1} bg="gray.50" borderRadius="xl" p={3}>
            <Text fontSize="2xs" color="coolGray.600" fontWeight="600" textTransform="uppercase" mb={1}>
              TOTAL POINTS
            </Text>
            <Text fontSize="xl" fontWeight="700" color="black">
              {(entry.totalPoints ?? 0).toFixed(1)}
            </Text>
          </VStack>
        </HStack>

        {/* Analysis Button */}
        {onViewDetails && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            bg="coolGray.100"
            borderRadius="xl"
            py={3}
            alignItems="center"
            _pressed={{ bg: 'coolGray.200' }}
          >
            <HStack alignItems="center" space={2}>
              <Text fontSize="md" fontWeight="600" color="black">
                📊
              </Text>
              <Text fontSize="md" fontWeight="600" color="black">
                Analysis
              </Text>
            </HStack>
          </Pressable>
        )}
      </Pressable>
    );
  };

  // Route to appropriate renderer
  if (variant === 'browse' && contest) {
    return renderBrowseCard(contest);
  }
  if (variant === 'upcoming' && contest) {
    return renderUpcomingCard(contest);
  }
  if (variant === 'live' && contest && entry) {
    return renderLiveCard(contest, entry);
  }
  if (variant === 'past' && contest && entry) {
    return renderPastCard(contest, entry);
  }

  return null;
};
