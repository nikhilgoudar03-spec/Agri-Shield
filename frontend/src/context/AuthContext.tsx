import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, setAuthToken, clearAuthToken, apiRequest } from '../config/api';

export interface UserSession {
  id: number;
  full_name: string;
  email: string;
  role: 'FARMER' | 'ADMIN';
  village?: string;
  district?: string;
  phone_number?: string;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  login: (data: {
    access_token: string;
    role: string;
    user_id: number;
    full_name: string;
    email: string;
    village?: string;
    district?: string;
    phone_number?: string;
  }) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isFarmer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('agrishield_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await apiRequest('/auth/me');
        const session: UserSession = {
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          village: userData.village,
          district: userData.district,
          phone_number: userData.phone_number || userData.emergency_contact_mobile,
        };
        setUser(session);
        localStorage.setItem('agrishield_user', JSON.stringify(session));
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        clearAuthToken();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = (data: {
    access_token: string;
    role: string;
    user_id: number;
    full_name: string;
    email: string;
    village?: string;
    district?: string;
    phone_number?: string;
  }) => {
    setAuthToken(data.access_token);
    setToken(data.access_token);
    const session: UserSession = {
      id: data.user_id,
      full_name: data.full_name,
      email: data.email,
      role: data.role as 'FARMER' | 'ADMIN',
      village: data.village,
      district: data.district,
      phone_number: data.phone_number,
    };
    setUser(session);
    localStorage.setItem('agrishield_user', JSON.stringify(session));
  };

  const logout = () => {
    // Optionally notify backend session invalidation
    apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        isFarmer: user?.role === 'FARMER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
