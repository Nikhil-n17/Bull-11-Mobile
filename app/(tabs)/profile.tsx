/**
 * Profile Screen
 * Shows user information and logout functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Box, VStack, HStack, Text, Badge, Button, ScrollView, Center } from 'native-base';
import { useRouter } from 'expo-router';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import type { User } from '@/src/domain/entities/User';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, updateActivity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [totalGames, setTotalGames] = useState<number>(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      await updateActivity();

      // Get fresh user data
      const currentUser = await container.getCurrentUserUseCase.execute();
      setUserData(currentUser);

      // Get total games count (active + history)
      const [activeGames, historyGames] = await Promise.all([
        container.getActiveGamesUseCase.execute(),
        container.getGameHistoryUseCase.execute(),
      ]);
      setTotalGames(activeGames.length + historyGames.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Note: AuthGuard handles authentication redirects at the root level
  // No need to check isAuthenticated here - if we reached this component, we're authenticated


  useEffect(() => {
    if (isAuthenticated) {
      loadProfileData();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      // Clear all auth state
      await logout();

      // Wait for state to clear
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force navigation to login with reset
      router.replace('/auth/login');
    } catch (error) {
      Alert.alert('Logout Failed', 'Could not logout. Please try again.');
      setLoggingOut(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Center flex={1} bg="coolGray.50">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text mt={4} fontSize="md" color="coolGray.600">
          Loading profile...
        </Text>
      </Center>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      {/* Header */}
      <Box bg="secondary.500" pt={16} pb={6} px={4}>
        <Text fontSize="2xl" fontWeight="bold" color="white" mb={1}>
          Profile
        </Text>
        <Text fontSize="md" color="secondary.200">
          Manage your account
        </Text>
      </Box>

      <ScrollView>
        <VStack space={4} p={4}>
          {/* User Info Card */}
          <Box bg="white" borderRadius="lg" p={6} shadow={2}>
            <VStack space={4} alignItems="center">
              {/* Avatar Circle */}
              <Center
                w={20}
                h={20}
                borderRadius="full"
                bg="secondary.500"
                mb={2}
              >
                <Text fontSize="4xl" fontWeight="bold" color="white">
                  {userData?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </Center>

              {/* User Info Rows */}
              <VStack space={3} w="full">
                <HStack justifyContent="space-between" alignItems="center" py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
                  <Text fontSize="md" color="coolGray.600" fontWeight="medium">
                    Name
                  </Text>
                  <Text fontSize="md" color="coolGray.800" fontWeight="semibold">
                    {userData?.name || 'N/A'}
                  </Text>
                </HStack>

                <HStack justifyContent="space-between" alignItems="center" py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
                  <Text fontSize="md" color="coolGray.600" fontWeight="medium">
                    Email
                  </Text>
                  <Text fontSize="md" color="coolGray.800" fontWeight="semibold">
                    {userData?.email || 'N/A'}
                  </Text>
                </HStack>

                <HStack justifyContent="space-between" alignItems="center" py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
                  <Text fontSize="md" color="coolGray.600" fontWeight="medium">
                    Role
                  </Text>
                  <Badge
                    colorScheme={userData?.role === 'ADMIN' ? 'error' : 'primary'}
                    variant="solid"
                    rounded="full"
                    px={3}
                    py={1}
                  >
                    <Text fontSize="xs" fontWeight="bold" color="white">
                      {userData?.role || 'USER'}
                    </Text>
                  </Badge>
                </HStack>

                <HStack justifyContent="space-between" alignItems="center" py={3}>
                  <Text fontSize="md" color="coolGray.600" fontWeight="medium">
                    Member Since
                  </Text>
                  <Text fontSize="md" color="coolGray.800" fontWeight="semibold">
                    {userData?.createdAt ? formatDate(userData.createdAt) : 'N/A'}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>

          {/* Statistics Card */}
          <Box bg="white" borderRadius="lg" p={6} shadow={2}>
            <Text fontSize="lg" fontWeight="bold" color="coolGray.800" mb={4}>
              Statistics
            </Text>

            <HStack space={4} justifyContent="space-around">
              {/* Total Games Stat */}
              <Box flex={1} bg="coolGray.100" borderRadius="md" p={4} alignItems="center">
                <Text fontSize="xs" color="coolGray.600" fontWeight="medium" mb={2}>
                  TOTAL GAMES
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="secondary.500">
                  {totalGames}
                </Text>
              </Box>

              {/* Days Active Stat */}
              <Box flex={1} bg="coolGray.100" borderRadius="md" p={4} alignItems="center">
                <Text fontSize="xs" color="coolGray.600" fontWeight="medium" mb={2}>
                  DAYS ACTIVE
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="secondary.500">
                  {userData?.createdAt
                    ? Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0}
                </Text>
              </Box>
            </HStack>
          </Box>

          {/* Logout Button */}
          <Button
            onPress={handleLogout}
            isDisabled={loggingOut}
            bg="error.500"
            _pressed={{ bg: 'error.600' }}
            borderRadius="lg"
            py={4}
            mt={2}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text fontSize="md" fontWeight="semibold" color="white">
                Logout
              </Text>
            )}
          </Button>

          {/* Footer */}
          <Center py={6}>
            <Text fontSize="xs" color="coolGray.500">
              Bull-11 v1.0.0
            </Text>
          </Center>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({});
