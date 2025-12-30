
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { authApi, setAuthToken } from '../services/api';

interface AuthContextType {
    user: any | null;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('@admin_token');
            const storedUser = await AsyncStorage.getItem('@admin_user');

            if (token && storedUser) {
                setAuthToken(token);
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);

                // Verify token validity in background
                try {
                    const userData = await authApi.getMe();
                    setUser(userData);
                    await AsyncStorage.setItem('@admin_user', JSON.stringify(userData));
                } catch (error) {
                    // Token invalid
                    logout();
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: any) => {
        setIsLoading(true);
        try {
            const data = await authApi.login(credentials);
            const { token, admin } = data;

            await AsyncStorage.setItem('@admin_token', token);
            await AsyncStorage.setItem('@admin_user', JSON.stringify(admin));

            setAuthToken(token);
            setUser(admin);
            setIsAuthenticated(true);
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('@admin_token');
        await AsyncStorage.removeItem('@admin_user');
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
