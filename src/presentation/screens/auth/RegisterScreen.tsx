/**
 * Registration Screen
 * Handles user registration with password validation
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Box,
  VStack,
  Text,
  Input,
  Button,
  Checkbox,
  ScrollView,
  Icon,
  HStack,
  Progress,
  Pressable,
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { PasswordValidator } from '@/src/core/security';
import type { PasswordValidationResult } from '@/src/core/security';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordValidationResult | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  // Update password strength indicator as user types
  const handlePasswordChange = (text: string) => {
    if (text.length > 0) {
      const result = PasswordValidator.validate(text);
      setPasswordStrength(result);
    } else {
      setPasswordStrength(null);
    }
    return text;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Check terms acceptance
      if (!termsAccepted) {
        setErrorMessage('Please accept the Terms of Service and Privacy Policy');
        return;
      }

      // Validate password strength
      const validation = PasswordValidator.validate(data.password);
      if (!validation.isValid) {
        setErrorMessage(validation.errors.join('\n'));
        return;
      }

      // Check password match
      if (data.password !== data.confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }

      await register({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      });

      // Registration successful - redirect to login
      Alert.alert(
        'Account Created! 🎉',
        'Your account has been created successfully. Please login to continue.',
        [
          {
            text: 'Go to Login',
            onPress: () => router.replace('/auth/login' as any),
          },
        ]
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setErrorMessage(message);
      Alert.alert('Registration Failed', message);
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
          <VStack flex={1} justifyContent="center" px={6} py={8} space={8}>
            {/* Header with Wallet Icon */}
            <VStack alignItems="center" space={4}>
              <Box
                bg="green.700"
                p={4}
                borderRadius="2xl"
                shadow={3}
              >
                <Icon
                  as={MaterialIcons}
                  name="account-balance-wallet"
                  size="xl"
                  color="white"
                />
              </Box>
              <VStack alignItems="center" space={1}>
                <Text fontSize="3xl" fontWeight="bold" color="coolGray.800">
                  Bull-11
                </Text>
                <Text fontSize="md" color="coolGray.600" textAlign="center" px={4}>
                  Curate your legacy in Indian Markets. Join the premier BSE/NSE stock fantasy league.
                </Text>
              </VStack>
            </VStack>

            {/* Registration Form */}
            <Box bg="white" borderRadius="xl" p={6} shadow={2}>
              <VStack space={4}>
                {/* Full Name Field */}
                <VStack space={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="coolGray.600" textTransform="uppercase">
                    FULL NAME
                  </Text>
                  <Controller
                    control={control}
                    name="name"
                    rules={{
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        placeholder="Alexander Hamilton"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        isDisabled={isLoading}
                        autoCapitalize="words"
                        bg="coolGray.100"
                        borderColor="transparent"
                        borderRadius="lg"
                        py={3}
                        px={4}
                        fontSize="md"
                        _focus={{
                          bg: 'coolGray.100',
                          borderColor: 'green.500',
                          borderWidth: 2,
                        }}
                        isInvalid={!!errors.name}
                      />
                    )}
                  />
                  {errors.name && (
                    <Text fontSize="xs" color="red.500">
                      {errors.name.message}
                    </Text>
                  )}
                </VStack>

                {/* Email Field */}
                <VStack space={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="coolGray.600" textTransform="uppercase">
                    EMAIL ADDRESS
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
                      <Input
                        placeholder="alex@example.com"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        isDisabled={isLoading}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        bg="coolGray.100"
                        borderColor="transparent"
                        borderRadius="lg"
                        py={3}
                        px={4}
                        fontSize="md"
                        _focus={{
                          bg: 'coolGray.100',
                          borderColor: 'green.500',
                          borderWidth: 2,
                        }}
                        isInvalid={!!errors.email}
                      />
                    )}
                  />
                  {errors.email && (
                    <Text fontSize="xs" color="red.500">
                      {errors.email.message}
                    </Text>
                  )}
                </VStack>

                {/* Password Field */}
                <VStack space={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="coolGray.600" textTransform="uppercase">
                    PASSWORD
                  </Text>
                  <Controller
                    control={control}
                    name="password"
                    rules={{
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <VStack space={2}>
                        <Input
                          placeholder="Enter your password"
                          value={value}
                          onChangeText={(text) => {
                            onChange(text);
                            handlePasswordChange(text);
                          }}
                          onBlur={onBlur}
                          isDisabled={isLoading}
                          type="password"
                          autoCapitalize="none"
                          autoComplete="password"
                          bg="coolGray.100"
                          borderColor="transparent"
                          borderRadius="lg"
                          py={3}
                          px={4}
                          fontSize="md"
                          _focus={{
                            bg: 'coolGray.100',
                            borderColor: 'green.500',
                            borderWidth: 2,
                          }}
                          isInvalid={!!errors.password}
                        />

                        {/* Password Strength Indicator */}
                        {passwordStrength && passwordValue.length > 0 && (
                          <VStack space={2}>
                            <Progress
                              value={
                                passwordStrength.strength === 'weak'
                                  ? 33
                                  : passwordStrength.strength === 'medium'
                                  ? 66
                                  : 100
                              }
                              colorScheme={
                                passwordStrength.strength === 'weak'
                                  ? 'red'
                                  : passwordStrength.strength === 'medium'
                                  ? 'yellow'
                                  : 'green'
                              }
                              size="xs"
                            />
                            <Text
                              fontSize="xs"
                              fontWeight="medium"
                              color={
                                passwordStrength.strength === 'weak'
                                  ? 'red.500'
                                  : passwordStrength.strength === 'medium'
                                  ? 'yellow.600'
                                  : 'green.500'
                              }
                            >
                              {passwordStrength.strength.charAt(0).toUpperCase() +
                                passwordStrength.strength.slice(1)}{' '}
                              password
                            </Text>
                            {passwordStrength.errors.length > 0 && (
                              <Box
                                bg="red.50"
                                p={2}
                                borderRadius="md"
                                borderLeftWidth={3}
                                borderLeftColor="red.500"
                              >
                                <Text fontSize="xs" fontWeight="semibold" color="red.700" mb={1}>
                                  Requirements:
                                </Text>
                                {passwordStrength.errors.map((error, index) => (
                                  <Text key={index} fontSize="xs" color="red.600">
                                    • {error}
                                  </Text>
                                ))}
                              </Box>
                            )}
                          </VStack>
                        )}
                      </VStack>
                    )}
                  />
                  {errors.password && (
                    <Text fontSize="xs" color="red.500">
                      {errors.password.message}
                    </Text>
                  )}
                </VStack>

                {/* Confirm Password Field */}
                <VStack space={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="coolGray.600" textTransform="uppercase">
                    CONFIRM
                  </Text>
                  <Controller
                    control={control}
                    name="confirmPassword"
                    rules={{
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === passwordValue || 'Passwords do not match',
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        placeholder="Re-enter your password"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        isDisabled={isLoading}
                        type="password"
                        autoCapitalize="none"
                        bg="coolGray.100"
                        borderColor="transparent"
                        borderRadius="lg"
                        py={3}
                        px={4}
                        fontSize="md"
                        _focus={{
                          bg: 'coolGray.100',
                          borderColor: 'green.500',
                          borderWidth: 2,
                        }}
                        isInvalid={!!errors.confirmPassword}
                      />
                    )}
                  />
                  {errors.confirmPassword && (
                    <Text fontSize="xs" color="red.500">
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </VStack>

                {/* Terms and Privacy Checkbox */}
                <Checkbox
                  value="terms"
                  isChecked={termsAccepted}
                  onChange={setTermsAccepted}
                  colorScheme="green"
                  size="sm"
                >
                  <Text fontSize="sm" color="coolGray.700">
                    I agree to the{' '}
                    <Text fontWeight="semibold" underline>
                      Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text fontWeight="semibold" underline>
                      Privacy Policy
                    </Text>
                  </Text>
                </Checkbox>

                {/* Error Message */}
                {errorMessage && (
                  <Box bg="red.50" p={3} borderRadius="md" borderWidth={1} borderColor="red.200">
                    <Text fontSize="sm" color="red.600">
                      {errorMessage}
                    </Text>
                  </Box>
                )}

                {/* Sign Up Button */}
                <Button
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isLoading}
                  isDisabled={isLoading}
                  bg="green.700"
                  borderRadius="full"
                  py={3.5}
                  _pressed={{ bg: 'green.800' }}
                  _text={{
                    fontSize: 'lg',
                    fontWeight: 'bold',
                  }}
                  mt={2}
                >
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </Button>

                {/* Security Badge */}
                <HStack justifyContent="center" space={6} pt={2}>
                  <VStack alignItems="center" space={1}>
                    <Icon as={MaterialIcons} name="security" size="sm" color="coolGray.400" />
                    <Text fontSize="2xs" color="coolGray.500" textAlign="center">
                      BANK-{'\n'}GRADE{'\n'}SECURITY
                    </Text>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Icon as={MaterialIcons} name="lock" size="sm" color="coolGray.400" />
                    <Text fontSize="2xs" color="coolGray.500" textAlign="center">
                      256-BIT{'\n'}ENCRYPTED
                    </Text>
                  </VStack>
                </HStack>

                {/* Login Link */}
                <Pressable onPress={() => router.back()} mt={2}>
                  <Text fontSize="sm" color="coolGray.600" textAlign="center">
                    Already part of the collective?{' '}
                    <Text fontWeight="bold" color="coolGray.800">
                      Login
                    </Text>
                  </Text>
                </Pressable>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
