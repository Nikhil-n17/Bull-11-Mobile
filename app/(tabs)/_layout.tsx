/**
 * Tab Layout - Unified for All Users
 * Admin users get an extra "Admin" tab
 * 4-tab design: HOME, MY CONTESTS, MY GAMES, PROFILE
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#006e1c', // Green for active tab
        tabBarInactiveTintColor: '#757575', // Gray for inactive tabs
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 70,
          paddingBottom: 12,
          paddingTop: 6,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      {/* Hide these tabs from tab bar - accessed via navigation */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="new-game"
        options={{
          href: null, // Hide from tab bar - accessed from games screen
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null, // Hide from tab bar - will be merged into games later
        }}
      />

      {/* Main 4 tabs */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contests"
        options={{
          title: 'MY CONTESTS',
          tabBarIcon: ({ color }) => <TabBarIcon name="contests" color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'MY GAMES',
          tabBarIcon: ({ color }) => <TabBarIcon name="games" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => <TabBarIcon name="profile" color={color} />,
        }}
      />

      {/* Admin-only tab - hide from non-admin users */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'ADMIN',
          tabBarIcon: ({ color }) => <TabBarIcon name="admin" color={color} />,
          href: isAdmin ? '/(tabs)/admin' : null,
        }}
      />
    </Tabs>
  );
}

// Consistent icon component using Ionicons
function TabBarIcon(props: { name: string; color: string }) {
  const iconMap: Record<string, any> = {
    home: 'home-outline',
    contests: 'trophy-outline',
    games: 'game-controller-outline',
    profile: 'person-outline',
    admin: 'settings-outline',
  };

  return (
    <Ionicons
      name={iconMap[props.name] || 'ellipse-outline'}
      size={24}
      color={props.color}
    />
  );
}
