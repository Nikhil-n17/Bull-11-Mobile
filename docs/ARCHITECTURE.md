# Bull-11 Mobile App - Architecture Documentation

> Developer-focused documentation for Clean Architecture implementation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Clean Architecture Layers](#clean-architecture-layers)
3. [SOLID Principles](#solid-principles)
4. [Folder Structure](#folder-structure)
5. [Security Implementation](#security-implementation)
6. [Use Cases](#use-cases)
7. [Repository Pattern](#repository-pattern)
8. [Dependency Injection](#dependency-injection)
9. [Navigation Structure](#navigation-structure)
10. [Code Guidelines](#code-guidelines)

---

## Architecture Overview

This project implements **Clean Architecture** (Robert C. Martin) with clear separation of concerns across layers:

```
┌─────────────────────────────────────┐
│     Presentation Layer (UI)         │  ← React Native screens, components
├─────────────────────────────────────┤
│     Use Cases (Business Logic)      │  ← Domain operations
├─────────────────────────────────────┤
│  Repository Interfaces (Contracts)  │  ← Abstraction layer
├─────────────────────────────────────┤
│ Repository Implementations (Data)   │  ← API, Storage, Cache
├─────────────────────────────────────┤
│    External Services (Backend)      │  ← Spring Boot API, Kite API
└─────────────────────────────────────┘
```

### Key Benefits

✅ **Testability**: Each layer tested independently with mocks
✅ **Maintainability**: Clear boundaries, easy to locate code
✅ **Scalability**: Add features without touching existing code
✅ **Framework Independence**: Domain logic not tied to React Native
✅ **Backend Alignment**: Mirrors Spring Boot layered architecture

---

## Clean Architecture Layers

### 1. Domain Layer (`src/domain/`)
**Pure business logic - No framework dependencies**

#### Entities (`src/domain/entities/`)
Immutable domain models representing core business concepts.

```typescript
// src/domain/entities/User.ts
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly createdAt: Date;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
```

#### Repository Interfaces (`src/domain/repositories/`)
Contracts defining data operations (Dependency Inversion Principle).

```typescript
// src/domain/repositories/AuthRepository.ts
export interface AuthRepository {
  login(email: string, password: string): Promise<AuthResponse>;
  register(name: string, email: string, password: string): Promise<AuthResponse>;
  getCurrentUser(): Promise<User>;
  logout(): Promise<void>;
}
```

#### Use Cases (`src/domain/usecases/`)
Single-responsibility business operations.

```typescript
// src/domain/usecases/LoginUseCase.ts
export class LoginUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    this.validateEmail(request.email);
    this.validatePassword(request.password);
    return await this.authRepository.login(request.email, request.password);
  }
}
```

### 2. Data Layer (`src/data/`)
**Implementation details - Framework-specific code**

#### API Client (`src/data/api/ApiClient.ts`)
Centralized HTTP client with JWT auto-injection.

```typescript
export class ApiClient {
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly storage: StorageService) {
    this.axiosInstance = axios.create({
      baseURL: Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8080',
      timeout: 10000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Auto-inject JWT token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await this.storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: Handle 401 errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.storage.removeToken();
          // Trigger logout flow
        }
        return Promise.reject(error);
      }
    );
  }
}
```

#### Mappers (`src/data/mappers/`)
Convert DTOs ↔ Domain Entities (Single Responsibility).

```typescript
// src/data/mappers/UserMapper.ts
export class UserMapper {
  static toDomain(dto: UserDTO): User {
    return {
      id: dto.id,
      email: dto.email,
      name: dto.name,
      role: dto.role as UserRole,
      createdAt: new Date(dto.createdAt),
    };
  }

  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

#### Repository Implementations (`src/data/repositories/`)
Concrete implementations of repository interfaces.

```typescript
// src/data/repositories/AuthRepositoryImpl.ts
export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly storage: StorageService
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponseDTO>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password }
    );

    await this.storage.setToken(response.data.token);

    return {
      user: UserMapper.toDomain(response.data.user),
      token: response.data.token,
    };
  }
}
```

### 3. Presentation Layer (`src/presentation/`)
**UI components and screens - React Native specific**

#### Screens (`src/presentation/screens/`)
Full-page views that compose components.

```typescript
// src/presentation/screens/auth/LoginScreen.tsx
export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (data: LoginFormData) => {
    const user = await login({ email: data.email, password: data.password });

    if (user.role === 'ADMIN') {
      router.replace('/(admin)/dashboard');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View>
      <Input name="email" label="Email" />
      <Input name="password" label="Password" secureTextEntry />
      <Button onPress={handleSubmit(handleLogin)}>Login</Button>
    </View>
  );
}
```

#### Components (`src/presentation/components/`)
Reusable UI building blocks.

```typescript
// src/presentation/components/common/Button.tsx
interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function Button({ onPress, children, variant = 'primary', loading }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.button, styles[variant]]}
    >
      {loading ? <ActivityIndicator /> : <Text>{children}</Text>}
    </TouchableOpacity>
  );
}
```

#### Hooks (`src/presentation/hooks/`)
Custom React hooks for shared logic.

```typescript
// src/presentation/hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: LoginRequest): Promise<User> => {
    setIsLoading(true);
    try {
      const { user, token } = await container.loginUseCase.execute(credentials);
      await SessionManager.initialize(logout);
      await AuditLogger.log(AuditAction.LOGIN, user.id, user.email, {}, true);
      setUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading, login, logout, register };
}
```

### 4. Core Layer (`src/core/`)
**Shared infrastructure and utilities**

#### Constants (`src/core/constants/app.constants.ts`)
Centralized configuration.

```typescript
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
  },
  GAMES: {
    START: '/api/games/start',
    HISTORY: '/api/games/history',
    CLOSE: (id: string) => `/api/games/${id}/close`,
  },
  ADMIN: {
    USERS: '/api/admin/users',
    KITE_LOGIN_URL: '/api/kite/auth/login-url',
  },
};

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_STOCKS: 3,
  MAX_STOCKS: 5,
};
```

#### Dependency Injection (`src/core/di/container.ts`)
Centralized dependency wiring.

```typescript
export class DIContainer {
  private static instance: DIContainer;

