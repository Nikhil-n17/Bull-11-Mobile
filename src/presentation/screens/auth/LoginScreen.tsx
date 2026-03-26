/**
 * Login Screen - Redesigned with NativeBase
 * Handles user authentication with rate limiting
 */

import React, { useState } from 'react';
import { Platform, Alert, KeyboardAvoidingView, TextInput, StyleSheet } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  Icon,
  ScrollView,
  Spinner,
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { ErrorText } from '../../components/common/ErrorText';
import { ServerWakeUpLoader } from '../../components/common/ServerWakeUpLoader';
import { useAuth } from '../../hooks/useAuth';
import { useServerWakeUp } from '../../hooks/useServerWakeUp';
import { RateLimiter } from '@/src/core/security';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { isWakingUp, startRequest, completeRequest, dismiss } = useServerWakeUp();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setRemainingAttempts(null);

      // Start tracking for cold start detection
      startRequest();

      const user = await login({
        email: data.email.trim(),
        password: data.password,
      });

      // Complete tracking
      completeRequest();

      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 200));

      // All users navigate to the same tabs - admins will see extra Admin tab
      router.replace('/(tabs)/home' as any);
    } catch (error) {
      // Complete tracking on error too
      completeRequest();

      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      setErrorMessage(message);

      const check = await RateLimiter.isAllowed(data.email.trim());
      setRemainingAttempts(check.remainingAttempts);

      // Show different alerts based on error type
      if (message.includes('Too many failed')) {
        Alert.alert(
          'Account Temporarily Locked',
          message,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Login Failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Box flex={1} bg="coolGray.50" safeArea>
          <VStack
            flex={1}
            px={6}
            py={8}
            justifyContent="center"
            alignItems="center"
            space={8}
          >
            {/* Header with Icon */}
            <VStack alignItems="center" space={3}>
              <Box
                bg="white"
                p={4}
                borderRadius="2xl"
                shadow={2}
              >
                <Icon
                  as={MaterialIcons}
                  name="account-balance"
                  size="xl"
                  color="green.600"
                />
              </Box>

              <Text
                fontSize="4xl"
                fontWeight="bold"
                color="black"
              >
                Bull-11
              </Text>

              <Text
                fontSize="md"
                color="coolGray.500"
                textAlign="center"
              >
                India's premier refined assets, curated for growth.
              </Text>
            </VStack>

            {/* Form Container */}
            <VStack w="100%" maxW="400px" space={4}>
              {/* Email Input */}
              <VStack space={2}>
                <Text
                  fontSize="xs"
                  fontWeight="500"
                  color="coolGray.500"
                  textTransform="uppercase"
                  letterSpacing="sm"
                >
                  Email Address
                </Text>
                <Controller
                  control={control}
                  name="email"
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isLoading}
                      placeholderTextColor="#a1a1aa"
                      style={styles.input}
                    />
                  )}
                />
                {errors.email && (
                  <Text fontSize="xs" color="red.500">
                    {errors.email.message}
                  </Text>
                )}
              </VStack>

              {/* Password Input with Forgot Link */}
              <VStack space={2}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text
                    fontSize="xs"
                    fontWeight="500"
                    color="coolGray.500"
                    textTransform="uppercase"
                    letterSpacing="sm"
                  >
                    Password
                  </Text>
                  <Pressable>
                    <Text fontSize="sm" color="green.600" fontWeight="500">
                      Forgot Password?
                    </Text>
                  </Pressable>
                </HStack>
                <Controller
                  control={control}
                  name="password"
                  rules={{
                    required: 'Password is required',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="••••••••"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      editable={!isLoading}
                      placeholderTextColor="#a1a1aa"
                      style={styles.input}
                    />
                  )}
                />
                {errors.password && (
                  <Text fontSize="xs" color="red.500">
                    {errors.password.message}
                  </Text>
                )}
              </VStack>

              {/* Error Message */}
              {errorMessage && <ErrorText message={errorMessage} />}

              {/* Rate Limit Warning */}
              {remainingAttempts !== null && remainingAttempts < 5 && (
                <HStack
                  bg="orange.50"
                  borderLeftWidth={3}
                  borderLeftColor="orange.500"
                  borderRadius="md"
                  p={3}
                  space={2}
                  alignItems="flex-start"
                >
                  <Text fontSize="md">⚠️</Text>
                  <Text fontSize="xs" color="orange.700" flex={1}>
                    {remainingAttempts} attempts remaining. Account will be locked for 30 minutes after 5 failed attempts.
                  </Text>
                </HStack>
              )}

              {/* Login Button - Green Pill Shape */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                isDisabled={isLoading}
                mt={2}
              >
                {({ isPressed }) => (
                  <Box
                    bg={isPressed ? 'green.700' : 'green.600'}
                    borderRadius="full"
                    py={4}
                    px={6}
                    shadow={3}
                    opacity={isLoading ? 0.7 : 1}
                  >
                    {isLoading ? (
                      <HStack justifyContent="center" alignItems="center" space={2}>
                        <Spinner color="white" size="sm" />
                        <Text
                          color="white"
                          fontSize="lg"
                          fontWeight="semibold"
                          textAlign="center"
                        >
                          Logging In...
                        </Text>
                      </HStack>
                    ) : (
                      <HStack justifyContent="center" alignItems="center" space={2}>
                        <Text
                          color="white"
                          fontSize="lg"
                          fontWeight="semibold"
                        >
                          Login
                        </Text>
                        <Icon
                          as={MaterialIcons}
                          name="arrow-forward"
                          size="md"
                          color="white"
                        />
                      </HStack>
                    )}
                  </Box>
                )}
              </Pressable>

              {/* Divider with Text */}
              <HStack alignItems="center" space={3} my={2}>
                <Box flex={1} h="1px" bg="coolGray.300" />
                <Text fontSize="xs" color="coolGray.400" textTransform="uppercase">
                  Secure Access
                </Text>
                <Box flex={1} h="1px" bg="coolGray.300" />
              </HStack>

              {/* Sign Up Link */}
              <Pressable
                onPress={() => router.push('/auth/register' as any)}
              >
                <Text
                  fontSize="md"
                  color="coolGray.600"
                  textAlign="center"
                >
                  Don't have an account?{' '}
                  <Text color="green.600" fontWeight="bold">
                    Sign Up
                  </Text>
                </Text>
              </Pressable>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>

      {/* Server Wake-Up Loader Modal */}
      <ServerWakeUpLoader visible={isWakingUp} onDismiss={dismiss} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#18181b',
  },
});
