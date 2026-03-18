# WebSocket Service Architecture Design

## Overview

This document outlines the architecture for implementing WebSocket-based live price updates in the Bull-11 React Native app. The design follows Clean Architecture principles and integrates with the existing codebase structure.

---

## 1. Architecture Layer Placement

```
+------------------+     +------------------+     +------------------+
|   Presentation   |     |      Domain      |     |       Data       |
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| useWebSocket     |<--->| WebSocketPort    |<--->| WebSocketClient  |
| useLivePrices    |     | (interface)      |     | (implementation) |
|                  |     |                  |     |                  |
| GameScreen       |     | PriceUpdate      |     | WebSocketManager |
| components       |     | (entity)         |     |                  |
+------------------+     +------------------+     +------------------+
```

### Layer Responsibilities:

- **Domain Layer**: Defines interfaces (ports) and entities for price updates
- **Data Layer**: Implements WebSocket client, connection management, reconnection logic
- **Presentation Layer**: React hooks for consuming live data, UI state management
- **Core Layer**: Constants, types, and DI container registration

---

## 2. TypeScript Interfaces & Types

### 2.1 Domain Layer Types

**File: `src/domain/entities/PriceUpdate.ts`**

```typescript
/**
 * Domain Entity: PriceUpdate
 * Represents a real-time stock price tick
 */
export interface PriceUpdate {
  readonly symbol: string;
  readonly instrumentToken: number;
  readonly lastPrice: number;
  readonly change: number;
  readonly changePercent: number;
  readonly volume: number;
  readonly timestamp: Date;
  readonly exchange: 'NSE' | 'BSE';
}

/**
 * Aggregated price updates for a game
 */
export interface GamePriceSnapshot {
  readonly gameId: string;
  readonly prices: Map<string, PriceUpdate>;
  readonly lastUpdated: Date;
}
```

### 2.2 Domain Port Interface

**File: `src/domain/ports/WebSocketPort.ts`**

```typescript
/**
 * Domain Port: WebSocket
 * Defines contract for real-time price streaming (Dependency Inversion)
 */
import { PriceUpdate } from '../entities/PriceUpdate';

export enum WebSocketConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

export interface WebSocketSubscription {
  readonly symbols: string[];
  readonly gameId?: string;
}

export interface WebSocketPort {
  // Connection management
  connect(): Promise<void>;
  disconnect(): void;
  getConnectionState(): WebSocketConnectionState;

  // Subscription management
  subscribe(subscription: WebSocketSubscription): void;
  unsubscribe(subscription: WebSocketSubscription): void;
  unsubscribeAll(): void;

  // Event listeners
  onPriceUpdate(callback: (update: PriceUpdate) => void): () => void;
  onConnectionStateChange(callback: (state: WebSocketConnectionState) => void): () => void;
  onError(callback: (error: WebSocketError) => void): () => void;
}

export interface WebSocketError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: Date;
}
```

### 2.3 Data Layer - WebSocket Message Types

**File: `src/data/websocket/types/WebSocketMessages.ts`**

```typescript
/**
 * WebSocket Protocol Message Types
 * Matches backend STOMP/SockJS message formats
 */

// ============ Client -> Server Messages ============

export enum ClientMessageType {
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  HEARTBEAT = 'HEARTBEAT',
}

export interface SubscribeMessage {
  type: ClientMessageType.SUBSCRIBE;
  payload: {
    symbols: string[];
    gameId?: string;
  };
}

export interface UnsubscribeMessage {
  type: ClientMessageType.UNSUBSCRIBE;
  payload: {
    symbols: string[];
    gameId?: string;
  };
}

export interface HeartbeatMessage {
  type: ClientMessageType.HEARTBEAT;
  payload: {
    timestamp: number;
  };
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | HeartbeatMessage;

// ============ Server -> Client Messages ============

export enum ServerMessageType {
  PRICE_TICK = 'PRICE_TICK',
  SUBSCRIPTION_CONFIRMED = 'SUBSCRIPTION_CONFIRMED',
  SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
  HEARTBEAT_ACK = 'HEARTBEAT_ACK',
  ERROR = 'ERROR',
}

export interface PriceTickDTO {
  symbol: string;
  instrumentToken: number;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string; // ISO 8601
  exchange: string;
}

export interface PriceTickMessage {
  type: ServerMessageType.PRICE_TICK;
  payload: PriceTickDTO;
}

export interface SubscriptionConfirmedMessage {
  type: ServerMessageType.SUBSCRIPTION_CONFIRMED;
  payload: {
    symbols: string[];
    gameId?: string;
  };
}

export interface SubscriptionErrorMessage {
  type: ServerMessageType.SUBSCRIPTION_ERROR;
  payload: {
    symbols: string[];
    error: string;
  };
}

export interface ErrorMessage {
  type: ServerMessageType.ERROR;
  payload: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export type ServerMessage =
  | PriceTickMessage
  | SubscriptionConfirmedMessage
  | SubscriptionErrorMessage
  | ErrorMessage;
```

