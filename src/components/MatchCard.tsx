import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface MatchCardProps {
    match: any;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
    const router = useRouter();

    const handlePress = () => {
        router.push(`/match/${match._id}`);
    };

    return (
        <TouchableOpacity onPress={handlePress} style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>{match.title}</Text>
                <StatusBadge status={match.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <InfoItem icon="game-controller-outline" label="Type" value={match.matchType} />
                <InfoItem icon="map-outline" label="Map" value={match.map} />
            </View>
            <View style={styles.row}>
                <InfoItem icon="calendar-outline" label="Date" value={match.scheduleDate} />
                <InfoItem icon="time-outline" label="Time" value={match.scheduleTime} />
            </View>

            <View style={styles.footer}>
                <View style={styles.footerItem}>
                    <Ionicons name="people-outline" size={16} color={COLORS.secondary} />
                    <Text style={styles.slots}> {match.joinedSlots}/{match.totalSlots}</Text>
                </View>
                <View style={[styles.footerItem, styles.feeContainer]}>
                    <Text style={styles.feeLabel}>Entry: </Text>
                    <Text style={styles.fees}>৳{match.entryFee}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <View style={styles.infoItem}>
        <Ionicons name={icon} size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
        <Text style={styles.value}>{value}</Text>
    </View>
);

const StatusBadge = ({ status }: { status: string }) => {
    let color = COLORS.primary;
    if (status === 'Open') color = COLORS.success;
    if (status === 'Full') color = COLORS.error;
    if (status === 'Completed') color = COLORS.textSecondary;

    return (
        <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    title: {
        color: COLORS.text,
        fontSize: 18,
        fontFamily: FONTS.bold,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.s,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    value: {
        color: COLORS.text,
        fontSize: 14,
        fontFamily: FONTS.medium,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.s,
        paddingTop: SPACING.s,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    slots: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.medium,
        fontSize: 14,
    },
    feeContainer: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    feeLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: FONTS.regular,
    },
    fees: {
        color: COLORS.primary,
        fontFamily: FONTS.bold,
        fontSize: 14,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
    },
});
