/**
 * Loading Spinner Component
 * Reusable loading indicator with optional message - NativeBase redesign
 */

import React from 'react';
import { Center, Spinner, Text, VStack } from 'native-base';
import type { ISpinnerProps } from 'native-base';

interface LoadingSpinnerProps {
  message?: string;
  size?: ISpinnerProps['size'];
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'lg',
  color,
}) => {
  return (
    <Center flex={1} bg="gray.50" p={5}>
      <VStack space={3} alignItems="center">
        <Spinner size={size} color={color || 'primary.500'} />
        {message && (
          <Text fontSize="md" color="gray.600" textAlign="center">
            {message}
          </Text>
        )}
      </VStack>
    </Center>
  );
};
