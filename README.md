<div align="center">

# 🎯 Bull-11 Mobile

### Stock Market Fantasy Game - React Native Mobile App

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**[Backend Repository](https://github.com/karthiks2410/Bull-11)** • **[Architecture Docs](./docs/ARCHITECTURE.md)**

</div>

---

## 📋 Overview

Bull-11 is a production-ready mobile application for participating in real-time stock market fantasy games featuring Indian stocks (NSE/BSE). Built with **Clean Architecture** and **SOLID principles**, it offers live market tracking, gaming analytics, and comprehensive security features.

### ✨ Key Highlights

- 🔐 **Secure Authentication** - JWT-based auth with rate limiting and session management
- 📊 **Live Market Data** - Real-time NSE/BSE stock prices via Zerodha Kite Connect
- 🎮 **Gaming UI** - Rank system, achievement badges, performance insights
- 📈 **Visual Analytics** - Stock comparison bars, color-coded profit/loss ranges
- 👥 **Role-Based Access** - User and Admin roles with dedicated features
- 🏗️ **Clean Architecture** - Domain-driven design with 15 organized use cases

---

## 🚀 Features

### For All Users
- ✅ **User Registration** - Self-service signup with password strength validation
- ✅ **Game Creation** - Select 3-5 stocks from NSE/BSE with smart search
- ✅ **Live Tracking** - Auto-refresh every 30 seconds with pause/resume
- ✅ **Gaming Dashboard** - Rank badges (🏆🥈🥉), performance insights, momentum indicators
- ✅ **Visual Analytics** - Stock comparison bars, color-coded P&L, trend arrows
- ✅ **Game History** - Completed games with final performance metrics
- ✅ **Profile Management** - View stats, manage account, secure logout

### For Administrators
- 🔧 **User Management** - View all users, search, detailed profiles
- 🔧 **Kite Integration** - OAuth setup for Zerodha market data
- 🔧 **System Monitoring** - Analytics, audit logs, system health

### Security Features
- 🔒 **JWT Authentication** - 24-hour token expiry with auto-refresh
- 🔒 **Rate Limiting** - Max 5 login attempts per 15 minutes
- 🔒 **Session Management** - 30-minute inactivity timeout
- 🔒 **Role Validation** - Privilege escalation detection
- 🔒 **Audit Logging** - Track all admin actions

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | SDK 54 | Development platform & tooling |
| **TypeScript** | 5.9.2 | Type-safe development |
| **Expo Router** | Latest | File-based navigation |
| **Axios** | Latest | HTTP client with interceptors |
| **React Hook Form** | Latest | Form validation & management |
| **react-native-logs** | Latest | Structured logging |

### Backend Integration
| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.2.5 | RESTful API server |
| **PostgreSQL** | 16 | Primary database |
| **Redis** | 7 | Caching & sessions |
| **Zerodha Kite** | Latest | Live stock market data |
| **JWT** | - | Authentication tokens |

### Architecture Patterns
- 🏗️ **Clean Architecture** - Domain → Data → Presentation → Core
- 🎯 **SOLID Principles** - Maintainable, testable, scalable code
- 📦 **Repository Pattern** - Abstracted data access layer
- 💉 **Dependency Injection** - Centralized service container
- 🔄 **Use Case Pattern** - 15 organized business operations

---

## 📁 Project Structure

```
bull-11-app/
├── 📱 app/                           # Expo Router screens
│   ├── auth/                         # Authentication flow
│   │   ├── login.tsx                 # Login screen
│   │   └── register.tsx              # Registration screen
│   ├── (tabs)/                       # Main app tabs (protected)
│   │   ├── index.tsx                 # Active games list with live data
│   │   ├── new-game.tsx              # Create new game
│   │   ├── history.tsx               # Game history & analytics
│   │   ├── profile.tsx               # User profile & stats
│   │   └── admin.tsx                 # Admin panel (ADMIN only)
│   └── (admin)/                      # Admin management
│       ├── dashboard.tsx             # Admin dashboard
│       ├── kite-setup.tsx            # Kite OAuth integration
│       ├── users.tsx                 # User management
│       └── users/[id].tsx            # User details
│
├── 🏗️ src/
│   ├── domain/                       # Business logic layer
│   │   ├── entities/                 # Domain models (User, Game, Stock)
│   │   ├── repositories/             # Repository interfaces
│   │   └── usecases/                 # 15 business use cases
│   │       ├── auth/                 # Login, Register, Logout, GetUser
│   │       ├── game/                 # Start, Close, Cancel, History, Live
│   │       ├── stock/                # Search stocks
│   │       └── admin/                # User mgmt, Kite setup
│   │
│   ├── data/                         # Implementation layer
│   │   ├── api/                      # API client & DTOs
│   │   ├── storage/                  # AsyncStorage wrapper
│   │   ├── mappers/                  # DTO ↔ Entity converters
│   │   └── repositories/             # Repository implementations
│   │
│   ├── presentation/                 # UI layer
│   │   ├── screens/                  # Screen components
│   │   ├── components/               # Reusable UI components
│   │   │   ├── common/               # Buttons, Cards, Inputs, Spinners
│   │   │   ├── GameDetailsModal.tsx  # Gaming dashboard
│   │   │   ├── StockComparisonBar.tsx # Visual portfolio composition
│   │   │   └── InsightBanner.tsx     # Performance insights
│   │   ├── hooks/                    # Custom React hooks
│   │   └── guards/                   # Auth & Admin route guards
│   │
│   └── core/                         # Infrastructure
│       ├── constants/                # API endpoints & config
│       ├── di/                       # Dependency injection container
│       ├── security/                 # Security modules (6 total)
│       ├── logging/                  # Structured logging setup
│       ├── theme/                    # Colors, typography, spacing
│       └── utils/                    # Game insights, error handlers
│
├── 📚 docs/                          # Documentation
│   ├── ARCHITECTURE.md               # Detailed architecture guide
│   └── archive/                      # Historical implementation docs
│
├── 🧪 tests/                         # Test suites
├── 🖼️ assets/                        # Images, fonts, icons
├── 📄 .env.example                   # Environment template
└── 📖 README.md                      # This file
```

---

## ⚡ Quick Start

### Prerequisites
- ✅ Node.js 18+ and npm
- ✅ iOS Simulator (Mac) or Android Emulator
- ✅ Expo CLI: `npm install -g expo-cli`
- ✅ Backend API running on port 8080

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/karthiks2410/Bull-11-Mobile.git
cd Bull-11-Mobile

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your backend URL

# 4. Start the app
npm start           # Start with QR code
npm run ios         # iOS simulator
npm run android     # Android emulator
npm run web         # Web browser (port 5050)
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Backend API
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080

# WebSocket (future feature)
EXPO_PUBLIC_WS_URL=ws://localhost:8080/ws

# Development server port
PORT=5050
```

### First Run

1. **Register** - Create a new account (USER role)
2. **Login** - Access your dashboard
3. **Create Game** - Select 3-5 stocks
4. **Track Performance** - Watch live market data

> **Note**: Admin access requires manual backend setup. See [Admin Setup](#admin-setup) below.

---

## 📱 App Screenshots & Features

### Gaming UI Enhancements
- **Live Price Updates** - Auto-refresh every 30 seconds with manual refresh option
- **Smart Color Coding** - Profit/loss ranges (0-2%, 2-5%, 5%+) in graduated colors
- **Rank System** - S/A/B/C/D grades with Gold/Green/Blue/Orange/Red colors
- **Achievement Badges** - 💎 Diamond Hands (+5%), 📄 Paper Hands (-5%)
- **Performance Insights** - Auto-generated messages ("🔥 Strong momentum!", "📉 Portfolio struggling")
- **Stock Comparison Bars** - Visual portfolio composition with color-coded segments
- **Trend Indicators** - ▲▲ (strong up), ▲ (up), ─ (flat), ▼ (down), ▼▼ (strong down)

---

## 🎮 User Flows

### Registration Flow
```
1. Open app → Login screen
2. Click "Sign Up" → Registration form
3. Enter: Full Name, Email, Password (8+ chars with complexity)
4. Password validated → Account created (USER role)
5. Auto-login → Navigate to Games tab
```

### Game Creation Flow
```
1. Navigate to "New Game" tab
2. Search stocks by symbol (e.g., "INFY", "TCS", "RELIANCE")
3. Select 3-5 stocks from results
4. Click "Start Game" → Opening prices recorded
5. Game appears in "Games" tab with live tracking
6. Monitor performance → Close when ready
```

### Admin Setup
To create an ADMIN user, run this SQL on your backend database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Admin features unlocked:
- 👥 User Management - View all users, search, details
- 🔧 Kite OAuth Setup - Integrate Zerodha market data
- 📊 System Analytics - Monitor platform health

---

## 🔒 Security Architecture

### Authentication & Authorization
- **JWT Tokens** - 24-hour expiry with automatic validation
- **Password Requirements** - Min 8 chars, uppercase, lowercase, number, special char
- **Rate Limiting** - Max 5 login attempts per 15 minutes, 30-minute lockout
- **Session Management** - 30-minute inactivity timeout with warning at 5 minutes
- **Role-Based Access** - USER vs ADMIN routes with privilege escalation detection

### Security Modules
| Module | Purpose |
|--------|---------|
| `TokenService` | JWT validation & expiry checking |
| `PasswordValidator` | Strength scoring (Weak/Medium/Strong) |
| `RateLimiter` | Login attempt tracking & lockout |
| `SessionManager` | Inactivity detection & auto-logout |
| `RoleValidator` | Privilege escalation prevention |
| `AuditLogger` | Admin action tracking |

---

## 🧪 Development

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Code Quality
```bash
npm run lint          # Check code style
npm run lint:fix      # Auto-fix issues
npm run typecheck     # TypeScript validation
```

### Building for Production
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas login
eas build:configure

# Build for platforms
eas build --platform ios      # iOS build
eas build --platform android  # Android build
eas build --platform all      # Both platforms
```

---

## 📚 Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Detailed system architecture, patterns, and decisions
- **[API Integration](./docs/ARCHITECTURE.md#api-integration)** - Backend API endpoints and contracts
- **[Security Implementation](./docs/ARCHITECTURE.md#security)** - Security features and best practices
- **[Component Library](./src/presentation/components/)** - Reusable UI components

---

## 🤝 Contributing

This is a proprietary project. For contributions or issues:
1. Review the [Architecture Guide](./docs/ARCHITECTURE.md)
2. Follow existing code patterns and Clean Architecture principles
3. Ensure all tests pass before submitting
4. Contact the development team for access

---

## 🔗 Related Projects

- **[Bull-11 Backend](https://github.com/karthiks2410/Bull-11)** - Spring Boot API server
  - Tech: Spring Boot 3.2.5, Java 21, PostgreSQL 16, Redis 7
  - Features: RESTful API, JWT auth, Kite integration, WebSocket support

---

## 📞 Support

For technical support or questions:
1. Check this README and [Architecture Guide](./docs/ARCHITECTURE.md)
2. Review existing documentation in `docs/`
3. Contact the development team

---

## 📄 License

Proprietary - All rights reserved

---

<div align="center">

**Built with ❤️ using React Native, Clean Architecture, and modern best practices**

[⬆ Back to Top](#-bull-11-mobile)

</div>

