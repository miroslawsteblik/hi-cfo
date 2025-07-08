'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string;
  email: string;
  first_name: string;  // Changed back to first_name to match Go backend
  last_name: string;   // Changed back to last_name to match Go backend
  role: string;
}

interface AuthContextType {
  user: any | null;
  login: (email: string, password: string) => Promise<any>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api/v1';


// Debug function to verify the API URL
export const debugApiConfig = () => {
  console.log('=== API Configuration Debug ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API URL:', apiUrl);
  console.log('Full register URL:', `${apiUrl}/auth/register`);
  console.log('Browser location:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  console.log('================================');
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check for stored token on app load
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      fetch(`${apiUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Invalid token');
          }
          return response.json();
        })
        .then(userData => {
          setUser(userData);
        })
        .catch(() => {
          console.log('Token validation failed');
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [mounted]);

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    setIsLoading(true);

    try {
      const requestUrl = `${apiUrl}/auth/register`;
      console.log('Making request to:', requestUrl);
      
      const requestData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password
      };
      
      console.log('Request body:', requestData);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        if (response.status === 400) {
          throw new Error(errorData.error || errorData.message || 'Validation failed. Please check your input.');
        } else if (response.status === 409) {
          throw new Error('User already exists with this email');
        } else {
          throw new Error(errorData.error || errorData.message || `Registration failed: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('Registration successful:', data);
      return data;
      
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = `Login failed with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse login error response:', parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Store token and update user state
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      if (data.user) {
        setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    // Check if token is expired
    if (token && isTokenExpired(token)) {
      // Try to refresh the token
      const refreshed = await refreshToken();
      if (!refreshed) {
        // If refresh failed, log out
        logout();
        throw new Error('Session expired');
      }
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };
    
    return fetch(url, {
      ...options,
      headers
    });
  };

  const isTokenExpired = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  };

  const refreshToken = async () => {
    const token = localStorage.getItem('refreshToken');
    if (!token) return false;
    
    try {
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: token }),
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refresh_token);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}