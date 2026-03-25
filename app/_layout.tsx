/**
 * Root Layout
 * Main navigation structure with auth-based routing
 * AuthProvider gives all components shared auth state
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme, View, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { NativeBaseProvider } from 'native-base';
import { nativeBaseTheme } from '@/src/core/theme/nativeBaseTheme';
import { AuthProvider } from '@/src/presentation/providers/AuthProvider';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { useEffect } from 'react';

export const unstable_settings = {
  initialRouteName: 'auth',
};

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, loading, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const content = (
    <NativeBaseProvider theme={nativeBaseTheme}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </NativeBaseProvider>
  );

  // On web, wrap in a rounded container to mimic device corners
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
});
