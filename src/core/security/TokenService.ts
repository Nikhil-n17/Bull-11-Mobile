/**
 * Token Service
 * Handles secure token management with expiry validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/src/core/constants/app.constants';

interface TokenData {
  token: string;
  expiresAt: number; // Unix timestamp
  issuedAt: number;
}

export class TokenService {
  private static readonly TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Store token with expiry metadata
   */
  static async storeToken(token: string): Promise<void> {
    const now = Date.now();
    const tokenData: TokenData = {
      token,
      issuedAt: now,
      expiresAt: now + this.TOKEN_EXPIRY_MS,
    };

    await AsyncStorage.setItem(
      STORAGE_KEYS.JWT_TOKEN,
      JSON.stringify(tokenData)
    );
  }

  /**
   * Get token only if not expired
   */
  static async getToken(): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
      if (!data) return null;

      const tokenData: TokenData = JSON.parse(data);

      // Check if token is expired
      if (Date.now() >= tokenData.expiresAt) {
        await this.clearToken();
        return null;
      }

      return tokenData.token;
    } catch (error) {
      // Silently handle token retrieval errors
      // Return null to trigger re-authentication
      return null;
    }
  }

  /**
   * Check if token exists and is valid
   */
  static async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Get remaining time until token expires (in seconds)
   */
  static async getTokenExpiryTime(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
      if (!data) return 0;

      const tokenData: TokenData = JSON.parse(data);
      const remainingMs = tokenData.expiresAt - Date.now();

      return Math.max(0, Math.floor(remainingMs / 1000));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear token
   */
  static async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
  }

  /**
   * Check if token is about to expire (within 1 hour)
   */
  static async isTokenExpiringSoon(): Promise<boolean> {
    const expirySeconds = await this.getTokenExpiryTime();
    return expirySeconds > 0 && expirySeconds < 3600; // Less than 1 hour
  }
}
