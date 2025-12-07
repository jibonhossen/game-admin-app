import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MatchDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Update Form State
    const [customId, setCustomId] = useState('');
    const [password, setPassword] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const matchData = await matchApi.getAllMatches();
            const found = matchData.find((m: any) => m._id === id);

            if (found) {
                setMatch(found);
                setCustomId(found.customId || '');
                setPassword(found.password || '');

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
            await matchApi.updateMatch(id as string, { customId, password });
            Alert.alert('Success', 'Match updated successfully');
            setMatch((prev: any) => ({ ...prev, customId, password }));
        } catch (error) {
            Alert.alert('Error', 'Failed to update match');
        } finally {
            setUpdating(false);
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
                <Text style={styles.errorText}>Match not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderHeader = () => (
        <LinearGradient
            colors={[COLORS.primaryDark, COLORS.background]}
            style={styles.headerGradient}
        >
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <View style={styles.badgeContainer}>
                    <View style={[styles.badge, match.status === 'Open' ? styles.badgeOpen : styles.badgeClosed]}>
                        <Text style={styles.badgeText}>{match.status}</Text>
                    </View>
                    <View style={styles.badgeSecondary}>
                        <Text style={styles.badgeText}>{match.category}</Text>
                    </View>
                </View>
                <Text style={styles.title}>{match.title}</Text>
                <Text style={styles.subtitle}>Match #{match.matchNo}</Text>
            </View>
        </LinearGradient>
    );

    const renderInfoCard = (icon: any, label: string, value: string) => (
        <View style={styles.infoCard}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={20} color={COLORS.primaryLight} />
            </View>
            <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {renderHeader()}

                <View style={styles.content}>
                    {/* Key Info Grid */}
                    <View style={styles.grid}>
                        {renderInfoCard('calendar', 'Date', match.scheduleDate)}
                        {renderInfoCard('time', 'Time', match.scheduleTime)}
                        {renderInfoCard('map', 'Map', match.map)}
                        {renderInfoCard('people', 'Type', match.matchType)}
                    </View>

                    {/* Room Management */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Room Configuration</Text>
                        <View style={styles.card}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Room ID</Text>
                                <TextInput
                                    style={styles.input}
                                    value={customId}
                                    onChangeText={setCustomId}
                                    placeholder="Enter Room ID"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter Password"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.updateButton, updating && styles.disabledButton]}
                                onPress={handleUpdate}
                                disabled={updating}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.primaryDark]}
                                    style={styles.gradientButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.buttonText}>{updating ? 'Updating...' : 'Update & Notify'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Participants Section */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.sectionTitle}>
                                Participants <Text style={styles.highlight}>({participants.length}/{match.totalSlots})</Text>
                            </Text>
                            <TouchableOpacity onPress={() => router.push(`/distribute/${id}`)} style={styles.distributeBtn}>
                                <LinearGradient
                                    colors={[COLORS.secondary, '#db2777']}
                                    style={styles.gradientBadge}
                                >
                                    <Ionicons name="gift-outline" size={16} color="white" style={{ marginRight: 4 }} />
                                    <Text style={styles.distributeText}>Distribute Prizes</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            {participants.length === 0 ? (
                                <Text style={styles.emptyText}>No participants joined yet.</Text>
                            ) : (
                                participants.map((p, index) => (
                                    <View key={p.uid} style={[styles.participantRow, index === participants.length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={styles.rankContainer}>
                                            <Text style={styles.rankText}>#{index + 1}</Text>
                                        </View>
                                        <View style={styles.participantInfo}>
                                            <Text style={styles.pName}>{p.username}</Text>
                                            <Text style={styles.pSub}>FF: {p.freeFireName || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.phoneContainer}>
                                            <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
                                            <Text style={styles.phoneText}>{p.number}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
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
        backgroundColor: COLORS.background,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 16,
        marginBottom: 20,
    },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 8,
    },
    backButtonText: {
        color: COLORS.text,
    },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: SPACING.m,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerBackBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 10,
    },
    badgeContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeOpen: {
        backgroundColor: COLORS.success,
    },
    badgeClosed: {
        backgroundColor: COLORS.error,
    },
    badgeSecondary: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 4,
    },
    content: {
        padding: SPACING.m,
        marginTop: -20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: SPACING.l,
    },
    infoCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.surface,
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    infoValue: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    section: {
        marginBottom: SPACING.l,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        color: COLORS.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 16,
    },
    updateButton: {
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 8,
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    highlight: {
        color: COLORS.primaryLight,
    },
    distributeBtn: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    gradientBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    distributeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    rankContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    rankText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    participantInfo: {
        flex: 1,
    },
    pName: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 15,
    },
    pSub: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    phoneText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    emptyText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        padding: 20,
    }
});
