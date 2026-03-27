/**
 * Toast Notification Component
 *
 * A non-intrusive notification that appears at the bottom of the screen
 * with a slide-up animation and auto-dismisses after a configurable duration.
 *
 * @example
 * // Basic usage with success variant
 * <Toast
 *   message="Game started successfully!"
 *   variant="success"
 *   onDismiss={() => console.log('Toast dismissed')}
 * />
 *
 * @example
 * // Custom duration (5 seconds)
 * <Toast
 *   message="Processing your request..."
 *   variant="info"
 *   duration={5000}
 * />
 *
 * @example
 * // Error notification
 * <Toast
 *   message="Failed to connect to server"
 *   variant="error"
 * />
 *
 * @example
 * // Usage in a screen with state management
 * const [toast, setToast] = useState<{
 *   message: string;
 *   variant: ToastVariant;
 * } | null>(null);
 *
 * const showToast = (message: string, variant: ToastVariant) => {
 *   setToast({ message, variant });
 * };
 *
 * const handleDismiss = () => {
 *   setToast(null);
 * };
 *
 * return (
 *   <View>
 *     {/* Your screen content *\/}
 *     {toast && (
 *       <Toast
 *         message={toast.message}
 *         variant={toast.variant}
 *         onDismiss={handleDismiss}
 *       />
 *     )}
 *   </View>
 * );
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { theme } from '@/src/core/theme';

/**
 * Toast variant types
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast component props
 */
export interface ToastProps {
  /**
   * The message to display in the toast
   */
  message: string;

  /**
   * The visual variant of the toast
   * - success: Green background for positive actions
   * - error: Red background for errors
   * - info: Blue background for informational messages
   * - warning: Amber background for warnings
   */
  variant: ToastVariant;

  /**
   * Duration in milliseconds before auto-dismiss
   * @default 3000 (3 seconds)
   */
  duration?: number;

  /**
   * Callback function called when toast is dismissed
   * (either by auto-dismiss or manual close)
   */
  onDismiss?: () => void;
}

/**
 * Configuration for each toast variant
 */
interface VariantConfig {
  backgroundColor: string;
  textColor: string;
  icon: string;
  borderColor: string;
}

/**
 * Toast Notification Component
 *
 * Features:
 * - Auto-dismisses after configurable duration (default 3s)
 * - Slide-up animation from bottom
 * - Slide-down animation on dismiss
 * - Manual dismiss by tapping close button
 * - Theme-aware colors
 * - Non-intrusive positioning at bottom of screen
 * - Safe area support for devices with notches
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  variant,
  duration = 3000,
  onDismiss,
}) => {
  // Starts off-screen below center, animates up to center
  const slideAnim = useRef(new Animated.Value(200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  /**
   * Get variant-specific styling configuration
   */
  const getVariantConfig = (): VariantConfig => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.success.main,
          textColor: theme.colors.success.contrast,
          icon: '✓',
          borderColor: theme.colors.success.dark,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error.main,
          textColor: theme.colors.error.contrast,
          icon: '✕',
          borderColor: theme.colors.error.dark,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.info.main,
          textColor: theme.colors.info.contrast,
          icon: 'ℹ',
          borderColor: theme.colors.info.dark,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning.main,
          textColor: theme.colors.warning.contrast,
          icon: '⚠',
          borderColor: theme.colors.warning.dark,
        };
    }
  };

  const config = getVariantConfig();

  /**
   * Animate toast sliding up from below center to center
   */
  const slideIn = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Animate toast sliding back down and dismiss
   */
  const slideOut = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  /**
   * Handle manual dismiss (close button tap)
   */
  const handleDismiss = () => {
    slideOut();
  };

  // Effect: Slide in on mount, auto-dismiss after duration
  useEffect(() => {
    slideIn();

    const timer = setTimeout(() => {
      slideOut();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={[styles.icon, { color: config.textColor }]}>
            {config.icon}
          </Text>
        </View>

        {/* Message */}
        <Text
          style={[styles.message, { color: config.textColor }]}
          numberOfLines={2}
        >
          {message}
        </Text>

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Text style={[styles.closeText, { color: config.textColor }]}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '45%',
    left: 32,
    right: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.padding.card,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    flex: 1,
    ...theme.typography.textStyles.body,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.8,
  },
});
