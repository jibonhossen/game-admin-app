import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.backgroundLight,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
                    paddingTop: 10,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 11,
                    marginBottom: 0,
                },
                headerStyle: {
                    backgroundColor: COLORS.backgroundLight,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                },
                headerTitleStyle: {
                    fontFamily: 'Poppins_700Bold',
                    fontSize: 18,
                    color: COLORS.text,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarLabel: 'Stats',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="stats-chart" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="matches"
                options={{
                    title: 'Match Management',
                    tabBarLabel: 'Matches',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="game-controller" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Direct Alert',
                    tabBarLabel: 'Alerts',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    tabBarLabel: 'Users',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Configuration',
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