### 2.4 Data Layer - WebSocket Client Implementation

**File: `src/data/websocket/WebSocketClient.ts`**

```typescript
/**
 * WebSocket Client Implementation
 * Handles connection, reconnection, and message routing
 */
import { API_CONFIG } from '@/src/core/constants/app.constants';
import {
  WebSocketPort,
  WebSocketConnectionState,
  WebSocketSubscription,
  WebSocketError,
} from '@/src/domain/ports/WebSocketPort';
import { PriceUpdate } from '@/src/domain/entities/PriceUpdate';
import {
  ClientMessage,
  ClientMessageType,
  ServerMessage,
  ServerMessageType,
  PriceTickDTO,
} from './types/WebSocketMessages';
import { StorageService } from '../storage/StorageService';

interface WebSocketClientConfig {
  url: string;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  connectionTimeout: number;
}

const DEFAULT_CONFIG: WebSocketClientConfig = {
  url: API_CONFIG.WS_URL,
  reconnectAttempts: 5,
  reconnectInterval: 3000, // 3 seconds
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 10000, // 10 seconds
};

export class WebSocketClient implements WebSocketPort {
  private socket: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private storageService: StorageService;

  // Connection state
  private connectionState: WebSocketConnectionState = WebSocketConnectionState.DISCONNECTED;
  private reconnectCount: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;

  // Subscriptions
  private activeSubscriptions: Map<string, WebSocketSubscription> = new Map();
  private pendingSubscriptions: WebSocketSubscription[] = [];

  // Event listeners
  private priceUpdateListeners: Set<(update: PriceUpdate) => void> = new Set();
  private stateChangeListeners: Set<(state: WebSocketConnectionState) => void> = new Set();
  private errorListeners: Set<(error: WebSocketError) => void> = new Set();

  constructor(storageService: StorageService, config?: Partial<WebSocketClientConfig>) {
    this.storageService = storageService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============ Connection Management ============

  async connect(): Promise<void> {
    if (this.connectionState === WebSocketConnectionState.CONNECTED ||
        this.connectionState === WebSocketConnectionState.CONNECTING) {
      return;
    }

    this.setConnectionState(WebSocketConnectionState.CONNECTING);

    try {
      const token = await this.storageService.getToken();
      const wsUrl = token
        ? `${this.config.url}?token=${encodeURIComponent(token)}`
        : this.config.url;

      this.socket = new WebSocket(wsUrl);
      this.setupSocketListeners();
      this.startConnectionTimeout();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  disconnect(): void {
    this.stopTimers();
    this.reconnectCount = 0;

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.setConnectionState(WebSocketConnectionState.DISCONNECTED);
    this.activeSubscriptions.clear();
  }

  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  // ============ Subscription Management ============

  subscribe(subscription: WebSocketSubscription): void {
    const key = this.getSubscriptionKey(subscription);

    if (this.activeSubscriptions.has(key)) {
      return; // Already subscribed
    }

    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      this.sendSubscribe(subscription);
      this.activeSubscriptions.set(key, subscription);
    } else {
      // Queue for when connected
      this.pendingSubscriptions.push(subscription);
      // Attempt to connect if disconnected
      if (this.connectionState === WebSocketConnectionState.DISCONNECTED) {
        this.connect();
      }
    }
  }

  unsubscribe(subscription: WebSocketSubscription): void {
    const key = this.getSubscriptionKey(subscription);

    if (!this.activeSubscriptions.has(key)) {
      return;
    }

    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      this.sendUnsubscribe(subscription);
    }

    this.activeSubscriptions.delete(key);
  }

  unsubscribeAll(): void {
    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      this.activeSubscriptions.forEach((sub) => {
        this.sendUnsubscribe(sub);
      });
    }

    this.activeSubscriptions.clear();
    this.pendingSubscriptions = [];
  }

  // ============ Event Listeners ============

  onPriceUpdate(callback: (update: PriceUpdate) => void): () => void {
    this.priceUpdateListeners.add(callback);
    return () => this.priceUpdateListeners.delete(callback);
  }

  onConnectionStateChange(callback: (state: WebSocketConnectionState) => void): () => void {
    this.stateChangeListeners.add(callback);
    // Immediately notify of current state
    callback(this.connectionState);
    return () => this.stateChangeListeners.delete(callback);
  }

  onError(callback: (error: WebSocketError) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  // ============ Private Methods ============

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.clearConnectionTimeout();
      this.reconnectCount = 0;
      this.setConnectionState(WebSocketConnectionState.CONNECTED);
      this.startHeartbeat();
      this.resubscribeAll();
    };

    this.socket.onclose = (event) => {
      this.stopTimers();

      if (event.code !== 1000) {
        // Abnormal closure - attempt reconnect
        this.scheduleReconnect();
      } else {
        this.setConnectionState(WebSocketConnectionState.DISCONNECTED);
      }
    };

    this.socket.onerror = (error) => {
      this.notifyError({
        code: 'SOCKET_ERROR',
        message: 'WebSocket connection error',
        recoverable: true,
        timestamp: new Date(),
      });
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(data: string): void {
    try {
      const message: ServerMessage = JSON.parse(data);

      switch (message.type) {
        case ServerMessageType.PRICE_TICK:
          this.handlePriceTick(message.payload);
          break;

        case ServerMessageType.SUBSCRIPTION_CONFIRMED:
          // Subscription acknowledged - no action needed
          break;

        case ServerMessageType.SUBSCRIPTION_ERROR:
          this.notifyError({
            code: 'SUBSCRIPTION_ERROR',
            message: message.payload.error,
            recoverable: true,
            timestamp: new Date(),
          });
          break;

        case ServerMessageType.ERROR:
          this.notifyError({
            code: message.payload.code,
            message: message.payload.message,
            recoverable: message.payload.recoverable,
            timestamp: new Date(),
          });
          break;
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handlePriceTick(tick: PriceTickDTO): void {
    const update: PriceUpdate = {
      symbol: tick.symbol,
      instrumentToken: tick.instrumentToken,
      lastPrice: tick.lastPrice,
      change: tick.change,
      changePercent: tick.changePercent,
      volume: tick.volume,
      timestamp: new Date(tick.timestamp),
      exchange: tick.exchange as 'NSE' | 'BSE',
    };

    this.priceUpdateListeners.forEach((listener) => {
      try {
        listener(update);
      } catch (error) {
        console.error('[WebSocket] Price update listener error:', error);
      }
    });
  }

  private sendMessage(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private sendSubscribe(subscription: WebSocketSubscription): void {
    this.sendMessage({
      type: ClientMessageType.SUBSCRIBE,
      payload: {
        symbols: subscription.symbols,
        gameId: subscription.gameId,
      },
    });
  }

  private sendUnsubscribe(subscription: WebSocketSubscription): void {
    this.sendMessage({
      type: ClientMessageType.UNSUBSCRIBE,
      payload: {
        symbols: subscription.symbols,
        gameId: subscription.gameId,
      },
    });
  }

  private resubscribeAll(): void {
    // Process pending subscriptions
    this.pendingSubscriptions.forEach((sub) => {
      const key = this.getSubscriptionKey(sub);
      this.sendSubscribe(sub);
      this.activeSubscriptions.set(key, sub);
    });
    this.pendingSubscriptions = [];

    // Resubscribe active subscriptions (after reconnect)
    this.activeSubscriptions.forEach((sub) => {
      this.sendSubscribe(sub);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      this.setConnectionState(WebSocketConnectionState.ERROR);
      this.notifyError({
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: `Failed to reconnect after ${this.config.reconnectAttempts} attempts`,
        recoverable: false,
        timestamp: new Date(),
      });
      return;
    }

    this.setConnectionState(WebSocketConnectionState.RECONNECTING);
    this.reconnectCount++;

    // Exponential backoff
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectCount - 1);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleConnectionError(error: Error): void {
    this.clearConnectionTimeout();
    this.notifyError({
      code: 'CONNECTION_FAILED',
      message: error.message,
      recoverable: true,
      timestamp: new Date(),
    });
    this.scheduleReconnect();
  }

  // ============ Heartbeat ============

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({
        type: ClientMessageType.HEARTBEAT,
        payload: { timestamp: Date.now() },
      });
    }, this.config.heartbeatInterval);
  }

  // ============ Timers ============

  private startConnectionTimeout(): void {
    this.connectionTimer = setTimeout(() => {
      if (this.connectionState === WebSocketConnectionState.CONNECTING) {
        this.socket?.close();
        this.handleConnectionError(new Error('Connection timeout'));
      }
    }, this.config.connectionTimeout);
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private stopTimers(): void {
    this.clearConnectionTimeout();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ============ Helpers ============

  private setConnectionState(state: WebSocketConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateChangeListeners.forEach((listener) => {
        listener(state);
      });
    }
  }

  private notifyError(error: WebSocketError): void {
    this.errorListeners.forEach((listener) => {
      listener(error);
    });
  }

  private getSubscriptionKey(subscription: WebSocketSubscription): string {
    const symbols = [...subscription.symbols].sort().join(',');
    return subscription.gameId ? `${subscription.gameId}:${symbols}` : symbols;
  }
}
```