  // Repositories
  private _authRepository?: AuthRepository;
  private _gameRepository?: GameRepository;

  // Use Cases
  private _loginUseCase?: LoginUseCase;
  private _startGameUseCase?: StartGameUseCase;

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  get loginUseCase(): LoginUseCase {
    if (!this._loginUseCase) {
      this._loginUseCase = new LoginUseCase(this.authRepository);
    }
    return this._loginUseCase;
  }

  get authRepository(): AuthRepository {
    if (!this._authRepository) {
      this._authRepository = new AuthRepositoryImpl(
        new ApiClient(new StorageService()),
        new StorageService()
      );
    }
    return this._authRepository;
  }
}

export const container = DIContainer.getInstance();
```

#### Security Modules (`src/core/security/`)
Enterprise-grade security features.

```typescript
// Token management, rate limiting, session handling, audit logging
// (See Security Implementation section)
```

---

## SOLID Principles

### Single Responsibility Principle (SRP)
Each class/module has ONE reason to change.

```typescript
// ✅ GOOD: Each use case does ONE thing
class LoginUseCase {
  async execute(request: LoginRequest): Promise<LoginResponse> { }
}

class RegisterUseCase {
  async execute(request: RegisterRequest): Promise<AuthResponse> { }
}

// ❌ BAD: One class doing multiple things
class AuthUseCase {
  login() { }
  register() { }
  logout() { }
  resetPassword() { }
}
```

### Open/Closed Principle (OCP)
Open for extension, closed for modification.

```typescript
// ✅ GOOD: Extend via interfaces
interface AuthRepository {
  login(email: string, password: string): Promise<AuthResponse>;
}

class AuthRepositoryImpl implements AuthRepository { }
class MockAuthRepository implements AuthRepository { } // Extension without modification
```

### Liskov Substitution Principle (LSP)
Subtypes must be substitutable for their base types.

```typescript
// ✅ GOOD: Any AuthRepository implementation works
function testLogin(authRepo: AuthRepository) {
  return authRepo.login('test@example.com', 'password');
}

testLogin(new AuthRepositoryImpl()); // Works
testLogin(new MockAuthRepository()); // Also works
```

### Interface Segregation Principle (ISP)
Clients shouldn't depend on interfaces they don't use.

```typescript
// ✅ GOOD: Small, focused interfaces
interface AuthRepository {
  login(...): Promise<...>;
  register(...): Promise<...>;
}

