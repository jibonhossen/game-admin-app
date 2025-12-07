import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { matchApi } from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function DistributePrizes() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
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

    const handleDistribute = async () => {
        const winners = getWinners();

        if (winners.length === 0) {
            Alert.alert('Error', 'Please enter prize amounts for at least one user');
            return;
        }

        Alert.alert(
            'Confirm Distribution',
            `Distribute prizes to ${winners.length} users? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Distribute',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDistributing(true);
                            await matchApi.distributePrizes({ matchId: id as string, winners });
                            Alert.alert('Success', 'Prizes distributed successfully', [
                                { text: 'OK', onPress: () => router.back() }
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

    const renderHeader = () => (
        <LinearGradient
            colors={[COLORS.secondary, COLORS.background]}
            style={styles.headerGradient}
        >
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <Ionicons name="gift-outline" size={40} color={COLORS.white} style={{ marginBottom: 10 }} />
                <Text style={styles.title}>Distribute Prizes</Text>
                <Text style={styles.subtitle}>Allocating funds to winners</Text>
            </View>
        </LinearGradient>
    );

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <View style={styles.row}>
            <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.subtext}>FF: {item.freeFireName || 'N/A'}</Text>
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
            <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

                {renderHeader()}

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
                    <FlatList
                        data={participants}
                        keyExtractor={(item) => item.uid}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>No participants found.</Text>}
                    />
                </View>

                <View style={styles.footer}>
                    <LinearGradient
                        colors={[COLORS.surface, COLORS.background]}
                        style={styles.footerGradient}
                    >
                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryLabel}>Total Winners</Text>
                            <Text style={styles.summaryValue}>{getWinners().length}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.button, distributing && styles.buttonDisabled]}
                            onPress={handleDistribute}
                            disabled={distributing}
                        >
                            <LinearGradient
                                colors={[COLORS.secondary, '#db2777']}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.buttonText}>{distributing ? 'Processing...' : 'Confirm Distribution'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: SPACING.m,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 1,
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
    },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
    subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
    content: {
        flex: 1,
        marginTop: -20,
        backgroundColor: COLORS.background, // To cover heavy list content if needed? No, standard bg
        paddingHorizontal: SPACING.m,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15, marginLeft: 5 },
    list: { paddingBottom: 120 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 12,
        marginBottom: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    rankBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    rankText: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 12 },
    userInfo: { flex: 1 },
    name: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
    subtext: { color: COLORS.textSecondary, fontSize: 12 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        width: 110,
        height: 45,
    },
    currency: { color: COLORS.success, fontWeight: 'bold', marginRight: 5, fontSize: 16 },
    input: { color: COLORS.text, flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 16, height: '100%' },
    emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 50 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    footerGradient: {
        padding: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryContainer: {
        flex: 1,
    },
    summaryLabel: { color: COLORS.textSecondary, fontSize: 12 },
    summaryValue: { color: COLORS.white, fontWeight: 'bold', fontSize: 20 },
    button: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
        marginLeft: 20,
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
