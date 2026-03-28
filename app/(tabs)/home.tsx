/**
 * Home Screen - Contest Discovery
 * Browse and join available contests
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Box, Text, VStack, HStack, Pressable, Center } from 'native-base';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Contest, ContestStatus } from '@/src/domain/entities/Contest';
import { ContestCard } from '@/src/presentation/components/ContestCard';
import { ErrorDisplay } from '@/src/presentation/components/common/ErrorDisplay';
import { theme } from '@/src/core/theme';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';

type FilterType = 'all' | 'today' | 'week' | 'registration';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, updateActivity } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [contests, setContests] = useState<Contest[]>([]);
  const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Join contest modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [teamName, setTeamName] = useState('');
  const [joining, setJoining] = useState(false);

  // Pulse animation for live badges
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

  // Load contests on mount, and silently refresh whenever the tab is focused
  const hasLoadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        loadContests();
      } else {
        loadContests(true); // silent refresh on re-focus
      }
    }, [])
  );

  // Apply filters whenever contests or activeFilter changes
  useEffect(() => {
    applyFilter();
  }, [contests, activeFilter]);

  const loadContests = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);
      await updateActivity();

      // Fetch upcoming and live contests separately to avoid
      // PgBouncer prepared statement issue with findAll()
      const [upcoming, live, myContests] = await Promise.all([
        container.contestRepository.getUpcomingContests(),
        container.contestRepository.getLiveContests(),
        container.contestRepository.getMyContests(),
      ]);

      // Build set of contest IDs the user has already joined
      setJoinedContestIds(new Set(myContests.map(entry => entry.contestId)));

      // Merge and deduplicate by id
      const contestMap = new Map<string, Contest>();
      [...upcoming, ...live].forEach(c => contestMap.set(c.id, c));
      setContests(Array.from(contestMap.values()));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contests';
      setError(errorMessage);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  const applyFilter = () => {
    let filtered = [...contests];

    switch (activeFilter) {
      case 'today':
        // Show contests starting today
        filtered = filtered.filter((c) => {
          const today = new Date();
          const startDate = new Date(c.startTime);
          return (
            startDate.getDate() === today.getDate() &&
            startDate.getMonth() === today.getMonth() &&
            startDate.getFullYear() === today.getFullYear()
          );
        });
        break;
      case 'week':
        // Show contests within this calendar week (Mon–Sun)
        filtered = filtered.filter((c) => {
          const now = new Date();
          const startDate = new Date(c.startTime);
          // Get Monday of current week
          const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
          const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
          const monday = new Date(now);
          monday.setDate(now.getDate() + diffToMonday);
          monday.setHours(0, 0, 0, 0);
          // Get Sunday of current week
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          return startDate >= monday && startDate <= sunday;
        });
        break;
      case 'registration':
        filtered = filtered.filter((c) => c.status === ContestStatus.REGISTRATION_OPEN);
        break;
      case 'all':
      default:
        // Show all except completed/cancelled
        filtered = filtered.filter(
          (c) =>
            c.status !== ContestStatus.COMPLETED && c.status !== ContestStatus.CANCELLED
        );
        break;
    }

    setFilteredContests(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContests(true);
    setRefreshing(false);
  };

  const handleJoinContest = (contest: Contest) => {
    setSelectedContest(contest);
    setTeamName('');
    setShowJoinModal(true);
  };

  const handleConfirmJoin = async () => {
    if (!selectedContest || !teamName.trim()) {
      return;
    }

    try {
      setJoining(true);
      await updateActivity();

      await container.joinContestUseCase.execute({
        contestId: selectedContest.id,
        teamName: teamName.trim(),
      });

      // Optimistically update joined set so the button flips immediately
      setJoinedContestIds(prev => new Set(prev).add(selectedContest.id));

      // Navigate to team builder
      setShowJoinModal(false);
      router.push(`/contest/${selectedContest.id}/team-builder` as any);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join contest';
      setShowJoinModal(false);
      setError(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  const renderFilterPill = (filter: FilterType, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <Pressable
        key={filter}
        onPress={() => setActiveFilter(filter)}
        px={5}
        py={2.5}
        borderRadius="full"
        bg={isActive ? '#1a1a1a' : 'rgba(0, 0, 0, 0.08)'}
        _pressed={{ opacity: 0.7 }}
      >
        <Text
          fontSize="sm"
          fontWeight="600"
          color={isActive ? 'white' : 'coolGray.700'}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderContestCard = ({ item, index }: { item: Contest; index: number }) => (
    <ContestCard
      contest={item}
      variant="browse"
      isUserJoined={joinedContestIds.has(item.id)}
      onJoin={() => handleJoinContest(item)}
      pulseAnim={item.status === ContestStatus.LIVE ? pulseAnim : undefined}
    />
  );

  if (!isAuthenticated) {
    return null;
  }

  if (loading && !refreshing) {
    return (
      <Box flex={1} bg={theme.colors.background.default}>
        <Box
          pt={16}
          px={5}
          pb={4}
          bg={theme.colors.background.default}
        >
          <Text fontSize="3xl" fontWeight="800" color={theme.colors.text.primary} mb={1} letterSpacing={-0.5}>
            Upcoming Contests
          </Text>
          <Text fontSize="md" color={theme.colors.text.secondary} fontWeight="500">
            Draft your portfolio for the next market session.
          </Text>
        </Box>
        <Center flex={1} p={5}>
          <ActivityIndicator size="large" color="#006e1c" />
          <Text mt={3} fontSize="md" color={theme.colors.text.secondary}>
            Loading contests...
          </Text>
        </Center>
      </Box>
    );
  }

  if (error && !refreshing) {
    return (
      <ErrorDisplay
        title="Failed to Load Contests"
        message={error}
        onRetry={loadContests}
      />
    );
  }

  return (
    <Box flex={1} bg={theme.colors.background.default}>
      {/* Header */}
      <Box
        pt={16}
        px={5}
        pb={4}
        bg={theme.colors.background.default}
      >
        <Text fontSize="3xl" fontWeight="800" color={theme.colors.text.primary} mb={1} letterSpacing={-0.5}>
          Upcoming Contests
        </Text>
        <Text fontSize="md" color={theme.colors.text.secondary} fontWeight="500">
          Draft your portfolio for the next market session.
        </Text>
      </Box>

      {/* Filter Pills */}
      <HStack px={4} py={4} space={2} bg={theme.colors.background.default}>
        {renderFilterPill('all', 'All')}
        {renderFilterPill('today', 'Today')}
        {renderFilterPill('week', 'This Week')}
        {renderFilterPill('registration', 'Open')}
      </HStack>

      {/* Contest List */}
      <FlatList
        data={filteredContests}
        renderItem={renderContestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Center py={16}>
            <Text fontSize="6xl" mb={4}>
              🏆
            </Text>
            <Text fontSize="lg" fontWeight="600" color={theme.colors.text.secondary} mb={2}>
              No contests available
            </Text>
            <Text fontSize="sm" color={theme.colors.text.hint} textAlign="center">
              {activeFilter === 'all'
                ? 'Check back later for new contests'
                : 'Try changing the filter'}
            </Text>
          </Center>
        }
      />

      {/* Join Contest Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <Box flex={1} bg={theme.colors.background.default}>
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
            <Text fontSize="2xl" fontWeight="bold" color={theme.colors.text.primary}>
              Join Contest
            </Text>
            <Pressable
              onPress={() => setShowJoinModal(false)}
              w={8}
              h={8}
              borderRadius="full"
              bg="rgba(0, 0, 0, 0.08)"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize="xl" color={theme.colors.text.primary} fontWeight="600">
                ✕
              </Text>
            </Pressable>
          </HStack>

          <VStack flex={1} p={5}>
            {selectedContest && (
              <>
                <Box
                  bg="rgba(0, 110, 28, 0.05)"
                  borderRadius="xl"
                  p={4}
                  mb={6}
                >
                  <Text fontSize="lg" fontWeight="700" color={theme.colors.text.primary} mb={2}>
                    {selectedContest.name}
                  </Text>
                  <Text fontSize="sm" color={theme.colors.text.secondary} mb={1}>
                    Entry Fee: ₹{selectedContest.entryFee.toLocaleString('en-IN')}
                  </Text>
                  <Text fontSize="sm" color={theme.colors.text.secondary}>
                    Prize Pool: ₹{selectedContest.prizePool.toLocaleString('en-IN')}
                  </Text>
                </Box>

                <VStack mb={6}>
                  <Text fontSize="sm" fontWeight="600" color={theme.colors.text.primary} mb={2}>
                    Team Name
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.colors.background.paper,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: theme.colors.border.light,
                      color: theme.colors.text.primary,
                    }}
                    placeholder="Enter your team name..."
                    placeholderTextColor={theme.colors.text.hint}
                    value={teamName}
                    onChangeText={setTeamName}
                    autoCapitalize="words"
                    maxLength={30}
                    editable={!joining}
                  />
                  <Text fontSize="xs" color={theme.colors.text.hint} mt={1.5}>
                    Choose a unique name for your team (max 30 characters)
                  </Text>
                </VStack>

                <Pressable
                  onPress={handleConfirmJoin}
                  isDisabled={!teamName.trim() || joining}
                  bg="#1a1a1a"
                  borderRadius="3xl"
                  py={3.5}
                  alignItems="center"
                  opacity={!teamName.trim() || joining ? 0.5 : 1}
                  _pressed={{ opacity: 0.8 }}
                >
                  {joining ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text fontSize="md" fontWeight="700" color="white">
                      Continue to Team Builder
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </VStack>
        </Box>
      </Modal>
    </Box>
  );
}
