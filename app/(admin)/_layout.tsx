/**
 * Admin Layout
 * Stack navigator for admin section with protected routes
 * Requires ADMIN role to access
 */

import { Stack } from 'expo-router';
import React from 'react';
import { AdminGuard } from '@/src/presentation/guards';

export default function AdminLayout() {
  return (
    <AdminGuard>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="dashboard"
          options={{
            title: 'Admin Dashboard',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="users"
          options={{
            title: 'User Management',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="users/[id]"
          options={{
            title: 'User Details',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="kite-setup"
          options={{
            title: 'Kite Integration',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="contests"
          options={{
            title: 'Contest Management',
            headerShown: false,
          }}
        />
      </Stack>
    </AdminGuard>
  );
}