interface GameRepository {
  startGame(...): Promise<...>;
  closeGame(...): Promise<...>;
}

// ❌ BAD: One giant interface
interface Repository {
  login, register, startGame, closeGame, searchStocks, ...
}
```

### Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions.

```typescript
// ✅ GOOD: Use case depends on interface
class LoginUseCase {
  constructor(private readonly authRepository: AuthRepository) {} // Interface
}

// ❌ BAD: Use case depends on concrete class
class LoginUseCase {
  constructor(private readonly authRepository: AuthRepositoryImpl) {} // Concrete
}
```

---

## Folder Structure Details

```
src/
├── domain/                         # ← Pure business logic (no React/Expo)
│   ├── entities/
│   │   ├── User.ts                 # Immutable domain model
│   │   ├── Game.ts                 # Game + GameStock entities
│   │   └── Stock.ts                # Stock entity
│   ├── repositories/
│   │   ├── AuthRepository.ts       # Contract (interface)
│   │   ├── GameRepository.ts
│   │   ├── StockRepository.ts
│   │   └── AdminRepository.ts
│   └── usecases/                   # Business operations (15 total)
│       ├── auth/
│       │   ├── LoginUseCase.ts
│       │   ├── RegisterUseCase.ts
│       │   ├── LogoutUseCase.ts
│       │   └── GetCurrentUserUseCase.ts
│       ├── game/
│       │   ├── StartGameUseCase.ts
│       │   ├── GetActiveGamesUseCase.ts
│       │   ├── GetGameHistoryUseCase.ts
│       │   ├── CloseGameUseCase.ts
│       │   └── CancelGameUseCase.ts
│       ├── stock/
│       │   └── SearchStocksUseCase.ts
│       └── admin/
│           ├── GetKiteLoginUrlUseCase.ts
│           ├── HandleKiteCallbackUseCase.ts
│           ├── GetAllUsersUseCase.ts
│           ├── GetUserByIdUseCase.ts
│           └── GetUserByEmailUseCase.ts
│
├── data/                           # ← Implementation (framework-specific)
│   ├── api/
│   │   ├── dto/
│   │   │   └── index.ts            # API request/response types
│   │   └── ApiClient.ts            # Axios + JWT interceptors
│   ├── storage/
│   │   └── StorageService.ts       # AsyncStorage wrapper
│   ├── mappers/                    # DTO ↔ Entity converters
│   │   ├── UserMapper.ts
│   │   ├── GameMapper.ts
│   │   └── StockMapper.ts
│   └── repositories/               # Concrete implementations
│       ├── AuthRepositoryImpl.ts
│       ├── GameRepositoryImpl.ts
│       ├── StockRepositoryImpl.ts
│       └── AdminRepositoryImpl.ts
│
├── presentation/                   # ← UI layer (React Native)
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   └── admin/
│   │       ├── AdminDashboardScreen.tsx
│   │       ├── UserManagementScreen.tsx
│   │       ├── UserDetailScreen.tsx
│   │       └── KiteSetupScreen.tsx
│   ├── components/
│   │   ├── AuthGuard.tsx           # Require authentication
│   │   ├── AdminGuard.tsx          # Require ADMIN role
│   │   ├── common/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── ErrorText.tsx
│   │   │   ├── Card.tsx
│   │   │   └── SessionTimeoutBanner.tsx
│   │   └── admin/
│   │       └── KiteStatusBadge.tsx
│   └── hooks/
│       └── useAuth.ts              # Authentication hook
│
└── core/                           # ← Shared infrastructure
    ├── constants/
    │   └── app.constants.ts        # API endpoints, validation rules
    ├── di/
    │   └── container.ts            # Dependency injection
    └── security/                   # Security modules (6 total)
        ├── TokenService.ts         # JWT expiry validation
        ├── PasswordValidator.ts    # Strength requirements
        ├── RateLimiter.ts          # Brute force protection
        ├── SessionManager.ts       # Inactivity timeout
        ├── RoleValidator.ts        # Privilege escalation detection
        ├── AuditLogger.ts          # Action tracking
        └── index.ts                # Export barrel
```

---

## Security Implementation

### 1. TokenService
**JWT token management with expiry validation**

```typescript
// src/core/security/TokenService.ts
export class TokenService {
  private static readonly TOKEN_KEY = '@bull11_token';
  private static readonly EXPIRY_KEY = '@bull11_token_expiry';
  private static readonly TOKEN_LIFETIME_HOURS = 24;

