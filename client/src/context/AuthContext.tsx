import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, businessName?: string) => Promise<void>;
  logout: () => void;
  currency: string;
  setCurrency: (c: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fundflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fundflow_token'));
  const [currency, setCurrency] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('fundflow_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
          setCurrency(res.user.currency || 'INR');
          localStorage.setItem('fundflow_user', JSON.stringify(res.user));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    const handleExpired = () => logout();
    window.addEventListener('auth-expired', handleExpired);

    checkAuth();
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('fundflow_token', res.token);
    localStorage.setItem('fundflow_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setCurrency(res.user.currency || 'INR');
  };

  const register = async (name: string, email: string, password: string, businessName?: string) => {
    const res = await authApi.register({ name, email, password, businessName });
    localStorage.setItem('fundflow_token', res.token);
    localStorage.setItem('fundflow_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setCurrency(res.user.currency || 'INR');
  };

  const logout = () => {
    localStorage.removeItem('fundflow_token');
    localStorage.removeItem('fundflow_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        logout,
        currency,
        setCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
