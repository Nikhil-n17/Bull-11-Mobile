<div align="center">

# Bull-11 Mobile

### Stock Market Fantasy Game - React Native Mobile App

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**[Backend Repository](https://github.com/karthiks2410/Bull-11)** · **[Architecture Docs](./docs/ARCHITECTURE.md)**

</div>

---
 
## Overview

Bull-11 is a **Dream11-style fantasy game for the stock market**. Players join contests, pick stocks, and compete based on real-time NSE/BSE price movements. Built with **Clean Architecture** on React Native (Expo) with a Spring Boot backend.

### Key Highlights

- **Contests** - Join upcoming contests, pick stocks, compete on live leaderboards
- **Real-Time Prices** - WebSocket (STOMP) for live price ticks during contests
- **Practice Games** - Solo stock-picking games with live market tracking
- **Secure Auth** - JWT-based authentication with session management
- **Clean Architecture** - Domain-driven design with repository pattern and DI

---

## Features

### Contests (Primary Feature)

| Feature | Description |
|---------|-------------|
| **Browse & Join** | Discover upcoming contests, view entry fee / prize pool, join with one tap |
| **Team Builder** | Search NSE/BSE instruments, pick stocks for your portfolio |
| **Live Leaderboard** | Real-time rank updates via WebSocket during contest hours |
| **My Contests** | Sub-tabs: Upcoming (edit team / withdraw) · Live (rank + return %) · Past (analysis) |
| **Contest Analysis** | Post-contest breakdown: stock-by-stock open/close/change, final leaderboard with prize distribution |
| **Admin Controls** | Create contests, force open registration / start / end, cancel, delete |

### Practice Games

- Create solo games with 3-5 NSE/BSE stocks
- Live price tracking with auto-refresh and WebSocket fallback
- Performance insights, rank badges, trend indicators
- Game history with final metrics

### Authentication & Security

- JWT tokens (24h expiry) stored in AsyncStorage
- Auto-attached via Axios interceptor
- 24-hour inactivity timeout with activity tracking
- Rate limiting (5 login attempts / 15 min)
- Role-based access: USER and ADMIN routes

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React Native** 0.81.5 | Cross-platform mobile framework |
| **Expo** SDK 54 | Development platform & OTA updates |
| **TypeScript** 5.9.2 | Type safety |
| **Expo Router** | File-based navigation |
| **NativeBase** | UI component library |
| **@stomp/stompjs** | WebSocket client for live data |
| **Axios** | HTTP client with auth interceptor |
| **React Native Reanimated** | Animations (card entry, price pulse) |

### Backend (separate repo)

| Technology | Purpose |
|------------|---------|
| **Spring Boot** 3.2.5 / Java 21 | REST API + WebSocket server |
| **PostgreSQL** 16 | Primary database |
| **Redis** 7 | Caching & sessions |
| **Zerodha Kite Connect** | Live NSE/BSE market data |

### Architecture

- **Clean Architecture** - Domain → Data → Presentation → Core
- **Repository Pattern** - Interfaces in domain, implementations in data
- **Use Case Pattern** - 20+ organized business operations
- **Dependency Injection** - Centralized container (`src/core/di/container.ts`)
- **WebSocket** - STOMP over SockJS for real-time contest leaderboards

---

## Project Structure

```
bull-11-app/
├── app/                              # Expo Router screens
│   ├── auth/
│   │   ├── login.tsx                 # Login
│   │   └── register.tsx              # Registration
│   ├── (tabs)/
│   │   ├── home.tsx                  # Contest discovery (upcoming/live)
│   │   ├── contests.tsx              # My Contests (upcoming/live/past)
│   │   ├── games.tsx                 # Practice games with live prices
│   │   ├── profile.tsx               # User profile & stats
│   │   └── _layout.tsx               # Tab bar layout
│   ├── contest/
│   │   └── [id]/
│   │       ├── team-builder.tsx      # Stock selection for contest
│   │       └── leaderboard.tsx       # Full leaderboard page
│   └── (admin)/
│       ├── contests.tsx              # Admin contest management
│       ├── kite-setup.tsx            # Kite OAuth integration
│       └── users.tsx                 # User management
│
├── src/
│   ├── domain/                       # Business logic layer
│   │   ├── entities/
│   │   │   ├── Contest.ts            # Contest, ContestEntry, LeaderboardEntry
│   │   │   ├── Game.ts               # Practice game entities
│   │   │   ├── User.ts               # User entity
│   │   │   └── Stock.ts              # Stock entity
│   │   ├── repositories/
│   │   │   ├── ContestRepository.ts  # Contest operations interface
│   │   │   ├── GameRepository.ts     # Game operations interface
│   │   │   └── ...
│   │   └── usecases/
│   │       ├── contest/              # Join, Submit/Update Team, Withdraw, Leaderboard, etc.
│   │       ├── game/                 # Start, Close, Cancel, History
│   │       ├── stock/                # Search instruments
│   │       └── auth/                 # Login, Register, Logout
│   │
│   ├── data/                         # Implementation layer
│   │   ├── api/
│   │   │   ├── ApiClient.ts          # Axios instance with JWT interceptor
│   │   │   └── dto.ts                # Request/Response DTOs
│   │   ├── repositories/
│   │   │   ├── ContestRepositoryImpl.ts  # Contest API calls + DTO mapping
│   │   │   └── ...
│   │   └── websocket/
│   │       ├── ContestWebSocketClient.ts # STOMP client for contests
│   │       └── ContestWebSocketTypes.ts  # WebSocket message types
│   │
│   ├── presentation/
│   │   ├── components/
│   │   │   ├── ContestCard.tsx        # Card variants: browse, upcoming, live, past
│   │   │   ├── ContestDetailsModal.tsx # Live contest detail view
│   │   │   ├── ContestAnalysisModal.tsx # Post-contest results & analysis
│   │   │   ├── GameDetailsModal.tsx   # Practice game dashboard
│   │   │   ├── SubTabNavigation.tsx   # Reusable sub-tab component
│   │   │   ├── ConfirmDialog.tsx      # Confirmation dialog with loading state
│   │   │   └── common/               # ErrorDisplay, ErrorBanner, Card, etc.
│   │   └── hooks/
│   │       ├── useAuth.ts            # Auth state management
│   │       ├── useContestWebSocket.ts # WebSocket hook for live contest data
│   │       └── useStockWebSocket.ts  # WebSocket hook for practice games
│   │
│   └── core/
│       ├── constants/app.constants.ts # API endpoints
│       ├── di/container.ts           # Dependency injection setup
│       ├── security/SessionManager.ts # Inactivity timeout
│       └── theme/                    # Colors, typography, spacing
│
├── .env                              # API URLs (production)
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Backend API running ([Bull-11 Backend](https://github.com/karthiks2410/Bull-11))

### Installation

```bash
# Clone
git clone https://github.com/karthiks2410/Bull-11-Mobile.git
cd Bull-11-Mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL

# Start
npm run web         # Web browser (localhost:5050)
npm start           # Expo dev server with QR code
npm run ios         # iOS simulator
npm run android     # Android emulator
```

### Environment Variables

```env
EXPO_PUBLIC_API_BASE_URL=https://bull11-backend.onrender.com
EXPO_PUBLIC_WS_URL=wss://bull11-backend.onrender.com/ws
PORT=5050
```

For local development, use `http://localhost:8080` and `ws://localhost:8080/ws`.

---

## User Flows

### Contest Flow

```
1. Home tab → Browse upcoming contests
2. Tap "Join Contest" → Enter team name
3. Team Builder → Search & pick stocks (NSE/BSE)
4. Submit team → Contest appears in My Contests (Upcoming)
5. Edit team or withdraw before contest starts
6. Contest goes live → Real-time leaderboard via WebSocket
7. Contest ends → View analysis (stock breakdown, final ranks, prizes)
```

### Practice Game Flow

```
1. Games tab → Create new game
2. Search & select 3-5 stocks
3. Start game → Opening prices recorded
4. Live tracking with WebSocket price updates
5. Close game when ready → Final performance calculated
```

### Admin Flow

```
1. Login as ADMIN user
2. Admin tab → Create contests (name, dates, entry fee, prize pool)
3. Force open registration / start / end contests
4. Kite Setup → OAuth for Zerodha market data
5. User Management → View/search all users
```

---

## Time Convention

All times follow a UTC pipeline:

1. **Admin creates contest** with IST times
2. **Backend converts** IST → UTC and stores in PostgreSQL
3. **API returns** `LocalDateTime` (no timezone suffix)
4. **Frontend appends** `'Z'` to parse as UTC (`parseUtcDate()` in `ContestRepositoryImpl.ts`)
5. **Display** uses `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })` for IST

---

## WebSocket Integration

Real-time updates use **STOMP over SockJS**:

| Topic | Purpose |
|-------|---------|
| `/topic/contest/{id}/leaderboard` | Live leaderboard updates during contests |
| `/topic/contest/{id}/prices` | Live stock price ticks |

- `ContestWebSocketClient.ts` manages connection lifecycle
- Auto-reconnect with fallback to REST polling (15s interval)
- Visual connection indicator on live contest cards

---

## API Endpoints (Key)

### Contests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contests` | List all contests |
| GET | `/api/contests/upcoming` | Upcoming contests |
| GET | `/api/contests/live` | Live contests |
| GET | `/api/contests/{id}` | Contest details |
| POST | `/api/contests/{id}/join` | Join a contest |
| POST | `/api/contests/{id}/team` | Submit team |
| PATCH | `/api/contests/{id}/team` | Update team |
| DELETE | `/api/contests/{id}/withdraw` | Withdraw |
| GET | `/api/contests/{id}/leaderboard` | Leaderboard |
| GET | `/api/contests/my-contests` | User's contests |

### Instruments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kite/instruments/search?q=INFY` | Search instruments |
| GET | `/api/kite/instruments/search-with-price?q=INFY` | Search with live price |
| GET | `/api/kite/instruments/token?symbol=INFY&exchange=NSE` | Get instrument token |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

---

## Related Projects

- **[Bull-11 Backend](https://github.com/karthiks2410/Bull-11)** - Spring Boot 3.2.5, Java 21, PostgreSQL 16, Redis 7, Zerodha Kite Connect, WebSocket (STOMP)

---

## License

Proprietary - All rights reserved

---

<div align="center">

**Built with React Native, Clean Architecture, and real-time market data**

[Back to Top](#bull-11-mobile)

</div>
