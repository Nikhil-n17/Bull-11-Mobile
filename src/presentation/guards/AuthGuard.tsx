/**
 * AuthGuard Component
 * Higher-Order Component that protects routes from unauthorized access
 *
 * Features:
 * - Checks authentication status before rendering
 * - Shows loading spinner during auth check
 * - Redirects to login if not authenticated
 * - Prevents flash of protected content
 * - Updates session activity on each render
 */

import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/presentation/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin, loading, updateActivity } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const isRedirecting = useRef(false);

  useEffect(() => {
    // Update activity on navigation (for session timeout tracking)
    if (isAuthenticated) {
      updateActivity();
    }
  }, [segments, isAuthenticated, updateActivity]);

  useEffect(() => {
    if (loading) {
      return;
    }

    // Prevent multiple simultaneous redirects
    if (isRedirecting.current) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const onIndexRoute = segments.length < 1;

    // Handle root index route - redirect based on auth status
    if (onIndexRoute) {
      isRedirecting.current = true;
      if (isAuthenticated) {
        router.replace('/(tabs)/home' as any);
      } else {
        router.replace('/auth/login' as any);
      }
      setTimeout(() => {
        isRedirecting.current = false;
      }, 500);
      return;
    }

    // If in auth group and authenticated, redirect to app
    if (inAuthGroup && isAuthenticated) {
      isRedirecting.current = true;
      router.replace('/(tabs)/home' as any);
      // Reset flag after navigation completes
      setTimeout(() => {
        isRedirecting.current = false;
      }, 500);
      return;
    }

    // If auth is required but user is not authenticated (and not in auth group)
    if (requireAuth && !isAuthenticated && !inAuthGroup) {
      isRedirecting.current = true;
      router.replace('/auth/login' as any);
      setTimeout(() => {
        isRedirecting.current = false;
      }, 500);
      return;
    }

    // If admin access is required but user is not admin
    if (requireAdmin && !isAdmin && !inTabsGroup) {
      isRedirecting.current = true;
      router.replace('/(tabs)/home' as any);
      setTimeout(() => {
        isRedirecting.current = false;
      }, 500);
      return;
    }
  }, [loading, isAuthenticated, isAdmin, requireAuth, requireAdmin, router, segments]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const inAuthGroup = segments[0] === 'auth';

  // If auth is required but user is not authenticated (and not in auth group), show loading
  // (will redirect in useEffect above)
  if (requireAuth && !isAuthenticated && !inAuthGroup) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // If admin is required but user is not admin, show loading
  // (will redirect in useEffect above)
  if (requireAdmin && !isAdmin) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // User is authenticated (and admin if required), or in auth group, render children
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});
