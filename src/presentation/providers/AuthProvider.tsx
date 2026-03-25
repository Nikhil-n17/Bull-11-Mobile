/**
 * Auth Provider - Global Auth State via React Context
 * All components that call useAuth() share the same auth state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { container } from '@/src/core/di/container';
import { User, UserRole } from '@/src/domain/entities/User';
import { LoginRequest } from '@/src/domain/usecases/auth/LoginUseCase';
import { RegisterRequest } from '@/src/domain/usecases/auth/RegisterUseCase';
import {
  TokenService,
  RateLimiter,
  SessionManager,
  RoleValidator,
  AuditLogger,
  AuditAction,
} from '@/src/core/security';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  sessionTimeRemaining: number;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (credentials: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  updateActivity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    sessionTimeRemaining: 0,
  });

  const roleValidator = useRef(new RoleValidator(container.getCurrentUserUseCase));
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    checkCurrentUser();
    initializeSession();

    return () => {
      SessionManager.cleanup();
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && stateRef.current.user) {
        await SessionManager.updateActivity();
        await verifyAdminRoleOnResume();
      }
    });

    return () => subscription.remove();
  }, []);

  const initializeSession = () => {
    SessionManager.initialize(async () => {
      await handleSessionExpiry();
    });

    sessionTimerRef.current = setInterval(async () => {
      const remaining = await SessionManager.getTimeUntilExpiry();
      setState((prev) => ({ ...prev, sessionTimeRemaining: remaining }));
    }, 60000) as any;
  };

  const handleSessionExpiry = async () => {
    await AuditLogger.log(
      AuditAction.LOGOUT,
      stateRef.current.user?.id,
      stateRef.current.user?.email,
      { reason: 'session_timeout' }
    );

    await logoutInternal();
    setState((prev) => ({
      ...prev,
      error: 'Session expired due to inactivity. Please login again.',
    }));
  };

  const checkCurrentUser = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const isTokenValid = await TokenService.isTokenValid();

      if (!isTokenValid) {
        setState({ user: null, loading: false, error: null, sessionTimeRemaining: 0 });
        return;
      }

      const user = await container.getCurrentUserUseCase.execute();
      setState({ user, loading: false, error: null, sessionTimeRemaining: 0 });
      await SessionManager.startSession();
    } catch (error) {
      setState({ user: null, loading: false, error: null, sessionTimeRemaining: 0 });
    }
  };

  const login = useCallback(async (credentials: LoginRequest): Promise<User> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const rateLimitCheck = await RateLimiter.isAllowed(credentials.email);
      if (!rateLimitCheck.allowed) {
        const lockoutTime = await RateLimiter.getLockoutTime(credentials.email);
        const minutes = Math.ceil(lockoutTime / 60);
        throw new Error(
          `Too many failed login attempts. Please try again in ${minutes} minutes.`
        );
      }

      try {
        const response = await container.loginUseCase.execute(credentials);

        await RateLimiter.reset(credentials.email);

        await AuditLogger.log(
          AuditAction.LOGIN,
          response.user.id,
          response.user.email,
          { timestamp: Date.now(), role: response.user.role },
          true
        );

        setState({ user: response.user, loading: false, error: null, sessionTimeRemaining: 0 });

        await SessionManager.startSession();

        return response.user;
      } catch (error) {
        await RateLimiter.recordAttempt(credentials.email);
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState({ user: null, loading: false, error: errorMessage, sessionTimeRemaining: 0 });
      throw error;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterRequest): Promise<User> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await container.registerUseCase.execute(credentials);

      await AuditLogger.log(
        AuditAction.LOGIN,
        response.user.id,
        response.user.email,
        { timestamp: Date.now(), isNewUser: true },
        true
      );

      setState((prev) => ({ ...prev, loading: false, error: null }));

      return response.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState({ user: null, loading: false, error: errorMessage, sessionTimeRemaining: 0 });
      throw error;
    }
  }, []);

  const logoutInternal = async () => {
    await container.logoutUseCase.execute();
    await SessionManager.endSession();
    setState({ user: null, loading: false, error: null, sessionTimeRemaining: 0 });
  };

  const logout = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      if (stateRef.current.user) {
        await AuditLogger.log(
          AuditAction.LOGOUT,
          stateRef.current.user.id,
          stateRef.current.user.email,
          { timestamp: Date.now() }
        );
      }

      await logoutInternal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const user = await container.getCurrentUserUseCase.execute();
      setState((prev) => ({ ...prev, user }));
      await SessionManager.updateActivity();
      return user;
    } catch (error) {
      setState((prev) => ({ ...prev, user: null }));
      return null;
    }
  }, []);

  const verifyAdminRoleOnResume = async () => {
    if (!stateRef.current.user) return;

    const result = await roleValidator.current.verifyWithEscalationCheck();

    if (!result.isValid && result.shouldLogout) {
      await AuditLogger.log(
        AuditAction.PRIVILEGE_ESCALATION_DETECTED,
        stateRef.current.user.id,
        stateRef.current.user.email,
        { reason: result.reason },
        false
      );

      await logoutInternal();
      setState((prev) => ({
        ...prev,
        error: result.reason || 'Access denied. Please login again.',
      }));
    }
  };

  const updateActivity = useCallback(async () => {
    await SessionManager.updateActivity();
  }, []);

  const isAuthenticated = !!state.user;
  const isAdmin = state.user?.role === UserRole.ADMIN;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        getCurrentUser,
        updateActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
