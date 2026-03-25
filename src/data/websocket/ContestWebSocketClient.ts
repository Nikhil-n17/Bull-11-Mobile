/**
 * Contest WebSocket Client
 * STOMP over SockJS client for real-time contest leaderboard and performance data
 *
 * Separate from StockWebSocketClient to keep concerns clean.
 * Creates its own STOMP connection to the same /ws endpoint.
 *
 * Features:
 * - Subscribe to leaderboard topic (all viewers)
 * - Subscribe to performance topic (per user)
 * - Auto-reconnect with exponential backoff
 * - JWT authentication
 * - Clean subscription management
 */

import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
// @ts-ignore - SockJS has complex typing, but works correctly at runtime
import SockJS from 'sockjs-client';
import { API_CONFIG } from '@/src/core/constants/app.constants';
import { TokenService } from '@/src/core/security/TokenService';
import {
  WsLeaderboardMessage,
  WsPerformanceMessage,
} from './ContestWebSocketTypes';

export type LeaderboardCallback = (message: WsLeaderboardMessage) => void;
export type PerformanceCallback = (message: WsPerformanceMessage) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type ErrorCallback = (error: Error) => void;

interface ContestWebSocketConfig {
  url: string;
  heartbeatIncoming: number;
  heartbeatOutgoing: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  reconnectMultiplier: number;
  debug: boolean;
}

const DEFAULT_CONFIG: ContestWebSocketConfig = {
  url: API_CONFIG.WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8080/ws',
  heartbeatIncoming: 30000,
  heartbeatOutgoing: 30000,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectMultiplier: 2,
  debug: process.env.NODE_ENV === 'development',
};

export class ContestWebSocketClient {
  private client: Client | null = null;
  private config: ContestWebSocketConfig;
  private connected = false;
  private isManualDisconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Active subscriptions
  private subscriptions: Map<string, StompSubscription> = new Map();

  // Callbacks
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  constructor(config?: Partial<ContestWebSocketConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.client?.connected) {
      this.log('Already connected');
      return;
    }

    this.isManualDisconnect = false;

    const token = await TokenService.getToken();
    if (!token) {
      const error = new Error('No authentication token available');
      this.notifyError(error);
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          webSocketFactory: () => new SockJS(this.config.url) as WebSocket,
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },
          heartbeatIncoming: this.config.heartbeatIncoming,
          heartbeatOutgoing: this.config.heartbeatOutgoing,
          debug: this.config.debug ? (msg) => this.log(msg) : () => {},

          onConnect: (_frame: IFrame) => {
            this.log('Connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.notifyConnection(true);
            resolve();
          },

          onStompError: (frame: IFrame) => {
            const errorMessage = frame.headers['message'] || 'STOMP error';
            this.log(`STOMP error: ${errorMessage}`);
            this.notifyError(new Error(errorMessage));
            reject(new Error(errorMessage));
          },

          onWebSocketClose: (_event: CloseEvent) => {
            this.log('WebSocket closed');
            this.connected = false;
            this.notifyConnection(false);
            if (!this.isManualDisconnect) {
              this.scheduleReconnect();
            }
          },

          onWebSocketError: (_event: Event) => {
            this.log('WebSocket error');
            this.notifyError(new Error('WebSocket connection error'));
          },
        });

        this.client.activate();
      } catch (error) {
        this.notifyError(error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    });
  }

  /**
   * Disconnect and clean up all subscriptions
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimeout();
    this.unsubscribeAll();

    if (this.client) {
      try {
        this.client.deactivate();
      } catch (e) {
        // Ignore
      }
      this.client = null;
    }

    this.connected = false;
    this.reconnectAttempts = 0;
    this.notifyConnection(false);
    this.log('Disconnected');
  }

  /**
   * Subscribe to contest leaderboard updates
   */
  subscribeToLeaderboard(contestId: string, callback: LeaderboardCallback): () => void {
    const topic = `/topic/contest/${contestId}/leaderboard`;
    return this.subscribeTo(topic, (message: IMessage) => {
      try {
        const data: WsLeaderboardMessage = JSON.parse(message.body);
        callback(data);
      } catch (e) {
        this.log(`Error parsing leaderboard message: ${e}`);
      }
    });
  }

  /**
   * Subscribe to user's contest performance updates
   */
  subscribeToPerformance(contestId: string, userId: string, callback: PerformanceCallback): () => void {
    const topic = `/topic/contest/${contestId}/performance/${userId}`;
    return this.subscribeTo(topic, (message: IMessage) => {
      try {
        const data: WsPerformanceMessage = JSON.parse(message.body);
        callback(data);
      } catch (e) {
        this.log(`Error parsing performance message: ${e}`);
      }
    });
  }

  /**
   * Unsubscribe from all topics
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((sub, topic) => {
      try {
        sub.unsubscribe();
        this.log(`Unsubscribed from ${topic}`);
      } catch (e) {
        // Ignore
      }
    });
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this.connected && !!this.client?.connected;
  }

  onConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    callback(this.connected);
    return () => this.connectionCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  // Private

  private subscribeTo(topic: string, handler: (message: IMessage) => void): () => void {
    if (!this.client?.connected) {
      this.log(`Cannot subscribe to ${topic}: not connected`);
      return () => {};
    }

    // Unsubscribe from existing subscription to the same topic
    const existing = this.subscriptions.get(topic);
    if (existing) {
      try { existing.unsubscribe(); } catch (e) { /* ignore */ }
    }

    const subscription = this.client.subscribe(topic, handler);
    this.subscriptions.set(topic, subscription);
    this.log(`Subscribed to ${topic}`);

    return () => {
      try { subscription.unsubscribe(); } catch (e) { /* ignore */ }
      this.subscriptions.delete(topic);
      this.log(`Unsubscribed from ${topic}`);
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(this.config.reconnectMultiplier, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectAttempts++;
      try {
        await this.connect();
      } catch (_error) {
        this.log(`Reconnect attempt ${this.reconnectAttempts} failed`);
        // onWebSocketClose will schedule the next attempt
      }
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((cb) => {
      try { cb(connected); } catch (e) { /* ignore */ }
    });
  }

  private notifyError(error: Error): void {
    this.errorCallbacks.forEach((cb) => {
      try { cb(error); } catch (e) { /* ignore */ }
    });
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[ContestWS] ${message}`);
    }
  }
}
