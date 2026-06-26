import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { client } from '@/lib/api';
import type { AuthUser } from '@/lib/rbac';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.auth.me();
      setUser(response?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      setError(null);
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      window.localStorage.removeItem('token');
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refetch: checkAuthStatus,
    isAdmin: user?.role === 'admin',
    hasPermission: (permission: string) => Boolean(user?.permissions?.includes(permission)),
    hasAnyPermission: (...permissions: string[]) =>
      permissions.some((permission) => Boolean(user?.permissions?.includes(permission))),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
