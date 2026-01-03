import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { historyApi } from '../../src/services/api';
import { PrizeRule } from '../../src/types/prize';
import { LinearGradient } from 'expo-linear-gradient';

export default function RuleList() {
    const router = useRouter();
    const [rules, setRules] = useState<PrizeRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRules = async () => {
        try {
            const data = await historyApi.getRules();
            setRules(data || []);
        } catch (error) {
            console.error('Failed to fetch rules', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchRules();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRules();
    };

    const renderItem = ({ item }: { item: PrizeRule }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/rules/${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.ruleName}>{item.name}</Text>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                            {item.type === 'rank_kill' ? 'Rank + Kill' :
                                item.type === 'equal_share' ? 'Equal Share' : 'Fixed List'}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
            <View style={styles.cardContent}>
                {item.type === 'rank_kill' && (
                    <Text style={styles.detailText}>
                        Per Kill: ৳{item.config.per_kill} | Ranks: {Object.keys(item.config.rank_rewards).length} configured
                    </Text>
                )}
                {item.type === 'equal_share' && (
                    <Text style={styles.detailText}>
                        Total Pool: ৳{item.config.total_prize}
                    </Text>
                )}
                {item.type === 'fixed_list' && (
                    <Text style={styles.detailText}>
                        Positions Paid: {item.config.prizes.length}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Manage Rules</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={rules}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="reader-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No rules found. Create one to get started.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/rules/create')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={24} color={COLORS.white} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    list: {
        padding: 20,
        gap: 12,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    ruleName: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 4,
    },
    typeBadge: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    typeText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        borderRadius: 28,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
});
