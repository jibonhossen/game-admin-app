
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Image } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { COLORS, FONTS, SPACING } from '../src/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Required', 'Please enter both username and password.');
            return;
        }

        setLoading(true);
        try {
            await login({ username, password });
        } catch (error: any) {
            console.error('Login Error Details:', error);

            let message = 'Something went wrong. Please try again.';

            if (error.response) {
                // Server responded with non-2xx code
                const status = error.response.status;
                const data = error.response.data;

                if (status === 401) {
                    message = 'Invalid username or password.';
                } else if (status === 403) {
                    message = 'Access denied. You do not have admin privileges.';
                } else if (status === 404) {
                    message = 'Service not found. Please contact support.';
                } else if (status >= 500) {
                    message = 'Server error. Please try again later.';
                } else if (data && data.error) {
                    message = data.error;
                }
            } else if (error.request) {
                // Request made but no response received (Network Error)
                message = 'Network error. Please check your internet connection.';
            }

            Alert.alert('Login Failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to manage GameZone</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor={COLORS.textSecondary}
                                autoCapitalize="none"
                                value={username}
                                onChangeText={setUsername}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={COLORS.textSecondary}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
    },
    content: {
        padding: SPACING.l,
    },
    header: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        fontFamily: FONTS.bold,
        fontSize: 28,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontFamily: FONTS.regular,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    form: {
        gap: SPACING.l,
    },
    inputGroup: {
        gap: SPACING.s,
    },
    label: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        color: COLORS.text,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.m,
        height: 50,
    },
    inputIcon: {
        marginRight: SPACING.s,
    },
    input: {
        flex: 1,
        fontFamily: FONTS.regular,
        fontSize: 16,
        color: COLORS.text,
    },
    eyeIcon: {
        padding: SPACING.s,
    },
    button: {
        backgroundColor: COLORS.primary,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.m,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: COLORS.white,
    },
});
