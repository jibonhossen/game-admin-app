import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi, notificationApi, historyApi } from '../../src/services/api';
import { calculateWinnings } from '../../src/utils/prizeCalculator';
import { PrizeRule, MatchResultInput } from '../../src/types/prize';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../../src/contexts/AlertContext';

const { width } = Dimensions.get('window');

export default function DistributePrizes() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const [match, setMatch] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [amounts, setAmounts] = useState<{ [key: string]: string }>({});
    const [stats, setStats] = useState<{ [key: string]: { rank: string, kills: string } }>({}); // For calculation
    const [distributing, setDistributing] = useState(false);
    const [rule, setRule] = useState<PrizeRule | null>(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [partsData, matchData] = await Promise.all([
                matchApi.getParticipants(id as string),
                matchApi.getAllMatches().then(matches => matches.find((m: any) => m.id === id))
            ]);

            setParticipants(partsData);
            setMatch(matchData);

            // Try to parse rule
            if (matchData?.prizeDetails) {
                try {
                    const parsed = JSON.parse(matchData.prizeDetails);
                    if (parsed.type && parsed.config) {
                        setRule(parsed);
                    }
                } catch (e) {
                    // Not a JSON rule, likely legacy text
                    console.log('Legacy prize details detected');
                }
            }
        } catch (error) {
            showAlert({ title: 'Error', message: 'Failed to fetch data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Auto-calculate when stats change
    useEffect(() => {
        if (rule && participants.length > 0) {
            calculatePrizes();
        }
    }, [stats, rule, participants]);

    const calculatePrizes = () => {
        if (!rule) return;

        // Prepare input for calculator
        const inputs: MatchResultInput[] = participants.map(p => {
            const stat = stats[p.uid] || { rank: '0', kills: '0' };
            const rank = parseInt(stat.rank) || 0;
            const kills = parseInt(stat.kills) || 0;

            return {
                uid: p.uid,
                username: p.username,
                kills,
                rank,
            };
        });

        // Filter inputs for meaningful data
        const activeInputs = inputs.filter(i => {
            if (rule.type === 'equal_share') return i.rank === 1; // HACK: Use Rank 1 to mark winners
            return i.rank > 0 || i.kills > 0;
        });

        const calculated = calculateWinnings(rule, activeInputs);

        const newAmounts: { [key: string]: string } = {};
        calculated.forEach(w => {
            newAmounts[w.uid] = w.amount.toString();
        });

        setAmounts(newAmounts);
    };

    const handleAmountChange = (uid: string, value: string) => {
        setAmounts(prev => ({ ...prev, [uid]: value }));
    };

    const handleStatsChange = (uid: string, field: 'rank' | 'kills', value: string) => {
        setStats(prev => ({
            ...prev,
            [uid]: { ...prev[uid], [field]: value }
        }));
    };

    // Removed handleCalculate as it is now automatic

    const getWinners = () => {
        return Object.entries(amounts)
            .filter(([_, amount]) => amount && !isNaN(Number(amount)) && Number(amount) > 0)
            .map(([uid, amount]) => ({ uid, amount: Number(amount) }));
    };

    const totalPrize = Object.values(amounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

    const sendPrizeNotifications = async (winners: { uid: string; amount: number }[]) => {
        try {
            // Send individual notifications to each winner
            for (const winner of winners) {
                const winnerData = participants.find(p => p.uid === winner.uid);
                const winnerName = winnerData?.username || 'Player';

                await notificationApi.sendNotification({
                    title: '🎉 Congratulations! You Won!',
                    body: `Hey ${winnerName}! You've won ৳${winner.amount} as prize money! 🏆 The amount has been added to your wallet.`,
                    data: { screen: 'wallet', amount: winner.amount },
                    targetType: 'specific',
                    userIds: [winner.uid],
                    skipSave: true,
                });
            }
        } catch (error) {
            console.error('Failed to send prize notifications:', error);
            // Don't fail the whole operation if notifications fail
        }
    };

    const handleDistribute = async () => {
        const winners = getWinners();

        if (winners.length === 0) {
            showAlert({ title: 'Required', message: 'Please enter prize amounts for at least one winner.', type: 'warning' });
            return;
        }

        showAlert({
            title: 'Confirm Payout',
            message: `You are about to distribute ৳${totalPrize} to ${winners.length} winners. This action cannot be reversed.`,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    setDistributing(true);

                    // 1. Distribute via Worker (Payout)
                    await matchApi.distributePrizes({ matchId: id as string, winners });

                    // 2. Log History to Supabase (EC2)
                    if (rule && rule.id) { // Only log if using valid rule, or log anyway?
                        // Construct stats for history
                        // We need calculated winners with breakdown.
                        // Ideally we have the breakdown. But 'amounts' only has number.
                        // We can re-calculate or just log the amounts.
                        // Let's re-run calculation to get breakdown if possible, or just log amounts.
                        // Actually, 'winners' is just uid/amount.
                        // Let's log simplistic breakdown "Manual" or re-calc.

                        // Better: If we calculated, we disregarded breakdown.
                        // We'll log simplified history.
                        const historyLog = {
                            match_id: id,
                            rule_id: rule.id,
                            title: match?.title || 'Unknown Match',
                            completed_at: new Date().toISOString(),
                            winners: winners.map(w => ({
                                uid: w.uid,
                                amount: w.amount,
                                breakdown: 'Distributed via Admin', // TODO: Enhance
                                username: participants.find(p => p.uid === w.uid)?.username || 'Unknown'
                            }))
                        };
                        try {
                            await historyApi.logMatch(historyLog);
                        } catch (e) {
                            console.error('Failed to log history', e);
                        }
                    }

                    // 3. Notify Winners
                    await sendPrizeNotifications(winners);

                    showAlert({
                        title: 'Success',
                        message: 'Prizes distributed successfully! Winners have been notified.',
                        type: 'success',
                        onConfirm: () => router.back()
                    });
                } catch (error) {
                    console.error('Distribute error', error);
                    showAlert({ title: 'Error', message: 'Failed to distribute prizes', type: 'error' });
                } finally {
                    setDistributing(false);
                }
            }
        });
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

            {/* Stats Inputs (Only if Rule Active) */}
            {rule && (
                <View style={{ flexDirection: 'row', gap: 6, marginRight: 6 }}>
                    {rule.type === 'rank_kill' && (
                        <>
                            <View style={styles.statInputWrap}>
                                <Text style={styles.statLabel}>R</Text>
                                <TextInput
                                    style={styles.statInput}
                                    placeholder="-"
                                    keyboardType="numeric"
                                    value={stats[item.uid]?.rank || ''}
                                    onChangeText={(t) => handleStatsChange(item.uid, 'rank', t)}
                                />
                            </View>
                            <View style={styles.statInputWrap}>
                                <Text style={styles.statLabel}>K</Text>
                                <TextInput
                                    style={styles.statInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={stats[item.uid]?.kills || ''}
                                    onChangeText={(t) => handleStatsChange(item.uid, 'kills', t)}
                                />
                            </View>
                        </>
                    )}
                    {rule.type === 'equal_share' && (
                        <View style={styles.statInputWrap}>
                            <Text style={styles.statLabel}>Select</Text>
                            <TouchableOpacity
                                style={[styles.checkCircle, stats[item.uid]?.rank === '1' && styles.checkCircleActive]}
                                onPress={() => handleStatsChange(item.uid, 'rank', stats[item.uid]?.rank === '1' ? '0' : '1')}
                            >
                                {stats[item.uid]?.rank === '1' && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

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

                <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>PARTICIPANTS LIST</Text>
                            {rule && <Text style={{ fontSize: 10, color: COLORS.primary }}>Using Rule: {rule.name}</Text>}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{participants.length} TOTAL</Text>
                            </View>
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
        width: 120, // Increased width
        height: 50, // Slightly taller
    },
    currency: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.success,
        marginRight: 4,
    },
    input: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        paddingVertical: 0,
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
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    payoutValue: {
        fontSize: 18,
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.bold,
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
    // Calculator Styles
    calcBtn: {
        backgroundColor: COLORS.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    calcBtnText: {
        color: COLORS.white,
        fontSize: 10,
        fontFamily: FONTS.bold,
    },
    statInputWrap: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
    },
    statInput: {
        width: 44, // Larger touch target
        height: 44,
        backgroundColor: COLORS.background,
        borderRadius: 10,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 14,
        fontFamily: FONTS.bold, // Use consistent font
        color: COLORS.text,
    },
    checkCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    checkCircleActive: {
        backgroundColor: COLORS.secondary,
        borderColor: COLORS.secondary,
    }
});
