import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { userApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

interface User {
    id: string;
    uid: string;
    username: string;
    number: string;
    email: string | null;
    free_fire_name: string;
    balance: number;
    status: 'active' | 'blocked';
    created_at: string;
}

export default function UsersScreen() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await userApi.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleToggleStatus = async (user: User) => {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        const action = newStatus === 'blocked' ? 'Block' : 'Unblock';

        Alert.alert(
            `${action} User`,
            `Are you sure you want to ${action.toLowerCase()} ${user.username}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action,
                    style: newStatus === 'blocked' ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await userApi.updateUserStatus(user.id, newStatus);
                            await fetchUsers(true);
                        } catch (error) {
                            Alert.alert('Error', `Failed to ${action.toLowerCase()} user`);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderUser = ({ item }: { item: User }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                    <Text style={styles.userName}>{item.username}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? COLORS.success + '15' : COLORS.error + '15' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'active' ? COLORS.success : COLORS.error }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.userDetailRow}>
                    <Ionicons name="finger-print-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.userDetailText}>UID: {item.uid}</Text>
                </View>

                <View style={styles.userDetailRow}>
                    <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.userDetailText}>{item.number}</Text>
                </View>

                {item.free_fire_name ? (
                    <View style={styles.userDetailRow}>
                        <Ionicons name="game-controller-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.userDetailText}>FF: {item.free_fire_name}</Text>
                    </View>
                ) : null}

                <View style={styles.balanceContainer}>
                    <Text style={styles.balanceLabel}>Balance:</Text>
                    <Text style={styles.balanceValue}>৳{item.balance}</Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={() => handleToggleStatus(item)}
                style={[styles.actionButton, { backgroundColor: item.status === 'active' ? COLORS.error + '10' : COLORS.success + '10' }]}
            >
                <Ionicons
                    name={item.status === 'active' ? "ban-outline" : "checkmark-circle-outline"}
                    size={24}
                    color={item.status === 'active' ? COLORS.error : COLORS.success}
                />
                <Text style={[styles.actionButtonText, { color: item.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {item.status === 'active' ? 'Block' : 'Unblock'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>User Management</Text>
                <Text style={styles.headerSubtitle}>{users.length} Total Users</Text>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(true); }} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color={COLORS.border} />
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    list: {
        padding: 16,
        paddingBottom: 100,
    },
    userCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    userInfo: {
        flex: 1,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    userName: {
        fontSize: 17,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
    },
    userDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    userDetailText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    balanceLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.textSecondary,
    },
    balanceValue: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
    },
    actionButton: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    actionButtonText: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
});
