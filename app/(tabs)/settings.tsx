import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../src/contexts/AlertContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { showAlert } = useAlert();

    const handleLogout = () => {
        showAlert({
            title: 'Logout',
            message: 'Are you sure you want to sign out?',
            type: 'confirm',
            onConfirm: () => logout()
        });
    };

    const MenuItem = ({ title, subtitle, icon, color, onPress, isDestructive = false }: any) => (
        <TouchableOpacity
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: isDestructive ? COLORS.error + '15' : color + '15' }]}>
                <Ionicons name={icon} size={22} color={isDestructive ? COLORS.error : color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, isDestructive && { color: COLORS.error }]}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Account Card */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.accountCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.accountInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || 'A'}</Text>
                    </View>
                    <View>
                        <Text style={styles.username}>{user?.username || 'Admin'}</Text>
                        <Text style={styles.role}>{user?.role || 'Administrator'}</Text>
                    </View>
                </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Data Management</Text>
            <View style={styles.menuGroup}>
                <MenuItem
                    title="Manage Users"
                    subtitle="View and manage all registered users"
                    icon="people"
                    color="#8B5CF6"
                    onPress={() => router.push('/(tabs)/users')}
                />
                <MenuItem
                    title="Match Templates"
                    subtitle="Create and manage match templates"
                    icon="document-text"
                    color="#F59E0B"
                    onPress={() => router.push('/(tabs)/templates')}
                />
            </View>

            <Text style={styles.sectionTitle}>Prize Settings</Text>
            <View style={styles.menuGroup}>
                <MenuItem
                    title="Prize Rules"
                    subtitle="Manage prize distribution rules"
                    icon="ribbon"
                    color="#10B981"
                    onPress={() => router.push('/rules')}
                />
            </View>

            <Text style={styles.sectionTitle}>Match Controls</Text>
            <View style={styles.menuGroup}>
                <MenuItem
                    title="Match Configurations"
                    subtitle="Manage maps, categories, and types"
                    icon="options"
                    color={COLORS.primary}
                    onPress={() => router.push('/match-settings')}
                />
            </View>

            <Text style={styles.sectionTitle}>Team Management</Text>
            <View style={styles.menuGroup}>
                <MenuItem
                    title="Create Sub-Admin"
                    subtitle="Add new restricted admin account"
                    icon="person-add"
                    color={COLORS.secondary}
                    onPress={() => router.push('/create-subadmin')}
                />
            </View>

            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuGroup}>
                <MenuItem
                    title="Logout"
                    icon="log-out"
                    color={COLORS.error}
                    isDestructive
                    onPress={handleLogout}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.version}>App Version 1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    accountCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 24,
        color: COLORS.white,
    },
    username: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
        color: COLORS.white,
        marginBottom: 2,
    },
    role: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'capitalize',
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuGroup: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 6,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.text,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    version: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
        opacity: 0.5,
    },
});
