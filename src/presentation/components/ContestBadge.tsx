/**
 * ContestBadge Component
 * Status badges for contest cards
 */

import React from 'react';
import { Box, Text } from 'native-base';
import { ContestStatus } from '@/src/domain/entities/Contest';
import { theme } from '@/src/core/theme';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface ContestBadgeProps {
  status: ContestStatus;
  size?: BadgeSize;
}

export const ContestBadge: React.FC<ContestBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case ContestStatus.LIVE:
        return {
          label: 'LIVE',
          backgroundColor: '#006e1c', // Bull-11 green
          textColor: '#ffffff',
        };
      case ContestStatus.REGISTRATION_OPEN:
        return {
          label: 'REGISTRATION OPEN',
          backgroundColor: theme.colors.primary.main,
          textColor: '#ffffff',
        };
      case ContestStatus.UPCOMING:
        return {
          label: 'UPCOMING',
          backgroundColor: theme.colors.neutral.gray400,
          textColor: '#ffffff',
        };
      case ContestStatus.COMPLETED:
        return {
          label: 'COMPLETED',
          backgroundColor: theme.colors.neutral.gray500,
          textColor: '#ffffff',
        };
      case ContestStatus.CANCELLED:
        return {
          label: 'CANCELLED',
          backgroundColor: theme.colors.neutral.gray400,
          textColor: '#ffffff',
        };
      default:
        return {
          label: status,
          backgroundColor: theme.colors.neutral.gray400,
          textColor: '#ffffff',
        };
    }
  };

  const config = getBadgeConfig();

  // Size mappings for NativeBase
  const sizeProps = {
    sm: { px: 2, py: 1, fontSize: 'xs' },
    md: { px: 3, py: 1.5, fontSize: 'xs' },
    lg: { px: 4, py: 2, fontSize: 'sm' },
  }[size];

  return (
    <Box
      borderRadius="full"
      px={sizeProps.px}
      py={sizeProps.py}
      alignSelf="flex-start"
      bg={config.backgroundColor}
    >
      <Text
        fontSize={sizeProps.fontSize}
        fontWeight="700"
        letterSpacing={0.5}
        color={config.textColor}
      >
        {config.label}
      </Text>
    </Box>
  );
};