---

## 3. Presentation Layer - React Hooks

### 3.1 Core WebSocket Hook

**File: `src/presentation/hooks/useWebSocket.ts`**

```typescript
/**
 * useWebSocket Hook
 * Manages WebSocket connection lifecycle with React
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { container } from '@/src/core/di/container';
import {
  WebSocketConnectionState,
  WebSocketError,
} from '@/src/domain/ports/WebSocketPort';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnForeground?: boolean;
}

interface UseWebSocketReturn {
  connectionState: WebSocketConnectionState;
  error: WebSocketError | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isReconnecting: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, reconnectOnForeground = true } = options;

  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(
    WebSocketConnectionState.DISCONNECTED
  );
  const [error, setError] = useState<WebSocketError | null>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const wasConnected = useRef(false);

  // Get WebSocket client from DI container
  const wsClient = container.webSocketClient;

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribeState = wsClient.onConnectionStateChange((state) => {
      setConnectionState(state);
      if (state === WebSocketConnectionState.CONNECTED) {
        wasConnected.current = true;
        setError(null);
      }
    });

    // Subscribe to errors
    const unsubscribeError = wsClient.onError((err) => {
      setError(err);
    });

    // Auto-connect if enabled
    if (autoConnect) {
      wsClient.connect();
    }

    return () => {
      unsubscribeState();
      unsubscribeError();
    };
  }, [wsClient, autoConnect]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!reconnectOnForeground) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        if (wasConnected.current && connectionState !== WebSocketConnectionState.CONNECTED) {
          wsClient.connect();
        }
      } else if (nextAppState === 'background') {
        // App went to background - disconnect to save battery
        if (connectionState === WebSocketConnectionState.CONNECTED) {
          wsClient.disconnect();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [wsClient, connectionState, reconnectOnForeground]);

  const connect = useCallback(async () => {
    setError(null);
    await wsClient.connect();
  }, [wsClient]);

  const disconnect = useCallback(() => {
    wasConnected.current = false;
    wsClient.disconnect();
  }, [wsClient]);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    isConnected: connectionState === WebSocketConnectionState.CONNECTED,
    isReconnecting: connectionState === WebSocketConnectionState.RECONNECTING,
  };
}
```