  static async storeToken(token: string): Promise<void> {
    const expiry = Date.now() + (this.TOKEN_LIFETIME_HOURS * 60 * 60 * 1000);
    await AsyncStorage.multiSet([
      [this.TOKEN_KEY, token],
      [this.EXPIRY_KEY, expiry.toString()],
    ]);
  }

  static async getToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem(this.TOKEN_KEY);
    const expiry = await AsyncStorage.getItem(this.EXPIRY_KEY);

    if (!token || !expiry) return null;

    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
      await this.clearToken();
      return null; // Token expired
    }

    return token;
  }

  static async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  static async getTokenExpiryTime(): Promise<number> {
    // Returns seconds remaining until expiry
  }
}
```

### 2. PasswordValidator
**Password strength validation with real-time feedback**

```typescript
// src/core/security/PasswordValidator.ts
export class PasswordValidator {
  static validate(password: string): ValidationResult {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) errors.push('At least 8 characters');
    else score++;

    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    else score++;

    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    else score++;

    if (!/[0-9]/.test(password)) errors.push('One number');
    else score++;

    if (!/[^a-zA-Z0-9]/.test(password)) errors.push('One special character');
    else score++;

    if (this.isCommonPassword(password)) errors.push('Password too common');

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  static getStrengthColor(strength: PasswordStrength): string {
    return strength === 'weak' ? '#EF4444' :
           strength === 'medium' ? '#F59E0B' :
           '#10B981';
  }
}
```

### 3. RateLimiter
**Brute force protection with exponential backoff**

```typescript
// src/core/security/RateLimiter.ts
export class RateLimiter {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

  static async isAllowed(identifier: string): Promise<RateLimitCheck> {
    const attemptsKey = `@rate_limit_${identifier}`;
    const windowKey = `@rate_limit_window_${identifier}`;
    const lockoutKey = `@rate_limit_lockout_${identifier}`;

    const lockout = await AsyncStorage.getItem(lockoutKey);
    if (lockout) {
      const lockoutTime = parseInt(lockout, 10);
      if (Date.now() < lockoutTime) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: lockoutTime,
        };
      }
      await AsyncStorage.removeItem(lockoutKey);
    }

    const attempts = parseInt(await AsyncStorage.getItem(attemptsKey) || '0', 10);
    const window = parseInt(await AsyncStorage.getItem(windowKey) || '0', 10);

    if (Date.now() > window) {
      await AsyncStorage.multiSet([
        [attemptsKey, '1'],
        [windowKey, (Date.now() + this.WINDOW_MS).toString()],
      ]);
      return { allowed: true, remaining: this.MAX_ATTEMPTS - 1 };
    }

    if (attempts >= this.MAX_ATTEMPTS) {
      const lockoutTime = Date.now() + this.LOCKOUT_MS;
      await AsyncStorage.setItem(lockoutKey, lockoutTime.toString());
      return { allowed: false, remaining: 0, resetAt: lockoutTime };
    }

    return {
      allowed: true,
      remaining: this.MAX_ATTEMPTS - attempts,
    };
  }

  static async recordAttempt(identifier: string): Promise<void> {
    const attemptsKey = `@rate_limit_${identifier}`;
    const attempts = parseInt(await AsyncStorage.getItem(attemptsKey) || '0', 10);
    await AsyncStorage.setItem(attemptsKey, (attempts + 1).toString());
  }

  static async reset(identifier: string): Promise<void> {
    // Clear all rate limit data for identifier
  }
}
```

### 4. SessionManager
**Inactivity timeout with auto-logout**

```typescript
// src/core/security/SessionManager.ts
export class SessionManager {
  private static readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly SESSION_KEY = '@session_last_activity';
  private static expiryCallback: (() => Promise<void>) | null = null;
  private static checkInterval: NodeJS.Timeout | null = null;

  static initialize(onExpiry: () => Promise<void>): void {
    this.expiryCallback = onExpiry;
    this.updateActivity();
    this.startMonitoring();

    // Monitor app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  static async updateActivity(): Promise<void> {
    await AsyncStorage.setItem(this.SESSION_KEY, Date.now().toString());
  }

