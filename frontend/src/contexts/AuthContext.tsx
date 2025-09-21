import React, { createContext, useContext, useEffect, useState } from 'react';
import { graphqlQuery, GRAPHQL_QUERIES } from '../api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('fv_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching user with token:', token.substring(0, 20) + '...');
      const data = await graphqlQuery(GRAPHQL_QUERIES.ME);
      console.log('GraphQL ME response:', data);
      
      if (data.me) {
        setUser(data.me);
        console.log('User set:', data.me);
      } else {
        console.log('No user data returned, removing token');
        localStorage.removeItem('fv_token');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('fv_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    localStorage.setItem('fv_token', token);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('fv_token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};