### 3.2 Live Prices Hook

**File: `src/presentation/hooks/useLivePrices.ts`**

```typescript
/**
 * useLivePrices Hook
 * Subscribes to real-time price updates for specific stocks
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { container } from '@/src/core/di/container';
import { PriceUpdate } from '@/src/domain/entities/PriceUpdate';
import { WebSocketConnectionState } from '@/src/domain/ports/WebSocketPort';
import { useWebSocket } from './useWebSocket';

interface UseLivePricesOptions {
  symbols: string[];
  gameId?: string;
  enabled?: boolean;
}

interface UseLivePricesReturn {
  prices: Map<string, PriceUpdate>;
  lastUpdated: Date | null;
  isLive: boolean;
  isConnecting: boolean;
  error: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

export function useLivePrices(options: UseLivePricesOptions): UseLivePricesReturn {
  const { symbols, gameId, enabled = true } = options;

  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { connectionState, isConnected } = useWebSocket({ autoConnect: enabled });
  const wsClient = container.webSocketClient;
  const isSubscribed = useRef(false);

  // Stable subscription object
  const subscription = useRef({ symbols, gameId });
  subscription.current = { symbols, gameId };

  const subscribe = useCallback(() => {
    if (isSubscribed.current || symbols.length === 0) return;

    wsClient.subscribe({
      symbols: subscription.current.symbols,
      gameId: subscription.current.gameId,
    });
    isSubscribed.current = true;
  }, [wsClient, symbols.length]);

  const unsubscribe = useCallback(() => {
    if (!isSubscribed.current) return;

    wsClient.unsubscribe({
      symbols: subscription.current.symbols,
      gameId: subscription.current.gameId,
    });
    isSubscribed.current = false;
  }, [wsClient]);

  // Handle price updates
  useEffect(() => {
    if (!enabled) return;

    const unsubscribePrices = wsClient.onPriceUpdate((update) => {
      if (symbols.includes(update.symbol)) {
        setPrices((prev) => {
          const next = new Map(prev);
          next.set(update.symbol, update);
          return next;
        });
        setLastUpdated(update.timestamp);
        setError(null);
      }
    });

    const unsubscribeError = wsClient.onError((err) => {
      if (err.code === 'SUBSCRIPTION_ERROR') {
        setError(err.message);
      }
    });

    return () => {
      unsubscribePrices();
      unsubscribeError();
    };
  }, [wsClient, symbols, enabled]);

  // Auto-subscribe when connected and enabled
  useEffect(() => {
    if (enabled && isConnected && symbols.length > 0) {
      subscribe();
    }

    return () => {
      if (isSubscribed.current) {
        unsubscribe();
      }
    };
  }, [enabled, isConnected, symbols, subscribe, unsubscribe]);

  return {
    prices,
    lastUpdated,
    isLive: isConnected && isSubscribed.current,
    isConnecting: connectionState === WebSocketConnectionState.CONNECTING ||
                  connectionState === WebSocketConnectionState.RECONNECTING,
    error,
    subscribe,
    unsubscribe,
  };
}
```