  static async isSessionValid(): Promise<boolean> {
    const lastActivity = await AsyncStorage.getItem(this.SESSION_KEY);
    if (!lastActivity) return false;

    const elapsed = Date.now() - parseInt(lastActivity, 10);
    return elapsed < this.SESSION_TIMEOUT_MS;
  }

  static async getTimeUntilExpiry(): Promise<number> {
    const lastActivity = await AsyncStorage.getItem(this.SESSION_KEY);
    if (!lastActivity) return 0;

    const elapsed = Date.now() - parseInt(lastActivity, 10);
    const remaining = this.SESSION_TIMEOUT_MS - elapsed;
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  }

  private static startMonitoring(): void {
    this.checkInterval = setInterval(async () => {
      const valid = await this.isSessionValid();
      if (!valid && this.expiryCallback) {
        await this.expiryCallback();
        this.cleanup();
      }
    }, 60000); // Check every minute
  }

  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      const valid = await this.isSessionValid();
      if (!valid && this.expiryCallback) {
        await this.expiryCallback();
      }
    }
  };
}
```

### 5. RoleValidator
**Privilege escalation detection**

```typescript
// src/core/security/RoleValidator.ts
export class RoleValidator {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  async verifyAdminRole(): Promise<RoleCheckResult> {
    try {
      const user = await this.getCurrentUserUseCase.execute();
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isAdmin) {
        await AuditLogger.log(
          AuditAction.ACCESS_DENIED,
          user.id,
          user.email,
          { reason: 'not_admin' },
          false,
          'User attempted to access admin resource'
        );
      }

      return { isAdmin, user, error: isAdmin ? null : 'Not an admin' };
    } catch (error) {
      if (error.response?.status === 403) {
        return {
          isAdmin: false,
          shouldLogout: true,
          error: 'Access forbidden by server',
        };
      }
      throw error;
    }
  }

  async verifyWithEscalationCheck(): Promise<RoleCheckResult> {
    const result = await this.verifyAdminRole();

    if (result.shouldLogout) {
      await AuditLogger.log(
        AuditAction.PRIVILEGE_ESCALATION_DETECTED,
        result.user?.id || '',
        result.user?.email || '',
        { reason: 'server_forbidden' },
        false
      );
    }

    return result;
  }
}
```

### 6. AuditLogger
**Comprehensive action tracking**

```typescript
// src/core/security/AuditLogger.ts
export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  VIEW_ALL_USERS = 'VIEW_ALL_USERS',
  VIEW_USER_DETAIL = 'VIEW_USER_DETAIL',
  KITE_SETUP_INITIATED = 'KITE_SETUP_INITIATED',
  KITE_SETUP_COMPLETED = 'KITE_SETUP_COMPLETED',
  PRIVILEGE_ESCALATION_DETECTED = 'PRIVILEGE_ESCALATION_DETECTED',
}

export class AuditLogger {
  private static readonly LOGS_KEY = '@audit_logs';
  private static readonly MAX_LOGS = 100;

  static async log(
    action: AuditAction,
    userId: string,
    userEmail: string,
    metadata: Record<string, any> = {},
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const log: AuditLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      userId,
      userEmail,
      timestamp: Date.now(),
      success,
      errorMessage,
      metadata,
    };

    const logs = await this.getLogs();
    logs.unshift(log);

