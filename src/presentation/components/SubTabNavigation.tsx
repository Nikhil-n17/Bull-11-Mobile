/**
 * SubTabNavigation Component
 * Simple text-based tab navigation with underline for active tab
 */

import React from 'react';
import { HStack, Pressable, Text } from 'native-base';

export interface SubTab {
  label: string;
  value: string;
}

export interface SubTabNavigationProps {
  tabs: SubTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const SubTabNavigation: React.FC<SubTabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <HStack
      px={5}
      py={3}
      space={6}
      bg="white"
      borderBottomWidth={1}
      borderBottomColor="rgba(0, 0, 0, 0.05)"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;

        return (
          <Pressable
            key={tab.value}
            onPress={() => onTabChange(tab.value)}
            pb={2}
            borderBottomWidth={2}
            borderBottomColor={isActive ? 'primary.500' : 'transparent'}
            _pressed={{ opacity: 0.6 }}
          >
            <Text
              fontSize="md"
              fontWeight={isActive ? '700' : '500'}
              color={isActive ? 'primary.500' : 'coolGray.600'}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
};
