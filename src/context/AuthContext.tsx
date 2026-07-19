import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/client';
import { storageService } from '../services/storage';

interface AuthContextData {
  user: any | null;
  loading: boolean;
  error: string | null;
  login: (emailInput: string, passwordInput: string) => Promise<any>;
  register: (name: string, email: string, password: string, avatar?: string, status?: string) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  setError: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await storageService.getUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (emailInput: string, passwordInput: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/auth/login', {
        email: emailInput,
        password: passwordInput,
      });
      setUser(data);
      await storageService.setUser(data);
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, avatar?: string, status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/auth/register', {
        name,
        email,
        password,
        avatar,
        status,
      });
      setUser(data);
      await storageService.setUser(data);
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await storageService.removeUser();
  };

  const updateProfile = async (profileData: any) => {
    try {
      const { data } = await API.put('/auth/profile', profileData);
      const updated = { ...user, ...data };
      setUser(updated);
      await storageService.setUser(updated);
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
