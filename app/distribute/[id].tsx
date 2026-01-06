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
    Modal,
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

const { width, height } = Dimensions.get('window');

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
    modalBg: '#0f172a',
    modalCard: '#1e293b',
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

interface SelectedPlayer {
    uid: string;
    username: string;
    freeFireName?: string;
    index: number;
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
    const [distributionComplete, setDistributionComplete] = useState(false);
    const [closingMatch, setClosingMatch] = useState(false);
    const [rule, setRule] = useState<PrizeRule | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showWinnersOnly, setShowWinnersOnly] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null);
    const [tempRank, setTempRank] = useState('');
    const [tempKills, setTempKills] = useState('');
    const modalScale = useState(new Animated.Value(0.9))[0];
    const modalOpacity = useState(new Animated.Value(0))[0];

    // Refund state
    const [refunds, setRefunds] = useState<{ [key: string]: 'full' | 'half' | 'none' }>({});
    const [tempRefundType, setTempRefundType] = useState<'full' | 'half' | 'none'>('none');

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

    // Helper to safely parse teamMembers (may already be an array or JSON string)
    const safeParseTeamMembers = (teamMembers: any): any[] => {
        if (!teamMembers) return [];
        if (Array.isArray(teamMembers)) return teamMembers;
        if (typeof teamMembers === 'string') {
            try {
                const parsed = JSON.parse(teamMembers);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    // Calculate refund amounts based on entry fee
    const getRefundAmount = (uid: string): number => {
        const refundType = refunds[uid];
        if (!refundType || refundType === 'none' || !match) return 0;
        const entryFee = match.entryFee || 0;
        // Get team size for this participant
        const participant = participants.find(p => p.uid === uid);
        const teamMembers = safeParseTeamMembers(participant?.teamMembers);
        const teamSize = teamMembers.length || 1;
        const fullRefund = entryFee * teamSize;
        return refundType === 'full' ? fullRefund : Math.floor(fullRefund / 2);
    };

    const totalRefunds = Object.keys(refunds).reduce((acc, uid) => acc + getRefundAmount(uid), 0);
    const getRefundList = () => {
        return Object.entries(refunds)
            .filter(([_, type]) => type && type !== 'none')
            .map(([uid, _]) => ({ uid, amount: getRefundAmount(uid) }))
            .filter(r => r.amount > 0);
    };
    const refundList = getRefundList();

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

    // Modal functions
    const openPlayerModal = (player: any, index: number) => {
        setSelectedPlayer({
            uid: player.uid,
            username: player.username,
            freeFireName: player.freeFireName,
            index: index,
        });
        const currentStats = stats[player.uid] || { rank: '', kills: '' };
        setTempRank(currentStats.rank);
        setTempKills(currentStats.kills);
        setTempRefundType(refunds[player.uid] || 'none');
        setModalVisible(true);

        Animated.parallel([
            Animated.spring(modalScale, {
                toValue: 1,
                friction: 8,
                tension: 65,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeModal = () => {
        Animated.parallel([
            Animated.timing(modalScale, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false);
            setSelectedPlayer(null);
            setTempRank('');
            setTempKills('');
            setTempRefundType('none');
        });
    };

    const handleModalSave = () => {
        if (!selectedPlayer) {
            closeModal();
            return;
        }

        const rankValue = parseInt(tempRank) || 0;

        // Check for duplicate ranks (only for rank_kill and fixed_list, not equal_share)
        if (rankValue > 0 && rule && (rule.type === 'rank_kill' || rule.type === 'fixed_list')) {
            const existingPlayerWithRank = Object.entries(stats).find(([uid, playerStats]) => {
                // Skip the current player being edited
                if (uid === selectedPlayer.uid) return false;
                // Check if another player already has this rank
                return parseInt(playerStats.rank) === rankValue;
            });

            if (existingPlayerWithRank) {
                const existingPlayer = participants.find(p => p.uid === existingPlayerWithRank[0]);
                const existingName = existingPlayer?.username || existingPlayer?.freeFireName || 'Another player';

                showAlert({
                    title: 'Duplicate Rank',
                    message: `Rank #${rankValue} is already assigned to "${existingName}". Each player must have a unique rank position.`,
                    type: 'warning',
                });
                return;
            }
        }

        // If refund is set, clear prize and stats (no prize for refunded players)
        if (tempRefundType !== 'none') {
            setRefunds(prev => ({ ...prev, [selectedPlayer.uid]: tempRefundType }));
            setAmounts(prev => ({ ...prev, [selectedPlayer.uid]: '0' }));
            setStats(prev => ({
                ...prev,
                [selectedPlayer.uid]: { rank: '0', kills: '0' }
            }));
        } else {
            // Clear any existing refund
            setRefunds(prev => {
                const newRefunds = { ...prev };
                delete newRefunds[selectedPlayer.uid];
                return newRefunds;
            });
            setStats(prev => ({
                ...prev,
                [selectedPlayer.uid]: {
                    rank: tempRank,
                    kills: tempKills,
                }
            }));
        }
        closeModal();
    };

    const handleModalReset = () => {
        setTempRank('');
        setTempKills('');
        setTempRefundType('none');
    };

    const handleEqualShareToggle = () => {
        if (selectedPlayer) {
            const newRank = tempRank === '1' ? '0' : '1';
            setTempRank(newRank);
        }
    };

    // Calculate prize preview in real-time based on tempRank and tempKills
    const getModalPrizePreview = (): number => {
        if (!rule || !selectedPlayer) return 0;

        const rank = parseInt(tempRank) || 0;
        const kills = parseInt(tempKills) || 0;

        if (rule.type === 'rank_kill') {
            let prize = 0;
            // Add rank reward
            const rankKey = rank.toString();
            if (rule.config.rank_rewards && rule.config.rank_rewards[rankKey]) {
                prize += rule.config.rank_rewards[rankKey];
            }
            // Add kill reward
            if (kills > 0 && rule.config.per_kill) {
                prize += kills * rule.config.per_kill;
            }
            return prize;
        } else if (rule.type === 'equal_share') {
            if (rank === 1) {
                // Count current winners including this player if they're marked as winner
                const currentWinners = Object.entries(stats).filter(([uid, s]) =>
                    s.rank === '1' && uid !== selectedPlayer.uid
                ).length;
                const totalWinners = currentWinners + 1; // +1 for this player
                return Math.floor((rule.config.total_prize || 0) / totalWinners);
            }
            return 0;
        } else if (rule.type === 'fixed_list') {
            if (rank > 0 && rule.config.prizes && rule.config.prizes[rank - 1]) {
                return rule.config.prizes[rank - 1];
            }
            return 0;
        }

        return 0;
    };

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

    const sendRefundNotifications = async (refundsData: { uid: string; amount: number }[]) => {
        try {
            for (const refund of refundsData) {
                const playerData = participants.find(p => p.uid === refund.uid);
                const playerName = playerData?.username || 'Player';

                await notificationApi.sendNotification({
                    title: '💰 Refund Processed!',
                    body: `Hey ${playerName}! You've received a refund of ৳${refund.amount} for the match "${match?.title || 'Match'}". The amount has been added to your wallet.`,
                    data: { screen: 'wallet', amount: refund.amount },
                    targetType: 'specific',
                    userIds: [refund.uid],
                    skipSave: true,
                });
            }
        } catch (error) {
            console.error('Failed to send refund notifications:', error);
        }
    };

    const handleCloseMatch = async () => {
        showAlert({
            title: 'Close Match',
            message: 'Are you sure you want to close this match? This will mark the match as completed and notify all participants.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    setClosingMatch(true);

                    // Close the match
                    await matchApi.changeAdminStatus(id as string, 'closed');

                    // Notify all participants
                    const participantIds = participants.map(p => p.uid);
                    if (participantIds.length > 0) {
                        await notificationApi.sendNotification({
                            title: '🏁 Match Completed!',
                            body: `The match "${match?.title || 'Match'}" has been completed! Check your wallet for prizes or refunds.`,
                            data: { screen: 'matches' },
                            targetType: 'specific',
                            userIds: participantIds,
                            skipSave: true,
                        });
                    }

                    showAlert({
                        title: 'Match Closed',
                        message: 'Match has been closed and all participants have been notified!',
                        type: 'success',
                        onConfirm: () => router.back()
                    });
                } catch (error) {
                    console.error('Close match error:', error);
                    showAlert({ title: 'Error', message: 'Failed to close match', type: 'error' });
                } finally {
                    setClosingMatch(false);
                }
            }
        });
    };

    const handleDistribute = async () => {
        const hasWinners = winners.length > 0;
        const hasRefunds = refundList.length > 0;

        if (!hasWinners && !hasRefunds) {
            showAlert({ title: 'Required', message: 'Please select winners or refunds for at least one player.', type: 'warning' });
            return;
        }

        // Build confirmation message
        let confirmMessage = '';
        if (hasWinners && hasRefunds) {
            confirmMessage = `You are about to distribute ৳${totalPrize} to ${winners.length} winners and refund ৳${totalRefunds} to ${refundList.length} players.`;
        } else if (hasWinners) {
            confirmMessage = `You are about to distribute ৳${totalPrize} to ${winners.length} winners.`;
        } else {
            confirmMessage = `You are about to refund ৳${totalRefunds} to ${refundList.length} players.`;
        }
        confirmMessage += ' This action cannot be reversed.';

        showAlert({
            title: 'Confirm Distribution',
            message: confirmMessage,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    setDistributing(true);

                    // Process prizes if any
                    if (hasWinners) {
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
                    }

                    // Process refunds if any
                    if (hasRefunds) {
                        await matchApi.refundParticipants({ matchId: id as string, refunds: refundList });
                        await sendRefundNotifications(refundList);
                    }

                    // Build success message
                    let successMessage = '';
                    if (hasWinners && hasRefunds) {
                        successMessage = 'Prizes distributed and refunds processed successfully!';
                    } else if (hasWinners) {
                        successMessage = 'Prizes distributed successfully! Winners have been notified.';
                    } else {
                        successMessage = 'Refunds processed successfully! Players have been notified.';
                    }

                    // Mark distribution as complete
                    setDistributionComplete(true);

                    showAlert({
                        title: 'Success',
                        message: successMessage + ' You can now close the match.',
                        type: 'success',
                    });
                } catch (error) {
                    console.error('Distribute error', error);
                    showAlert({ title: 'Error', message: 'Failed to process distribution', type: 'error' });
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
        const hasStats = statData.rank !== '' || statData.kills !== '';

        return (
            <TouchableOpacity
                style={[styles.playerCard, isWinner && styles.playerCardWinner]}
                onPress={() => openPlayerModal(item, index)}
                activeOpacity={0.7}
            >
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
                            <View style={styles.playerMetaRow}>
                                <Text style={styles.playerMetaText} numberOfLines={1}>
                                    FF: {item.freeFireName || 'N/A'}
                                </Text>
                                {hasStats && (
                                    <View style={styles.playerStatsBadge}>
                                        {statData.rank !== '' && (
                                            <View style={styles.miniStatBadge}>
                                                <Ionicons name="medal-outline" size={10} color={THEME.cyan} />
                                                <Text style={styles.miniStatText}>#{statData.rank}</Text>
                                            </View>
                                        )}
                                        {statData.kills !== '' && statData.kills !== '0' && (
                                            <View style={styles.miniStatBadge}>
                                                <Ionicons name="skull-outline" size={10} color={THEME.rose} />
                                                <Text style={styles.miniStatText}>{statData.kills}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Prize Display */}
                    <View style={styles.playerRight}>
                        <View style={[styles.prizeDisplay, isWinner && styles.prizeDisplayWinner]}>
                            <Text style={styles.prizeCurrency}>৳</Text>
                            <Text style={[styles.prizeAmount, isWinner && styles.prizeAmountWinner]}>
                                {prizeAmount || '0'}
                            </Text>
                        </View>
                        <View style={styles.editIconWrap}>
                            <Ionicons name="create-outline" size={16} color={THEME.muted} />
                        </View>
                    </View>
                </View>

                {/* Winner Badge */}
                {isWinner && (
                    <View style={styles.winnerBadge}>
                        <Ionicons name="trophy" size={10} color={COLORS.white} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderPlayerModal = () => {
        if (!selectedPlayer) return null;

        const prizeAmount = amounts[selectedPlayer.uid] ? Number(amounts[selectedPlayer.uid]) : 0;

        return (
            <Modal
                visible={modalVisible}
                transparent
                animationType="none"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={closeModal}
                    />
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {
                                transform: [{ scale: modalScale }],
                                opacity: modalOpacity,
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={[THEME.modalBg, THEME.modalCard]}
                            style={styles.modalContent}
                        >
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalPlayerInfo}>
                                    <View style={styles.modalPlayerAvatar}>
                                        <Text style={styles.modalAvatarText}>
                                            {(selectedPlayer.freeFireName || selectedPlayer.username || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.modalPlayerName}>
                                            {selectedPlayer.username || 'Unknown Player'}
                                        </Text>
                                        <Text style={styles.modalPlayerSub}>
                                            FF: {selectedPlayer.freeFireName || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    onPress={closeModal}
                                >
                                    <Ionicons name="close" size={24} color={THEME.muted} />
                                </TouchableOpacity>
                            </View>

                            {/* Modal Divider */}
                            <View style={styles.modalDivider} />

                            {/* Input Fields */}
                            {rule?.type === 'rank_kill' && (
                                <View style={styles.modalInputSection}>
                                    <Text style={styles.modalSectionTitle}>Enter Player Stats</Text>

                                    <View style={styles.modalInputRow}>
                                        <View style={styles.modalInputGroup}>
                                            <View style={styles.modalInputHeader}>
                                                <Ionicons name="medal" size={18} color={THEME.cyan} />
                                                <Text style={styles.modalInputLabel}>Rank Position</Text>
                                            </View>
                                            <TextInput
                                                style={[styles.modalInput, styles.modalInputRank]}

                                                placeholderTextColor={THEME.muted}
                                                keyboardType="number-pad"
                                                value={tempRank}
                                                onChangeText={setTempRank}
                                                maxLength={2}
                                            />
                                        </View>

                                        <View style={styles.modalInputGroup}>
                                            <View style={styles.modalInputHeader}>
                                                <Ionicons name="skull" size={18} color={THEME.rose} />
                                                <Text style={styles.modalInputLabel}>Total Kills</Text>
                                            </View>
                                            <TextInput
                                                style={[styles.modalInput, styles.modalInputKills]}

                                                placeholderTextColor={THEME.muted}
                                                keyboardType="number-pad"
                                                value={tempKills}
                                                onChangeText={setTempKills}
                                                maxLength={2}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            {rule?.type === 'equal_share' && (
                                <View style={styles.modalInputSection}>
                                    <Text style={styles.modalSectionTitle}>Winner Selection</Text>

                                    <TouchableOpacity
                                        style={[
                                            styles.modalWinnerToggle,
                                            tempRank === '1' && styles.modalWinnerToggleActive
                                        ]}
                                        onPress={handleEqualShareToggle}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons
                                            name={tempRank === '1' ? "checkmark-circle" : "ellipse-outline"}
                                            size={28}
                                            color={tempRank === '1' ? COLORS.white : THEME.accent}
                                        />
                                        <Text style={[
                                            styles.modalWinnerToggleText,
                                            tempRank === '1' && styles.modalWinnerToggleTextActive
                                        ]}>
                                            {tempRank === '1' ? 'Selected as Winner' : 'Tap to Mark as Winner'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {rule?.type === 'fixed_list' && (
                                <View style={styles.modalInputSection}>
                                    <Text style={styles.modalSectionTitle}>Enter Position</Text>

                                    <View style={styles.modalInputGroup}>
                                        <View style={styles.modalInputHeader}>
                                            <Ionicons name="podium" size={18} color={THEME.purple} />
                                            <Text style={styles.modalInputLabel}>Position Number</Text>
                                        </View>
                                        <TextInput
                                            style={[styles.modalInput, styles.modalInputRank]}
                                            placeholder="Enter position..."
                                            placeholderTextColor={THEME.muted}
                                            keyboardType="number-pad"
                                            value={tempRank}
                                            onChangeText={setTempRank}
                                            maxLength={2}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Refund Options Section */}
                            <View style={styles.modalInputSection}>
                                <Text style={styles.modalSectionTitle}>💰 Refund Options</Text>
                                <Text style={[styles.modalInputLabel, { marginBottom: 12, color: THEME.muted }]}>
                                    If refund is selected, player will not receive prize money
                                </Text>

                                {(() => {
                                    const entryFee = match?.entryFee || 0;
                                    const participant = participants.find(p => p.uid === selectedPlayer?.uid);
                                    const teamMembers = safeParseTeamMembers(participant?.teamMembers);
                                    const teamSize = teamMembers.length || 1;
                                    const fullRefundAmount = entryFee * teamSize;
                                    const halfRefundAmount = Math.floor(fullRefundAmount / 2);

                                    return (
                                        <View style={styles.refundOptionsContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.refundOption,
                                                    tempRefundType === 'none' && styles.refundOptionActive
                                                ]}
                                                onPress={() => setTempRefundType('none')}
                                            >
                                                <Ionicons
                                                    name={tempRefundType === 'none' ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={tempRefundType === 'none' ? THEME.accent : THEME.muted}
                                                />
                                                <Text style={[
                                                    styles.refundOptionText,
                                                    tempRefundType === 'none' && styles.refundOptionTextActive
                                                ]}>No Refund</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.refundOption,
                                                    tempRefundType === 'half' && styles.refundOptionActive
                                                ]}
                                                onPress={() => setTempRefundType('half')}
                                            >
                                                <Ionicons
                                                    name={tempRefundType === 'half' ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={tempRefundType === 'half' ? THEME.gold : THEME.muted}
                                                />
                                                <Text style={[
                                                    styles.refundOptionText,
                                                    tempRefundType === 'half' && { color: THEME.gold }
                                                ]}>Half Refund (৳{halfRefundAmount})</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.refundOption,
                                                    tempRefundType === 'full' && styles.refundOptionActive
                                                ]}
                                                onPress={() => setTempRefundType('full')}
                                            >
                                                <Ionicons
                                                    name={tempRefundType === 'full' ? "radio-button-on" : "radio-button-off"}
                                                    size={20}
                                                    color={tempRefundType === 'full' ? THEME.rose : THEME.muted}
                                                />
                                                <Text style={[
                                                    styles.refundOptionText,
                                                    tempRefundType === 'full' && { color: THEME.rose }
                                                ]}>Full Refund (৳{fullRefundAmount})</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })()}
                            </View>

                            {/* Prize Preview */}
                            <View style={styles.modalPrizePreview}>
                                <Text style={styles.modalPrizeLabel}>
                                    {tempRefundType !== 'none' ? 'Refund Amount' : 'Calculated Prize'}
                                </Text>
                                <Text style={[
                                    styles.modalPrizeValue,
                                    tempRefundType !== 'none' && { color: tempRefundType === 'full' ? THEME.rose : THEME.gold }
                                ]}>
                                    {tempRefundType !== 'none' ? (() => {
                                        const entryFee = match?.entryFee || 0;
                                        const participant = participants.find(p => p.uid === selectedPlayer?.uid);
                                        const teamMembers = safeParseTeamMembers(participant?.teamMembers);
                                        const teamSize = teamMembers.length || 1;
                                        const fullRefund = entryFee * teamSize;
                                        return `৳${tempRefundType === 'full' ? fullRefund : Math.floor(fullRefund / 2)}`;
                                    })() : `৳${getModalPrizePreview()}`}
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalResetBtn}
                                    onPress={handleModalReset}
                                >
                                    <Ionicons name="refresh" size={20} color={THEME.rose} />
                                    <Text style={styles.modalResetText}>Reset</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalSaveBtn}
                                    onPress={handleModalSave}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[THEME.accent, '#059669']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.modalSaveBtnGradient}
                                    >
                                        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                                        <Text style={styles.modalSaveText}>Save Details</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>
        );
    };

    const renderFooter = () => {
        const hasWinnersOrRefunds = winners.length > 0 || refundList.length > 0;
        const totalDistribution = totalPrize + totalRefunds;
        const prizePool = match?.prizePool || 0;
        const isOverBudget = totalDistribution > prizePool && prizePool > 0;

        return (
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
                                <Text style={styles.summaryLabel}>Prizes</Text>
                            </View>
                        </View>

                        {refundList.length > 0 && (
                            <View style={styles.summaryCard}>
                                <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                                    <Ionicons name="arrow-undo" size={18} color={THEME.rose} />
                                </View>
                                <View>
                                    <Text style={[styles.summaryValue, { color: THEME.rose }]}>৳{totalRefunds}</Text>
                                    <Text style={styles.summaryLabel}>Refunds ({refundList.length})</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Over budget warning */}
                    {isOverBudget && (
                        <View style={styles.warningBanner}>
                            <Ionicons name="warning" size={16} color={THEME.rose} />
                            <Text style={styles.warningText}>
                                Total (৳{totalDistribution}) exceeds prize pool (৳{prizePool})
                            </Text>
                        </View>
                    )}

                    {/* Distribute Button or Close Match Button */}
                    {distributionComplete ? (
                        <TouchableOpacity
                            style={styles.distributeBtn}
                            onPress={handleCloseMatch}
                            disabled={closingMatch}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#f43f5e', '#dc2626']}
                                style={styles.distributeBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {closingMatch ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <>
                                        <Ionicons name="lock-closed" size={22} color={COLORS.white} />
                                        <Text style={styles.distributeBtnText}>Close Match</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.distributeBtn, (!hasWinnersOrRefunds || distributing || isOverBudget) && styles.distributeBtnDisabled]}
                            onPress={handleDistribute}
                            disabled={distributing || !hasWinnersOrRefunds || isOverBudget}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={hasWinnersOrRefunds && !isOverBudget ? [THEME.accent, '#059669'] : ['#94a3b8', '#64748b']}
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
                                            {!hasWinnersOrRefunds
                                                ? 'No Winners or Refunds'
                                                : isOverBudget
                                                    ? 'Over Budget'
                                                    : refundList.length > 0 && winners.length > 0
                                                        ? 'Distribute All'
                                                        : refundList.length > 0
                                                            ? 'Process Refunds'
                                                            : 'Release Prizes'}
                                        </Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

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
                            <View style={styles.tapHint}>
                                <Ionicons name="hand-left-outline" size={12} color={THEME.muted} />
                                <Text style={styles.tapHintText}>Tap to edit</Text>
                            </View>
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

            {/* Player Edit Modal */}
            {renderPlayerModal()}
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
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tapHintText: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: THEME.muted,
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
        gap: 4,
    },
    playerName: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    playerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerStatsBadge: {
        flexDirection: 'row',
        gap: 6,
    },
    miniStatBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: THEME.cardAlt,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniStatText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: THEME.slate,
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
        gap: 8,
    },
    editIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: THEME.cardAlt,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    // Prize Display
    prizeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.cardAlt,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        minWidth: 70,
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

    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    modalContainer: {
        width: width - 40,
        maxWidth: 400,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalPlayerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalPlayerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: THEME.gradient1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAvatarText: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    modalPlayerName: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    modalPlayerSub: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: THEME.muted,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 20,
    },
    modalInputSection: {
        gap: 16,
    },
    modalSectionTitle: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.white,
        marginBottom: 4,
    },
    modalInputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    modalInputGroup: {
        flex: 1,
        gap: 8,
    },
    modalInputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    modalInputLabel: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: THEME.muted,
    },
    modalInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.white,
        borderWidth: 1.5,
        textAlign: 'center',
    },
    modalInputRank: {
        borderColor: 'rgba(6, 182, 212, 0.4)',
    },
    modalInputKills: {
        borderColor: 'rgba(244, 63, 94, 0.4)',
    },
    modalWinnerToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 18,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: THEME.accent,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    modalWinnerToggleActive: {
        backgroundColor: THEME.accent,
    },
    modalWinnerToggleText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: THEME.accent,
    },
    modalWinnerToggleTextActive: {
        color: COLORS.white,
    },
    modalPrizePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderRadius: 12,
        padding: 14,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    modalPrizeLabel: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: THEME.gold,
    },
    modalPrizeValue: {
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: THEME.gold,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalResetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: THEME.rose,
        backgroundColor: 'rgba(244, 63, 94, 0.08)',
    },
    modalResetText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: THEME.rose,
    },
    modalSaveBtn: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalSaveBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
    },
    modalSaveText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.white,
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

    // Refund options styles
    refundOptionsContainer: {
        gap: 8,
    },
    refundOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    refundOptionActive: {
        borderColor: THEME.accent,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    refundOptionText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.white,
    },
    refundOptionTextActive: {
        color: THEME.accent,
    },

    // Warning banner styles
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: THEME.rose,
    },
    warningText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: THEME.rose,
        flex: 1,
    },
});