    // Keep only last MAX_LOGS entries
    const trimmed = logs.slice(0, this.MAX_LOGS);
    await AsyncStorage.setItem(this.LOGS_KEY, JSON.stringify(trimmed));
  }

  static async getLogs(): Promise<AuditLog[]> {
    const data = await AsyncStorage.getItem(this.LOGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async getRecentLogs(hours: number): Promise<AuditLog[]> {
    const logs = await this.getLogs();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return logs.filter(log => log.timestamp > cutoff);
  }

  static async getFailedActions(): Promise<AuditLog[]> {
    const logs = await this.getLogs();
    return logs.filter(log => !log.success);
  }
}
```

---

## Use Cases

### Organization Pattern

All use cases follow a consistent structure:

```typescript
export class ExampleUseCase {
  constructor(private readonly repository: SomeRepository) {}

  async execute(request: RequestType): Promise<ResponseType> {
    // 1. Validate input
    this.validateInput(request);

    // 2. Call repository
    const result = await this.repository.operation(request);

    // 3. Transform/validate result
    return this.transformResult(result);
  }

  private validateInput(request: RequestType): void {
    // Validation logic
    if (!request.field) {
      throw new Error('Field is required');
    }
  }

  private transformResult(data: any): ResponseType {
    // Transformation logic
    return data;
  }
}
```

### Complete Use Case List

#### Authentication (4)
1. **LoginUseCase** - Authenticate user with email/password
2. **RegisterUseCase** - Create new user account (USER role)
3. **LogoutUseCase** - Clear tokens and end session
4. **GetCurrentUserUseCase** - Fetch authenticated user profile

#### Game Management (5)
5. **StartGameUseCase** - Create game with 3-5 stock selections
6. **GetActiveGamesUseCase** - Fetch user's active games
7. **GetGameHistoryUseCase** - Fetch completed/cancelled games
8. **CloseGameUseCase** - Finalize game with closing prices
9. **CancelGameUseCase** - Cancel active game without results

#### Stock Operations (1)
10. **SearchStocksUseCase** - Search NSE/BSE stocks by symbol/name

#### Admin Operations (5)
11. **GetKiteLoginUrlUseCase** - Generate Kite OAuth URL (ADMIN only)
12. **HandleKiteCallbackUseCase** - Complete Kite authentication (ADMIN only)
13. **GetAllUsersUseCase** - List all system users (ADMIN only)
14. **GetUserByIdUseCase** - Fetch user by ID (ADMIN only)
15. **GetUserByEmailUseCase** - Search user by email (ADMIN only)

---

## Repository Pattern

### Interface Definition

```typescript
// src/domain/repositories/GameRepository.ts
export interface GameRepository {
  startGame(stockSymbols: string[]): Promise<Game>;
  getGame(id: string): Promise<Game>;
  getActiveGames(): Promise<Game[]>;
  getGameHistory(): Promise<Game[]>;
  closeGame(id: string, closingPrices: Record<string, number>): Promise<Game>;
  cancelGame(id: string): Promise<void>;
}
```

### Implementation

```typescript
// src/data/repositories/GameRepositoryImpl.ts
export class GameRepositoryImpl implements GameRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async startGame(stockSymbols: string[]): Promise<Game> {
    const response = await this.apiClient.post<GameDTO>(
      API_ENDPOINTS.GAMES.START,
      { stockSymbols }
    );
    return GameMapper.toDomain(response.data);
  }

  async getActiveGames(): Promise<Game[]> {
    const response = await this.apiClient.get<GameDTO[]>(
      `${API_ENDPOINTS.GAMES.HISTORY}?status=ACTIVE`
    );
    return response.data.map(GameMapper.toDomain);
  }

  // ... other methods
}
```

### Benefits

✅ **Abstraction**: Use cases don't know about API implementation
✅ **Testability**: Easy to mock repositories in tests
✅ **Swappable**: Can replace API with local storage or cache
✅ **Single Responsibility**: Repository handles data access only

---

## Dependency Injection

### Manual DI Container

```typescript
// src/core/di/container.ts
export class DIContainer {
  private static instance: DIContainer;

  // Infrastructure
  private _storageService?: StorageService;
  private _apiClient?: ApiClient;

  // Repositories
  private _authRepository?: AuthRepository;
  private _gameRepository?: GameRepository;
  private _stockRepository?: StockRepository;
  private _adminRepository?: AdminRepository;

  // Use Cases
  private _loginUseCase?: LoginUseCase;
  private _registerUseCase?: RegisterUseCase;
  private _startGameUseCase?: StartGameUseCase;
  // ... 12 more use cases

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  // Lazy initialization with getters
  get storageService(): StorageService {
    if (!this._storageService) {
      this._storageService = new StorageService();
    }
    return this._storageService;
  }

  get apiClient(): ApiClient {
    if (!this._apiClient) {
      this._apiClient = new ApiClient(this.storageService);
    }
    return this._apiClient;
  }

  get authRepository(): AuthRepository {
    if (!this._authRepository) {
      this._authRepository = new AuthRepositoryImpl(
        this.apiClient,
        this.storageService
      );
    }
    return this._authRepository;
  }

  get loginUseCase(): LoginUseCase {
    if (!this._loginUseCase) {
      this._loginUseCase = new LoginUseCase(this.authRepository);
    }
    return this._loginUseCase;
  }

  // ... remaining getters
}