### 3.3 Game-Specific Live Updates Hook

**File: `src/presentation/hooks/useGameLivePrices.ts`**

```typescript
/**
 * useGameLivePrices Hook
 * Manages live price updates for a specific game with optimistic updates
 */
import { useEffect, useMemo, useCallback } from 'react';
import { Game, GameStock } from '@/src/domain/entities/Game';
import { PriceUpdate } from '@/src/domain/entities/PriceUpdate';
import { useLivePrices } from './useLivePrices';

interface UseGameLivePricesOptions {
  game: Game | null;
  enabled?: boolean;
}

interface UseGameLivePricesReturn {
  stocks: GameStock[];
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  isLive: boolean;
  lastUpdated: Date | null;
  changedSymbols: Set<string>;
}

export function useGameLivePrices(options: UseGameLivePricesOptions): UseGameLivePricesReturn {
  const { game, enabled = true } = options;

  // Extract symbols from game
  const symbols = useMemo(() => {
    if (!game) return [];
    return game.stocks.map((stock) => stock.symbol);
  }, [game]);

  // Get live prices
  const { prices, lastUpdated, isLive } = useLivePrices({
    symbols,
    gameId: game?.id,
    enabled: enabled && !!game,
  });

  // Track which symbols changed
  const changedSymbols = useMemo(() => {
    const changed = new Set<string>();
    if (!game) return changed;

    game.stocks.forEach((stock) => {
      const livePrice = prices.get(stock.symbol);
      if (livePrice) {
        const currentPrice = stock.currentPrice || stock.openingPrice;
        if (livePrice.lastPrice !== currentPrice) {
          changed.add(stock.symbol);
        }
      }
    });

    return changed;
  }, [game, prices]);

  // Merge live prices with game stocks
  const stocks = useMemo((): GameStock[] => {
    if (!game) return [];

    return game.stocks.map((stock) => {
      const livePrice = prices.get(stock.symbol);

      if (livePrice) {
        const change = livePrice.lastPrice - stock.openingPrice;
        const percentChange = (change / stock.openingPrice) * 100;

        return {
          ...stock,
          currentPrice: livePrice.lastPrice,
          percentageChange: percentChange,
        };
      }

      return stock;
    });
  }, [game, prices]);

  // Calculate totals
  const { totalValue, totalReturn, totalReturnPercent } = useMemo(() => {
    if (stocks.length === 0) {
      return { totalValue: 0, totalReturn: 0, totalReturnPercent: 0 };
    }

    const openingTotal = stocks.reduce((sum, s) => sum + s.openingPrice, 0);
    const currentTotal = stocks.reduce(
      (sum, s) => sum + (s.currentPrice || s.openingPrice),
      0
    );
    const returnAmount = currentTotal - openingTotal;
    const returnPercent = openingTotal > 0 ? (returnAmount / openingTotal) * 100 : 0;

    return {
      totalValue: currentTotal,
      totalReturn: returnAmount,
      totalReturnPercent: returnPercent,
    };
  }, [stocks]);

  return {
    stocks,
    totalValue,
    totalReturn,
    totalReturnPercent,
    isLive,
    lastUpdated,
    changedSymbols,
  };
}
```

