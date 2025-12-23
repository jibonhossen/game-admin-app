import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { matchApi } from '../services/api';
import { useAlert } from '../contexts/AlertContext';

interface MatchCardProps {
    match: any;
    onUpdate?: () => void;
    onDelete?: (id: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onUpdate, onDelete }) => {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [updating, setUpdating] = useState(false);

    const handlePress = () => {
        router.push(`/match/${match.id}`);
    };

    const updateStatus = async (newStatus: 'active' | 'inactive' | 'closed') => {
        if (newStatus === match.adminStatus) return;
        try {
            setUpdating(true);
            await matchApi.changeAdminStatus(match.id, newStatus);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Status update error:', error);
            showAlert({ title: 'Error', message: 'Failed to update status', type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = () => {
        showAlert({
            title: 'Delete Match',
            message: 'Are you sure you want to delete this match? This action cannot be undone.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    setUpdating(true);
                    await matchApi.deleteMatch(match.id);
                    if (onDelete) onDelete(match.id);
                    showAlert({ title: 'Success', message: 'Match deleted successfully', type: 'success' });
                } catch (error) {
                    console.error('Delete error:', error);
                    showAlert({ title: 'Error', message: 'Failed to delete match', type: 'error' });
                } finally {
                    setUpdating(false);
                }
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return COLORS.success;
            case 'inactive': return COLORS.textSecondary;
            case 'closed': return COLORS.error;
            default: return COLORS.primary;
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.card}>
            <View style={styles.header}>
                <View style={styles.titleSection}>
                    <Text style={styles.matchNo}>{match.matchNo}</Text>
                    <Text style={styles.title} numberOfLines={1}>{match.title}</Text>
                </View>
                <View style={styles.headerActions}>
                    <StatusBadge status={match.status} />
                    <TouchableOpacity
                        onPress={handleDelete}
                        style={styles.deleteBtn}
                        disabled={updating}
                    >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                    <InfoItem icon="game-controller" value={match.matchType} color={COLORS.primary} />
                    <InfoItem icon="map" value={match.map} color="#f59e0b" />
                </View>
                <View style={styles.infoRow}>
                    <InfoItem icon="calendar" value={match.scheduleDate} color="#3b82f6" />
                    <InfoItem icon="time" value={match.scheduleTime} color="#ec4899" />
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.slotsInfo}>
                    <Ionicons name="people" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.slotsText}>
                        <Text style={styles.slotsJoined}>{match.joinedSlots}</Text>
                        <Text style={styles.slotsTotal}> / {match.totalSlots} Slots</Text>
                    </Text>
                </View>
                <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>৳{match.entryFee}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.adminActions}>
                <Text style={styles.actionLabel}>Admin Status:</Text>
                <View style={styles.statusGroup}>
                    {['active', 'inactive', 'closed'].map((status) => {
                        const isActive = match.adminStatus === status;
                        const color = getStatusColor(status);
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusBtn,
                                    isActive && { backgroundColor: color, borderColor: color }
                                ]}
                                onPress={() => updateStatus(status as any)}
                                disabled={updating}
                            >
                                {updating && isActive ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={[styles.statusBtnText, isActive && { color: COLORS.white }]}>
                                        {status.toUpperCase()}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const InfoItem = ({ icon, value, color }: { icon: any, value: string, color: string }) => (
    <View style={styles.infoItem}>
        <View style={[styles.infoIconBg, { backgroundColor: color + '10' }]}>
            <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={styles.infoText} numberOfLines={1}>{value}</Text>
    </View>
);

const StatusBadge = ({ status }: { status: string }) => {
    let color = COLORS.primary;
    if (status === 'Open') color = COLORS.success;
    if (status === 'Full') color = COLORS.error;
    if (status === 'Completed') color = COLORS.textSecondary;

    return (
        <View style={[styles.badge, { backgroundColor: color + '10' }]}>
            <View style={[styles.badgeDot, { backgroundColor: color }]} />
            <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 15,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.error + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleSection: {
        flex: 1,
        marginRight: 10,
    },
    matchNo: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: 2,
    },
    title: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    infoGrid: {
        gap: 12,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    infoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 8,
        borderRadius: 12,
    },
    infoIconBg: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    infoText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.text,
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    slotsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    slotsText: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
    },
    slotsJoined: {
        color: COLORS.text,
    },
    slotsTotal: {
        color: COLORS.textSecondary,
    },
    priceBadge: {
        backgroundColor: COLORS.secondary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    priceText: {
        fontSize: 15,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.secondary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 16,
    },
    adminActions: {
        gap: 10,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    statusGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBtn: {
        flex: 1,
        height: 36,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    statusBtnText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 6,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
    },
});
