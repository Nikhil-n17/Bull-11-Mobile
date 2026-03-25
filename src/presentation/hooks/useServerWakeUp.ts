/**
 * Server Wake-Up Hook
 * Detects and manages Render free tier cold starts
 */

import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLD_START_THRESHOLD_MS = 3000; // Show loader if request takes >3s
const WAKE_UP_KEY = 'bull11_server_woke_up';
const WAKE_UP_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const useServerWakeUp = () => {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const requestStartTime = useRef<number | null>(null);
  const wakeUpTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if server recently woke up (within last 10 minutes)
   */
  const hasRecentlyWokenUp = async (): Promise<boolean> => {
    const lastWakeUp = await AsyncStorage.getItem(WAKE_UP_KEY);
    if (!lastWakeUp) return false;

    const elapsed = Date.now() - parseInt(lastWakeUp, 10);
    return elapsed < WAKE_UP_DURATION_MS;
  };

  /**
   * Mark server as awake
   */
  const markServerAwake = useCallback(async () => {
    await AsyncStorage.setItem(WAKE_UP_KEY, Date.now().toString());
    setIsWakingUp(false);

    // Clear the flag after 10 minutes
    if (wakeUpTimer.current) {
      clearTimeout(wakeUpTimer.current);
    }
    wakeUpTimer.current = setTimeout(async () => {
      await AsyncStorage.removeItem(WAKE_UP_KEY);
    }, WAKE_UP_DURATION_MS);
  }, []);

  /**
   * Start tracking a request for cold start detection
   */
  const startRequest = useCallback(() => {
    // Check if server recently woke up (async)
    hasRecentlyWokenUp().then((hasWokenUp) => {
      if (hasWokenUp) {
        return;
      }

      requestStartTime.current = Date.now();

      // Show loader after threshold if request hasn't completed
      const timeout = setTimeout(() => {
        if (requestStartTime.current !== null) {
          setIsWakingUp(true);
        }
      }, COLD_START_THRESHOLD_MS);

      return () => clearTimeout(timeout);
    });
  }, []);

  /**
   * Complete tracking for a request
   */
  const completeRequest = useCallback(() => {
    if (requestStartTime.current === null) {
      return;
    }

    const duration = Date.now() - requestStartTime.current;
    requestStartTime.current = null;

    // If request took >3s, mark server as recently woken up
    if (duration >= COLD_START_THRESHOLD_MS) {
      markServerAwake();
    } else {
      // Quick response means server was already warm
      setIsWakingUp(false);
    }
  }, [markServerAwake]);

  /**
   * Manually dismiss the wake-up loader
   */
  const dismiss = useCallback(() => {
    setIsWakingUp(false);
    requestStartTime.current = null;
  }, []);

  return {
    isWakingUp,
    startRequest,
    completeRequest,
    dismiss,
  };
};
