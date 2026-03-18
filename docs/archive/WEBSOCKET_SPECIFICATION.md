# WebSocket Live Price Updates - Technical Specification

## Overview

This document provides a complete technical specification for implementing WebSocket live price updates in the Bull-11 React Native frontend. The backend uses Spring Boot with STOMP over WebSocket to stream live stock data from Zerodha Kite.

---

## Architecture Flow

```
Zerodha WebSocket (wss://ws.kite.trade)
         |
    KiteTicker (Zerodha SDK)
         |
    KiteTickerService - processes ticks
         |
    StockWebSocketHandler - broadcasts to clients via STOMP
         |
    STOMP Message Broker (/topic/stocks)
         |
    React Native WebSocket Client
```

---

## Connection Details

### WebSocket Endpoint

| Property | Value |
|----------|-------|
| **URL** | `http://localhost:9090/ws` |
| **Protocol** | STOMP over SockJS |
| **CORS** | All origins allowed (`*`) |
| **Fallback** | SockJS enabled for non-WebSocket browsers |

### Required Libraries

For the HTML test client, the backend uses:
- **SockJS Client**: `https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js`
- **STOMP.js**: `https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js`

For React Native, equivalent libraries:
- `@stomp/stompjs` (STOMP protocol)
- `sockjs-client` or native WebSocket with SockJS polyfill

---

## Connection Flow

### Step 1: Create SockJS Connection

```javascript
const socket = new SockJS('http://localhost:9090/ws');
```

### Step 2: Create STOMP Client

```javascript
const stompClient = Stomp.over(socket);
```

### Step 3: Connect to Server

```javascript
stompClient.connect(
  {},  // No authentication headers required
  function(frame) {
    // Connection successful
    console.log('Connected:', frame);
  },
  function(error) {
    // Connection error
    console.log('Error:', error);
    // Implement reconnection logic
  }
);
```

### Step 4: Subscribe to Topics

```javascript
// Subscribe to live stock data
stompClient.subscribe('/topic/stocks', function(message) {
  const ticks = JSON.parse(message.body);
  // Process ticks array
});

// Subscribe to subscription responses (feedback)
stompClient.subscribe('/topic/subscription-response', function(message) {
  const response = JSON.parse(message.body);
  // Handle subscription confirmation
});
```

### Step 5: Request Stock Subscriptions

```javascript
const request = {
  symbols: ['INFY', 'TCS', 'RELIANCE'],
  exchange: 'NSE'  // Default: NSE, Options: NSE, BSE, NFO
};

stompClient.send('/app/subscribe', {}, JSON.stringify(request));
```

---

## Message Formats

### 1. Subscription Request (Client -> Server)

**Destination:** `/app/subscribe`

```typescript
interface SubscriptionRequest {
  symbols: string[];    // Stock trading symbols
  exchange: string;     // "NSE" | "BSE" | "NFO" (default: "NSE")
}
```

**Example:**
```json
{
  "symbols": ["INFY", "TCS", "RELIANCE", "HDFCBANK", "ICICIBANK"],
  "exchange": "NSE"
}
```

### 2. Subscription Response (Server -> Client)

**Topic:** `/topic/subscription-response`

```typescript
interface SubscriptionResponse {
  success: boolean;
  subscribedCount: number;
  message: string;
  failedSymbols?: string[];  // Symbols that couldn't be found
  hint?: string;             // Suggestions for valid symbols
}
```

**Success Example:**
```json
{
  "success": true,
  "subscribedCount": 5,
  "message": "Subscribed to 5 symbols"
}
```

**Partial Failure Example:**
```json
{
  "success": true,
  "subscribedCount": 3,
  "message": "Subscribed to 3 symbols",
  "failedSymbols": ["INVALID1", "NOTFOUND"],
  "hint": "Try: HDFCBANK, ICICIBANK, RELIANCE, INFY, TCS"
}
```

**Error Example:**
```json
{
  "success": false,
  "subscribedCount": 0,
  "message": "No valid symbols found"
}
```

### 3. Tick Data (Server -> Client)

**Topic:** `/topic/stocks`

**Format:** Array of tick objects