---

## 4. DI Container Integration

### 4.1 Updated Container

**File: `src/core/di/container.ts` (additions)**

```typescript
// Add import
import { WebSocketClient } from '@/src/data/websocket/WebSocketClient';
import { WebSocketPort } from '@/src/domain/ports/WebSocketPort';

class DIContainer {
  // ... existing code ...

  // WebSocket
  private readonly _webSocketClient: WebSocketClient;

  // Expose as interface (Dependency Inversion)
  get webSocketClient(): WebSocketPort {
    return this._webSocketClient;
  }

  private constructor() {
    // ... existing initialization ...

    // Initialize WebSocket client
    this._webSocketClient = new WebSocketClient(this.storageService);
  }
}
```

---

## 5. Connection Lifecycle Management

### 5.1 Component-Level Control

**Pattern for screens that need live updates:**

```typescript
// In ActiveGamesScreen
import { useFocusEffect } from 'expo-router';
import { useWebSocket } from '@/src/presentation/hooks/useWebSocket';
import { useLivePrices } from '@/src/presentation/hooks/useLivePrices';

export default function ActiveGamesScreen() {
  const { disconnect } = useWebSocket();
  const [games, setGames] = useState<Game[]>([]);

  // Get all symbols from active games
  const allSymbols = useMemo(() => {
    return games.flatMap((game) => game.stocks.map((s) => s.symbol));
  }, [games]);

  const { prices, isLive, lastUpdated } = useLivePrices({
    symbols: allSymbols,
    enabled: games.length > 0,
  });

  // Disconnect when leaving screen
  useFocusEffect(
    useCallback(() => {
      // Screen focused - WebSocket connects automatically via useLivePrices

      return () => {
        // Screen unfocused - optionally disconnect
        // disconnect();  // Uncomment to disconnect on blur
      };
    }, [])
  );

  // Update games with live prices
  useEffect(() => {
    if (prices.size === 0) return;

    setGames((prevGames) =>
      prevGames.map((game) => ({
        ...game,
        stocks: game.stocks.map((stock) => {
          const live = prices.get(stock.symbol);
          return live
            ? { ...stock, currentPrice: live.lastPrice }
            : stock;
        }),
      }))
    );
  }, [prices]);

  // ... rest of component
}
```

