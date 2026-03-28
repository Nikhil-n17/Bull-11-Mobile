/**
 * My Contests Screen
 * View user's contest entries with sub-tabs: Upcoming | Live | Past
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  View,
  TouchableOpacity,
} from 'react-native';
import { Box, Text, VStack, HStack, Center } from 'native-base';
import { useRouter, useFocusEffect } from 'expo-router';
import { Contest, ContestEntry, ContestStatus } from '@/src/domain/entities/Contest';
import { SubTabNavigation, SubTab } from '@/src/presentation/components/SubTabNavigation';
import { ContestCard } from '@/src/presentation/components/ContestCard';
import { ContestDetailsModal } from '@/src/presentation/components/ContestDetailsModal';
import { ContestAnalysisModal } from '@/src/presentation/components/ContestAnalysisModal';
import { ConfirmDialog } from '@/src/presentation/components/ConfirmDialog';
import { ErrorDisplay } from '@/src/presentation/components/common/ErrorDisplay';
import { theme } from '@/src/core/theme';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { ContestWebSocketClient } from '@/src/data/websocket/ContestWebSocketClient';
import type { WsLeaderboardMessage } from '@/src/data/websocket/ContestWebSocketTypes';

type SubTabType = 'upcoming' | 'live' | 'past';

// Mock user balance (will come from backend)
const USER_BALANCE = 24500;

const SUB_TABS: SubTab[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Live', value: 'live' },
  { label: 'Past', value: 'past' },
];

export default function ContestsScreen() {
  const router = useRouter();
  const { isAuthenticated, user, updateActivity } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('live');
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [contests, setContests] = useState<Map<string, Contest>>(new Map());
  const [filteredEntries, setFilteredEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-refresh interval for live contests (15 seconds) — fallback when WebSocket not connected
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebSocket client for live contest cards
  const wsClientRef = useRef<ContestWebSocketClient | null>(null);
  const wsUnsubscribersRef = useRef<Array<() => void>>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Withdraw confirmation dialog
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [entryToWithdraw, setEntryToWithdraw] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Contest details modal state
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Contest analysis modal state (for PAST contests)
  const [selectedAnalysisContestId, setSelectedAnalysisContestId] = useState<string | null>(null);
  const [selectedAnalysisEntryId, setSelectedAnalysisEntryId] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

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

  // Load entries when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadMyContests();
      }
      return () => {
        // Cleanup
      };
    }, [isAuthenticated])
  );

  // Filter entries when activeSubTab or entries change
  useEffect(() => {
    applyFilter();
  }, [activeSubTab, entries, contests]);

  // Auto-refresh for live contests (fallback when WebSocket not connected)
  useEffect(() => {
    if (activeSubTab === 'live' && filteredEntries.length > 0 && !wsConnected) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [activeSubTab, filteredEntries, wsConnected]);

  // WebSocket connection for live contest cards
  useEffect(() => {
    if (activeSubTab !== 'live' || filteredEntries.length === 0 || !user?.id) {
      // Clean up WebSocket when leaving live tab
      cleanupWs();
      return;
    }

    // Get unique live contest IDs
    const liveContestIds = [...new Set(filteredEntries.map((e) => e.contestId))];

    // Create WebSocket client
    const client = new ContestWebSocketClient();
    wsClientRef.current = client;

    const unsubConnection = client.onConnection((connected) => {
      setWsConnected(connected);
      if (connected) {
        // Subscribe to leaderboard for each live contest
        liveContestIds.forEach((cId) => {
          const unsub = client.subscribeToLeaderboard(cId, (msg: WsLeaderboardMessage) => {
            if (msg.status === 'COMPLETED') {
              // Contest completed — reload everything
              loadMyContests(true);
              return;
            }

            // Find current user's entry in leaderboard and update the card data
            const myEntry = msg.entries.find((e) => e.userId === user.id);
            if (myEntry) {
              setEntries((prev) =>
                prev.map((entry) => {
                  if (entry.contestId === cId) {
                    return {
                      ...entry,
                      rank: myEntry.rank,
                      totalReturnPercentage: myEntry.totalReturn,
                    };
                  }
                  return entry;
                })
              );
            }
          });
          wsUnsubscribersRef.current.push(unsub);
        });
      }
    });
    wsUnsubscribersRef.current.push(unsubConnection);

    client.connect().catch(() => {
      // Connection failed — REST fallback will handle it
    });

    return () => {
      cleanupWs();
    };
  }, [activeSubTab, filteredEntries.length, user?.id]);

  const cleanupWs = () => {
    wsUnsubscribersRef.current.forEach((unsub) => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    wsUnsubscribersRef.current = [];
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
    setWsConnected(false);
  };

  const startAutoRefresh = () => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    autoRefreshIntervalRef.current = setInterval(() => {
      loadMyContests(true); // Silent refresh
    }, 15000); // 15 seconds
  };

  const stopAutoRefresh = () => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
  };

  const loadMyContests = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      setLoadError(null);
      await updateActivity();

      // Get user's contest entries
      const myEntries = await container.getMyContestsUseCase.execute();
      setEntries(myEntries || []);

      // Get contest details for each unique contest
      const contestIds = [...new Set((myEntries || []).map(e => e.contestId))];
      const contestsData = await Promise.all(
        contestIds.map(id => container.getContestUseCase.execute({ contestId: id }))
      );

      // Build contest map
      const contestMap = new Map<string, Contest>();
      contestsData.forEach((contest) => contestMap.set(contest.id, contest));
      setContests(contestMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contests';
      setLoadError(errorMessage);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  const applyFilter = () => {
    const filtered = entries.filter((entry) => {
      const contest = contests.get(entry.contestId);
      if (!contest) return false;

      switch (activeSubTab) {
        case 'upcoming':
          return (
            contest.status === ContestStatus.UPCOMING ||
            contest.status === ContestStatus.REGISTRATION_OPEN
          );
        case 'live':
          return contest.status === ContestStatus.LIVE;
        case 'past':
          return (
            contest.status === ContestStatus.COMPLETED ||
            contest.status === ContestStatus.CANCELLED
          );
        default:
          return false;
      }
    });

    setFilteredEntries(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyContests(true);
    setRefreshing(false);
  };

  const handleEditTeam = (contestId: string) => {
    router.push(`/contest/${contestId}/team-builder` as any);
  };

  const handleWithdraw = (entryId: string) => {
    setEntryToWithdraw(entryId);
    setShowWithdrawConfirm(true);
  };

  const confirmWithdraw = async () => {
    if (!entryToWithdraw) return;

    setWithdrawing(true);
    try {
      await updateActivity();
      const entry = entries.find(e => e.id === entryToWithdraw);
      if (!entry) {
        throw new Error('Contest entry not found');
      }
      await container.withdrawFromContestUseCase.execute({
        contestId: entry.contestId,
      });
      // Optimistically remove the entry from UI immediately
      setEntries(prev => prev.filter(e => e.id !== entryToWithdraw));
      setShowWithdrawConfirm(false);
      setEntryToWithdraw(null);
      setWithdrawing(false);
      // Silent background refresh to sync with server
      loadMyContests(true);
    } catch (err) {
      setShowWithdrawConfirm(false);
      setEntryToWithdraw(null);
      setWithdrawing(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      Alert.alert('Withdraw Failed', errorMessage);
    }
  };

  const handleViewDetails = (contestId: string, entryId: string) => {
    setSelectedContestId(contestId);
    setSelectedEntryId(entryId);
    setShowDetailsModal(true);
  };

  const handleViewLiveDetails = (contestId: string, entryId: string) => {
    setSelectedContestId(contestId);
    setSelectedEntryId(entryId);
    setShowDetailsModal(true);
  };

  const handleViewPastAnalysis = (contestId: string, entryId: string) => {
    setSelectedAnalysisContestId(contestId);
    setSelectedAnalysisEntryId(entryId);
    setShowAnalysisModal(true);
  };

  const renderEntryCard = ({ item }: { item: ContestEntry }) => {
    const contest = contests.get(item.contestId);
    if (!contest) return null;

    const variant: 'upcoming' | 'live' | 'past' =
      activeSubTab === 'upcoming'
        ? 'upcoming'
        : activeSubTab === 'live'
        ? 'live'
        : 'past';

    return (
      <ContestCard
        contest={contest}
        entry={item}
        variant={variant}
        onEditTeam={variant === 'upcoming' ? () => handleEditTeam(contest.id) : undefined}
        onWithdraw={variant === 'upcoming' ? () => handleWithdraw(item.id) : undefined}
        onViewDetails={
          variant === 'live'
            ? () => handleViewLiveDetails(contest.id, item.id)
            : variant === 'past'
            ? () => handleViewPastAnalysis(contest.id, item.id)
            : undefined
        }
        pulseAnim={variant === 'live' ? pulseAnim : undefined}
      />
    );
  };

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
          <HStack justifyContent="space-between" alignItems="center">
            <VStack flex={1}>
              <Text fontSize="3xl" fontWeight="800" color={theme.colors.text.primary} mb={1} letterSpacing={-0.5}>
                My Contests
              </Text>
              <Text fontSize="md" color={theme.colors.text.secondary} fontWeight="500">
                Manage your active registrations and history.
              </Text>
            </VStack>
            <Box
              bg="#f3f3f3"
              borderRadius="full"
              py={2}
              px={4}
              alignItems="flex-end"
            >
              <Text fontSize="md" fontWeight="800" color="#006e1c" letterSpacing={-0.5}>
                ₹{USER_BALANCE.toLocaleString('en-IN')}
              </Text>
            </Box>
          </HStack>
        </Box>
        <Center flex={1} p={5}>
          <ActivityIndicator size="large" color="#006e1c" />
          <Text mt={3} fontSize="md" color={theme.colors.text.secondary}>
            Loading your contests...
          </Text>
        </Center>
      </Box>
    );
  }

  if (loadError && !refreshing) {
    return (
      <ErrorDisplay
        title="Failed to Load Contests"
        message={loadError}
        onRetry={loadMyContests}
      />
    );
  }

  return (
    <Box flex={1} bg={theme.colors.background.default}>
      {/* Header with Balance */}
      <Box
        pt={16}
        px={5}
        pb={4}
        bg={theme.colors.background.default}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack flex={1}>
            <Text fontSize="3xl" fontWeight="800" color={theme.colors.text.primary} mb={1} letterSpacing={-0.5}>
              My Contests
            </Text>
            <Text fontSize="md" color={theme.colors.text.secondary} fontWeight="500">
              Manage your active registrations and history.
            </Text>
          </VStack>
          <Box
            bg="#f3f3f3"
            borderRadius="full"
            py={2}
            px={4}
            alignItems="flex-end"
          >
            <Text fontSize="md" fontWeight="800" color="#006e1c" letterSpacing={-0.5}>
              ₹{USER_BALANCE.toLocaleString('en-IN')}
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Sub-Tab Navigation */}
      <SubTabNavigation
        tabs={SUB_TABS}
        activeTab={activeSubTab}
        onTabChange={(value) => setActiveSubTab(value as SubTabType)}
      />

      {/* Action Error Banner */}
      {actionError && (
        <View style={{ backgroundColor: '#fee2e2', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#dc2626', flex: 1 }}>{actionError}</Text>
          <TouchableOpacity onPress={() => setActionError(null)}>
            <Text style={{ color: '#dc2626', fontWeight: 'bold', paddingLeft: 8 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contest Entries List */}
      <FlatList
        data={filteredEntries}
        renderItem={renderEntryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Center py={16}>
            <Text fontSize="6xl" mb={4}>
              {activeSubTab === 'upcoming'
                ? '📅'
                : activeSubTab === 'live'
                ? '🔴'
                : '🏁'}
            </Text>
            <Text fontSize="lg" fontWeight="600" color={theme.colors.text.secondary} mb={2}>
              {activeSubTab === 'upcoming'
                ? 'No upcoming contests'
                : activeSubTab === 'live'
                ? 'No live contests'
                : 'No past contests'}
            </Text>
            <Text fontSize="sm" color={theme.colors.text.hint} textAlign="center" px={10}>
              {activeSubTab === 'upcoming'
                ? 'Join a contest from the Home tab'
                : activeSubTab === 'live'
                ? 'Your active contests will appear here'
                : 'Your completed contests will show here'}
            </Text>
          </Center>
        }
      />

      {/* Withdraw Confirmation Dialog */}
      <ConfirmDialog
        visible={showWithdrawConfirm}
        title="Withdraw from Contest"
        message="Are you sure you want to withdraw? Your entry fee will be refunded."
        confirmText="Withdraw"
        cancelText="Cancel"
        onConfirm={confirmWithdraw}
        onCancel={() => {
          setShowWithdrawConfirm(false);
          setEntryToWithdraw(null);
        }}
        confirmColor="#b3272a"
        isLoading={withdrawing}
      />

      {/* Live Contest Details Modal */}
      <ContestDetailsModal
        contestId={selectedContestId || ''}
        entryId={selectedEntryId || ''}
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onViewFullLeaderboard={() => {
          setShowDetailsModal(false);
          router.push(`/contest/${selectedContestId}/leaderboard` as any);
        }}
      />

      {/* Past Contest Analysis Modal */}
      <ContestAnalysisModal
        contestId={selectedAnalysisContestId || ''}
        entryId={selectedAnalysisEntryId || ''}
        visible={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
      />
    </Box>
  );
}
