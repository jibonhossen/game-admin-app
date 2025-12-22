import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi, notificationApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function MatchDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [match, setMatch] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Update Form State
    const [customId, setCustomId] = useState('');
    const [password, setPassword] = useState('');
    const [prizeDetails, setPrizeDetails] = useState('');
    const [updating, setUpdating] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);
    const [sendingNotification, setSendingNotification] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const matchData = await matchApi.getAllMatches();
            const found = matchData.find((m: any) => m.id === id);

            if (found) {
                setMatch(found);
                setCustomId(found.customId || '');
                setPassword(found.password || '');
                setPrizeDetails(found.prizeDetails || '');

                const parts = await matchApi.getParticipants(id as string);
                setParticipants(parts);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch match details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            setUpdating(true);
            await matchApi.updateMatch(id as string, { customId, password, prizeDetails });
            setMatch((prev: any) => ({ ...prev, customId, password, prizeDetails }));

            // Send notification in background to participants if room details provided
            if (participants.length > 0 && (customId || password)) {
                // Construct notification payload
                const userIds = participants.map((p: any) => p.uid);
                const timeLeft = getTimeLeftString();

                let notifyBody = '🎮 Room Details Updated!';
                notifyBody += '\n\n📋 Match Details:';
                notifyBody += `\n📅 Date: ${match.scheduleDate}`;
                notifyBody += `\n⏰ Time: ${match.scheduleTime}`;
                notifyBody += `\n🗺️ Map: ${match.map}`;
                if (customId) notifyBody += `\n🆔 Room ID: ${customId}`;
                if (password) notifyBody += `\n🔑 Password: ${password}`;
                if (timeLeft) notifyBody += `\n\n⏳ ${timeLeft}`;

                // Fire and forget (it will complete in background)
                notificationApi.sendNotification({
                    title: `${match.title} - Match #${match.matchNo}`,
                    body: notifyBody,
                    data: { screen: 'match-list', matchId: id },
                    targetType: 'specific',
                    userIds,
                    skipSave: true,
                }).catch(err => console.error('Background notification failed:', err));
            }

            Alert.alert('Success', 'Match updated successfully. Sending notification to participants...');
        } catch (error) {
            Alert.alert('Error', 'Failed to update match');
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusChange = async (newStatus: 'active' | 'closed') => {
        const statusLabels = { inactive: 'Inactive', active: 'Active', closed: 'Closed' };
        const currentLabel = statusLabels[match.adminStatus as keyof typeof statusLabels] || 'Inactive';
        const newLabel = statusLabels[newStatus];

        Alert.alert(
            'Change Status',
            `Are you sure you want to change status from "${currentLabel}" to "${newLabel}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setChangingStatus(true);
                            const result = await matchApi.changeAdminStatus(id as string, newStatus);
                            Alert.alert('Success', result.message);
                            setMatch(result.match);
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to change status');
                        } finally {
                            setChangingStatus(false);
                        }
                    }
                }
            ]
        );
    };

    const getTimeLeftString = () => {
        try {
            const monthMap: { [key: string]: number } = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };

            if (!match?.scheduleDate || !match?.scheduleTime) return '';

            const dateParts = match.scheduleDate.trim().split(' ');
            if (dateParts.length !== 3) return '';

            const dayNum = parseInt(dateParts[0], 10);
            const monthNum = monthMap[dateParts[1]];
            const yearNum = parseInt(dateParts[2], 10);

            const timeParts = match.scheduleTime.trim().split(' ');
            if (timeParts.length !== 2) return '';

            const [timeStr, modifier] = timeParts;
            const timeComponents = timeStr.split(':');
            let hours = parseInt(timeComponents[0], 10);
            const minutes = parseInt(timeComponents[1], 10);

            if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

            const matchDate = new Date(yearNum, monthNum, dayNum, hours, minutes, 0);
            const now = new Date();
            const diffMs = matchDate.getTime() - now.getTime();

            if (isNaN(diffMs) || diffMs <= 0) return diffMs <= 0 ? 'Match has started!' : '';

            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (diffDays > 0) return `${diffDays}d ${diffHours}h ${diffMinutes}m left`;
            if (diffHours > 0) return `${diffHours}h ${diffMinutes}m left`;
            return `${diffMinutes}m left`;
        } catch (e) {
            return '';
        }
    };

    const handleSendNotification = async () => {
        if (participants.length === 0) {
            Alert.alert('No Participants', 'There are no participants to notify.');
            return;
        }

        try {
            setSendingNotification(true);
            const userIds = participants.map((p: any) => p.uid);
            const timeLeft = getTimeLeftString();
            let detailedBody = '🎮 Get Ready for the Match!';
            detailedBody += '\n\n📋 Match Details:';
            detailedBody += `\n📅 Date: ${match.scheduleDate}`;
            detailedBody += `\n⏰ Time: ${match.scheduleTime}`;
            detailedBody += `\n🗺️ Map: ${match.map}`;
            if (match.customId) detailedBody += `\n🆔 Room ID: ${match.customId}`;
            if (match.password) detailedBody += `\n🔑 Password: ${match.password}`;
            if (timeLeft) detailedBody += `\n\n⏳ ${timeLeft}`;

            // Fire and forget for speed
            notificationApi.sendNotification({
                title: `${match.title} - Match #${match.matchNo}`,
                body: detailedBody,
                data: { screen: 'match-list', matchId: id },
                targetType: 'specific',
                userIds,
                skipSave: true,
            }).catch(error => {
                console.error('Manual notification failed:', error);
            });

            Alert.alert('Success', 'Notification delivery started in the background.');
        } catch (error: any) {
            Alert.alert('Error', 'Failed to initiate notification');
        } finally {
            setSendingNotification(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!match) {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
                <Text style={styles.errorText}>Match not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Information Section */}
                <View style={styles.matchHeaderContent}>
                    <View style={styles.statusBadgeRow}>
                        <StatusIndicator status={match.adminStatus} />
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{match.category}</Text>
                        </View>
                    </View>
                    <Text style={styles.matchTitle}>{match.title}</Text>
                    <Text style={styles.matchNo}>MATCH NO: #{match.matchNo}</Text>
                </View>

                {/* Info Grid */}
                <View style={[styles.card, styles.infoGrid]}>
                    <InfoBox icon="calendar" label="Date" value={match.scheduleDate} color="#3b82f6" />
                    <InfoBox icon="time" label="Time" value={match.scheduleTime} color="#ec4899" />
                    <InfoBox icon="map" label="Map" value={match.map} color="#f59e0b" />
                    <InfoBox icon="people" label="Type" value={match.matchType} color={COLORS.primary} />
                </View>

                {/* Room Config */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>ROOM CONFIGURATION</Text>
                    </View>
                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Room ID</Text>
                            <TextInput
                                style={styles.input}
                                value={customId}
                                onChangeText={setCustomId}
                                placeholder="Wait for Match"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="****"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={updating}
                        activeOpacity={0.8}
                        style={styles.updateBtn}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBtn}
                        >
                            {updating ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Text style={styles.updateText}>Update Credentials</Text>
                                    <Ionicons name="notifications-outline" size={18} color={COLORS.white} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Prize Details */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.cardTitle}>PRIZE DISTRIBUTION</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setPrizeDetails("1st: \n2nd: \n3rd: ")}
                            style={styles.autoPopBtn}
                        >
                            <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
                            <Text style={styles.autoPopText}>Auto 3 Rows</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Prize Details</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            value={prizeDetails}
                            onChangeText={setPrizeDetails}
                            placeholder="e.g. 1st: 500, 2nd: 250, 3rd: 100"
                            placeholderTextColor={COLORS.textSecondary}
                            multiline={true}
                            numberOfLines={4}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={[styles.card, styles.actionsRow]}>
                    <ActionButton
                        icon="notifications"
                        label="PUSH ALERT"
                        onPress={handleSendNotification}
                        color="#4F46E5"
                        loading={sendingNotification}
                    />
                    <ActionButton
                        icon="gift"
                        label="DISTRIBUTE"
                        onPress={() => router.push(`/distribute/${id}`)}
                        color={COLORS.secondary}
                    />
                    <ActionButton
                        icon={match.adminStatus === 'closed' ? 'refresh' : 'power'}
                        label={match.adminStatus === 'closed' ? 'REOPEN' : 'CLOSE'}
                        onPress={() => handleStatusChange(match.adminStatus === 'closed' ? 'active' : 'closed')}
                        color={match.adminStatus === 'closed' ? COLORS.success : COLORS.error}
                        loading={changingStatus}
                    />
                </View>

                {/* Participants List */}
                <View style={styles.partHeader}>
                    <Text style={styles.partTitle}>Participants</Text>
                    <View style={styles.partCount}>
                        <Text style={styles.countText}>{participants.length} / {match.totalSlots}</Text>
                    </View>
                </View>

                <View style={styles.participantsList}>
                    {participants.length === 0 ? (
                        <View style={styles.emptyPart}>
                            <Ionicons name="people-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No one has joined this match yet.</Text>
                        </View>
                    ) : (
                        participants.map((p, index) => (
                            <ParticipantCard key={p.uid} data={p} index={index} />
                        ))
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const InfoBox = ({ icon, label, value, color }: any) => (
    <View style={styles.infoBox}>
        <View style={[styles.infoIconBg, { backgroundColor: color + '10' }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

const ActionButton = ({ icon, label, onPress, color, loading }: any) => (
    <TouchableOpacity onPress={onPress} disabled={loading} style={styles.actionBtn}>
        <View style={[styles.actionIconBg, { backgroundColor: color + '15' }]}>
            {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={22} color={color} />}
        </View>
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
);

const StatusIndicator = ({ status }: { status: string }) => {
    let color = COLORS.success;
    if (status === 'closed') color = COLORS.error;
    if (status === 'inactive') color = COLORS.textSecondary;

    return (
        <View style={[styles.statusBadge, { backgroundColor: color + '10' }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{status.toUpperCase()}</Text>
        </View>
    );
};

const ParticipantCard = ({ data, index }: any) => (
    <View style={styles.pCard}>
        <View style={styles.pTop}>
            <View style={styles.pRank}>
                <Text style={styles.pRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.pInfo}>
                <Text style={styles.pName}>{data.username}</Text>
                <View style={styles.pRow}>
                    <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.pPhone}>{data.phoneNumber || '99xxxxxx'}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.pContact}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
        </View>

        <View style={styles.pTeam}>
            <Text style={styles.teamTitle}>OFFICIAL NAMES</Text>
            <View style={styles.teamGrid}>
                {data.teamMembers && data.teamMembers.length > 0 ? (
                    data.teamMembers.map((m: string, i: number) => (
                        <View key={i} style={styles.teamMember}>
                            <View style={styles.memberDot} />
                            <Text style={styles.memberName} numberOfLines={1}>{m}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.teamMember}>
                        <View style={styles.memberDot} />
                        <Text style={styles.memberName}>{data.freeFireName || 'Unknown'}</Text>
                    </View>
                )}
            </View>
        </View>
    </View>
);

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
    matchHeaderContent: {
        backgroundColor: COLORS.white,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.5,
    },
    typeBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typeBadgeText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
    },
    matchTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    matchNo: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginTop: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    infoBox: {
        width: (width - 80) / 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    autoPopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    autoPopText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.primary,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.text,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 12,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    updateBtn: {
        overflow: 'hidden',
        borderRadius: 14,
    },
    gradientBtn: {
        flexDirection: 'row',
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    updateText: {
        color: COLORS.white,
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    actionIconBg: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 9,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.5,
    },
    partHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 24,
        marginBottom: 12,
    },
    partTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    partCount: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    countText: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
    },
    participantsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    pCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    pRank: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pRankText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    pInfo: {
        flex: 1,
    },
    pName: {
        fontSize: 15,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    pRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pPhone: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    pContact: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#25D36610',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pTeam: {
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 12,
    },
    teamTitle: {
        fontSize: 9,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    teamGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    teamMember: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    memberDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    memberName: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.text,
    },
    emptyPart: {
        alignItems: 'center',
        padding: 40,
        gap: 16,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.error,
        marginTop: 16,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    backButtonText: {
        color: COLORS.white,
        fontFamily: 'Poppins_700Bold',
    },
});
