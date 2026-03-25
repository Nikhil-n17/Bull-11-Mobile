/**
 * Error Display Component
 * Reusable error display with retry functionality - NativeBase redesign
 */

import React from 'react';
import { Center, VStack, Text, Button } from 'native-base';

interface ErrorDisplayProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  title = 'Error',
  onRetry,
  retryText = 'Retry',
  showIcon = true,
}) => {
  return (
    <Center flex={1} bg="gray.50" p={5}>
      <VStack space={4} alignItems="center" maxW="90%">
        {showIcon && <Text fontSize="5xl">⚠️</Text>}
        <Text fontSize="xl" fontWeight="600" color="error.500" textAlign="center">
          {title}
        </Text>
        <Text fontSize="md" color="gray.600" textAlign="center" lineHeight="sm">
          {message}
        </Text>
        {onRetry && (
          <Button
            onPress={onRetry}
            colorScheme="primary"
            minW="120px"
            borderRadius="lg"
            mt={2}
          >
            {retryText}
          </Button>
        )}
      </VStack>
    </Center>
  );
};
