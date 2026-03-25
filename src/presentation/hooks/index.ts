/**
 * Presentation Hooks - Barrel Export
 * Central export point for all React hooks
 */

// Authentication hooks
export { useAuth } from './useAuth';

// WebSocket hooks for real-time price updates
export {
  useStockWebSocket,
  useSingleStockPrice,
  useActiveGamesPrices,
  type PriceMap,
  type UseStockWebSocketOptions,
  type UseStockWebSocketResult,
} from './useStockWebSocket';

// Market countdown hook for 3:30 PM IST auto-close
export {
  useMarketCountdown,
  MarketUtils,
  COUNTDOWN_COLORS,
  type MarketCountdownState,
} from './useMarketCountdown';

// Server wake-up hook for Render cold starts
export { useServerWakeUp } from './useServerWakeUp';
