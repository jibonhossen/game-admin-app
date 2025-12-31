import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { historyApi } from '../../src/services/api';
import { PrizeRuleType } from '../../src/types/prize';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateRule() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [type, setType] = useState<PrizeRuleType>('rank_kill');
    const [creating, setCreating] = useState(false);

    // Config States
    const [totalPrize, setTotalPrize] = useState(''); // equal_share
    const [perKill, setPerKill] = useState(''); // rank_kill
    // Rank Rewards: "1:500, 2:300" -> Parsed to object
    const [rankRewardsInput, setRankRewardsInput] = useState<{ rank: string, amount: string }[]>([{ rank: '1', amount: '' }]);
    // Fixed List: "500, 300, 200" -> Parsed to array
    const [fixedPrizesInput, setFixedPrizesInput] = useState<string[]>(['']);

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

    const handleAddFixedRow = () => {
        setFixedPrizesInput([...fixedPrizesInput, '']);
    };

    const handleUpdateFixedRow = (index: number, value: string) => {
        const newRows = [...fixedPrizesInput];
        newRows[index] = value;
        setFixedPrizesInput(newRows);
    };

    const handleRemoveFixedRow = (index: number) => {
        const newRows = [...fixedPrizesInput];
        newRows.splice(index, 1);
        setFixedPrizesInput(newRows);
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a rule name');
            return;
        }

        let config: any = {};

        if (type === 'equal_share') {
            if (!totalPrize || isNaN(Number(totalPrize))) {
                Alert.alert('Error', 'Please enter a valid Total Prize amount');
                return;
            }
            config = { total_prize: Number(totalPrize) };

        } else if (type === 'rank_kill') {
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

        } else if (type === 'fixed_list') {
            const prizes = fixedPrizesInput
                .map(p => Number(p))
                .filter(p => !isNaN(p) && p > 0);

            if (prizes.length === 0) {
                Alert.alert('Error', 'Please add at least one fixed prize');
                return;
            }
            config = { prizes };
        }

        try {
            setCreating(true);
            const newRule = {
                name,
                type,
                config
            };
            await historyApi.createRule(newRule);
            Alert.alert('Success', 'Rule created successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to create rule', error);
            Alert.alert('Error', 'Failed to save rule');
        } finally {
            setCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Prize Rule</Text>
                </View>
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
                        <TypeOption
                            selected={type === 'equal_share'}
                            label="Equal Share"
                            icon="people"
                            onPress={() => setType('equal_share')}
                        />
                        <TypeOption
                            selected={type === 'fixed_list'}
                            label="Fixed List"
                            icon="list"
                            onPress={() => setType('fixed_list')}
                        />
                    </View>
                </View>

                {/* Dynamic Configuration */}
                <View style={styles.configContainer}>
                    <Text style={styles.sectionTitle}>Configuration</Text>

                    {type === 'equal_share' && (
                        <View style={styles.group}>
                            <Text style={styles.label}>Total Prize Pool (৳)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5000"
                                keyboardType="numeric"
                                value={totalPrize}
                                onChangeText={setTotalPrize}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <Text style={styles.hint}>Split equally among all winners.</Text>
                        </View>
                    )}

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

                    {type === 'fixed_list' && (
                        <View style={styles.group}>
                            <Text style={styles.label}>Fixed Prizes (Top Ranks)</Text>
                            {fixedPrizesInput.map((val, index) => (
                                <View key={index} style={styles.rowInput}>
                                    <Text style={[styles.miniLabel, { width: 60 }]}>Rank {index + 1}</Text>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="Amount"
                                        keyboardType="numeric"
                                        value={val}
                                        onChangeText={(t) => handleUpdateFixedRow(index, t)}
                                    />
                                    <TouchableOpacity onPress={() => handleRemoveFixedRow(index)}>
                                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addBtn} onPress={handleAddFixedRow}>
                                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                                <Text style={styles.addBtnText}>Add Next Rank Prize</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleCreate}
                    disabled={creating}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.btnGradient}
                    >
                        {creating ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitText}>Save Rule</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
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