export const container = DIContainer.getInstance();
```

### Usage in Components

```typescript
// In any screen/component
import { container } from '@/src/core/di/container';

export default function SomeScreen() {
  const handleAction = async () => {
    // Access use case via container
    const result = await container.loginUseCase.execute({
      email: 'user@example.com',
      password: 'password123',
    });
  };
}
```

---

## Navigation Structure

### Expo Router File-Based Routing

```
app/
├── index.tsx                      # Entry point → Redirect to /auth/login
├── _layout.tsx                    # Root stack navigator
│
├── auth/                          # Authentication flow
│   ├── _layout.tsx                # Auth stack
│   ├── login.tsx                  # Login screen
│   └── register.tsx               # Registration screen
│
├── (tabs)/                        # Main app (bottom tabs)
│   ├── _layout.tsx                # Tab navigator (role-based tabs)
│   ├── index.tsx                  # Games list (active games)
│   ├── new-game.tsx               # Create game
│   ├── history.tsx                # Game history
│   ├── profile.tsx                # User profile
│   └── admin.tsx                  # Admin panel (ADMIN only, 5th tab)
│
└── (admin)/                       # Admin management
    ├── _layout.tsx                # Admin stack
    ├── dashboard.tsx              # Admin dashboard
    ├── kite-setup.tsx             # Kite OAuth setup
    ├── users.tsx                  # User list
    └── users/[id].tsx             # User detail (dynamic route)
```

### Role-Based Tab Visibility

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  const { user, isAdmin } = useAuth();

  return (
    <Tabs>
      {/* All users see these 4 tabs */}
      <Tabs.Screen name="index" options={{ title: 'Games', tabBarIcon: ... }} />
      <Tabs.Screen name="new-game" options={{ title: 'New Game', tabBarIcon: ... }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ... }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ... }} />

      {/* ADMIN users see 5th tab */}
      {isAdmin && (
        <Tabs.Screen name="admin" options={{ title: 'Admin', tabBarIcon: ... }} />
      )}
    </Tabs>
  );
}
```

### Navigation Guards

#### AuthGuard (Require Authentication)
```typescript
// src/presentation/components/AuthGuard.tsx
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, isLoading]);

  if (isLoading) return <ActivityIndicator />;
  if (!user) return null;

  return <>{children}</>;
}
```

#### AdminGuard (Require ADMIN Role)
```typescript
// src/presentation/components/AdminGuard.tsx
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!user || user.role !== UserRole.ADMIN) {
        router.replace('/auth/login');
        return;
      }

      // Re-verify role with backend
      const roleValidator = new RoleValidator(container.getCurrentUserUseCase);
      const result = await roleValidator.verifyAdminRole();

      if (!result.isAdmin) {
        Alert.alert('Access Denied', 'You do not have admin privileges');
        router.replace('/(tabs)');
      }

      setIsVerifying(false);
    };

    if (!isLoading) {
      verifyAccess();
    }
  }, [user, isLoading]);

  if (isLoading || isVerifying) return <ActivityIndicator />;

  return <>{children}</>;
}
```

---

## Code Guidelines

### TypeScript Conventions

```typescript
// ✅ GOOD: Explicit types
interface User {
  readonly id: string;
  readonly email: string;
}

// ✅ GOOD: Type-safe functions
function getUser(id: string): Promise<User> { }

// ❌ BAD: Any types
function getUser(id: any): any { }
```

### Immutability

```typescript
// ✅ GOOD: Readonly properties
interface User {
  readonly id: string;
  readonly email: string;
}

// ✅ GOOD: Return new objects
function updateUser(user: User, name: string): User {
  return { ...user, name };
}

// ❌ BAD: Mutating objects
function updateUser(user: User, name: string): void {
  user.name = name; // Error: cannot assign to readonly property
}
```

### Error Handling