### 5.2 Lifecycle State Diagram

```
                    +-----------------+
                    |   DISCONNECTED  |
                    +-----------------+
                           |
                           | connect()
                           v
                    +-----------------+
                    |   CONNECTING    |
                    +-----------------+
                           |
            +--------------+--------------+
            |                             |
            | success                     | failure
            v                             v
    +-----------------+           +-----------------+
    |    CONNECTED    |           |  RECONNECTING   |
    +-----------------+           +-----------------+
            |                             |
            | close (abnormal)            | retry
            +-----------------------------+
            |                             |
            | max attempts reached        | success
            v                             v
    +-----------------+           +-----------------+
    |     ERROR       |           |    CONNECTED    |
    +-----------------+           +-----------------+
```

---

## 6. File Structure

```
src/
├── domain/
│   ├── entities/
│   │   ├── Game.ts
│   │   ├── Stock.ts
│   │   └── PriceUpdate.ts          # NEW
│   └── ports/
│       └── WebSocketPort.ts         # NEW
├── data/
│   ├── websocket/
│   │   ├── WebSocketClient.ts       # NEW
│   │   └── types/
│   │       └── WebSocketMessages.ts # NEW
│   └── repositories/
│       └── GameRepositoryImpl.ts
├── presentation/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts          # NEW
│   │   ├── useLivePrices.ts         # NEW
│   │   └── useGameLivePrices.ts     # NEW
│   └── components/
│       └── ...
└── core/
    ├── di/
    │   └── container.ts             # UPDATED
    └── constants/
        └── app.constants.ts         # Already has WS_URL
```

---

## 7. Migration Strategy

### Phase 1: Infrastructure Setup
1. Create domain entities and ports (`PriceUpdate.ts`, `WebSocketPort.ts`)
2. Implement `WebSocketClient.ts` with full connection logic
3. Register in DI container

### Phase 2: Hooks Development
1. Create `useWebSocket.ts` hook
2. Create `useLivePrices.ts` hook
3. Create `useGameLivePrices.ts` hook

### Phase 3: Integration
1. Update Active Games screen to use live prices
2. Replace 30-second polling with WebSocket subscription
3. Maintain fallback to polling if WebSocket fails

### Phase 4: Enhancement
1. Add offline indicator
2. Add manual reconnect button
3. Add connection status in UI

---

## 8. Error Handling Strategy

| Error Type | Handling |
|------------|----------|
| Connection timeout | Auto-reconnect with exponential backoff |
| Socket error | Auto-reconnect up to N attempts |
| Max reconnect reached | Show error banner, offer manual retry |
| Subscription error | Log error, continue with REST fallback |
| Parse error | Log error, ignore malformed message |
| Token expired | Clear token, redirect to login |

---

## 9. Testing Considerations

### Unit Tests
- `WebSocketClient`: Mock WebSocket, test state transitions
- `useLivePrices`: Mock DI container, test subscription logic
- `useGameLivePrices`: Test price merging and calculations

### Integration Tests
- Connect/disconnect lifecycle
- Reconnection behavior
- Price update propagation

### Manual Testing
- Network disconnection recovery
- App background/foreground transitions
- Multiple games with overlapping symbols