```typescript
interface TickData {
  instrumentToken: number;    // Unique Zerodha instrument identifier
  tradingSymbol: string;      // Stock symbol (e.g., "INFY")
  lastPrice: number;          // Current trading price
  volume: number;             // Volume traded today
  change: number;             // Absolute price change from previous close
  timestamp: string | null;   // ISO timestamp of the tick

  // OHLC Data
  open: number;               // Day's opening price
  high: number;               // Day's high price
  low: number;                // Day's low price
  close: number;              // Previous day's closing price
}
```

**Example Tick Array:**
```json
[
  {
    "instrumentToken": 408065,
    "tradingSymbol": "INFY",
    "lastPrice": 1456.75,
    "volume": 5234567,
    "change": 12.50,
    "timestamp": "2024-01-15T10:30:45.123Z",
    "open": 1445.00,
    "high": 1462.30,
    "low": 1442.15,
    "close": 1444.25
  },
  {
    "instrumentToken": 2953217,
    "tradingSymbol": "TCS",
    "lastPrice": 3789.45,
    "volume": 1234567,
    "change": -15.30,
    "timestamp": "2024-01-15T10:30:45.125Z",
    "open": 3805.00,
    "high": 3810.50,
    "low": 3780.00,
    "close": 3804.75
  }
]
```

---

## Authentication

### Current Implementation

**No authentication is required** for WebSocket connections. The WebSocket endpoint is open.

However, the backend requires Kite authentication to be completed before tick data can be streamed:

1. Admin must authenticate with Zerodha via `/api/kite/auth/login`
2. Once authenticated, the KiteTicker connects to Zerodha
3. WebSocket clients can then subscribe and receive data

### Future Consideration

For production, JWT authentication should be added to WebSocket connections:

```javascript
stompClient.connect(
  {
    Authorization: 'Bearer <JWT_TOKEN>'
  },
  onConnected,
  onError
);
```

---

## Error Handling

### Connection Errors

| Error | Cause | Handling |
|-------|-------|----------|
| Connection refused | Server not running | Retry with exponential backoff |
| 403 Forbidden | Kite token expired | Admin needs to re-authenticate |
| Timeout | Network issues | Retry connection |

### Recommended Retry Strategy

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connect() {
  const socket = new SockJS('http://localhost:9090/ws');
  stompClient = Stomp.over(socket);

  stompClient.connect({},
    function(frame) {
      reconnectAttempts = 0;  // Reset on successful connection
      // ... setup subscriptions
    },
    function(error) {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(connect, delay);
      }
    }
  );
}
```

---

## STOMP Endpoints Summary

| Endpoint | Direction | Purpose |
|----------|-----------|---------|
| `/ws` | Connect | WebSocket connection endpoint |
| `/app/subscribe` | Client -> Server | Send subscription request |
| `/topic/stocks` | Server -> Client | Receive live tick data |
| `/topic/subscription-response` | Server -> Client | Receive subscription feedback |

---

## Market Hours (IST)

| Session | Time (IST) |
|---------|------------|
| Pre-market | 9:00 AM - 9:15 AM |
| Trading | 9:15 AM - 3:30 PM |
| Post-market | 3:30 PM - 4:00 PM |
| Weekend | Closed (Sat-Sun) |

**Note:** No live ticks will be received outside trading hours. Last traded prices from the previous session may be shown.

---

## Complete Working Example (from Backend Test Client)

```javascript
// Global variables
let stompClient = null;
let tickData = {};

/**
 * Connect to WebSocket
 */
function connect() {
  const socket = new SockJS('http://localhost:9090/ws');
  stompClient = Stomp.over(socket);

  stompClient.connect({}, function(frame) {
    console.log('Connected to WebSocket!');

    // Subscribe to stock updates
    stompClient.subscribe('/topic/stocks', function(message) {
      const ticks = JSON.parse(message.body);
      ticks.forEach(tick => {
        console.log(`${tick.tradingSymbol}: ${tick.lastPrice} (${tick.change >= 0 ? '+' : ''}${tick.change})`);
        tickData[tick.instrumentToken] = tick;
      });
    });

    // Subscribe to subscription responses
    stompClient.subscribe('/topic/subscription-response', function(message) {
      const response = JSON.parse(message.body);
      if (response.success) {
        console.log(`Subscribed to ${response.subscribedCount} symbols`);
      } else {
        console.error(`Subscription failed: ${response.message}`);
        if (response.failedSymbols) {
          console.warn(`Failed symbols: ${response.failedSymbols.join(', ')}`);
        }
      }
    });

  }, function(error) {
    console.error('WebSocket error:', error);
    setTimeout(connect, 5000);  // Retry after 5 seconds
  });
}

