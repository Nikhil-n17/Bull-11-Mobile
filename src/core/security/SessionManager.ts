/**
 * Session Manager
 * Handles session timeout and inactivity detection
 */

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionData {
  lastActivity: number;
  sessionStarted: number;
}

export class SessionManager {
  private static readonly INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly SESSION_KEY = 'session_data';
  private static appStateSubscription: any;
  private static inactivityTimer: NodeJS.Timeout | null = null;
  private static onSessionExpired?: () => void;

  /**
   * Initialize session manager
   */
  static initialize(onExpired: () => void): void {
    this.onSessionExpired = onExpired;
    this.startSession();
    this.setupAppStateListener();
  }

  /**
   * Start a new session
   */
  static async startSession(): Promise<void> {
    const now = Date.now();
    const sessionData: SessionData = {
      lastActivity: now,
      sessionStarted: now,
    };

    await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    this.resetInactivityTimer();
  }

  /**
   * Update last activity timestamp
   */
  static async updateActivity(): Promise<void> {
    try {
      const data = await this.getSessionData();
      if (!data) {
        await this.startSession();
        return;
      }

      data.lastActivity = Date.now();
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
      this.resetInactivityTimer();
    } catch (error) {
      // Silently handle activity update errors
      // Activity tracking is non-critical functionality
    }
  }

  /**
   * Check if session is still valid
   */
  static async isSessionValid(): Promise<boolean> {
    const data = await this.getSessionData();
    if (!data) return true; // No session data yet — don't trigger expiry

    const inactiveTime = Date.now() - data.lastActivity;
    return inactiveTime < this.INACTIVITY_TIMEOUT_MS;
  }

  /**
   * End current session
   */
  static async endSession(): Promise<void> {
    await AsyncStorage.removeItem(this.SESSION_KEY);
    this.clearInactivityTimer();
  }

  /**
   * Get session duration in seconds
   */
  static async getSessionDuration(): Promise<number> {
    const data = await this.getSessionData();
    if (!data) return 0;

    return Math.floor((Date.now() - data.sessionStarted) / 1000);
  }

  /**
   * Get time until session expires (seconds)
   */
  static async getTimeUntilExpiry(): Promise<number> {
    const data = await this.getSessionData();
    if (!data) return 0;

    const elapsed = Date.now() - data.lastActivity;
    const remaining = this.INACTIVITY_TIMEOUT_MS - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Cleanup listeners
   */
  static cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.clearInactivityTimer();
  }

  private static async getSessionData(): Promise<SessionData | null> {
    try {
      const json = await AsyncStorage.getItem(this.SESSION_KEY);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  private static setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // App came to foreground - just refresh activity
          // Session expiry is handled by the inactivity timer (resetInactivityTimer)
          // Checking here caused false logouts on browser tab switches
          await this.updateActivity();
        } else if (nextAppState === 'background') {
          await this.updateActivity();
        }
      }
    );
  }

  private static resetInactivityTimer(): void {
    this.clearInactivityTimer();

    this.inactivityTimer = setTimeout(async () => {
      const isValid = await this.isSessionValid();
      if (!isValid && this.onSessionExpired) {
        this.onSessionExpired();
      }
    }, this.INACTIVITY_TIMEOUT_MS) as any;
  }

  private static clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}
