/**
 * Admin Contest Management Screen
 * Create, manage, and control contest lifecycle
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import type { Contest } from '@/src/domain/entities/Contest';
import type { CreateContestRequestDTO } from '@/src/data/api/dto';

export default function AdminContestsScreen() {
  const { updateActivity } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'DAILY' | 'WEEKLY' | 'CUSTOM'>('DAILY');
  const [formMaxParticipants, setFormMaxParticipants] = useState('100');
  const [formEntryFee, setFormEntryFee] = useState('0');
  const [formPrizePool, setFormPrizePool] = useState('5000');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      await updateActivity();
      // Fetch all contest categories to avoid PgBouncer prepared statement issue
      const repo = container.contestRepository;
      const [upcoming, live, completed] = await Promise.all([
        repo.getUpcomingContests(),
        repo.getLiveContests(),
        repo.getCompletedContests(),
      ]);
      const contestMap = new Map<string, Contest>();
      [...upcoming, ...live, ...completed].forEach(c => contestMap.set(c.id, c));
      setContests(Array.from(contestMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContests(true);
    setRefreshing(false);
  };

  const handleCreateContest = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation', 'Contest name is required');
      return;
    }

    try {
      setCreating(true);

      // Set times: registration starts now, ends in 30 min, contest starts in 35 min, ends in 6 hours
      const now = new Date();
      const regStart = new Date(now.getTime());
      const regEnd = new Date(now.getTime() + 30 * 60 * 1000);
      const contestStart = new Date(now.getTime() + 35 * 60 * 1000);
      const contestEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      // Backend expects IST times (it converts IST → UTC before saving).
      // Format as IST LocalDateTime (no Z suffix).
      const formatAsIST = (d: Date) => {
        const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const y = ist.getFullYear();
        const m = String(ist.getMonth() + 1).padStart(2, '0');
        const day = String(ist.getDate()).padStart(2, '0');
        const h = String(ist.getHours()).padStart(2, '0');
        const min = String(ist.getMinutes()).padStart(2, '0');
        const s = String(ist.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${day}T${h}:${min}:${s}`;
      };

      const request: CreateContestRequestDTO = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        registrationStart: formatAsIST(regStart),
        registrationEnd: formatAsIST(regEnd),
        contestStart: formatAsIST(contestStart),
        contestEnd: formatAsIST(contestEnd),
        type: formType,
        maxParticipants: parseInt(formMaxParticipants) || 100,
        entryFee: parseFloat(formEntryFee) || 0,
        prizePool: parseFloat(formPrizePool) || 5000,
        isPublic: true,
      };

      await container.contestRepository.createContest(request);

      Alert.alert('Success', 'Contest created! Open registration to let users join.');
      setShowCreateModal(false);
      resetForm();
      await loadContests(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create contest');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormType('DAILY');
    setFormMaxParticipants('100');
    setFormEntryFee('0');
    setFormPrizePool('5000');
  };

  const handleAction = async (contestId: string, action: string, label: string) => {
    Alert.alert(
      `Confirm ${label}`,
      `Are you sure you want to ${label.toLowerCase()} this contest?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'cancel' || action === 'delete' ? 'destructive' : 'default',
          onPress: () => executeAction(contestId, action, label),
        },
      ]
    );
  };

  const executeAction = async (contestId: string, action: string, label: string) => {
    try {
      setActionLoading(`${contestId}-${action}`);
      const repo = container.contestRepository;

      switch (action) {
        case 'open-registration':
          await repo.forceOpenRegistration(contestId);
          break;
        case 'force-start':
          await repo.forceStartContest(contestId);
          break;
        case 'force-end':
          await repo.forceEndContest(contestId);
          break;
        case 'cancel':
          await repo.cancelContest(contestId);
          break;
        case 'delete':
          await repo.deleteContest(contestId);
          break;
      }

      Alert.alert('Success', `${label} completed`);
      await loadContests(true);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : `Failed to ${label.toLowerCase()}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'UPCOMING': return '#2196F3';
      case 'REGISTRATION_OPEN': return '#FF9800';
      case 'LIVE': return '#4CAF50';
      case 'COMPLETED': return '#9E9E9E';
      case 'CANCELLED': return '#f44336';
      default: return '#757575';
    }
  };

  const getAvailableActions = (contest: Contest): { action: string; label: string; color: string }[] => {
    const status = contest.status;
    const actions: { action: string; label: string; color: string }[] = [];

    switch (status) {
      case 'UPCOMING':
        actions.push({ action: 'open-registration', label: 'Open Registration', color: '#FF9800' });
        actions.push({ action: 'cancel', label: 'Cancel', color: '#f44336' });
        actions.push({ action: 'delete', label: 'Delete', color: '#b71c1c' });
        break;
      case 'REGISTRATION_OPEN':
        actions.push({ action: 'force-start', label: 'Force Start', color: '#4CAF50' });
        actions.push({ action: 'cancel', label: 'Cancel', color: '#f44336' });
        break;
      case 'LIVE':
        actions.push({ action: 'force-end', label: 'Force End', color: '#FF9800' });
        break;
      case 'COMPLETED':
        actions.push({ action: 'delete', label: 'Delete', color: '#b71c1c' });
        break;
      case 'CANCELLED':
        actions.push({ action: 'delete', label: 'Delete', color: '#b71c1c' });
        break;
    }

    return actions;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const renderContestCard = (contest: Contest) => {
    const actions = getAvailableActions(contest);
    const statusColor = getStatusColor(contest.status);

    return (
      <View key={contest.id} style={styles.contestCard}>
        <View style={styles.contestHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.contestName}>{contest.name}</Text>
            {contest.description ? (
              <Text style={styles.contestDesc} numberOfLines={1}>{contest.description}</Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{contest.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.contestMeta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Participants:</Text>
            <Text style={styles.metaValue}>{contest.currentParticipants}/{contest.maxParticipants}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Prize Pool:</Text>
            <Text style={styles.metaValue}>₹{contest.prizePool.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Entry Fee:</Text>
            <Text style={styles.metaValue}>₹{contest.entryFee}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Start:</Text>
            <Text style={styles.metaValue}>{formatTime(contest.startTime)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>End:</Text>
            <Text style={styles.metaValue}>{formatTime(contest.endTime)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ID:</Text>
            <Text style={[styles.metaValue, { fontSize: 10 }]}>{contest.id}</Text>
          </View>
        </View>

        {actions.length > 0 && (
          <View style={styles.actionsRow}>
            {actions.map(({ action, label, color }) => {
              const isLoading = actionLoading === `${contest.id}-${action}`;
              return (
                <TouchableOpacity
                  key={action}
                  style={[styles.actionButton, { backgroundColor: color }]}
                  onPress={() => handleAction(contest.id, action, label)}
                  disabled={!!actionLoading}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>{label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading contests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contest Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>+ New Contest</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {contests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>No contests yet</Text>
            <Text style={styles.emptySubtext}>Create your first contest to get started</Text>
          </View>
        ) : (
          contests.map(renderContestCard)
        )}
      </ScrollView>

      {/* Create Contest Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Contest</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.fieldLabel}>Contest Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Daily IT Showdown"
              placeholderTextColor="#999"
              value={formName}
              onChangeText={setFormName}
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Contest description..."
              placeholderTextColor="#999"
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              maxLength={500}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['DAILY', 'WEEKLY', 'CUSTOM'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, formType === t && styles.typePillActive]}
                  onPress={() => setFormType(t)}
                >
                  <Text style={[styles.typePillText, formType === t && styles.typePillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Max Participants</Text>
                <TextInput
                  style={styles.input}
                  value={formMaxParticipants}
                  onChangeText={setFormMaxParticipants}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Entry Fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={formEntryFee}
                  onChangeText={setFormEntryFee}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Prize Pool (₹)</Text>
            <TextInput
              style={styles.input}
              value={formPrizePool}
              onChangeText={setFormPrizePool}
              keyboardType="numeric"
              placeholder="5000"
              placeholderTextColor="#999"
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Times will be auto-set: Registration opens now, closes in 30 min. Contest starts 35 min from now, runs for 6 hours. You can force-start/end anytime.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, creating && { opacity: 0.6 }]}
              onPress={handleCreateContest}
              disabled={creating}
              activeOpacity={0.7}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Contest</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  contestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contestName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  contestDesc: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  contestMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  metaLabel: {
    fontSize: 13,
    color: '#888',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
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
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  typePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  typePillActive: {
    backgroundColor: '#FF9800',
  },
  typePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typePillTextActive: {
    color: '#ffffff',
  },
  formRow: {
    flexDirection: 'row',
  },
  infoBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  infoText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#FF9800',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