/**
 * Subscribe to stock symbols
 */
function subscribe(symbols, exchange = 'NSE') {
  if (!stompClient || !stompClient.connected) {
    console.error('Not connected to WebSocket!');
    return;
  }

  const request = {
    symbols: symbols,
    exchange: exchange
  };

  stompClient.send('/app/subscribe', {}, JSON.stringify(request));
  console.log(`Subscription request sent for: ${symbols.join(', ')}`);
}

/**
 * Disconnect from WebSocket
 */
function disconnect() {
  if (stompClient) {
    stompClient.disconnect();
    console.log('Disconnected from WebSocket');
  }
}

// Usage
connect();
// After connection established:
// subscribe(['INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'ICICIBANK']);
```

---

## React Native Implementation Notes

### Recommended Libraries

1. **@stomp/stompjs** - Modern STOMP client
2. **sockjs-client** - SockJS client (may need polyfill for React Native)

Or use the React Native compatible approach:

```bash
npm install @stomp/stompjs
npm install sockjs-client
npm install text-encoding  # May be needed for polyfill
```

### React Native Polyfills

```javascript
// Add to index.js or App.js before other imports
import { TextEncoder, TextDecoder } from 'text-encoding';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
```

### Hook-based Implementation Pattern

```typescript
// useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface TickData {
  instrumentToken: number;
  tradingSymbol: string;
  lastPrice: number;
  volume: number;
  change: number;
  timestamp: string | null;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useStockWebSocket(baseUrl: string) {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState<Map<number, TickData>>(new Map());

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
      onConnect: () => {
        setConnected(true);

        // Subscribe to stock updates
        client.subscribe('/topic/stocks', (message) => {
          const tickArray: TickData[] = JSON.parse(message.body);
          setTicks(prev => {
            const newMap = new Map(prev);
            tickArray.forEach(tick => {
              newMap.set(tick.instrumentToken, tick);
            });
            return newMap;
          });
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => console.error('STOMP error:', frame),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [baseUrl]);

  const subscribe = useCallback((symbols: string[], exchange = 'NSE') => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/subscribe',
        body: JSON.stringify({ symbols, exchange }),
      });
    }
  }, []);

  return { connected, ticks, subscribe };
}
```

---

## Key Backend Files Reference

| File | Path | Purpose |
|------|------|---------|
| WebSocketConfig | `/src/main/java/com/project/app/config/WebSocketConfig.java` | STOMP/WebSocket configuration |
| StockWebSocketHandler | `/src/main/java/com/project/app/websocket/StockWebSocketHandler.java` | Handles subscriptions, broadcasts ticks |
| KiteTickerService | `/src/main/java/com/project/app/service/kite/KiteTickerService.java` | Manages Zerodha Kite ticker connection |
| Test Client | `/app/index.html`, `/app/app.js` | Working HTML/JS test implementation |

---

## Testing

1. Start the backend server on port 9090
2. Ensure Kite authentication is completed (admin login)
3. Open the test client at `Bull-11/app/index.html`
4. Enter stock symbols and click Subscribe
5. Verify tick data appears during market hours

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No ticks received | Check if market is open (9:15 AM - 3:30 PM IST) |
| Connection refused | Ensure backend is running on port 9090 |
| Subscription fails | Verify symbol names are correct (e.g., INFY, TCS, RELIANCE) |
| 403 Forbidden | Admin needs to re-authenticate with Kite |
| Symbols not found | Try popular symbols: HDFCBANK, ICICIBANK, RELIANCE, INFY, TCS |
