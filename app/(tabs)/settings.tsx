import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../src/contexts/AlertContext';

export default function ConfigScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
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
            showAlert({ title: 'Error', message: 'Failed to load configurations', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newValue.trim()) {
            showAlert({ title: 'Error', message: 'Please enter a value', type: 'error' });
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
            showAlert({ title: 'Success', message: 'Configuration added successfully', type: 'success' });
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.response?.data?.message || 'Failed to add configuration', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string, value: string) => {
        showAlert({
            title: 'Confirm Delete',
            message: `Are you sure you want to remove "${value}" from the ${activeTab.replace('_', ' ')} list?`,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await matchApi.deleteConfig(id);
                    await fetchConfigs();
                    showAlert({ title: 'Success', message: 'Deleted successfully', type: 'success' });
                } catch (error) {
                    showAlert({ title: 'Error', message: 'Failed to delete', type: 'error' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const tabs: { key: 'map' | 'category' | 'match_type'; label: string; icon: any }[] = [
        { key: 'map', label: 'Maps', icon: 'map' },
        { key: 'category', label: 'Modes', icon: 'game-controller' },
        { key: 'match_type', label: 'Types', icon: 'people' },
    ];

    const currentList = configs[activeTab] || [];

    return (
        <View style={styles.container}>
            <View style={styles.tabWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? COLORS.white : COLORS.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.content}>
                <View style={styles.addCard}>
                    <Text style={styles.cardHeader}>ADD NEW ENTRY</Text>
                    <View style={styles.addForm}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={newValue}
                                onChangeText={setNewValue}
                                placeholder={`Enter new ${activeTab.replace('_', ' ')}...`}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleAdd}
                            disabled={adding}
                            style={[styles.addButton, adding && { opacity: 0.7 }]}
                        >
                            {adding ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Ionicons name="add" size={24} color={COLORS.white} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Manage {tabs.find(t => t.key === activeTab)?.label}</Text>
                    <Text style={styles.itemCount}>{currentList.length} Items</Text>
                </View>

                {loading && !adding ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <ScrollView
                        style={styles.list}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {currentList.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="documents-outline" size={48} color={COLORS.border} />
                                <Text style={styles.emptyText}>No items found for this category.</Text>
                            </View>
                        ) : (
                            currentList.map((item: any) => (
                                <View key={item.id} style={styles.listItem}>
                                    <View style={styles.itemInfo}>
                                        <View style={styles.dot} />
                                        <Text style={styles.itemText}>{item.value}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, item.value)}
                                        style={styles.deleteButton}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
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
    },
    tabWrapper: {
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    tabScroll: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 14,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textSecondary,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    activeTabText: {
        color: COLORS.white,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    addCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: 16,
    },
    addForm: {
        flexDirection: 'row',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 54,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    input: {
        color: COLORS.text,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        width: 54,
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    itemCount: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.textSecondary,
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    list: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginRight: 12,
    },
    itemText: {
        color: COLORS.text,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
        flex: 1,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.error + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        marginTop: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 16,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
    },
});
