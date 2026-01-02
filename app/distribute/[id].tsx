import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ScrollView,
    Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi, notificationApi, historyApi } from '../../src/services/api';
import { calculateWinnings } from '../../src/utils/prizeCalculator';
import { PrizeRule, MatchResultInput, CalculatedWinner } from '../../src/types/prize';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../../src/contexts/AlertContext';

const { width } = Dimensions.get('window');

// Enhanced color palette
const THEME = {
    accent: '#10b981',      // Emerald for success/prize
    gold: '#f59e0b',        // Gold for winners
    purple: '#8b5cf6',      // Purple for stats
    rose: '#f43f5e',        // Rose for kills
    cyan: '#06b6d4',        // Cyan for rank
    slate: '#334155',       // Dark slate
    muted: '#94a3b8',       // Muted text
    card: '#ffffff',
    cardAlt: '#f8fafc',
    gradient1: '#6366f1',
    gradient2: '#8b5cf6',
};

interface ParticipantWithPrize {
    uid: string;
    username: string;
    freeFireName?: string;
    phone?: string;
    prize?: number;
    breakdown?: string;
    rank?: number;
    kills?: number;
}

export default function DistributePrizes() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const [match, setMatch] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [amounts, setAmounts] = useState<{ [key: string]: string }>({});
    const [stats, setStats] = useState<{ [key: string]: { rank: string, kills: string } }>({});
    const [distributing, setDistributing] = useState(false);
    const [rule, setRule] = useState<PrizeRule | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showWinnersOnly, setShowWinnersOnly] = useState(false);

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

            if (matchData?.prizeDetails) {
                try {
                    const parsed = JSON.parse(matchData.prizeDetails);
                    if (parsed.type && parsed.config) {
                        setRule(parsed);
                    }
                } catch (e) {
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

        const activeInputs = inputs.filter(i => {
            if (rule.type === 'equal_share') return i.rank === 1;
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
        setStats(prev => {
            const currentStats = prev[uid] || { rank: '', kills: '' };
            return {
                ...prev,
                [uid]: {
                    ...currentStats,
                    [field]: value
                }
            };
        });
    };

    const getWinners = () => {
        return Object.entries(amounts)
            .filter(([_, amount]) => amount && !isNaN(Number(amount)) && Number(amount) > 0)
            .map(([uid, amount]) => ({ uid, amount: Number(amount) }));
    };

    const totalPrize = Object.values(amounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const winners = getWinners();

    // Filter participants based on search and winner filter
    const filteredParticipants = useMemo(() => {
        let filtered = participants;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.username?.toLowerCase().includes(query) ||
                p.freeFireName?.toLowerCase().includes(query) ||
                p.phone?.includes(query)
            );
        }

        if (showWinnersOnly) {
            const winnerIds = winners.map(w => w.uid);
            filtered = filtered.filter(p => winnerIds.includes(p.uid));
        }

        return filtered;
    }, [participants, searchQuery, showWinnersOnly, winners]);

    const sendPrizeNotifications = async (winnersData: { uid: string; amount: number }[]) => {
        try {
            for (const winner of winnersData) {
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
        }
    };

    const handleDistribute = async () => {
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

                    await matchApi.distributePrizes({ matchId: id as string, winners });

                    if (rule && rule.id) {
                        const historyLog = {
                            match_id: id,
                            rule_id: rule.id,
                            title: match?.title || 'Unknown Match',
                            completed_at: new Date().toISOString(),
                            winners: winners.map(w => ({
                                uid: w.uid,
                                amount: w.amount,
                                breakdown: 'Distributed via Admin',
                                username: participants.find(p => p.uid === w.uid)?.username || 'Unknown'
                            }))
                        };
                        try {
                            await historyApi.logMatch(historyLog);
                        } catch (e) {
                            console.error('Failed to log history', e);
                        }
                    }

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

    // Get prize breakdown for a participant
    const getPrizeBreakdown = (uid: string): string | null => {
        if (!rule) return null;
        const stat = stats[uid] || { rank: '0', kills: '0' };
        const rank = parseInt(stat.rank) || 0;
        const kills = parseInt(stat.kills) || 0;

        if (rule.type === 'rank_kill') {
            const parts: string[] = [];
            const rankKey = rank.toString();
            if (rule.config.rank_rewards[rankKey]) {
                parts.push(`Rank ${rank}: ৳${rule.config.rank_rewards[rankKey]}`);
            }
            if (kills > 0) {
                parts.push(`${kills} Kills × ৳${rule.config.per_kill} = ৳${kills * rule.config.per_kill}`);
            }
            return parts.length > 0 ? parts.join('\n') : null;
        } else if (rule.type === 'equal_share' && stat.rank === '1') {
            const winnerCount = Object.values(stats).filter(s => s.rank === '1').length;
            return `Equal Share: ৳${rule.config.total_prize} ÷ ${winnerCount} winners`;
        }
        return null;
    };

    const renderMatchHeader = () => (
        <View style={styles.matchHeader}>
            <LinearGradient
                colors={[THEME.gradient1, THEME.gradient2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.matchHeaderGradient}
            >
                <View style={styles.matchHeaderContent}>
                    <View style={styles.matchTitleRow}>
                        <View style={styles.matchIcon}>
                            <Ionicons name="game-controller" size={24} color={COLORS.white} />
                        </View>
                        <View style={styles.matchTitleInfo}>
                            <Text style={styles.matchTitle} numberOfLines={1}>
                                {match?.title || 'Loading...'}
                            </Text>
                            <Text style={styles.matchSubtitle}>
                                Admin Prize Distribution
                            </Text>
                        </View>
                    </View>

                    <View style={styles.matchStats}>
                        <View style={styles.matchStatItem}>
                            <Text style={styles.matchStatValue}>{participants.length}</Text>
                            <Text style={styles.matchStatLabel}>Players</Text>
                        </View>
                        <View style={styles.matchStatDivider} />
                        <View style={styles.matchStatItem}>
                            <Text style={styles.matchStatValue}>{winners.length}</Text>
                            <Text style={styles.matchStatLabel}>Winners</Text>
                        </View>
                        <View style={styles.matchStatDivider} />
                        <View style={styles.matchStatItem}>
                            <Text style={[styles.matchStatValue, { color: THEME.gold }]}>৳{totalPrize}</Text>
                            <Text style={styles.matchStatLabel}>Total Prize</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    const renderRuleCard = () => {
        if (!rule) return null;

        return (
            <View style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                    <View style={styles.ruleBadge}>
                        <Ionicons name="ribbon" size={14} color={THEME.purple} />
                        <Text style={styles.ruleBadgeText}>Active Rule</Text>
                    </View>
                    <Text style={styles.ruleName}>{rule.name}</Text>
                </View>

                <View style={styles.ruleDetails}>
                    {rule.type === 'rank_kill' && (
                        <>
                            <View style={styles.ruleItem}>
                                <Ionicons name="flash" size={16} color={THEME.rose} />
                                <Text style={styles.ruleItemText}>
                                    Per Kill: ৳{rule.config.per_kill}
                                </Text>
                            </View>
                            <View style={styles.ruleRanks}>
                                {Object.entries(rule.config.rank_rewards).slice(0, 5).map(([rank, amount]) => (
                                    <View key={rank} style={styles.rankBadge}>
                                        <Text style={styles.rankBadgeRank}>#{rank}</Text>
                                        <Text style={styles.rankBadgeAmount}>৳{amount}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                    {rule.type === 'equal_share' && (
                        <View style={styles.ruleItem}>
                            <Ionicons name="people" size={16} color={THEME.accent} />
                            <Text style={styles.ruleItemText}>
                                Total Pool: ৳{rule.config.total_prize} (Split equally)
                            </Text>
                        </View>
                    )}
                    {rule.type === 'fixed_list' && (
                        <View style={styles.ruleRanks}>
                            {rule.config.prizes.slice(0, 5).map((amount, idx) => (
                                <View key={idx} style={styles.rankBadge}>
                                    <Text style={styles.rankBadgeRank}>#{idx + 1}</Text>
                                    <Text style={styles.rankBadgeAmount}>৳{amount}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderSearchAndFilter = () => (
        <View style={styles.filterContainer}>
            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={THEME.muted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search player..."
                    placeholderTextColor={THEME.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={THEME.muted} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <TouchableOpacity
                style={[styles.filterBtn, showWinnersOnly && styles.filterBtnActive]}
                onPress={() => setShowWinnersOnly(!showWinnersOnly)}
            >
                <Ionicons
                    name={showWinnersOnly ? "trophy" : "trophy-outline"}
                    size={18}
                    color={showWinnersOnly ? COLORS.white : THEME.gold}
                />
                <Text style={[styles.filterBtnText, showWinnersOnly && styles.filterBtnTextActive]}>
                    Winners
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderPlayerCard = ({ item, index }: { item: any, index: number }) => {
        const prizeAmount = amounts[item.uid] ? Number(amounts[item.uid]) : 0;
        const isWinner = prizeAmount > 0;
        const statData = stats[item.uid] || { rank: '', kills: '' };

        return (
            <View style={[styles.playerCard, isWinner && styles.playerCardWinner]}>
                {/* Main Row */}
                <View style={styles.playerMainRow}>
                    {/* Serial Number & Info */}
                    <View style={styles.playerLeft}>
                        <View style={[styles.playerSerial, isWinner && styles.playerSerialWinner]}>
                            <Text style={[styles.serialText, isWinner && styles.serialTextWinner]}>
                                {index + 1}
                            </Text>
                        </View>

                        <View style={styles.playerInfo}>
                            <Text style={styles.playerName} numberOfLines={1}>
                                {item.username}
                            </Text>
                            <Text style={styles.playerMetaText} numberOfLines={1}>
                                FF: {item.freeFireName || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    {/* Stats Input Section */}
                    <View style={styles.playerRight}>
                        {rule && (
                            <View style={styles.statsContainer}>
                                {rule.type === 'rank_kill' && (
                                    <>
                                        <View style={styles.statInputGroup}>
                                            <Text style={styles.statInputLabel}>Rank</Text>
                                            <TextInput
                                                style={[styles.statInputBox, styles.rankInput]}
                                                placeholder="#"
                                                placeholderTextColor={THEME.muted}
                                                keyboardType="number-pad"
                                                value={statData.rank}
                                                onChangeText={(t) => handleStatsChange(item.uid, 'rank', t)}
                                                maxLength={2}
                                                returnKeyType="done"
                                            />
                                        </View>

                                        <View style={styles.statInputGroup}>
                                            <Text style={styles.statInputLabel}>Kills</Text>
                                            <TextInput
                                                style={[styles.statInputBox, styles.killsInput]}
                                                placeholder="0"
                                                placeholderTextColor={THEME.muted}
                                                keyboardType="number-pad"
                                                value={statData.kills}
                                                onChangeText={(t) => handleStatsChange(item.uid, 'kills', t)}
                                                maxLength={2}
                                                returnKeyType="done"
                                            />
                                        </View>
                                    </>
                                )}

                                {rule.type === 'equal_share' && (
                                    <TouchableOpacity
                                        style={[
                                            styles.winnerToggle,
                                            statData.rank === '1' && styles.winnerToggleActive
                                        ]}
                                        onPress={() => handleStatsChange(
                                            item.uid,
                                            'rank',
                                            statData.rank === '1' ? '0' : '1'
                                        )}
                                    >
                                        <Ionicons
                                            name={statData.rank === '1' ? "checkmark-circle" : "ellipse-outline"}
                                            size={20}
                                            color={statData.rank === '1' ? COLORS.white : THEME.accent}
                                        />
                                        <Text style={[
                                            styles.winnerToggleText,
                                            statData.rank === '1' && styles.winnerToggleTextActive
                                        ]}>
                                            Win
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {rule.type === 'fixed_list' && (
                                    <View style={styles.statInputGroup}>
                                        <Text style={styles.statInputLabel}>Pos</Text>
                                        <TextInput
                                            style={[styles.statInputBox, styles.rankInput]}
                                            placeholder="#"
                                            placeholderTextColor={THEME.muted}
                                            keyboardType="number-pad"
                                            value={statData.rank}
                                            onChangeText={(t) => handleStatsChange(item.uid, 'rank', t)}
                                            maxLength={2}
                                            returnKeyType="done"
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Prize Display (Read-only) */}
                        <View style={[styles.prizeDisplay, isWinner && styles.prizeDisplayWinner]}>
                            <Text style={styles.prizeCurrency}>৳</Text>
                            <Text style={[styles.prizeAmount, isWinner && styles.prizeAmountWinner]}>
                                {prizeAmount || '0'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Winner Badge */}
                {isWinner && (
                    <View style={styles.winnerBadge}>
                        <Ionicons name="trophy" size={10} color={COLORS.white} />
                    </View>
                )}
            </View>
        );
    };

    const renderFooter = () => (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.footerContent}>
                {/* Summary Stats */}
                <View style={styles.summaryCards}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconWrap}>
                            <Ionicons name="people" size={18} color={THEME.purple} />
                        </View>
                        <View>
                            <Text style={styles.summaryValue}>{winners.length}</Text>
                            <Text style={styles.summaryLabel}>Winners</Text>
                        </View>
                    </View>

                    <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
                        <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Ionicons name="cash" size={18} color={THEME.gold} />
                        </View>
                        <View>
                            <Text style={[styles.summaryValue, { color: THEME.gold }]}>৳{totalPrize}</Text>
                            <Text style={styles.summaryLabel}>Total Payout</Text>
                        </View>
                    </View>
                </View>

                {/* Distribute Button */}
                <TouchableOpacity
                    style={[styles.distributeBtn, (distributing || winners.length === 0) && styles.distributeBtnDisabled]}
                    onPress={handleDistribute}
                    disabled={distributing || winners.length === 0}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={winners.length > 0 ? [THEME.accent, '#059669'] : ['#94a3b8', '#64748b']}
                        style={styles.distributeBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {distributing ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <>
                                <Ionicons name="gift" size={22} color={COLORS.white} />
                                <Text style={styles.distributeBtnText}>
                                    {winners.length > 0 ? 'Release Prizes' : 'No Winners Selected'}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading participants...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Match Header - Fixed at top */}
            {renderMatchHeader()}

            {/* Scrollable Content */}
            <FlatList
                data={filteredParticipants}
                keyExtractor={(item) => item.uid}
                renderItem={renderPlayerCard}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={[
                    styles.list,
                    { paddingBottom: 20 }
                ]}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        {/* Prize Rule Card */}
                        {renderRuleCard()}

                        {/* Search & Filter */}
                        {renderSearchAndFilter()}

                        {/* Section Title */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Players ({filteredParticipants.length})
                            </Text>
                            {rule?.type === 'rank_kill' && (
                                <View style={styles.legendRow}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: THEME.cyan }]} />
                                        <Text style={styles.legendText}>Rank</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: THEME.rose }]} />
                                        <Text style={styles.legendText}>Kills</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={48} color={COLORS.border} />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No players match your search' : 'No participants found'}
                        </Text>
                    </View>
                }
            />

            {/* Footer - Static at bottom */}
            {renderFooter()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: THEME.muted,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    listHeader: {
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 0,
    },

    // Match Header
    matchHeader: {
        marginBottom: 16,
    },
    matchHeaderGradient: {
        paddingTop: 16,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    matchHeaderContent: {
        gap: 16,
    },
    matchTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    matchIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    matchTitleInfo: {
        flex: 1,
    },
    matchTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    matchSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: 'rgba(255,255,255,0.7)',
    },
    matchStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 12,
    },
    matchStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    matchStatValue: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    matchStatLabel: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    matchStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 8,
    },

    // Rule Card
    ruleCard: {
        backgroundColor: THEME.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    ruleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    ruleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    ruleBadgeText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: THEME.purple,
    },
    ruleName: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        flex: 1,
    },
    modeToggle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeToggleActive: {
        backgroundColor: THEME.purple,
    },
    ruleDetails: {
        gap: 10,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ruleItemText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: THEME.slate,
    },
    ruleRanks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    rankBadge: {
        backgroundColor: THEME.cardAlt,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    rankBadgeRank: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: THEME.cyan,
    },
    rankBadgeAmount: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: THEME.accent,
    },
    manualModeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderRadius: 8,
        padding: 10,
    },
    manualModeText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: THEME.gold,
        flex: 1,
    },

    // Filter Section
    filterContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: THEME.card,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        borderWidth: 1,
        borderColor: THEME.gold,
    },
    filterBtnActive: {
        backgroundColor: THEME.gold,
    },
    filterBtnText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: THEME.gold,
    },
    filterBtnTextActive: {
        color: COLORS.white,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: FONTS.bold,
        color: THEME.slate,
    },
    legendRow: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: THEME.muted,
    },

    // Player Card
    list: {
        paddingHorizontal: 16,
        gap: 10,
    },
    playerCard: {
        backgroundColor: THEME.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
        overflow: 'hidden',
    },
    playerCardWinner: {
        borderColor: THEME.accent,
        backgroundColor: 'rgba(16, 185, 129, 0.03)',
    },
    playerMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    playerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    playerSerial: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: THEME.cardAlt,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    playerSerialWinner: {
        backgroundColor: THEME.accent,
        borderColor: THEME.accent,
    },
    serialText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: THEME.muted,
    },
    serialTextWinner: {
        color: COLORS.white,
    },
    playerInfo: {
        flex: 1,
        gap: 2,
    },
    playerName: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    playerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playerMetaText: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: THEME.muted,
    },
    playerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    // Stats Container
    statsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statInputGroup: {
        alignItems: 'center',
        gap: 3,
    },
    statInputBox: {
        width: 48,
        height: 40,
        borderRadius: 10,
        borderWidth: 1.5,
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        textAlign: 'center',
        paddingVertical: 0,
        paddingHorizontal: 4,
    },
    rankInput: {
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        borderColor: 'rgba(6, 182, 212, 0.4)',
    },
    killsInput: {
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.4)',
    },
    statInputLabel: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: THEME.muted,
        marginBottom: 4,
    },

    // Winner Toggle (Equal Share)
    winnerToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: THEME.accent,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    winnerToggleActive: {
        backgroundColor: THEME.accent,
    },
    winnerToggleText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: THEME.accent,
    },
    winnerToggleTextActive: {
        color: COLORS.white,
    },

    // Prize Display
    prizeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.cardAlt,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        minWidth: 80,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    prizeDisplayWinner: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: THEME.accent,
    },
    prizeCurrency: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: THEME.accent,
        marginRight: 2,
    },
    prizeAmount: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: THEME.muted,
    },
    prizeAmountWinner: {
        color: THEME.accent,
    },
    prizeInputField: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: THEME.muted,
        textAlign: 'center',
        minWidth: 50,
        padding: 0,
    },
    prizeInputFieldWinner: {
        color: THEME.accent,
    },

    // Winner Badge
    winnerBadge: {
        position: 'absolute',
        top: -1,
        right: 12,
        backgroundColor: THEME.gold,
        width: 20,
        height: 20,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Expanded Section
    expandedSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    breakdownCard: {
        backgroundColor: THEME.cardAlt,
        borderRadius: 10,
        padding: 12,
    },
    breakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    breakdownTitle: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: THEME.purple,
    },
    breakdownText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: THEME.slate,
        lineHeight: 18,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: THEME.muted,
        textAlign: 'center',
    },

    // Footer
    footer: {
        backgroundColor: THEME.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    footerContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    summaryCards: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: THEME.cardAlt,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    summaryCardHighlight: {
        borderColor: THEME.gold,
    },
    summaryIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    summaryLabel: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: THEME.muted,
    },
    distributeBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    distributeBtnDisabled: {
        opacity: 0.7,
    },
    distributeBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
    },
    distributeBtnText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
});
