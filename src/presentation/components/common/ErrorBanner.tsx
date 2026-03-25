/**
 * Error Banner Component
 * Inline error banner for displaying errors without replacing content - NativeBase redesign
 */

import React from 'react';
import { Alert, HStack, Text, IconButton, CloseIcon } from 'native-base';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  type = 'error',
}) => {
  if (!message) return null;

  const getStatusConfig = () => {
    switch (type) {
      case 'warning':
        return { status: 'warning' as const, icon: '⚠️' };
      case 'info':
        return { status: 'info' as const, icon: 'ℹ️' };
      case 'success':
        return { status: 'success' as const, icon: '✓' };
      case 'error':
      default:
        return { status: 'error' as const, icon: '❌' };
    }
  };

  const { status, icon } = getStatusConfig();

  return (
    <Alert status={status} mx={4} my={2} borderRadius="lg">
      <HStack space={2} flexShrink={1} alignItems="center" w="100%">
        <Text fontSize="md">{icon}</Text>
        <Text flex={1} fontSize="sm" color={`${status}.700`}>
          {message}
        </Text>
        {onDismiss && (
          <IconButton
            icon={<CloseIcon size="3" />}
            onPress={onDismiss}
            variant="unstyled"
            _pressed={{ opacity: 0.5 }}
          />
        )}
      </HStack>
    </Alert>
  );
};
