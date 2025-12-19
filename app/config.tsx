import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../src/constants/theme';
import { matchApi } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ConfigScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [configs, setConfigs] = useState<any>({});
    const [activeTab, setActiveTab] = useState<'map' | 'category' | 'match_type'>('map');

    // Form State
    const [newValue, setNewValue] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const data = await matchApi.getMatchConfig();
            setConfigs(data || {});
        } catch (error) {
            console.error('Failed to fetch configs', error);
            Alert.alert('Error', 'Failed to load configurations');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newValue.trim()) {
            Alert.alert('Error', 'Please enter a value');
            return;
        }

        try {
            setAdding(true);
            await matchApi.addConfig({
                type: activeTab,
                value: newValue.trim(),
                label: newValue.trim()
            });
            setNewValue('');
            await fetchConfigs();
            Alert.alert('Success', 'Configuration added');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to add configuration');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string, value: string) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete "${value}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await matchApi.deleteConfig(id);
                            await fetchConfigs();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const tabs: { key: 'map' | 'category' | 'match_type'; label: string }[] = [
        { key: 'map', label: 'Maps' },
        { key: 'category', label: 'Categories' },
        { key: 'match_type', label: 'Match Types' },
    ];

    const currentList = configs[activeTab] || [];

    return (
        <View style={styles.container}>
    

            {/* Tabs */}
            <View style={styles.tabContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.content}>
                {/* Add New Form */}
                <View style={styles.addForm}>
                    <TextInput
                        style={styles.input}
                        value={newValue}
                        onChangeText={setNewValue}
                        placeholder={`Add new ${activeTab.replace('_', ' ')}...`}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                    <TouchableOpacity onPress={handleAdd} disabled={adding} style={styles.addButton}>
                        {adding ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Ionicons name="add" size={24} color={COLORS.white} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* List */}
                {loading && !adding ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                ) : (
                    <ScrollView style={styles.list}>
                        {currentList.length === 0 ? (
                            <Text style={styles.emptyText}>No items found.</Text>
                        ) : (
                            currentList.map((item: any) => (
                                <View key={item.id} style={styles.listItem}>
                                    <Text style={styles.itemText}>{item.value}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, item.value)}
                                        style={styles.deleteButton}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
    },
    backButton: {
        marginRight: SPACING.m,
    },
    header: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
        gap: SPACING.s,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.medium,
        fontSize: 14,
    },
    activeTabText: {
        color: COLORS.white,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.m,
    },
    addForm: {
        flexDirection: 'row',
        marginBottom: SPACING.m,
        gap: SPACING.s,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        padding: SPACING.m,
        borderRadius: 12,
        fontFamily: FONTS.regular,
        fontSize: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        width: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    itemText: {
        color: COLORS.text,
        fontFamily: FONTS.medium,
        fontSize: 16,
    },
    deleteButton: {
        padding: SPACING.s,
    },
    emptyText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        fontFamily: FONTS.regular,
    }
});