```typescript
// ✅ GOOD: Specific error messages
try {
  const result = await apiClient.post('/endpoint', data);
} catch (error) {
  if (error.response?.status === 401) {
    throw new Error('Authentication failed. Please login again.');
  } else if (error.response?.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  } else {
    throw new Error(`Request failed: ${error.message}`);
  }
}

// ❌ BAD: Generic error handling
try {
  const result = await apiClient.post('/endpoint', data);
} catch (error) {
  console.log(error); // Not helpful
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
class LoginUseCase { }
class UserMapper { }

// Interfaces: PascalCase
interface AuthRepository { }
interface User { }

// Functions/Methods: camelCase
function validateEmail(email: string): boolean { }
async execute(request: LoginRequest): Promise<LoginResponse> { }

// Constants: UPPER_SNAKE_CASE
const MAX_ATTEMPTS = 5;
const API_BASE_URL = 'http://localhost:8080';

// Files: Match class name
// LoginUseCase.ts (for LoginUseCase class)
// AuthRepository.ts (for AuthRepository interface)
```

### Component Structure

```typescript
// ✅ GOOD: Props interface, clear structure
interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ onPress, children, loading = false, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.button, styles[variant]]}
    >
      {loading ? <ActivityIndicator /> : <Text>{children}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: 16, borderRadius: 8 },
  primary: { backgroundColor: '#007bff' },
  secondary: { backgroundColor: '#6c757d' },
});
```

### Async/Await Best Practices

```typescript
// ✅ GOOD: Always use try/catch with async
async function login(email: string, password: string): Promise<User> {
  try {
    const response = await apiClient.post('/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

// ✅ GOOD: Parallel operations with Promise.all
async function loadData(): Promise<void> {
  const [users, games, stats] = await Promise.all([
    container.getAllUsersUseCase.execute(),
    container.getActiveGamesUseCase.execute(),
    fetchSystemStats(),
  ]);
}

// ❌ BAD: Sequential when parallel is possible
async function loadData(): Promise<void> {
  const users = await container.getAllUsersUseCase.execute();
  const games = await container.getActiveGamesUseCase.execute();
  const stats = await fetchSystemStats();
}
```

### Testing Patterns

```typescript
// Unit test: Use case with mock repository
describe('LoginUseCase', () => {
  it('should validate email format', async () => {
    const mockRepo = {} as AuthRepository;
    const useCase = new LoginUseCase(mockRepo);

    await expect(
      useCase.execute({ email: 'invalid', password: 'password123' })
    ).rejects.toThrow('Invalid email address');
  });

  it('should call repository with correct params', async () => {
    const mockRepo = {
      login: jest.fn().mockResolvedValue({ user: mockUser, token: 'token' }),
    } as unknown as AuthRepository;

    const useCase = new LoginUseCase(mockRepo);
    await useCase.execute({ email: 'test@example.com', password: 'password123' });

    expect(mockRepo.login).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

---

## Backend Alignment

This mobile architecture mirrors the Bull-11 Spring Boot backend:

| Backend (Java Spring) | Mobile (TypeScript) |
|-----------------------|---------------------|
| `@RestController` | Screen Component |
| `@Service` | UseCase |
| `Repository` (interface) | Repository (interface) |
| `@Repository` (JPA impl) | RepositoryImpl (API impl) |
| `@Entity` | Domain Entity |
| DTO (Request/Response) | DTO (API types) |
| `@Configuration` | DIContainer |
| `@Autowired` | `container.useCase` |
| `@PreAuthorize("ROLE_ADMIN")` | AdminGuard component |
| `application.properties` | `.env` file |

**Example Comparison:**

**Backend (Spring Boot):**
```java
@Service
public class AuthService {
    @Autowired
    private UserRepository userRepository;

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail());
        // ... validation logic
        return new AuthResponse(user, generateToken(user));
    }
}
```

**Mobile (TypeScript):**
```typescript
export class LoginUseCase {
    constructor(private readonly authRepository: AuthRepository) {}

    async execute(request: LoginRequest): Promise<LoginResponse> {
        const response = await this.authRepository.login(
            request.email,
            request.password
        );
        return response;
    }
}
```

---

## Summary

This architecture provides:

✅ **Clean Separation**: Domain, Data, Presentation, Core layers
✅ **SOLID Principles**: Applied throughout the codebase
✅ **Testability**: Each component can be tested in isolation
✅ **Maintainability**: Clear structure, easy to locate code
✅ **Scalability**: Add features without modifying existing code
✅ **Security**: Enterprise-grade authentication and authorization
✅ **Backend Alignment**: Mirrors Spring Boot architecture patterns

For user-facing documentation, see [README.md](./README.md)

---

**Last Updated**: March 2026
**Architecture Version**: 1.0.0
**Framework**: Clean Architecture (Robert C. Martin)
