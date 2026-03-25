/**
 * Server Wake-Up Loader Component
 * Shows friendly message during Render free tier cold starts (30-60s first load)
 */

import React, { useEffect, useState, useRef } from 'react';
import { Modal, Animated } from 'react-native';
import { Box, VStack, HStack, Text, Spinner, Center } from 'native-base';

interface ServerWakeUpLoaderProps {
  visible: boolean;
  onDismiss?: () => void;
}

export const ServerWakeUpLoader: React.FC<ServerWakeUpLoaderProps> = ({
  visible,
  onDismiss,
}) => {
  const [dots, setDots] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      progressAnim.setValue(0);
      return;
    }

    // Animated progress bar
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [visible, progressAnim]);

  if (!visible) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Center flex={1} bg="rgba(0, 0, 0, 0.5)">
        <Box
          bg="white"
          borderRadius="2xl"
          shadow={9}
          maxW="90%"
          w="350px"
          overflow="hidden"
        >
          {/* Header with gradient background */}
          <Box bg="#006e1c" px={6} py={4}>
            <HStack space={3} alignItems="center">
              <Text fontSize="3xl">🌅</Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
                color="white"
                flex={1}
              >
                Waking Up Server{dots}
              </Text>
            </HStack>
          </Box>

          {/* Content */}
          <VStack px={6} py={6} space={4} alignItems="center">
            <Spinner size="lg" color="#006e1c" />

            <VStack space={2} alignItems="center">
              <Text
                fontSize="md"
                color="coolGray.700"
                textAlign="center"
                fontWeight="500"
              >
                First request may take 30-60 seconds
              </Text>

              <Text
                fontSize="sm"
                color="coolGray.500"
                textAlign="center"
                px={2}
              >
                Our server is waking up from sleep mode. This only happens on the first visit after 15 minutes of inactivity.
              </Text>
            </VStack>

            {/* Animated Loading Bar */}
            <Box w="100%" h="2px" bg="coolGray.200" borderRadius="full" overflow="hidden">
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: '#006e1c',
                  width: progressWidth,
                }}
              />
            </Box>

            <HStack
              bg="green.50"
              borderLeftWidth={3}
              borderLeftColor="green.500"
              borderRadius="md"
              p={3}
              space={2}
              alignItems="flex-start"
              w="100%"
            >
              <Text fontSize="md">💡</Text>
              <Text fontSize="xs" color="green.700" flex={1}>
                Subsequent requests will be instant. We're using a free hosting tier to keep the app accessible to everyone!
              </Text>
            </HStack>
          </VStack>
        </Box>
      </Center>
    </Modal>
  );
};
