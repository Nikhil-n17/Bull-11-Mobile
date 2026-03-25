/**
 * Admin Tab Screen
 * Admin-specific features and management tools
 * Only visible to users with ADMIN role
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/src/presentation/components/common/Card';
import { LoadingSpinner } from '@/src/presentation/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/src/presentation/components/common/ErrorDisplay';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { ErrorHandler } from '@/src/core/utils/errorHandler';
import type { User } from '@/src/domain/entities/User';

export default function AdminScreen() {
  const router = useRouter();
  const { user, isAdmin, updateActivity } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeGames: 0,
    kiteConnected: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.replace('/(tabs)' as any);
    }
  }, [isAdmin, loading]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin]);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      await updateActivity();

      // Load user count
      const users = await container.getAllUsersUseCase.execute();
      setStats((prev) => ({ ...prev, totalUsers: users.length }));

      // TODO: Load other stats when available
    } catch (err) {
      const errorMessage = ErrorHandler.getShortMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const navigateToUserManagement = () => {
    router.push('/(admin)/users' as any);
  };

  const navigateToKiteSetup = () => {
    router.push('/(admin)/kite-setup' as any);
  };

  const navigateToContestManagement = () => {
    router.push('/(admin)/contests' as any);
  };

  const navigateToAllGames = () => {
    Alert.alert('Coming Soon', 'View all user games feature is under development');
  };

  const navigateToSystemStats = () => {
    Alert.alert('Coming Soon', 'System statistics feature is under development');
  };

  if (loading) {
    return <LoadingSpinner message="Loading admin panel..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to Load Admin Panel"
        message={error}
        onRetry={loadAdminStats}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.name || 'Admin'}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeGames}</Text>
            <Text style={styles.statLabel}>Active Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, stats.kiteConnected ? styles.connected : styles.disconnected]}>
              {stats.kiteConnected ? '✓' : '✗'}
            </Text>
            <Text style={styles.statLabel}>Kite API</Text>
          </View>
        </View>

        {/* Admin Actions */}
        <Text style={styles.sectionTitle}>Management</Text>

        <Card onPress={navigateToUserManagement}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>👥</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionDescription}>
                View and manage all registered users
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </Card>

        <Card onPress={navigateToKiteSetup}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>🔗</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Kite Integration</Text>
              <Text style={styles.actionDescription}>
                Configure Zerodha Kite API connection
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </Card>

        <Card onPress={navigateToContestManagement}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>🏆</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Contest Management</Text>
              <Text style={styles.actionDescription}>
                Create, start, and end contests
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </Card>

        <Card onPress={navigateToAllGames}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>🎮</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>All Games</Text>
              <Text style={styles.actionDescription}>
                Monitor all user games and activity
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </Card>

        <Card onPress={navigateToSystemStats}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>System Statistics</Text>
              <Text style={styles.actionDescription}>
                View performance metrics and analytics
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </Card>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            You have administrative privileges. Use these features responsibly.
          </Text>
        </View>
      </ScrollView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff3e0',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#f44336',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  actionIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionArrow: {
    fontSize: 32,
    color: '#ccc',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
});
