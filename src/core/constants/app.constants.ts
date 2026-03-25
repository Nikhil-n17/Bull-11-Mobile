/**
 * Core Constants
 * Centralized configuration values
 */

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080',
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:8080/ws',
  TIMEOUT: 90000, // 90 seconds for Render free tier cold starts
} as const;

export const STORAGE_KEYS = {
  JWT_TOKEN: 'bull11_jwt_token',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
  },
  GAMES: {
    START: '/api/games/start',
    LIVE: (id: string) => `/api/games/${id}/live`,
    CLOSE: (id: string) => `/api/games/${id}/close`,
    CANCEL: (id: string) => `/api/games/${id}/cancel`,
    HISTORY: '/api/games/history',
    DETAILS: (id: string) => `/api/games/${id}`,
  },
  STOCKS: {
    SEARCH: '/api/kite/instruments/search',
  },
  ADMIN: {
    KITE_LOGIN_URL: '/api/kite/auth/login-url',
    KITE_CALLBACK: '/api/kite/auth/callback',
    KITE_STATUS: '/api/kite/auth/status',
    USERS: '/api/admin/users',
    USER_BY_ID: (id: string) => `/api/admin/users/${id}`,
    USER_BY_EMAIL: (email: string) => `/api/admin/users/email/${email}`,
  },
  CONTESTS: {
    LIST: '/api/contests',
    CREATE: '/api/contests',
    DETAILS: (id: string) => `/api/contests/${id}`,
    UPCOMING: '/api/contests/upcoming',
    LIVE: '/api/contests/live',
    COMPLETED: '/api/contests/completed',
    JOIN: (id: string) => `/api/contests/${id}/join`,
    SUBMIT_TEAM: (id: string) => `/api/contests/${id}/team`,
    MY_TEAM: (id: string) => `/api/contests/${id}/my-team`,
    WITHDRAW: (id: string) => `/api/contests/${id}/withdraw`,
    LEADERBOARD: (id: string) => `/api/contests/${id}/leaderboard`,
    MY_PERFORMANCE: (id: string) => `/api/contests/${id}/my-performance`,
    MY_CONTESTS: '/api/contests/my-contests',
    RESULTS: (id: string) => `/api/contests/${id}/results`,
    CANCEL: (id: string) => `/api/contests/${id}/cancel`,
    DELETE: (id: string) => `/api/contests/${id}`,
    FORCE_OPEN_REGISTRATION: (id: string) => `/api/contests/${id}/force-open-registration`,
    FORCE_START: (id: string) => `/api/contests/${id}/force-start`,
    FORCE_END: (id: string) => `/api/contests/${id}/force-end`,
    PARTICIPANTS: (id: string) => `/api/contests/${id}/participants`,
  },
} as const;

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  GAME_MIN_STOCKS: 3,
  GAME_MAX_STOCKS: 5,
} as const;
