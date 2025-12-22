import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi } from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DistributePrizes() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [amounts, setAmounts] = useState<{ [key: string]: string }>({});
    const [distributing, setDistributing] = useState(false);

    useEffect(() => {
        fetchParticipants();
    }, [id]);

    const fetchParticipants = async () => {
        try {
            setLoading(true);
            const data = await matchApi.getParticipants(id as string);
            setParticipants(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch participants');
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (uid: string, value: string) => {
        setAmounts(prev => ({ ...prev, [uid]: value }));
    };

    const getWinners = () => {
        return Object.entries(amounts)
            .filter(([_, amount]) => amount && !isNaN(Number(amount)) && Number(amount) > 0)
            .map(([uid, amount]) => ({ uid, amount: Number(amount) }));
    };

    const totalPrize = Object.values(amounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

    const handleDistribute = async () => {
        const winners = getWinners();

        if (winners.length === 0) {
            Alert.alert('Required', 'Please enter prize amounts for at least one winner.');
            return;
        }

        Alert.alert(
            'Confirm Payout',
            `You are about to distribute ৳${totalPrize} to ${winners.length} winners. This action cannot be reversed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm & Send',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDistributing(true);
                            await matchApi.distributePrizes({ matchId: id as string, winners });
                            Alert.alert('Success', 'Prizes distributed successfully!', [
                                { text: 'Done', onPress: () => router.back() }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to distribute prizes');
                        } finally {
                            setDistributing(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <View style={styles.pCard}>
            <View style={styles.pRank}>
                <Text style={styles.pRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.pInfo}>
                <Text style={styles.pName} numberOfLines={1}>{item.username}</Text>
                <Text style={styles.pSub} numberOfLines={1}>FF: {item.freeFireName || 'N/A'}</Text>
            </View>
            <View style={styles.inputContainer}>
                <Text style={styles.currency}>৳</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={amounts[item.uid] || ''}
                    onChangeText={(text) => handleAmountChange(item.uid, text)}
                />
            </View>
        </View>
    );

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Distribute Prizes</Text>
                        <Text style={styles.headerSub}>Allocate funds to match winners</Text>
                    </View>
                </View>

                <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>PARTICIPANTS LIST</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{participants.length} TOTAL</Text>
                        </View>
                    </View>

                    <FlatList
                        data={participants}
                        keyExtractor={(item) => item.uid}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={48} color={COLORS.border} />
                                <Text style={styles.emptyText}>No participants found.</Text>
                            </View>
                        }
                    />
                </View>

                {/* Footer Summary */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                    <LinearGradient
                        colors={[COLORS.white, COLORS.background]}
                        style={styles.footerGradient}
                    >
                        <View style={styles.summaryInfo}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Winners</Text>
                                <Text style={styles.summaryValue}>{getWinners().length}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Payout</Text>
                                <Text style={styles.payoutValue}>৳{totalPrize}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.distributeBtn, distributing && { opacity: 0.7 }]}
                            onPress={handleDistribute}
                            disabled={distributing}
                        >
                            <LinearGradient
                                colors={[COLORS.secondary, '#db2777']}
                                style={styles.actionGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {distributing ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <>
                                        <Text style={styles.btnText}>Release Prizes</Text>
                                        <Ionicons name="gift" size={20} color={COLORS.white} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: COLORS.white,
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    headerSub: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        color: COLORS.textSecondary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    countBadge: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    countText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
    },
    list: {
        gap: 12,
        paddingBottom: 40,
    },
    pCard: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    pRank: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pRankText: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
    },
    pInfo: {
        flex: 1,
    },
    pName: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    pSub: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        width: 100,
        height: 48,
    },
    currency: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.success,
        marginRight: 4,
    },
    input: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderColor: COLORS.border,
        paddingTop: 10,
    },
    footerGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryInfo: {
        flex: 1,
        gap: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    payoutValue: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
    },
    distributeBtn: {
        flex: 1.5,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionGradient: {
        flexDirection: 'row',
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnText: {
        color: COLORS.white,
        fontSize: 15,
        fontFamily: 'Poppins_700Bold',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
});
