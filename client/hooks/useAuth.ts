'use client';

import { useState, useEffect, createContext, useContext, ReactNode, createElement } from 'react';
import { AuthService } from '@/lib/auth';
import { User, LoginCredentials, RegisterCredentials } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for existing user and refresh token if needed
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let storedUser = AuthService.getUser();
        
        if (!storedUser && AuthService.isAuthenticated()) {
          // Try to refresh token if access token exists but no user in storage
          const newToken = await AuthService.refreshToken();
          if (newToken) {
            storedUser = AuthService.getUser();
          }
        }
        
        if (storedUser) {
          setUser(storedUser);
        } else if (AuthService.isAuthenticated()) {
          // Try to fetch user from API if token exists but no user in storage
          const fetchedUser = await AuthService.getCurrentUser();
          setUser(fetchedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const authData = await AuthService.login(credentials);
      setUser(authData.user);
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setLoading(true);
    try {
      const authData = await AuthService.register(credentials);
      setUser(authData.user);
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const fetchedUser = await AuthService.getCurrentUser();
      setUser(fetchedUser);
    } catch (error) {
      console.error('Refresh user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser
  };

  return createElement(AuthContext.Provider, { value: contextValue }, children);
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};