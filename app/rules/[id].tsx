import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { historyApi } from '../../src/services/api';
import { PrizeRule, PrizeRuleType } from '../../src/types/prize';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '../../src/contexts/AlertContext';

export default function EditRule() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [name, setName] = useState('');
    const [type, setType] = useState<PrizeRuleType>('rank_kill');

    // Config States
    const [perKill, setPerKill] = useState(''); // rank_kill
    const [rankRewardsInput, setRankRewardsInput] = useState<{ rank: string, amount: string }[]>([{ rank: '1', amount: '' }]);

    useEffect(() => {
        fetchRule();
    }, [id]);

    const fetchRule = async () => {
        try {
            setLoading(true);
            const rules = await historyApi.getRules();
            const rule = rules.find((r: PrizeRule) => r.id === id);

            if (rule) {
                setName(rule.name);
                setType(rule.type);

                if (rule.type === 'rank_kill') {
                    setPerKill(rule.config.per_kill?.toString() || '');
                    const rewards = rule.config.rank_rewards || {};
                    const rewardRows = Object.entries(rewards).map(([rank, amount]) => ({
                        rank,
                        amount: amount.toString()
                    }));
                    if (rewardRows.length > 0) {
                        setRankRewardsInput(rewardRows);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch rule', error);
            showAlert({ title: 'Error', message: 'Failed to load rule', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddRankRow = () => {
        setRankRewardsInput([...rankRewardsInput, { rank: (rankRewardsInput.length + 1).toString(), amount: '' }]);
    };

    const handleUpdateRankRow = (index: number, field: 'rank' | 'amount', value: string) => {
        const newRows = [...rankRewardsInput];
        newRows[index] = { ...newRows[index], [field]: value };
        setRankRewardsInput(newRows);
    };

    const handleRemoveRankRow = (index: number) => {
        const newRows = [...rankRewardsInput];
        newRows.splice(index, 1);
        setRankRewardsInput(newRows);
    };



    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a rule name');
            return;
        }

        let config: any = {};

        if (type === 'rank_kill') {
            if (!perKill || isNaN(Number(perKill))) {
                Alert.alert('Error', 'Please enter a valid Per Kill amount');
                return;
            }
            const rewards: Record<string, number> = {};
            for (const row of rankRewardsInput) {
                if (row.rank && row.amount) {
                    rewards[row.rank] = Number(row.amount);
                }
            }
            config = { per_kill: Number(perKill), rank_rewards: rewards };
        }

        try {
            setSaving(true);
            await historyApi.updateRule(id as string, { name, type, config });
            showAlert({
                title: 'Success',
                message: 'Rule updated successfully',
                type: 'success',
                onConfirm: () => router.back()
            });
        } catch (error) {
            console.error('Failed to update rule', error);
            showAlert({ title: 'Error', message: 'Failed to update rule', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        showAlert({
            title: 'Delete Rule',
            message: 'Are you sure you want to delete this rule? This action cannot be undone.',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    setDeleting(true);
                    await historyApi.deleteRule(id as string);
                    showAlert({
                        title: 'Deleted',
                        message: 'Rule deleted successfully',
                        type: 'success',
                        onConfirm: () => router.back()
                    });
                } catch (error) {
                    console.error('Failed to delete rule', error);
                    showAlert({ title: 'Error', message: 'Failed to delete rule', type: 'error' });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Rule</Text>
                </View>
                <TouchableOpacity onPress={handleDelete} disabled={deleting}>
                    {deleting ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                        <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Name */}
                <View style={styles.group}>
                    <Text style={styles.label}>Rule Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Weekly Solo Cup"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>

                {/* Type Selection */}
                <View style={styles.group}>
                    <Text style={styles.label}>Rule Type</Text>
                    <View style={styles.typeGrid}>
                        <TypeOption
                            selected={type === 'rank_kill'}
                            label="Rank + Kill"
                            icon="trophy"
                            onPress={() => setType('rank_kill')}
                        />
                    </View>
                </View>

                {/* Dynamic Configuration */}
                <View style={styles.configContainer}>
                    <Text style={styles.sectionTitle}>Configuration</Text>



                    {type === 'rank_kill' && (
                        <View style={{ gap: 16 }}>
                            <View style={styles.group}>
                                <Text style={styles.label}>Per Kill Amount (৳)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="10"
                                    keyboardType="numeric"
                                    value={perKill}
                                    onChangeText={setPerKill}
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>

                            <View style={styles.group}>
                                <Text style={styles.label}>Rank Rewards</Text>
                                {rankRewardsInput.map((row, index) => (
                                    <View key={index} style={styles.rowInput}>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.miniLabel}>Rank</Text>
                                            <TextInput
                                                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                                                value={row.rank}
                                                onChangeText={(t) => handleUpdateRankRow(index, 'rank', t)}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.miniLabel}>Prize ৳</Text>
                                            <TextInput
                                                style={[styles.input, { flex: 1 }]}
                                                value={row.amount}
                                                onChangeText={(t) => handleUpdateRankRow(index, 'amount', t)}
                                                keyboardType="numeric"
                                                placeholder="0"
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveRankRow(index)}>
                                            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.addBtn} onPress={handleAddRankRow}>
                                    <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                                    <Text style={styles.addBtnText}>Add Rank Reward</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}


                </View>

                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.btnGradient}
                    >
                        {saving ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitText}>Save Changes</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const TypeOption = ({ selected, label, icon, onPress }: any) => (
    <TouchableOpacity
        style={[styles.typeOption, selected && styles.typeOptionSelected]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Ionicons name={icon} size={20} color={selected ? COLORS.white : COLORS.textSecondary} />
        <Text style={[styles.typeOptionText, selected && { color: COLORS.white }]}>{label}</Text>
    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    content: {
        padding: 20,
        gap: 24,
        paddingBottom: 50,
    },
    group: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    input: {
        height: 48,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    typeGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    typeOption: {
        flex: 1,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typeOptionSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeOptionText: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    configContainer: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
        marginBottom: 8,
    },
    hint: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontFamily: FONTS.medium,
    },
    rowInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    miniLabel: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    addBtnText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    submitBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 10,
    },
    btnGradient: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
});
